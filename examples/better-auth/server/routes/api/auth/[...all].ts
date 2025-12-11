import { defineEventHandler } from 'nitro/h3'
import { auth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  return auth.handler(event.req)
})
