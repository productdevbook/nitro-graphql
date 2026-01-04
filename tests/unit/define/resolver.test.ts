/**
 * Tests for resolver define functions from src/define.ts
 *
 * These functions are identity or wrapper functions that provide
 * type safety for GraphQL resolvers. The types come from a virtual
 * module (#graphql/server) but are type-only imports that get erased
 * at runtime, so we can test the runtime behavior directly.
 */
import { describe, expect, it } from 'vitest'
import {
  defineField,
  defineMutation,
  defineQuery,
  defineResolver,
  defineSubscription,
} from '../../../src/define'

describe('defineResolver', () => {
  it('should return the exact same object', () => {
    const resolvers = {
      Query: {
        user: () => ({ id: '1', name: 'Test' }),
      },
      Mutation: {
        createUser: () => ({ id: '2', name: 'New' }),
      },
    }

    const result = defineResolver(resolvers as any)

    expect(result).toBe(resolvers)
  })

  it('should preserve all properties of the resolver object', () => {
    const resolvers = {
      Query: {
        users: () => [],
        user: () => null,
      },
      Mutation: {
        updateUser: () => null,
      },
      User: {
        fullName: (parent: any) => `${parent.firstName} ${parent.lastName}`,
      },
    }

    const result = defineResolver(resolvers as any)

    expect(result).toEqual(resolvers)
    expect(result.Query).toBe(resolvers.Query)
    expect(result.Mutation).toBe(resolvers.Mutation)
    expect(result.User).toBe(resolvers.User)
  })
})

describe('defineQuery', () => {
  it('should wrap resolvers in Query object', () => {
    const queryResolvers = {
      user: () => ({ id: '1' }),
      users: () => [],
    }

    const result = defineQuery(queryResolvers as any)

    expect(result).toEqual({ Query: queryResolvers })
    expect(result.Query).toEqual(queryResolvers)
  })

  it('should return { Query: {} } when called with empty object', () => {
    const result = defineQuery({})

    expect(result).toEqual({ Query: {} })
  })

  it('should return { Query: {} } when called with no arguments', () => {
    const result = defineQuery()

    expect(result).toEqual({ Query: {} })
  })

  it('should spread the resolvers into Query (not reference)', () => {
    const queryResolvers = {
      user: () => ({ id: '1' }),
    }

    const result = defineQuery(queryResolvers as any)

    // The Query object should have the same properties but not be the same reference
    expect(result.Query).not.toBe(queryResolvers)
    expect(result.Query).toEqual(queryResolvers)
  })
})

describe('defineMutation', () => {
  it('should wrap resolvers in Mutation object', () => {
    const mutationResolvers = {
      createUser: () => ({ id: '1' }),
      updateUser: () => ({ id: '1' }),
      deleteUser: () => true,
    }

    const result = defineMutation(mutationResolvers as any)

    expect(result).toEqual({ Mutation: mutationResolvers })
    expect(result.Mutation).toEqual(mutationResolvers)
  })

  it('should return { Mutation: {} } when called with empty object', () => {
    const result = defineMutation({})

    expect(result).toEqual({ Mutation: {} })
  })

  it('should return { Mutation: {} } when called with no arguments', () => {
    const result = defineMutation()

    expect(result).toEqual({ Mutation: {} })
  })

  it('should spread the resolvers into Mutation (not reference)', () => {
    const mutationResolvers = {
      createUser: () => ({ id: '1' }),
    }

    const result = defineMutation(mutationResolvers as any)

    expect(result.Mutation).not.toBe(mutationResolvers)
    expect(result.Mutation).toEqual(mutationResolvers)
  })
})

describe('defineSubscription', () => {
  it('should wrap resolvers in Subscription object', () => {
    const subscriptionResolvers = {
      userCreated: {
        subscribe: () => ({}),
      },
      messageReceived: {
        subscribe: () => ({}),
      },
    }

    const result = defineSubscription(subscriptionResolvers as any)

    expect(result).toEqual({ Subscription: subscriptionResolvers })
    expect(result.Subscription).toEqual(subscriptionResolvers)
  })

  it('should return { Subscription: {} } when called with empty object', () => {
    const result = defineSubscription({})

    expect(result).toEqual({ Subscription: {} })
  })

  it('should return { Subscription: {} } when called with no arguments', () => {
    const result = defineSubscription()

    expect(result).toEqual({ Subscription: {} })
  })

  it('should spread the resolvers into Subscription (not reference)', () => {
    const subscriptionResolvers = {
      onEvent: { subscribe: () => ({}) },
    }

    const result = defineSubscription(subscriptionResolvers as any)

    expect(result.Subscription).not.toBe(subscriptionResolvers)
    expect(result.Subscription).toEqual(subscriptionResolvers)
  })
})

describe('defineField', () => {
  it('should return the exact same object', () => {
    const fieldResolvers = {
      User: {
        fullName: (parent: any) => `${parent.firstName} ${parent.lastName}`,
      },
    }

    const result = defineField(fieldResolvers as any)

    expect(result).toBe(fieldResolvers)
  })

  it('should preserve all type resolvers', () => {
    const fieldResolvers = {
      User: {
        fullName: (parent: any) => `${parent.firstName} ${parent.lastName}`,
        age: (parent: any) => new Date().getFullYear() - parent.birthYear,
      },
      Post: {
        author: (parent: any) => ({ id: parent.authorId }),
      },
    }

    const result = defineField(fieldResolvers as any)

    expect(result).toEqual(fieldResolvers)
    expect(result.User).toBe(fieldResolvers.User)
    expect(result.Post).toBe(fieldResolvers.Post)
  })

  it('should work with empty object', () => {
    const result = defineField({} as any)

    expect(result).toEqual({})
  })
})
