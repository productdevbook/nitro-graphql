import { debugInfo } from '#nitro-graphql/debug-info'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { defineEventHandler, getQuery } from 'nitro/h3'
import { generateDebugHtml } from '../../core/debug/template'

/**
 * Debug endpoint for inspecting virtual modules and GraphQL setup
 * Only available in development mode
 *
 * Routes:
 * - /_nitro/graphql/debug - HTML dashboard
 * - /_nitro/graphql/debug?format=json - JSON API
 */
export default defineEventHandler(async (event) => {
  // Runtime safety: prevent accidental exposure in production
  if (import.meta.env?.PROD || process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 })
  }

  const query = getQuery(event)
  const format = query.format as string || 'html'

  // Process resolver files to make them more readable
  const processedResolverFiles = debugInfo.scanned.resolverFiles.map((r) => {
    // Extract filename from full path
    const parts = r.specifier.split('/')
    const fileName = parts.at(-1)

    return {
      file: fileName,
      fullPath: r.specifier,
      exports: r.imports.map(i => ({
        name: i.name,
        type: i.type,
        as: i.as,
      })),
    }
  })

  const processedDirectiveFiles = debugInfo.scanned.directiveFiles.map((d) => {
    const parts = d.specifier.split('/')
    const fileName = parts.at(-1)

    return {
      file: fileName,
      fullPath: d.specifier,
      exports: d.imports.map(i => ({
        name: i.name,
        type: i.type,
        as: i.as,
      })),
    }
  })

  // Collect debug information
  const fullDebugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      dev: debugInfo.isDev,
      framework: debugInfo.framework,
    },
    graphql: {
      framework: debugInfo.graphqlFramework ?? null,
      federation: debugInfo.federation,
    },
    scanned: {
      schemas: debugInfo.scanned.schemas,
      schemaFiles: debugInfo.scanned.schemaFiles.map((s) => {
        const parts = s.split('/')
        return parts.slice(-3).join('/')
      }),
      resolvers: debugInfo.scanned.resolvers,
      resolverFiles: processedResolverFiles,
      directives: debugInfo.scanned.directives,
      directiveFiles: processedDirectiveFiles,
      documents: debugInfo.scanned.documents,
      documentFiles: debugInfo.scanned.documentFiles.map((d) => {
        const parts = d.split('/')
        return parts.slice(-3).join('/')
      }),
    },
    runtime: {
      loadedResolvers: resolvers.length,
      loadedSchemas: schemas.length,
      loadedDirectives: directives.length,
    },
    virtualModules: debugInfo.virtualModules || {},
    virtualModuleSamples: {
      'server-resolvers': {
        resolverCount: resolvers.length,
        sample: resolvers.slice(0, 3).map(r => ({
          hasResolver: !!r.resolver,
          resolverKeys: r.resolver ? Object.keys(r.resolver) : [],
        })),
      },
      'server-schemas': {
        schemaCount: schemas.length,
        sample: schemas.slice(0, 2).map(s => ({
          defLength: s.def?.length || 0,
          defPreview: s.def?.substring(0, 100) || 'Empty',
        })),
      },
      'server-directives': {
        directiveCount: directives.length,
      },
      'module-config': moduleConfig,
    },
  }

  // JSON format
  if (format === 'json') {
    event.res.headers.set('Content-Type', 'application/json')
    return fullDebugInfo
  }

  // HTML dashboard
  event.res.headers.set('Content-Type', 'text/html')
  return generateDebugHtml(fullDebugInfo)
})
