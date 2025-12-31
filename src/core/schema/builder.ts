/**
 * Schema builder utilities
 * Shared logic for creating merged GraphQL schemas
 */

import type { GraphQLSchema } from 'graphql'
import type { DirectiveDefinition } from '../types/define'
import { readFileSync } from 'node:fs'
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { consola } from 'consola'
import { buildSchema, parse, print } from 'graphql'
import { loadFederationSupport, warnFederationUnavailable } from './federation'

/**
 * Schema definition from virtual module
 */
export interface SchemaDefinition {
  def: string
}

/**
 * Resolver definition from virtual module
 */
export interface ResolverDefinition {
  resolver: Record<string, unknown>
}

/**
 * Directive wrapper from virtual module
 */
export interface DirectiveWrapper {
  directive: DirectiveDefinition
}

/**
 * Module configuration for federation
 */
export interface ModuleConfig {
  federation?: {
    enabled?: boolean
    serviceName?: string
  }
}

/**
 * Options for creating a merged schema
 */
export interface CreateMergedSchemaOptions {
  schemas: SchemaDefinition[]
  resolvers: ResolverDefinition[]
  directives?: DirectiveWrapper[]
  moduleConfig: ModuleConfig
}

/**
 * Create a merged GraphQL schema from schemas, resolvers, and directives
 * Supports Apollo Federation when enabled
 */
export async function createMergedSchema(options: CreateMergedSchemaOptions): Promise<GraphQLSchema> {
  const { schemas, resolvers, directives, moduleConfig } = options

  try {
    const mergedSchemas = schemas.map(schema => schema.def).join('\n\n')
    const typeDefs = mergeTypeDefs([mergedSchemas], {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })
    const mergedResolvers = mergeResolvers(resolvers.map(r => r.resolver) as Parameters<typeof mergeResolvers>[0])

    // Check if federation is enabled via config
    const federationEnabled = moduleConfig.federation?.enabled

    let schema: GraphQLSchema

    if (federationEnabled) {
      // Load federation support dynamically
      const buildSubgraph = await loadFederationSupport()

      if (buildSubgraph) {
        // Use Apollo Federation buildSubgraphSchema
        // buildSubgraphSchema requires DocumentNode, convert string if needed
        const typeDefsDoc = typeof typeDefs === 'string' ? parse(typeDefs) : typeDefs

        schema = buildSubgraph({
          typeDefs: typeDefsDoc,
          resolvers: mergedResolvers,
        })
      }
      else {
        warnFederationUnavailable()
        schema = makeExecutableSchema({
          typeDefs,
          resolvers: mergedResolvers,
        })
      }
    }
    else {
      // Use regular schema builder
      schema = makeExecutableSchema({
        typeDefs,
        resolvers: mergedResolvers,
      })
    }

    // Apply directives if any
    if (directives && directives.length > 0) {
      for (const { directive } of directives) {
        if (directive.transformer) {
          schema = directive.transformer(schema)
        }
      }
    }

    return schema
  }
  catch (error) {
    consola.error('Schema merge error:', error)
    throw error
  }
}

/**
 * Build a GraphQL schema from file paths (CLI usage)
 * Reads schema files, merges them, and builds an executable schema
 */
export async function buildGraphQLSchema(schemaPaths: string[]): Promise<GraphQLSchema | null> {
  if (schemaPaths.length === 0) {
    return null
  }

  try {
    const schemaContents = schemaPaths.map(path => readFileSync(path, 'utf-8'))
    const mergedTypeDefs = mergeTypeDefs(schemaContents, {
      throwOnConflict: true,
      commentDescriptions: true,
      sort: true,
    })

    // Build schema without resolvers for type generation
    const schemaString = typeof mergedTypeDefs === 'string'
      ? mergedTypeDefs
      : print(mergedTypeDefs)

    return buildSchema(schemaString)
  }
  catch (error) {
    consola.error('Failed to build GraphQL schema:', error)
    return null
  }
}
