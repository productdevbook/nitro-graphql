# Social Media GraphQL API

This example demonstrates a complete social media GraphQL API with posts, comments, likes, follows, notifications, and real-time subscriptions. Perfect for building social platforms, community apps, or content-sharing applications.

## Features Demonstrated

- User profiles and authentication
- Post creation with media uploads
- Comments and nested replies
- Like/unlike functionality
- Follow/unfollow users
- Activity feed with pagination
- Real-time subscriptions (GraphQL Subscriptions)
- Notifications system
- Search and discovery
- Hashtags and mentions
- Type-safe resolvers

## Domain Model

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    User     │──────│    Post     │──────│   Comment   │
└─────────────┘      └─────────────┘      └─────────────┘
      │                     │                     │
      │                     │                     │
      │              ┌─────────────┐       ┌─────────────┐
      └──────────────│    Like     │───────│   Reply     │
                     └─────────────┘       └─────────────┘

┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    User     │──────│   Follow    │──────│Notification │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Project Structure

```
social-api/
├── server/
│   ├── graphql/
│   │   ├── schema.graphql
│   │   ├── context.ts
│   │   ├── data/
│   │   │   └── index.ts            # Mock database
│   │   ├── users/
│   │   │   ├── user.graphql
│   │   │   └── user.resolver.ts
│   │   ├── posts/
│   │   │   ├── post.graphql
│   │   │   └── post.resolver.ts
│   │   ├── comments/
│   │   │   ├── comment.graphql
│   │   │   └── comment.resolver.ts
│   │   ├── likes/
│   │   │   ├── like.graphql
│   │   │   └── like.resolver.ts
│   │   ├── follows/
│   │   │   ├── follow.graphql
│   │   │   └── follow.resolver.ts
│   │   └── notifications/
│   │       ├── notification.graphql
│   │       └── notification.resolver.ts
│   └── utils/
│       ├── auth.ts
│       └── subscriptions.ts
├── nitro.config.ts
└── package.json
```

## GraphQL Schema

### server/graphql/schema.graphql

```graphql
scalar DateTime
scalar Upload

type Query {
  _empty: String
}

type Mutation {
  _empty: String
}

type Subscription {
  _empty: String
}
```

### server/graphql/users/user.graphql

```graphql
type User {
  id: ID!
  username: String!
  email: String!
  displayName: String!
  bio: String
  avatar: String
  coverImage: String
  website: String
  location: String
  verified: Boolean!

  # Relationships
  posts(limit: Int = 20, offset: Int = 0): [Post!]!
  followers(limit: Int = 20): [User!]!
  following(limit: Int = 20): [User!]!

  # Counts
  postCount: Int!
  followerCount: Int!
  followingCount: Int!

  # Current user relationship
  isFollowing: Boolean!
  isFollowedBy: Boolean!

  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateUserInput {
  username: String!
  email: String!
  password: String!
  displayName: String!
}

input UpdateProfileInput {
  displayName: String
  bio: String
  avatar: String
  coverImage: String
  website: String
  location: String
}

extend type Query {
  user(id: ID, username: String): User
  users(search: String, limit: Int = 20, offset: Int = 0): [User!]!
  me: User
  searchUsers(query: String!, limit: Int = 20): [User!]!
  suggestedUsers(limit: Int = 10): [User!]!
}

extend type Mutation {
  register(input: CreateUserInput!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!
  updateProfile(input: UpdateProfileInput!): User!
  uploadAvatar(file: Upload!): User!
}

type AuthPayload {
  token: String!
  user: User!
}
```

### server/graphql/posts/post.graphql

```graphql
type Post {
  id: ID!
  author: User!
  content: String!
  media: [MediaItem!]!
  hashtags: [String!]!
  mentions: [User!]!

  # Interactions
  likes: [Like!]!
  comments(limit: Int = 20, offset: Int = 0): [Comment!]!
  shares: [Share!]!

  # Counts
  likeCount: Int!
  commentCount: Int!
  shareCount: Int!
  viewCount: Int!

  # Current user interaction
  isLiked: Boolean!
  isBookmarked: Boolean!

  # Privacy
  visibility: PostVisibility!

  createdAt: DateTime!
  updatedAt: DateTime!
}

type MediaItem {
  id: ID!
  type: MediaType!
  url: String!
  thumbnail: String
  width: Int
  height: Int
  duration: Int
  alt: String
}

enum MediaType {
  IMAGE
  VIDEO
  GIF
}

enum PostVisibility {
  PUBLIC
  FOLLOWERS
  PRIVATE
}

input CreatePostInput {
  content: String!
  media: [Upload!]
  visibility: PostVisibility = PUBLIC
}

input UpdatePostInput {
  content: String
  visibility: PostVisibility
}

extend type Query {
  post(id: ID!): Post
  posts(
    userId: ID
    hashtag: String
    limit: Int = 20
    offset: Int = 0
  ): [Post!]!
  feed(limit: Int = 20, offset: Int = 0): [Post!]!
  trending(limit: Int = 10): [Post!]!
}

extend type Mutation {
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
  sharePost(postId: ID!, content: String): Post!
}

extend type Subscription {
  postCreated(userId: ID): Post!
  postUpdated(postId: ID!): Post!
  postDeleted: ID!
}

type Share {
  id: ID!
  user: User!
  post: Post!
  content: String
  createdAt: DateTime!
}
```

### server/graphql/comments/comment.graphql

```graphql
type Comment {
  id: ID!
  post: Post!
  author: User!
  content: String!
  parent: Comment
  replies(limit: Int = 10): [Comment!]!

  # Interactions
  likes: [Like!]!
  likeCount: Int!
  isLiked: Boolean!

  replyCount: Int!

  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateCommentInput {
  postId: ID!
  content: String!
  parentId: ID
}

input UpdateCommentInput {
  content: String!
}

extend type Query {
  comment(id: ID!): Comment
  comments(postId: ID!, limit: Int = 20, offset: Int = 0): [Comment!]!
}

extend type Mutation {
  createComment(input: CreateCommentInput!): Comment!
  updateComment(id: ID!, input: UpdateCommentInput!): Comment!
  deleteComment(id: ID!): Boolean!
}

extend type Subscription {
  commentCreated(postId: ID!): Comment!
}
```

### server/graphql/likes/like.graphql

```graphql
type Like {
  id: ID!
  user: User!
  target: LikeTarget!
  targetId: ID!
  createdAt: DateTime!
}

union LikeTarget = Post | Comment

extend type Mutation {
  likePost(postId: ID!): Post!
  unlikePost(postId: ID!): Post!
  likeComment(commentId: ID!): Comment!
  unlikeComment(commentId: ID!): Comment!
}

extend type Subscription {
  likeAdded(postId: ID): Like!
}
```

### server/graphql/follows/follow.graphql

```graphql
type Follow {
  id: ID!
  follower: User!
  following: User!
  createdAt: DateTime!
}

extend type Mutation {
  followUser(userId: ID!): User!
  unfollowUser(userId: ID!): User!
}

extend type Subscription {
  userFollowed(userId: ID!): Follow!
}
```

### server/graphql/notifications/notification.graphql

```graphql
type Notification {
  id: ID!
  recipient: User!
  actor: User!
  type: NotificationType!
  target: NotificationTarget
  targetId: ID
  message: String!
  read: Boolean!
  createdAt: DateTime!
}

enum NotificationType {
  FOLLOW
  LIKE_POST
  LIKE_COMMENT
  COMMENT
  REPLY
  MENTION
  SHARE
}

union NotificationTarget = Post | Comment | User

extend type Query {
  notifications(limit: Int = 20, offset: Int = 0): [Notification!]!
  unreadNotificationCount: Int!
}

extend type Mutation {
  markNotificationAsRead(id: ID!): Notification!
  markAllNotificationsAsRead: Boolean!
  deleteNotification(id: ID!): Boolean!
}

extend type Subscription {
  notificationReceived: Notification!
}
```

## Resolvers

### server/graphql/data/index.ts

```typescript
import type { User, Post, Comment, Like, Follow, Notification } from '#graphql/server'

// Mock data stores
export const users: User[] = [
  {
    id: '1',
    username: 'john_doe',
    email: 'john@example.com',
    displayName: 'John Doe',
    bio: 'Software developer and coffee enthusiast',
    avatar: 'https://i.pravatar.cc/150?img=1',
    coverImage: null,
    website: 'https://johndoe.com',
    location: 'San Francisco, CA',
    verified: false,
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    username: 'jane_smith',
    email: 'jane@example.com',
    displayName: 'Jane Smith',
    bio: 'Designer | Traveler | Dog lover',
    avatar: 'https://i.pravatar.cc/150?img=5',
    coverImage: null,
    website: null,
    location: 'New York, NY',
    verified: true,
    postCount: 0,
    followerCount: 0,
    followingCount: 0,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
]

export const posts: Post[] = []
export const comments: Comment[] = []
export const likes: Like[] = []
export const follows: Follow[] = []
export const notifications: Notification[] = []

// Utility functions
export const generateId = () => Date.now().toString()

export const findById = <T extends { id: string }>(
  items: T[],
  id: string
): T | undefined => items.find(item => item.id === id)

export const extractHashtags = (content: string): string[] => {
  const regex = /#[\w]+/g
  const matches = content.match(regex)
  return matches ? matches.map(tag => tag.slice(1)) : []
}

export const extractMentions = (content: string): string[] => {
  const regex = /@[\w]+/g
  const matches = content.match(regex)
  return matches ? matches.map(mention => mention.slice(1)) : []
}

// Subscription pub/sub (mock implementation)
const subscribers = new Map<string, Set<Function>>()

export const pubsub = {
  publish: (channel: string, payload: any) => {
    const subs = subscribers.get(channel)
    if (subs) {
      subs.forEach(fn => fn(payload))
    }
  },
  subscribe: (channel: string, callback: Function) => {
    if (!subscribers.has(channel)) {
      subscribers.set(channel, new Set())
    }
    subscribers.get(channel)!.add(callback)

    return () => {
      subscribers.get(channel)?.delete(callback)
    }
  },
}
```

### server/graphql/posts/post.resolver.ts

```typescript
import {
  posts,
  users,
  comments,
  likes,
  follows,
  generateId,
  findById,
  extractHashtags,
  extractMentions,
  pubsub,
} from '../data'

export const postQueries = defineQuery({
  post: (_, { id }) => {
    return findById(posts, id) || null
  },

  posts: (_, { userId, hashtag, limit = 20, offset = 0 }) => {
    let filtered = [...posts]

    if (userId) {
      filtered = filtered.filter(p => p.author.id === userId)
    }

    if (hashtag) {
      filtered = filtered.filter(p => p.hashtags.includes(hashtag))
    }

    return filtered
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)
  },

  feed: (_, { limit = 20, offset = 0 }, context) => {
    const currentUserId = context.user?.id
    if (!currentUserId) {
      // Return public posts for anonymous users
      return posts
        .filter(p => p.visibility === 'PUBLIC')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(offset, offset + limit)
    }

    // Get posts from followed users
    const followingIds = follows
      .filter(f => f.follower.id === currentUserId)
      .map(f => f.following.id)

    return posts
      .filter(
        p =>
          p.author.id === currentUserId ||
          (followingIds.includes(p.author.id) &&
            (p.visibility === 'PUBLIC' || p.visibility === 'FOLLOWERS'))
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)
  },

  trending: (_, { limit = 10 }) => {
    // Simple trending algorithm: most likes + comments in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return posts
      .filter(p => p.createdAt > oneDayAgo && p.visibility === 'PUBLIC')
      .sort(
        (a, b) =>
          b.likeCount + b.commentCount - (a.likeCount + a.commentCount)
      )
      .slice(0, limit)
  },
})

export const postMutations = defineMutation({
  createPost: (_, { input }, context) => {
    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const author = findById(users, currentUser.id)
    if (!author) {
      throw new Error('User not found')
    }

    const hashtags = extractHashtags(input.content)
    const mentionUsernames = extractMentions(input.content)
    const mentions = users.filter(u => mentionUsernames.includes(u.username))

    const newPost = {
      id: generateId(),
      author,
      content: input.content,
      media: [], // Handle media uploads separately
      hashtags,
      mentions,
      likes: [],
      comments: [],
      shares: [],
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      viewCount: 0,
      isLiked: false,
      isBookmarked: false,
      visibility: input.visibility || 'PUBLIC',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    posts.push(newPost)
    author.postCount++

    // Publish to subscribers
    pubsub.publish('POST_CREATED', { postCreated: newPost })

    return newPost
  },

  updatePost: (_, { id, input }, context) => {
    const post = findById(posts, id)
    if (!post) {
      throw new Error(`Post with id ${id} not found`)
    }

    if (post.author.id !== context.user?.id) {
      throw new Error('Not authorized to update this post')
    }

    if (input.content) {
      post.content = input.content
      post.hashtags = extractHashtags(input.content)
      const mentionUsernames = extractMentions(input.content)
      post.mentions = users.filter(u => mentionUsernames.includes(u.username))
    }

    if (input.visibility) {
      post.visibility = input.visibility
    }

    post.updatedAt = new Date()

    // Publish update
    pubsub.publish(`POST_UPDATED_${id}`, { postUpdated: post })

    return post
  },

  deletePost: (_, { id }, context) => {
    const postIndex = posts.findIndex(p => p.id === id)
    if (postIndex === -1) {
      throw new Error(`Post with id ${id} not found`)
    }

    const post = posts[postIndex]
    if (post.author.id !== context.user?.id) {
      throw new Error('Not authorized to delete this post')
    }

    posts.splice(postIndex, 1)
    post.author.postCount--

    // Delete associated comments and likes
    comments.filter(c => c.post.id === id).forEach(c => {
      const idx = comments.indexOf(c)
      comments.splice(idx, 1)
    })

    likes.filter(l => l.targetId === id).forEach(l => {
      const idx = likes.indexOf(l)
      likes.splice(idx, 1)
    })

    // Publish deletion
    pubsub.publish('POST_DELETED', { postDeleted: id })

    return true
  },

  sharePost: (_, { postId, content }, context) => {
    const originalPost = findById(posts, postId)
    if (!originalPost) {
      throw new Error(`Post with id ${postId} not found`)
    }

    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    // Create a new post that references the original
    const shareContent = content || `Shared: ${originalPost.content}`
    const newPost = {
      id: generateId(),
      author: findById(users, currentUser.id)!,
      content: shareContent,
      media: originalPost.media,
      hashtags: extractHashtags(shareContent),
      mentions: [],
      likes: [],
      comments: [],
      shares: [],
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      viewCount: 0,
      isLiked: false,
      isBookmarked: false,
      visibility: 'PUBLIC',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    posts.push(newPost)
    originalPost.shareCount++

    return newPost
  },
})

export const postTypeResolver = defineType({
  Post: {
    isLiked: (post, _, context) => {
      if (!context.user) return false
      return likes.some(
        l => l.targetId === post.id && l.user.id === context.user!.id
      )
    },
  },
})

export const postSubscriptions = {
  postCreated: {
    subscribe: (_, { userId }) => {
      // Return async iterator for subscription
      const channel = userId ? `POST_CREATED_${userId}` : 'POST_CREATED'
      return pubsub.subscribe(channel, payload => payload)
    },
  },
  postUpdated: {
    subscribe: (_, { postId }) => {
      return pubsub.subscribe(`POST_UPDATED_${postId}`, payload => payload)
    },
  },
  postDeleted: {
    subscribe: () => {
      return pubsub.subscribe('POST_DELETED', payload => payload)
    },
  },
}
```

### server/graphql/comments/comment.resolver.ts

```typescript
import { comments, posts, findById, generateId, pubsub } from '../data'

export const commentQueries = defineQuery({
  comment: (_, { id }) => {
    return findById(comments, id) || null
  },

  comments: (_, { postId, limit = 20, offset = 0 }) => {
    return comments
      .filter(c => c.post.id === postId && !c.parent)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit)
  },
})

export const commentMutations = defineMutation({
  createComment: (_, { input }, context) => {
    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const post = findById(posts, input.postId)
    if (!post) {
      throw new Error(`Post with id ${input.postId} not found`)
    }

    const parent = input.parentId ? findById(comments, input.parentId) : null

    const newComment = {
      id: generateId(),
      post,
      author: currentUser,
      content: input.content,
      parent,
      replies: [],
      likes: [],
      likeCount: 0,
      isLiked: false,
      replyCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    comments.push(newComment)
    post.commentCount++

    if (parent) {
      parent.replyCount++
    }

    // Publish to subscribers
    pubsub.publish(`COMMENT_CREATED_${input.postId}`, {
      commentCreated: newComment,
    })

    return newComment
  },

  updateComment: (_, { id, input }, context) => {
    const comment = findById(comments, id)
    if (!comment) {
      throw new Error(`Comment with id ${id} not found`)
    }

    if (comment.author.id !== context.user?.id) {
      throw new Error('Not authorized to update this comment')
    }

    comment.content = input.content
    comment.updatedAt = new Date()

    return comment
  },

  deleteComment: (_, { id }, context) => {
    const commentIndex = comments.findIndex(c => c.id === id)
    if (commentIndex === -1) {
      throw new Error(`Comment with id ${id} not found`)
    }

    const comment = comments[commentIndex]
    if (comment.author.id !== context.user?.id) {
      throw new Error('Not authorized to delete this comment')
    }

    comments.splice(commentIndex, 1)
    comment.post.commentCount--

    if (comment.parent) {
      comment.parent.replyCount--
    }

    return true
  },
})

export const commentTypeResolver = defineType({
  Comment: {
    replies: (comment, { limit = 10 }) => {
      return comments
        .filter(c => c.parent?.id === comment.id)
        .slice(0, limit)
    },
  },
})

export const commentSubscriptions = {
  commentCreated: {
    subscribe: (_, { postId }) => {
      return pubsub.subscribe(`COMMENT_CREATED_${postId}`, payload => payload)
    },
  },
}
```

### server/graphql/likes/like.resolver.ts

```typescript
import { likes, posts, comments, findById, generateId, pubsub } from '../data'

export const likeMutations = defineMutation({
  likePost: (_, { postId }, context) => {
    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const post = findById(posts, postId)
    if (!post) {
      throw new Error(`Post with id ${postId} not found`)
    }

    // Check if already liked
    const existingLike = likes.find(
      l => l.targetId === postId && l.user.id === currentUser.id
    )

    if (existingLike) {
      return post
    }

    const newLike = {
      id: generateId(),
      user: currentUser,
      target: post,
      targetId: postId,
      createdAt: new Date(),
    }

    likes.push(newLike)
    post.likeCount++

    // Publish to subscribers
    pubsub.publish('LIKE_ADDED', { likeAdded: newLike })

    return post
  },

  unlikePost: (_, { postId }, context) => {
    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const post = findById(posts, postId)
    if (!post) {
      throw new Error(`Post with id ${postId} not found`)
    }

    const likeIndex = likes.findIndex(
      l => l.targetId === postId && l.user.id === currentUser.id
    )

    if (likeIndex !== -1) {
      likes.splice(likeIndex, 1)
      post.likeCount--
    }

    return post
  },

  likeComment: (_, { commentId }, context) => {
    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const comment = findById(comments, commentId)
    if (!comment) {
      throw new Error(`Comment with id ${commentId} not found`)
    }

    const existingLike = likes.find(
      l => l.targetId === commentId && l.user.id === currentUser.id
    )

    if (existingLike) {
      return comment
    }

    const newLike = {
      id: generateId(),
      user: currentUser,
      target: comment,
      targetId: commentId,
      createdAt: new Date(),
    }

    likes.push(newLike)
    comment.likeCount++

    return comment
  },

  unlikeComment: (_, { commentId }, context) => {
    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const comment = findById(comments, commentId)
    if (!comment) {
      throw new Error(`Comment with id ${commentId} not found`)
    }

    const likeIndex = likes.findIndex(
      l => l.targetId === commentId && l.user.id === currentUser.id
    )

    if (likeIndex !== -1) {
      likes.splice(likeIndex, 1)
      comment.likeCount--
    }

    return comment
  },
})

export const likeSubscriptions = {
  likeAdded: {
    subscribe: (_, { postId }) => {
      return pubsub.subscribe('LIKE_ADDED', payload => {
        if (!postId || payload.likeAdded.targetId === postId) {
          return payload
        }
      })
    },
  },
}
```

### server/graphql/follows/follow.resolver.ts

```typescript
import { follows, users, notifications, findById, generateId, pubsub } from '../data'

export const followMutations = defineMutation({
  followUser: (_, { userId }, context) => {
    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    if (currentUser.id === userId) {
      throw new Error('Cannot follow yourself')
    }

    const userToFollow = findById(users, userId)
    if (!userToFollow) {
      throw new Error(`User with id ${userId} not found`)
    }

    // Check if already following
    const existingFollow = follows.find(
      f => f.follower.id === currentUser.id && f.following.id === userId
    )

    if (existingFollow) {
      return userToFollow
    }

    const newFollow = {
      id: generateId(),
      follower: currentUser,
      following: userToFollow,
      createdAt: new Date(),
    }

    follows.push(newFollow)
    userToFollow.followerCount++
    currentUser.followingCount++

    // Create notification
    const notification = {
      id: generateId(),
      recipient: userToFollow,
      actor: currentUser,
      type: 'FOLLOW',
      target: null,
      targetId: null,
      message: `${currentUser.displayName} started following you`,
      read: false,
      createdAt: new Date(),
    }
    notifications.push(notification)

    // Publish to subscribers
    pubsub.publish(`USER_FOLLOWED_${userId}`, { userFollowed: newFollow })
    pubsub.publish(`NOTIFICATION_${userId}`, {
      notificationReceived: notification,
    })

    return userToFollow
  },

  unfollowUser: (_, { userId }, context) => {
    const currentUser = context.user
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const userToUnfollow = findById(users, userId)
    if (!userToUnfollow) {
      throw new Error(`User with id ${userId} not found`)
    }

    const followIndex = follows.findIndex(
      f => f.follower.id === currentUser.id && f.following.id === userId
    )

    if (followIndex !== -1) {
      follows.splice(followIndex, 1)
      userToUnfollow.followerCount--
      currentUser.followingCount--
    }

    return userToUnfollow
  },
})

export const followSubscriptions = {
  userFollowed: {
    subscribe: (_, { userId }) => {
      return pubsub.subscribe(`USER_FOLLOWED_${userId}`, payload => payload)
    },
  },
}
```

## Example Queries and Mutations

### User Operations

```graphql
# Register
mutation Register {
  register(input: {
    username: "john_doe"
    email: "john@example.com"
    password: "securepass123"
    displayName: "John Doe"
  }) {
    token
    user {
      id
      username
      displayName
    }
  }
}

# Get user profile
query GetUser($username: String!) {
  user(username: $username) {
    id
    username
    displayName
    bio
    avatar
    followerCount
    followingCount
    postCount
    isFollowing
    posts(limit: 10) {
      id
      content
      createdAt
    }
  }
}

# Update profile
mutation UpdateProfile {
  updateProfile(input: {
    displayName: "John Doe"
    bio: "Software developer"
    location: "San Francisco"
  }) {
    id
    displayName
    bio
  }
}
```

### Posts

```graphql
# Create post
mutation CreatePost {
  createPost(input: {
    content: "Hello world! #firstpost @jane_smith"
    visibility: PUBLIC
  }) {
    id
    content
    hashtags
    mentions {
      username
    }
    createdAt
  }
}

# Get feed
query GetFeed {
  feed(limit: 20) {
    id
    author {
      username
      displayName
      avatar
    }
    content
    likeCount
    commentCount
    isLiked
    createdAt
  }
}

# Get trending posts
query GetTrending {
  trending(limit: 10) {
    id
    content
    author {
      username
      avatar
    }
    likeCount
    commentCount
  }
}
```

### Interactions

```graphql
# Like post
mutation LikePost($postId: ID!) {
  likePost(postId: $postId) {
    id
    likeCount
    isLiked
  }
}

# Comment on post
mutation CreateComment($postId: ID!) {
  createComment(input: {
    postId: $postId
    content: "Great post!"
  }) {
    id
    content
    author {
      username
      avatar
    }
    createdAt
  }
}

# Follow user
mutation FollowUser($userId: ID!) {
  followUser(userId: $userId) {
    id
    username
    isFollowing
    followerCount
  }
}
```

### Subscriptions

```graphql
# Subscribe to new posts
subscription OnPostCreated {
  postCreated {
    id
    content
    author {
      username
      avatar
    }
    createdAt
  }
}

# Subscribe to notifications
subscription OnNotificationReceived {
  notificationReceived {
    id
    type
    actor {
      username
      avatar
    }
    message
    createdAt
  }
}

# Subscribe to new comments on a post
subscription OnCommentCreated($postId: ID!) {
  commentCreated(postId: $postId) {
    id
    content
    author {
      username
      avatar
    }
    createdAt
  }
}
```

## Next Steps

1. **Real-time Features**: Implement full WebSocket support for subscriptions
2. **Media Uploads**: Add Cloudinary or S3 integration for images/videos
3. **Direct Messages**: Add private messaging between users
4. **Stories**: Implement temporary 24-hour stories
5. **Hashtag Trends**: Build trending hashtag system
6. **Search**: Add full-text search with Algolia or Elasticsearch
7. **Moderation**: Content moderation and reporting
8. **Analytics**: Track engagement metrics
9. **Push Notifications**: Mobile push notifications
10. **Content Recommendations**: ML-based content recommendations

## Related Examples

- [Basic Nitro Server](./nitro-basic.md) - Getting started
- [Full-stack Nuxt App](./nuxt-fullstack.md) - Client integration
- [External Services](./external-services.md) - Third-party APIs

## Production Considerations

- Implement proper authentication with JWT/OAuth
- Add rate limiting to prevent abuse
- Use a real database with proper indexes
- Implement caching for feed generation
- Add CDN for media content
- Set up monitoring and logging
- Implement content moderation
- Add backup and disaster recovery
- Scale with read replicas
- Use message queues for async operations
