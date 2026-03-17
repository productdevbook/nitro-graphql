/**
 * Directive parser utilities
 * AST-based parsing for GraphQL directive definitions using oxc-parser
 */

import { parseSync } from 'oxc-parser'

// ============ OXC AST NODE TYPES ============

/** Minimal oxc-parser AST node shape for the fields we actually access */
interface OxcNode {
  type: string
  callee?: OxcNode
  name?: string
  arguments?: OxcNode[]
  properties?: OxcProperty[]
  elements?: OxcNode[]
  value?: string | number | boolean | null
  [key: string]: unknown
}

interface OxcProperty {
  type: string
  key?: OxcNode
  value?: OxcNode
}

// ============ PARSED DIRECTIVE TYPE ============

export interface ParsedDirective {
  name: string
  locations: string[]
  args?: Record<string, { type: string, defaultValue?: string | number | boolean | null }>
  description?: string
  isRepeatable?: boolean
}

// ============ AST EXTRACTION HELPERS ============

function extractStringLiteral(node: OxcNode | undefined): string | undefined {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value
  }
  return undefined
}

function extractBooleanLiteral(node: OxcNode | undefined): boolean | undefined {
  if (node?.type === 'Literal' && typeof node.value === 'boolean') {
    return node.value
  }
  return undefined
}

function extractLiteralValue(node: OxcNode | undefined): string | number | boolean | null | undefined {
  if (node?.type === 'Literal') {
    return node.value ?? undefined
  }
  return undefined
}

function extractStringArray(node: OxcNode | undefined): string[] {
  if (node?.type !== 'ArrayExpression')
    return []

  return (node.elements || [])
    .filter((el): el is OxcNode => el?.type === 'Literal' && typeof el.value === 'string')
    .map(el => el.value as string)
}

function extractArgConfig(node: OxcNode | undefined): { type: string, defaultValue?: string | number | boolean | null } | null {
  if (node?.type !== 'ObjectExpression')
    return null

  let type = 'String'
  let defaultValue: string | number | boolean | null | undefined

  for (const prop of (node.properties || []) as OxcProperty[]) {
    if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
      continue

    switch (prop.key.name) {
      case 'type': {
        const typeValue = extractStringLiteral(prop.value as OxcNode | undefined)
        if (typeValue)
          type = typeValue
        break
      }
      case 'defaultValue':
        defaultValue = extractLiteralValue(prop.value as OxcNode | undefined)
        break
    }
  }

  return { type, ...(defaultValue !== undefined && { defaultValue }) }
}

function extractArgsObject(node: OxcNode | undefined): Record<string, { type: string, defaultValue?: string | number | boolean | null }> {
  if (node?.type !== 'ObjectExpression')
    return {}

  const args: Record<string, { type: string, defaultValue?: string | number | boolean | null }> = {}

  for (const prop of (node.properties || []) as OxcProperty[]) {
    if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
      continue

    const argConfig = extractArgConfig(prop.value as OxcNode | undefined)
    if (argConfig) {
      args[prop.key.name!] = argConfig
    }
  }

  return args
}

function extractDirectiveFromObject(objNode: OxcNode): ParsedDirective | null {
  let name = ''
  let locations: string[] = []
  let args: Record<string, { type: string, defaultValue?: string | number | boolean | null }> = {}
  let description: string | undefined
  let isRepeatable: boolean | undefined

  for (const prop of (objNode.properties || []) as OxcProperty[]) {
    if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
      continue

    switch (prop.key.name) {
      case 'name':
        name = extractStringLiteral(prop.value as OxcNode | undefined) || ''
        break
      case 'locations':
        locations = extractStringArray(prop.value as OxcNode | undefined)
        break
      case 'args':
        args = extractArgsObject(prop.value as OxcNode | undefined)
        break
      case 'description':
        description = extractStringLiteral(prop.value as OxcNode | undefined)
        break
      case 'isRepeatable':
        isRepeatable = extractBooleanLiteral(prop.value as OxcNode | undefined)
        break
    }
  }

  return name && locations.length > 0
    ? { name, locations, args, description, isRepeatable }
    : null
}

// ============ AST TRAVERSAL ============

function traverse(node: unknown, visitor: (node: OxcNode) => void): void {
  if (!node || typeof node !== 'object')
    return

  visitor(node as OxcNode)

  for (const key in node as Record<string, unknown>) {
    const child = (node as Record<string, unknown>)[key]
    if (Array.isArray(child)) {
      child.forEach(item => traverse(item, visitor))
    }
    else if (child && typeof child === 'object') {
      traverse(child, visitor)
    }
  }
}

function isDefineDirectiveCall(node: OxcNode): boolean {
  return (
    node.type === 'CallExpression'
    && node.callee?.type === 'Identifier'
    && node.callee.name === 'defineDirective'
    && (node.arguments?.length ?? 0) > 0
  )
}

// ============ PUBLIC API ============

/**
 * Parse directives from a TypeScript/JavaScript file
 */
export function parseDirectivesFromFile(fileContent: string, filePath: string): ParsedDirective[] {
  try {
    const result = parseSync(filePath, fileContent, {
      lang: filePath.endsWith('.ts') ? 'ts' : 'js',
      sourceType: 'module',
      astType: 'ts',
    })

    if (result.errors.length > 0) {
      return []
    }

    const directives: ParsedDirective[] = []

    traverse(result.program, (node: OxcNode) => {
      if (isDefineDirectiveCall(node)) {
        const arg = node.arguments![0] as OxcNode
        if (arg?.type === 'ObjectExpression') {
          const directive = extractDirectiveFromObject(arg)
          if (directive) {
            directives.push(directive)
          }
        }
      }
    })

    return directives
  }
  catch {
    return []
  }
}

/**
 * Generate GraphQL directive schema from parsed directive
 */
export function generateDirectiveSchema(directive: ParsedDirective): string {
  let args = ''
  if (directive.args && Object.keys(directive.args).length > 0) {
    const argDefs = Object.entries(directive.args).map(([name, arg]) => {
      let defaultValue = ''
      if (arg.defaultValue !== undefined) {
        if (typeof arg.defaultValue === 'string') {
          defaultValue = ` = "${arg.defaultValue}"`
        }
        else {
          defaultValue = ` = ${arg.defaultValue}`
        }
      }
      return `${name}: ${arg.type}${defaultValue}`
    })
    args = `(${argDefs.join(', ')})`
  }

  const locations = directive.locations.join(' | ')
  return `directive @${directive.name}${args} on ${locations}`
}

/**
 * Directive file reference
 * Can be either { fullPath } or { specifier } (for GenImport compatibility)
 */
export type DirectiveFileRef = { fullPath: string } | { specifier: string }

function getFilePath(ref: DirectiveFileRef): string {
  return 'fullPath' in ref ? ref.fullPath : ref.specifier
}

/**
 * Generate GraphQL schema content from directive files
 * Parses each file, extracts defineDirective calls, and produces SDL
 */
export async function generateDirectiveSchemas(
  directives: DirectiveFileRef[],
  buildDir?: string,
): Promise<string | null> {
  if (directives.length === 0) {
    return null
  }

  const fs = await import('node:fs')
  const path = await import('pathe')

  const allParsedDirectives: ParsedDirective[] = []

  for (const directive of directives) {
    try {
      const filePath = getFilePath(directive)
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = parseDirectivesFromFile(content, filePath)
      allParsedDirectives.push(...parsed)
    }
    catch {
      // Continue on parse errors
    }
  }

  if (allParsedDirectives.length === 0) {
    return null
  }

  // Deduplicate by directive name (first definition wins - local takes precedence over extends)
  const uniqueDirectives = allParsedDirectives.filter((directive, index, self) =>
    index === self.findIndex(d => d.name === directive.name),
  )

  const schemaContent = uniqueDirectives
    .map(d => generateDirectiveSchema(d))
    .join('\n\n')

  // Write to .graphql/directives.graphql if buildDir provided
  if (buildDir) {
    const directivesPath = path.join(buildDir, 'directives.graphql')
    fs.mkdirSync(buildDir, { recursive: true })

    // Only write if content changed
    const existingContent = fs.existsSync(directivesPath)
      ? fs.readFileSync(directivesPath, 'utf-8')
      : null
    if (existingContent !== schemaContent) {
      fs.writeFileSync(directivesPath, schemaContent, 'utf-8')
    }
  }

  return schemaContent
}
