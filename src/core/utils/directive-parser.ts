/**
 * Directive parser utilities
 * AST-based parsing for GraphQL directive definitions
 */

export interface ParsedDirective {
  name: string
  locations: string[]
  args?: Record<string, { type: string, defaultValue?: any }>
  description?: string
  isRepeatable?: boolean
}

/**
 * Clean AST-based directive parser using oxc-parser
 */
export class DirectiveParser {
  private oxc: any

  async init() {
    if (!this.oxc) {
      this.oxc = await import('oxc-parser')
    }
  }

  /**
   * Parse directives from a TypeScript/JavaScript file
   */
  async parseDirectives(fileContent: string, filePath: string): Promise<ParsedDirective[]> {
    await this.init()

    try {
      const result = this.oxc.parseSync(filePath, fileContent, {
        lang: filePath.endsWith('.ts') ? 'ts' : 'js',
        sourceType: 'module',
        astType: 'ts',
      })

      if (result.errors.length > 0) {
        return []
      }

      return this.extractDirectiveDefinitions(result.program)
    }
    catch {
      return []
    }
  }

  /**
   * Extract directive definitions from AST
   */
  private extractDirectiveDefinitions(program: any): ParsedDirective[] {
    const directives: ParsedDirective[] = []

    this.traverse(program, (node: any) => {
      if (this.isDefineDirectiveCall(node)) {
        const directive = this.extractDirectiveFromCall(node)
        if (directive) {
          directives.push(directive)
        }
      }
    })

    return directives
  }

  /**
   * Traverse AST nodes recursively
   */
  private traverse(node: any, visitor: (node: any) => void) {
    if (!node || typeof node !== 'object')
      return

    visitor(node)

    // Traverse child nodes
    for (const key in node) {
      const child = node[key]
      if (Array.isArray(child)) {
        child.forEach(item => this.traverse(item, visitor))
      }
      else if (child && typeof child === 'object') {
        this.traverse(child, visitor)
      }
    }
  }

  /**
   * Check if node is a defineDirective call
   */
  private isDefineDirectiveCall(node: any): boolean {
    return (
      node.type === 'CallExpression'
      && node.callee?.type === 'Identifier'
      && node.callee.name === 'defineDirective'
      && node.arguments?.length > 0
    )
  }

  /**
   * Extract directive configuration from defineDirective call
   */
  private extractDirectiveFromCall(node: any): ParsedDirective | null {
    const arg = node.arguments[0]
    if (arg?.type !== 'ObjectExpression')
      return null

    return this.extractDirectiveFromObject(arg)
  }

  /**
   * Extract directive properties from object expression
   */
  private extractDirectiveFromObject(objNode: any): ParsedDirective | null {
    let name = ''
    let locations: string[] = []
    let args: Record<string, { type: string, defaultValue?: any }> = {}
    let description: string | undefined
    let isRepeatable: boolean | undefined

    for (const prop of objNode.properties || []) {
      if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
        continue

      switch (prop.key.name) {
        case 'name':
          name = this.extractStringLiteral(prop.value) || ''
          break
        case 'locations':
          locations = this.extractStringArray(prop.value)
          break
        case 'args':
          args = this.extractArgsObject(prop.value)
          break
        case 'description':
          description = this.extractStringLiteral(prop.value)
          break
        case 'isRepeatable':
          isRepeatable = this.extractBooleanLiteral(prop.value)
          break
      }
    }

    return name && locations.length > 0
      ? { name, locations, args, description, isRepeatable }
      : null
  }

  /**
   * Extract string literal value
   */
  private extractStringLiteral(node: any): string | undefined {
    if (node?.type === 'Literal' && typeof node.value === 'string') {
      return node.value
    }
    return undefined
  }

  /**
   * Extract boolean literal value
   */
  private extractBooleanLiteral(node: any): boolean | undefined {
    if (node?.type === 'Literal' && typeof node.value === 'boolean') {
      return node.value
    }
    return undefined
  }

  /**
   * Extract array of strings
   */
  private extractStringArray(node: any): string[] {
    if (node?.type !== 'ArrayExpression')
      return []

    return (node.elements || [])
      .filter((el: any) => el?.type === 'Literal' && typeof el.value === 'string')
      .map((el: any) => el.value)
  }

  /**
   * Extract arguments object
   */
  private extractArgsObject(node: any): Record<string, { type: string, defaultValue?: any }> {
    if (node?.type !== 'ObjectExpression')
      return {}

    const args: Record<string, { type: string, defaultValue?: any }> = {}

    for (const prop of node.properties || []) {
      if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
        continue

      const argName = prop.key.name
      const argConfig = this.extractArgConfig(prop.value)

      if (argConfig) {
        args[argName] = argConfig
      }
    }

    return args
  }

  /**
   * Extract argument configuration
   */
  private extractArgConfig(node: any): { type: string, defaultValue?: any } | null {
    if (node?.type !== 'ObjectExpression')
      return null

    let type = 'String'
    let defaultValue: any

    for (const prop of node.properties || []) {
      if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
        continue

      switch (prop.key.name) {
        case 'type': {
          const typeValue = this.extractStringLiteral(prop.value)
          if (typeValue)
            type = typeValue
          break
        }
        case 'defaultValue':
          defaultValue = this.extractLiteralValue(prop.value)
          break
      }
    }

    return { type, ...(defaultValue !== undefined && { defaultValue }) }
  }

  /**
   * Extract literal value (string, number, boolean)
   */
  private extractLiteralValue(node: { type?: string, value?: string | number | boolean | null } | null | undefined): string | number | boolean | null | undefined {
    if (node?.type === 'Literal') {
      return node.value
    }
    return undefined
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

/**
 * Get the file path from a directive reference
 */
function getFilePath(ref: DirectiveFileRef): string {
  return 'fullPath' in ref ? ref.fullPath : ref.specifier
}

/**
 * Singleton instance for reuse
 */
export const directiveParser = new DirectiveParser()

/**
 * Generate GraphQL schemas from an array of parsed directives
 */
export async function generateDirectiveSchemas(
  nitro: { graphql: { buildDir: string } },
  directives: DirectiveFileRef[],
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
      const parsed = await directiveParser.parseDirectives(content, filePath)
      allParsedDirectives.push(...parsed)
    }
    catch {
      // Continue on parse errors
    }
  }

  if (allParsedDirectives.length === 0) {
    return null
  }

  const schemaContent = allParsedDirectives
    .map(d => generateDirectiveSchema(d))
    .join('\n\n')

  const directivesPath = path.join(nitro.graphql.buildDir, '_directives.graphql')
  fs.mkdirSync(path.dirname(directivesPath), { recursive: true })
  fs.writeFileSync(directivesPath, schemaContent, 'utf-8')

  return directivesPath
}
