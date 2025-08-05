declare module 'h3' {
  interface H3EventContext {
    event: H3Event
    storage: any
    user?: {
      id: string
      name: string
      email: string
      role: 'USER' | 'ADMIN'
    }
  }
}
