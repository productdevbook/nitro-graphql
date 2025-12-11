export const subscriptionResolvers = defineSubscription({
  countdown: {
    subscribe: async function* (_parent, { from }: { from: number }) {
      for (let i = from; i >= 0; i--) {
        yield { countdown: i }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    },
  },

  greetings: {
    subscribe: async function* () {
      const greetings = ['Hello!', 'Merhaba!', 'Bonjour!', 'Hola!', 'Ciao!', 'Hallo!']
      let index = 0

      while (true) {
        yield { greetings: greetings[index % greetings.length] }
        index++
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Stop after 10 messages for demo
        if (index >= 10)
          break
      }
    },
  },

  serverTime: {
    subscribe: async function* () {
      for (let i = 0; i < 30; i++) {
        yield { serverTime: new Date().toISOString() }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    },
  },
})
