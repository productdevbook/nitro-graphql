/**
 * CLI Debug Handler
 *
 * Debug dashboard for CLI dev server.
 * Uses core debug template for HTML generation.
 */

import type { DebugInfo } from '../../core/debug/template'
import type { CLIContext } from '../index'
import { generateDebugHtml } from '../../core/debug/template'
import { scanDirectivesCore, scanDocumentsCore, scanResolversCore, scanSchemasCore } from '../../core/scanning'
import { CLIAdapter } from '../adapter'

/**
 * Create a debug handler for the CLI dev server
 */
export function createDebugHandler(ctx: CLIContext) {
  return async (request: Request): Promise<Response> => {
    const debugInfo = await collectDebugInfo(ctx)

    const url = new URL(request.url)
    if (url.searchParams.get('format') === 'json') {
      return Response.json(debugInfo)
    }

    return new Response(generateDebugHtml(debugInfo), {
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

/**
 * Collect debug information from CLI context
 */
async function collectDebugInfo(ctx: CLIContext): Promise<DebugInfo> {
  const scanCtx = CLIAdapter.createScanContext(ctx)

  // Scan all files
  const [schemasResult, resolversResult, directivesResult, documentsResult] = await Promise.all([
    scanSchemasCore(scanCtx),
    scanResolversCore(scanCtx),
    scanDirectivesCore(scanCtx),
    scanDocumentsCore(scanCtx, { externalServices: ctx.config.externalServices }),
  ])

  // Process resolver files for display
  const resolverFiles = resolversResult.items.map((r) => {
    const parts = r.specifier.split('/')
    const fileName = parts.at(-1) || r.specifier

    return {
      file: fileName,
      exports: r.imports.map(i => ({
        name: i.name,
        type: i.type,
      })),
    }
  })

  // Process schema files for display
  const schemaFiles = schemasResult.items.map((s) => {
    const parts = s.split('/')
    return parts.slice(-3).join('/')
  })

  // Process document files for display
  const documentFiles = documentsResult.items.map((d) => {
    const parts = d.split('/')
    return parts.slice(-3).join('/')
  })

  return {
    environment: {
      dev: true,
      framework: 'cli',
    },
    graphql: {
      framework: ctx.config.framework || 'graphql-yoga',
    },
    scanned: {
      schemas: schemasResult.items.length,
      resolvers: resolversResult.items.length,
      directives: directivesResult.items.length,
      documents: documentsResult.items.length,
      schemaFiles,
      resolverFiles,
      documentFiles,
    },
    runtime: {
      loadedResolvers: resolversResult.items.length,
      loadedSchemas: schemasResult.items.length,
      loadedDirectives: directivesResult.items.length,
    },
    virtualModules: {
      // CLI doesn't have virtual modules like Nitro
      // Show config instead
      'cli-config': JSON.stringify(ctx.config, null, 2),
    },
  }
}
