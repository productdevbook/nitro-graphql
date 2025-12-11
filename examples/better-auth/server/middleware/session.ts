import { defineEventHandler } from 'nitro/h3'
import { auth } from '../utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const session = await auth.api.getSession({
      headers: event.req.headers,
    })

    if (session?.session) {
    // You can save the session to the event context for later use
      event.context.session = session.session
      event.context.user = session.user
    }
  }
  catch (error) {
    event.context.session = null
    event.context.user = null as any
  }
})