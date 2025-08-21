import type { IGraphQLConfig } from 'graphql-config'

export default <IGraphQLConfig> {
  projects: {
    default: {
      schema: [
        './.nuxt/graphql/schema.graphql',
      ],
      documents: [
        './app/graphql/default/**/*.{graphql,js,ts,jsx,tsx}',
      ],
    },
    country: {
      schema: [
        './.nuxt/graphql/schemas/countries.graphql',
      ],
      documents: [
        './app/graphql/countries/**/*.graphql',
      ],
    },
  },
}
