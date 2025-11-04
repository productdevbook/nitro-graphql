import { debugInfo } from '#nitro-graphql/debug-info'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { defineEventHandler, getQuery } from 'h3'

/**
 * Debug endpoint for inspecting virtual modules and GraphQL setup
 * Only available in development mode
 *
 * Routes:
 * - /_nitro/graphql/debug - HTML dashboard
 * - /_nitro/graphql/debug?format=json - JSON API
 */
export default defineEventHandler(async (event) => {
  // Note: This route is only registered in development mode (see src/index.ts)
  // No need for additional isDev check here as it's already handled at registration

  const query = getQuery(event)
  const format = query.format as string || 'html'

  // Process resolver files to make them more readable
  const processedResolverFiles = debugInfo.scanned.resolverFiles.map((r) => {
    // Extract filename from full path
    const parts = r.specifier.split('/')
    const fileName = parts[parts.length - 1]

    return {
      file: fileName,
      fullPath: r.specifier,
      exports: r.imports.map((i: any) => ({
        name: i.name,
        type: i.type,
        as: i.as,
      })),
    }
  })

  const processedDirectiveFiles = debugInfo.scanned.directiveFiles.map((d) => {
    const parts = d.specifier.split('/')
    const fileName = parts[parts.length - 1]

    return {
      file: fileName,
      fullPath: d.specifier,
      exports: d.imports.map((i: any) => ({
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
      framework: debugInfo.graphqlFramework,
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
  return generateHtmlDashboard(fullDebugInfo)
})

function generateHtmlDashboard(debugInfo: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nitro GraphQL Debug Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0f172a;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-200 min-h-screen">
  <div class="container mx-auto max-w-7xl p-6 space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="mb-8 border-b border-slate-800 pb-6">
      <div class="flex items-center gap-3 mb-2">
        <svg class="w-10 h-10" viewBox="0 0 400 400" fill="none">
          <path d="M57.468 302.66l-14.376-8.3 160.15-277.38 14.376 8.3z" fill="#E535AB"/>
          <path d="M39.8 272.2h320.3v16.6H39.8z" fill="#E535AB"/>
          <path d="M206.348 374.026l-160.21-92.5 8.3-14.376 160.21 92.5z" fill="#E535AB"/>
          <path d="M345.522 132.947l-160.21-92.5 8.3-14.376 160.21 92.5z" fill="#E535AB"/>
          <path d="M54.482 132.883l-8.3-14.375 160.21-92.5 8.3 14.376z" fill="#E535AB"/>
          <path d="M342.568 302.663l-160.15-277.38 14.376-8.3 160.15 277.38z" fill="#E535AB"/>
          <path d="M52.5 107.5h16.6v185H52.5z" fill="#E535AB"/>
          <path d="M330.9 107.5h16.6v185h-16.6z" fill="#E535AB"/>
          <path d="M203.522 367l-7.25-12.558 139.34-80.45 7.25 12.557z" fill="#E535AB"/>
          <path d="M369.5 297.9c-9.6 16.7-31 22.4-47.7 12.8-16.7-9.6-22.4-31-12.8-47.7 9.6-16.7 31-22.4 47.7-12.8 16.8 9.7 22.5 31 12.8 47.7M90.9 137c-9.6 16.7-31 22.4-47.7 12.8-16.7-9.6-22.4-31-12.8-47.7 9.6-16.7 31-22.4 47.7-12.8 16.7 9.7 22.4 31 12.8 47.7M30.5 297.9c-9.6-16.7-3.9-38 12.8-47.7 16.7-9.6 38-3.9 47.7 12.8 9.6 16.7 3.9 38-12.8 47.7-16.8 9.6-38.1 3.9-47.7-12.8M309.1 137c-9.6-16.7-3.9-38 12.8-47.7 16.7-9.6 38-3.9 47.7 12.8 9.6 16.7 3.9 38-12.8 47.7-16.7 9.6-38.1 3.9-47.7-12.8M200 395.8c-19.3 0-34.9-15.6-34.9-34.9 0-19.3 15.6-34.9 34.9-34.9 19.3 0 34.9 15.6 34.9 34.9 0 19.2-15.6 34.9-34.9 34.9M200 74c-19.3 0-34.9-15.6-34.9-34.9 0-19.3 15.6-34.9 34.9-34.9 19.3 0 34.9 15.6 34.9 34.9 0 19.3-15.6 34.9-34.9 34.9" fill="#E535AB"/>
        </svg>
        <div>
          <h1 class="text-3xl font-bold text-slate-100">
            Nitro GraphQL Debug
          </h1>
          <p class="text-sm text-slate-500">Development Diagnostics Dashboard</p>
        </div>
      </div>
    </div>

    <!-- Top Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Environment Card -->
      <div class="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 hover:border-[#E535AB]/30 transition-all">
        <h2 class="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
          <span class="text-[#E535AB]">●</span> Environment
        </h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-slate-800/50">
            <span class="text-slate-400 text-sm">Mode</span>
            <span class="text-slate-200 font-medium text-sm">${debugInfo.environment.dev ? 'Development' : 'Production'}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-800/50">
            <span class="text-slate-400 text-sm">Framework</span>
            <span class="text-slate-200 font-medium text-sm">${debugInfo.environment.framework}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-slate-400 text-sm">GraphQL Server</span>
            <span class="text-slate-200 font-medium text-sm">${debugInfo.graphql.framework || 'Not configured'}</span>
          </div>
        </div>
      </div>

      <!-- Scanned Files Card -->
      <div class="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 hover:border-[#E535AB]/30 transition-all">
        <h2 class="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
          <span class="text-[#E535AB]">●</span> Scanned Files
        </h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-slate-800/50">
            <span class="text-slate-400 text-sm">Schemas</span>
            <span class="text-[#E535AB] font-semibold text-sm">${debugInfo.scanned.schemas}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-800/50">
            <span class="text-slate-400 text-sm">Resolvers</span>
            <span class="text-[#E535AB] font-semibold text-sm">${debugInfo.scanned.resolvers}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-800/50">
            <span class="text-slate-400 text-sm">Directives</span>
            <span class="text-[#E535AB] font-semibold text-sm">${debugInfo.scanned.directives}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-slate-400 text-sm">Documents</span>
            <span class="text-[#E535AB] font-semibold text-sm">${debugInfo.scanned.documents}</span>
          </div>
        </div>
      </div>

      <!-- Runtime Info Card -->
      <div class="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 hover:border-[#E535AB]/30 transition-all">
        <h2 class="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
          <span class="text-[#E535AB]">●</span> Runtime Loaded
        </h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-slate-800/50">
            <span class="text-slate-400 text-sm">Resolvers</span>
            <span class="text-[#E535AB] font-semibold text-sm">${debugInfo.runtime.loadedResolvers}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-slate-800/50">
            <span class="text-slate-400 text-sm">Schemas</span>
            <span class="text-[#E535AB] font-semibold text-sm">${debugInfo.runtime.loadedSchemas}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-slate-400 text-sm">Directives</span>
            <span class="text-[#E535AB] font-semibold text-sm">${debugInfo.runtime.loadedDirectives}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Resolver Exports -->
    <div class="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-slate-200 flex items-center gap-2">
          <span class="text-[#E535AB]">●</span> Resolver Exports
        </h2>
        ${debugInfo.scanned.resolverFiles.length > 0
            ? `<span class="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">${debugInfo.scanned.resolverFiles.length} files</span>`
            : ''
        }
      </div>
      ${debugInfo.scanned.resolverFiles.length > 0
          ? `
        <div class="max-h-96 overflow-y-auto space-y-2 pr-2">
          ${debugInfo.scanned.resolverFiles.map((r: any) => {
            const totalExports = r.exports.length
            return `
              <div class="border border-slate-700/50 rounded-lg p-4 hover:border-[#E535AB]/20 hover:bg-slate-800/30 transition-all">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-slate-300 font-mono text-xs truncate pr-2">${r.file}</span>
                  <span class="bg-slate-800/80 px-2.5 py-0.5 rounded text-[#E535AB] text-[10px] font-semibold whitespace-nowrap">
                    ${totalExports} export${totalExports !== 1 ? 's' : ''}
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  ${r.exports.map((e: any) => {
                    const typeConfig = {
                      query: {
                        bg: 'bg-blue-500/10',
                        text: 'text-blue-400',
                        border: 'border-blue-500/30',
                        symbol: '◆',
                        label: 'query',
                      },
                      mutation: {
                        bg: 'bg-[#E535AB]/10',
                        text: 'text-[#E535AB]',
                        border: 'border-[#E535AB]/30',
                        symbol: '●',
                        label: 'mutation',
                      },
                      type: {
                        bg: 'bg-purple-500/10',
                        text: 'text-purple-400',
                        border: 'border-purple-500/30',
                        symbol: '▲',
                        label: 'type',
                      },
                      directive: {
                        bg: 'bg-amber-500/10',
                        text: 'text-amber-400',
                        border: 'border-amber-500/30',
                        symbol: '@',
                        label: 'directive',
                      },
                      resolver: {
                        bg: 'bg-emerald-500/10',
                        text: 'text-emerald-400',
                        border: 'border-emerald-500/30',
                        symbol: '◉',
                        label: 'resolver',
                      },
                      subscription: {
                        bg: 'bg-teal-500/10',
                        text: 'text-teal-400',
                        border: 'border-teal-500/30',
                        symbol: '↻',
                        label: 'subscription',
                      },
                    }
                    const config = typeConfig[e.type as keyof typeof typeConfig] || typeConfig.resolver
                    return `<span class="px-2.5 py-1 rounded border text-[11px] font-mono ${config.bg} ${config.text} ${config.border} hover:scale-105 transition-transform inline-flex items-center gap-1.5">
                      <span class="font-bold">${config.symbol}</span>
                      <span class="font-medium">${e.name}</span>
                      <span class="opacity-60 text-[9px] uppercase tracking-wide">${config.label}</span>
                    </span>`
                  }).join('')}
                </div>
              </div>
            `
          }).join('')}
        </div>
      `
          : '<p class="text-slate-500 text-sm">No resolvers found</p>'
      }
    </div>

    <!-- Generated Virtual Modules -->
    <div class="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-slate-200 flex items-center gap-2">
          <span class="text-[#E535AB]">●</span> Generated Virtual Modules
        </h2>
        <span class="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
          ${Object.keys(debugInfo.virtualModules).length} modules
        </span>
      </div>
      <div class="space-y-3">
        ${Object.entries(debugInfo.virtualModules).map(([moduleName, codeContent]) => {
          const code = String(codeContent)
          const moduleColors = {
            'server-schemas': { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400' },
            'server-resolvers': { bg: 'bg-[#E535AB]/5', border: 'border-[#E535AB]/20', text: 'text-[#E535AB]' },
            'server-directives': { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400' },
            'module-config': { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
            'graphql-config': { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
          }
          const colorConfig = moduleColors[moduleName as keyof typeof moduleColors] || moduleColors['module-config']
          const lineCount = code.split('\\n').length
          const byteSize = new TextEncoder().encode(code).length

          return `
            <details class="border ${colorConfig.border} ${colorConfig.bg} rounded-lg overflow-hidden group">
              <summary class="cursor-pointer p-4 hover:bg-slate-800/30 transition-all flex justify-between items-center">
                <div class="flex items-center gap-3">
                  <span class="${colorConfig.text} text-lg">▸</span>
                  <div>
                    <span class="font-mono text-sm ${colorConfig.text} font-semibold">#nitro-graphql/${moduleName}</span>
                    <div class="text-[10px] text-slate-500 mt-0.5">
                      ${lineCount} lines · ${(byteSize / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <button
                  onclick="event.stopPropagation(); navigator.clipboard.writeText(this.getAttribute('data-code')); this.textContent = '✓ Copied!'; setTimeout(() => this.textContent = 'Copy', 1000)"
                  data-code="${escapeHtml(code).replace(/"/g, '&quot;')}"
                  class="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600/50 transition-colors"
                >
                  Copy
                </button>
              </summary>
              <div class="border-t ${colorConfig.border}">
                <div class="bg-slate-950/80 p-4 max-h-96 overflow-auto">
                  <pre class="text-xs font-mono text-slate-300 leading-relaxed"><code>${escapeHtml(code)}</code></pre>
                </div>
              </div>
            </details>
          `
        }).join('')}
      </div>
    </div>

    <!-- Files Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Schema Files -->
      <div class="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 hover:border-[#E535AB]/30 transition-all">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <span class="text-[#E535AB]">●</span> Schema Files
          </h2>
          ${debugInfo.scanned.schemaFiles.length > 0
              ? `<span class="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">${debugInfo.scanned.schemaFiles.length} file${debugInfo.scanned.schemaFiles.length !== 1 ? 's' : ''}</span>`
              : ''
          }
        </div>
        <ul class="space-y-2 max-h-64 overflow-y-auto pr-2">
          ${debugInfo.scanned.schemaFiles.length > 0
              ? debugInfo.scanned.schemaFiles.map((f: string) =>
                  `<li class="text-slate-400 font-mono text-xs flex items-start gap-2 py-1.5 px-2 rounded hover:bg-slate-800/50 transition-colors group">
                  <span class="text-[#E535AB] text-[10px] mt-0.5 group-hover:scale-110 transition-transform">▸</span>
                  <span class="truncate group-hover:text-slate-300">${f}</span>
                </li>`,
                ).join('')
              : '<li class="text-slate-500 text-sm">No schemas found</li>'
          }
        </ul>
      </div>

      <!-- Document Files -->
      <div class="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6 hover:border-[#E535AB]/30 transition-all">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <span class="text-[#E535AB]">●</span> Document Files
          </h2>
          ${debugInfo.scanned.documentFiles.length > 0
              ? `<span class="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">${debugInfo.scanned.documentFiles.length} file${debugInfo.scanned.documentFiles.length !== 1 ? 's' : ''}</span>`
              : ''
          }
        </div>
        <ul class="space-y-2 max-h-64 overflow-y-auto pr-2">
          ${debugInfo.scanned.documentFiles.length > 0
              ? debugInfo.scanned.documentFiles.map((f: string) =>
                  `<li class="text-slate-400 font-mono text-xs flex items-start gap-2 py-1.5 px-2 rounded hover:bg-slate-800/50 transition-colors group">
                  <span class="text-[#E535AB] text-[10px] mt-0.5 group-hover:scale-110 transition-transform">▸</span>
                  <span class="truncate group-hover:text-slate-300">${f}</span>
                </li>`,
                ).join('')
              : '<li class="text-slate-500 text-sm">No documents found</li>'
          }
        </ul>
      </div>
    </div>

    <!-- Reload Button -->
    <button
      onclick="location.reload()"
      class="fixed bottom-8 right-8 bg-[#E535AB] hover:bg-[#d12a99] text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl hover:shadow-[#E535AB]/20 transform hover:-translate-y-1 transition-all duration-200 flex items-center gap-2 border border-[#E535AB]/20"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Reload
    </button>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m] || m)
}
