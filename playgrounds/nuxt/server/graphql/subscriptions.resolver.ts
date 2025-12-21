export const subscriptionResolvers = defineSubscription({
  countdown: {
    async* subscribe(_parent, { from }: { from: number }, context) {
      for (let i = from; i >= 0; i--) {
        yield { countdown: i }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    },
  },

  greetings: {
    async* subscribe() {
      const greetings = ['Merhaba!', 'Hello!', 'Bonjour!', 'Hola!', 'Ciao!', 'Hallo!']
      let index = 0
      while (true) {
        yield { greetings: greetings[index % greetings.length] }
        index++
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    },
  },

  serverTime: {
    async* subscribe() {
      while (true) {
        yield { serverTime: new Date().toISOString() }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    },
  },
})
