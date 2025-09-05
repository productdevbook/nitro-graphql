import type { IGraphQLConfig } from 'graphql-config'

export default <IGraphQLConfig> {
  projects: {
    default: {
      schema: [
        './.nitro/graphql/schema.graphql',
      ],
      documents: [
        './**/*.{graphql,js,ts,jsx,tsx}',
      ],
    },
  },
}
