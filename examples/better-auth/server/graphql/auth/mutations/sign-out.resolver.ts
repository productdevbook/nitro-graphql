import { defineMutation } from 'nitro-graphql/define'
import { HTTPError } from 'nitro/h3'
import { auth } from '../../../utils/auth'

export const signOutMutation = defineMutation({
  signOut: async (_, args, { context }) => {
    // Require authentication to sign out
    if (!context.session) {
      throw new HTTPError('Not authenticated', {
        status: 401,
      })
    }

    await auth.api.signOut({
      headers: {
        authorization: `Bearer ${context.session.token}`,
      },
    })

    return true
  },
})
