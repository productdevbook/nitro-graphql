import type { GraphQLSchemaConfig } from './types'

export function defineGraphQLSchema(config: GraphQLSchemaConfig): GraphQLSchemaConfig {
  return config
}

export function defineGraphQLResolver<T = any>(resolver: T): T {
  return resolver
}

export function gql(strings: TemplateStringsArray, ...values: any[]): string {
  let result = ''
  strings.forEach((string, i) => {
    result += string
    if (i < values.length) {
      result += values[i]
    }
  })
  return result
}
