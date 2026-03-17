/**
 * GraphQL Yoga WebSocket handler for subscriptions
 * Uses shared WebSocket handler with graphql-ws and crossws
 *
 * @see https://github.com/enisdenjo/graphql-ws
 */

import { defineWebSocketHandler } from 'nitro/h3'
import { wsHooks } from './_ws-handler'

export default defineWebSocketHandler(wsHooks)
