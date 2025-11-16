import type { User } from '../../../drizzle'
import { HTTPError } from 'h3'
import { defineMutation } from 'nitro-graphql/define'
import { auth } from '../../../utils/auth'

export const signInMutation = defineMutation({
  signIn: async (_, { input }) => {
    const result = await auth.api.signInEmail({
      body: {
        email: input.email,
        password: input.password,
      },
    })

    if (!result) {
      throw new HTTPError('Invalid email or password', {
        status: 401,
      })
    }

    return {
      user: {
        ...result.user,
        image: result.user.image ?? null,
        createdAt: result.user.createdAt.toISOString(),
        updatedAt: result.user.updatedAt.toISOString(),
      } as User,
      session: result.token, // Return token string from session object
    }
  },
})
