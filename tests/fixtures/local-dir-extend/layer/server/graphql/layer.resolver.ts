import { defineQuery } from '../../../../../src/define'

export const layerQueries = defineQuery({
  layerQuery: () => ({
    layerHello: 'Hello from layer!',
  }),
})
