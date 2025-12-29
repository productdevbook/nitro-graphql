import { parse } from 'graphql'

export const schemaString = `
type Query {
  pregenTest: String!
}
`
export const typeDefs = parse(schemaString)
