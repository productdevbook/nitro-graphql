import graphql from 'nitro-graphql'
import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  serverDir: './server',
  modules: [
    graphql({
      framework: 'graphql-yoga',
      codegen: {
        client: {
          scalars: {
            Timestamp: 'string',
            File: 'File',
            Decimal: 'string',
          },
        },
      },
    }),
  ],
})
