# File Uploads

Complete guide to implementing file uploads in Nitro GraphQL with GraphQL Upload scalar and multipart handling.

## Overview

This recipe covers:
- GraphQL Upload scalar integration
- Multipart form data handling
- File validation and security
- Image processing
- Cloud storage integration (S3, Cloudinary)
- Direct uploads with presigned URLs

## GraphQL Upload Integration

### 1. Installation

```bash
pnpm add graphql-upload
pnpm add -D @types/graphql-upload
```

### 2. Define Upload Schema

Create `server/graphql/upload/upload.graphql`:

```graphql
scalar Upload

type File {
  id: ID!
  filename: String!
  mimetype: String!
  encoding: String!
  url: String!
  size: Int!
  uploadedAt: DateTime!
}

input UploadFileInput {
  file: Upload!
  description: String
}

extend type Mutation {
  """Upload a single file"""
  uploadFile(input: UploadFileInput!): File!

  """Upload multiple files"""
  uploadFiles(files: [Upload!]!): [File!]!

  """Update user avatar"""
  updateAvatar(file: Upload!): User!

  """Delete a file"""
  deleteFile(id: ID!): Boolean!
}
```

### 3. Configure GraphQL Yoga for Uploads

Update `server/graphql/config.ts`:

```typescript
import { GraphQLUpload } from 'graphql-upload'

export default defineGraphQLConfig({
  schema: {
    resolvers: {
      Upload: GraphQLUpload,
    },
  },
})
```

### 4. Create File Storage Utility

Create `server/utils/file-storage.ts`:

```typescript
import type { FileUpload } from 'graphql-upload'
import { randomBytes } from 'node:crypto'
import { createWriteStream, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'

const UPLOAD_DIR = join(process.cwd(), 'uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR)
  }
  catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// Generate unique filename
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = randomBytes(8).toString('hex')
  const ext = originalName.split('.').pop()
  return `${timestamp}-${random}.${ext}`
}

// Validate file
function validateFile(file: FileUpload, maxSize = MAX_FILE_SIZE) {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} is not allowed`)
  }

  // Note: Size validation happens during streaming
}

// Save file to disk
export async function saveFile(
  upload: Promise<FileUpload>
): Promise<{
  filename: string
  mimetype: string
  encoding: string
  size: number
  path: string
}> {
  const file = await upload

  validateFile(file)
  await ensureUploadDir()

  const filename = generateFilename(file.filename)
  const filepath = join(UPLOAD_DIR, filename)

  let size = 0
  const stream = file.createReadStream()

  // Track size while streaming
  stream.on('data', (chunk) => {
    size += chunk.length
    if (size > MAX_FILE_SIZE) {
      stream.destroy(new Error(`File size exceeds ${MAX_FILE_SIZE} bytes`))
    }
  })

  try {
    await pipeline(stream, createWriteStream(filepath))
  }
  catch (error) {
    // Clean up partial file
    try {
      await fs.unlink(filepath)
    }
    catch {}
    throw error
  }

  return {
    filename,
    mimetype: file.mimetype,
    encoding: file.encoding,
    size,
    path: filepath,
  }
}

// Delete file from disk
export async function deleteFile(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath)
  }
  catch (error) {
    console.error('Failed to delete file:', error)
  }
}

// Get public URL for file
export function getFileUrl(filename: string): string {
  // In production, this would be your CDN URL
  return `/uploads/${filename}`
}
```

### 5. Create Upload Resolvers

Create `server/graphql/upload/upload.resolver.ts`:

```typescript
import type { FileUpload } from 'graphql-upload'
import { GraphQLError } from 'graphql'
import { deleteFile, getFileUrl, saveFile } from '../../utils/file-storage'

export const uploadResolvers = defineResolver({
  Mutation: {
    uploadFile: async (_parent, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      try {
        const { filename, mimetype, encoding, size, path } = await saveFile(
          input.file
        )

        // Save file metadata to database
        const file = await context.db.file.create({
          data: {
            filename,
            mimetype,
            encoding,
            size,
            path,
            url: getFileUrl(filename),
            description: input.description,
            uploadedBy: context.user.id,
          },
        })

        return file
      }
      catch (error) {
        throw new GraphQLError(`Upload failed: ${error.message}`, {
          extensions: { code: 'UPLOAD_ERROR' },
        })
      }
    },

    uploadFiles: async (_parent, { files }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const results = []

      for (const filePromise of files) {
        try {
          const { filename, mimetype, encoding, size, path } = await saveFile(
            filePromise
          )

          const file = await context.db.file.create({
            data: {
              filename,
              mimetype,
              encoding,
              size,
              path,
              url: getFileUrl(filename),
              uploadedBy: context.user.id,
            },
          })

          results.push(file)
        }
        catch (error) {
          console.error('File upload failed:', error)
          // Continue with other files
        }
      }

      return results
    },

    updateAvatar: async (_parent, { file }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      try {
        const { filename, mimetype, size, path } = await saveFile(file)

        // Validate it's an image
        if (!mimetype.startsWith('image/')) {
          await deleteFile(path)
          throw new GraphQLError('File must be an image', {
            extensions: { code: 'INVALID_FILE_TYPE' },
          })
        }

        // Delete old avatar if exists
        const currentUser = await context.db.user.findUnique({
          where: { id: context.user.id },
          select: { avatar: true },
        })

        if (currentUser?.avatar) {
          // Delete old file
          await deleteFile(currentUser.avatar)
        }

        // Update user avatar
        const user = await context.db.user.update({
          where: { id: context.user.id },
          data: {
            avatar: getFileUrl(filename),
          },
        })

        return user
      }
      catch (error) {
        throw new GraphQLError(`Avatar upload failed: ${error.message}`, {
          extensions: { code: 'UPLOAD_ERROR' },
        })
      }
    },

    deleteFile: async (_parent, { id }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const file = await context.db.file.findUnique({
        where: { id },
      })

      if (!file) {
        throw new GraphQLError('File not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check ownership or admin
      if (file.uploadedBy !== context.user.id && context.user.role !== 'ADMIN') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN' },
        })
      }

      // Delete file from disk
      await deleteFile(file.path)

      // Delete from database
      await context.db.file.delete({
        where: { id },
      })

      return true
    },
  },
})
```

## Image Processing

### 1. Install Sharp

```bash
pnpm add sharp
```

### 2. Create Image Processing Utility

Create `server/utils/image-processing.ts`:

```typescript
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

export interface ImageVariant {
  name: string
  width: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill'
}

const VARIANTS: ImageVariant[] = [
  { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
  { name: 'small', width: 400 },
  { name: 'medium', width: 800 },
  { name: 'large', width: 1200 },
]

// Process and resize image
export async function processImage(
  inputPath: string,
  outputDir: string
): Promise<Record<string, string>> {
  await fs.mkdir(outputDir, { recursive: true })

  const variants: Record<string, string> = {}

  for (const variant of VARIANTS) {
    const outputFilename = `${variant.name}-${Date.now()}.webp`
    const outputPath = join(outputDir, outputFilename)

    await sharp(inputPath)
      .resize(variant.width, variant.height, {
        fit: variant.fit || 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(outputPath)

    variants[variant.name] = outputPath
  }

  return variants
}

// Generate thumbnail
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  size = 150
): Promise<void> {
  await sharp(inputPath)
    .resize(size, size, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(outputPath)
}

// Optimize image
export async function optimizeImage(inputPath: string): Promise<void> {
  const buffer = await sharp(inputPath)
    .webp({ quality: 85 })
    .toBuffer()

  await fs.writeFile(inputPath, buffer)
}
```

## AWS S3 Integration

### 1. Install AWS SDK

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Create S3 Utility

Create `server/utils/s3.ts`:

```typescript
import { randomBytes } from 'node:crypto'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET!

// Upload file to S3
export async function uploadToS3(
  buffer: Buffer,
  mimetype: string,
  originalFilename: string
): Promise<{ key: string, url: string }> {
  const ext = originalFilename.split('.').pop()
  const key = `uploads/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      // Make public readable
      ACL: 'public-read',
    })
  )

  const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`

  return { key, url }
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  )
}

// Generate presigned URL for upload
export async function generatePresignedUploadUrl(
  filename: string,
  mimetype: string,
  expiresIn = 3600
): Promise<{ url: string, key: string }> {
  const ext = filename.split('.').pop()
  const key = `uploads/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimetype,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn })

  return { url, key }
}

// Generate presigned URL for download
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}
```

### 3. S3 Upload Resolver

```typescript
export const s3UploadResolvers = defineResolver({
  Mutation: {
    uploadToS3: async (_parent, { file }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const upload = await file
      const stream = upload.createReadStream()

      // Convert stream to buffer
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)

      // Upload to S3
      const { key, url } = await uploadToS3(
        buffer,
        upload.mimetype,
        upload.filename
      )

      // Save metadata to database
      const fileRecord = await context.db.file.create({
        data: {
          filename: upload.filename,
          mimetype: upload.mimetype,
          encoding: upload.encoding,
          size: buffer.length,
          url,
          s3Key: key,
          uploadedBy: context.user.id,
        },
      })

      return fileRecord
    },

    getPresignedUploadUrl: async (_parent, { filename, mimetype }, context) => {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const { url, key } = await generatePresignedUploadUrl(filename, mimetype)

      return {
        uploadUrl: url,
        key,
        expiresIn: 3600,
      }
    },
  },
})
```

## Client-Side Implementation

### 1. Upload Mutation

Create `app/graphql/default/mutations.graphql`:

```graphql
mutation UploadFile($input: UploadFileInput!) {
  uploadFile(input: $input) {
    id
    filename
    url
    size
    mimetype
  }
}

mutation UploadFiles($files: [Upload!]!) {
  uploadFiles(files: $files) {
    id
    filename
    url
  }
}

mutation UpdateAvatar($file: Upload!) {
  updateAvatar(file: $file) {
    id
    avatar
  }
}
```

### 2. Vue Upload Component

Create `app/components/FileUpload.vue`:

```vue
<template>
  <div class="file-upload">
    <input
      ref="fileInput"
      type="file"
      :multiple="multiple"
      :accept="accept"
      @change="handleFileChange"
      hidden
    />

    <button
      @click="fileInput?.click()"
      :disabled="uploading"
      class="upload-button"
    >
      {{ uploading ? 'Uploading...' : 'Choose File' }}
    </button>

    <div v-if="uploadedFiles.length > 0" class="uploaded-files">
      <div
        v-for="file in uploadedFiles"
        :key="file.id"
        class="file-item"
      >
        <img v-if="file.mimetype.startsWith('image/')" :src="file.url" />
        <span>{{ file.filename }}</span>
        <span>{{ formatSize(file.size) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  multiple?: boolean
  accept?: string
}>()

const emit = defineEmits<{
  uploaded: [files: any[]]
}>()

const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const uploadedFiles = ref<any[]>([])

async function handleFileChange(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files || files.length === 0) return

  uploading.value = true

  try {
    if (props.multiple) {
      const { data } = await useGraphQL('UploadFiles', {
        files: Array.from(files),
      })

      if (data?.uploadFiles) {
        uploadedFiles.value = data.uploadFiles
        emit('uploaded', data.uploadFiles)
      }
    } else {
      const { data } = await useGraphQL('UploadFile', {
        input: {
          file: files[0],
        },
      })

      if (data?.uploadFile) {
        uploadedFiles.value = [data.uploadFile]
        emit('uploaded', [data.uploadFile])
      }
    }
  } catch (error) {
    console.error('Upload failed:', error)
    alert('Upload failed')
  } finally {
    uploading.value = false
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>
```

## Security Best Practices

### 1. File Validation

```typescript
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function validateFile(file: FileUpload) {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    throw new Error('Invalid file type')
  }
}
```

### 2. Virus Scanning

```typescript
import { scanFile } from './virus-scanner'

async function validateFileContent(filepath: string) {
  const isSafe = await scanFile(filepath)
  if (!isSafe) {
    await deleteFile(filepath)
    throw new Error('File failed security scan')
  }
}
```

### 3. Rate Limiting

Use the rate limiting directive (see [Rate Limiting recipe](./rate-limiting.md)):

```graphql
extend type Mutation {
  uploadFile(input: UploadFileInput!): File! @rateLimit(limit: 10, window: 60)
}
```

## Related Recipes

- [Authentication](./authentication.md) - Protecting upload endpoints
- [Authorization](./authorization.md) - File access control
- [Rate Limiting](./rate-limiting.md) - Preventing abuse

## References

- [GraphQL Upload Spec](https://github.com/jaydenseric/graphql-upload)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [AWS S3 SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
