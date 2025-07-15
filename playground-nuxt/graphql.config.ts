import type { IGraphQLConfig } from 'graphql-config'

export function createGraphQLConfig(config?: IGraphQLConfig): IGraphQLConfig {
  const newConfig: IGraphQLConfig = {
    projects: {
      default: {
        schema: [
          './.nuxt/graphql/schema.graphql',
        ],
        documents: [
          './app/graphql/**/*.{graphql,js,ts,jsx,tsx}',
        ],
      },
    },
  }
  return newConfig
}
