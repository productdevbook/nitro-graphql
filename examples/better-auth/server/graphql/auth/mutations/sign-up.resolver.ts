import { defineMutation } from 'nitro-graphql/define'
import { HTTPError } from 'nitro/h3'
import { auth } from '../../../utils/auth'

export const signUpMutation = defineMutation({
  signUp: async (_, { input }) => {
    const result = await auth.api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: input.name,
      },
    })

    if (!result) {
      throw new HTTPError('Sign up failed', {
        status: 500,
      })
    }

    return {
      user: result.user as any,
      session: result.token, // Return token string directly
    }
  },
})
