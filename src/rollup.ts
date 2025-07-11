export function rollupPlugin() {
  app.hooks.hook('rollup:before', (nitro, rollupConfig) => {
    rollupConfig.plugins = rollupConfig.plugins || []
    if (Array.isArray(rollupConfig.plugins)) {
      rollupConfig.plugins.push({
        name: 'nitro-graphql-watcher',
        buildStart() {
          const graphqlFiles = globSync([
            'server/graphql/**/*.graphql',
            'server/graphql/**/*.gql',
            'server/graphql/**/*.ts',
          ], {
            absolute: true,
            ignore: app.options.ignore || [],
            cwd: app.options.rootDir,
          })

          for (const file of graphqlFiles) {
            this.addWatchFile(file)
          }

          // 2. Directory watching (partial çalışır)
          this.addWatchFile('server/graphql/')
        },
      })
    }
  })

  if (!app.options.dev) {
    app.options.rollupConfig ??= {} as any
    if (app.options.rollupConfig) {
      app.options.rollupConfig.plugins ??= []

      const originalExternal = app.options.rollupConfig.external
      app.options.rollupConfig.external = (id, parentId, isResolved) => {
        if (id.startsWith('./dev')) {
          return true
        }
        if (id.startsWith('./prerender') && !app.options.prerender) {
          return true
        }

        // Orijinal external logic'i koru
        if (typeof originalExternal === 'function') {
          return originalExternal(id, parentId, isResolved)
        }
        if (Array.isArray(originalExternal)) {
          return originalExternal.includes(id)
        }
        return false
      }
    }
  }
}