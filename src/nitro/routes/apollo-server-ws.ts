/**
 * Apollo Server WebSocket handler for subscriptions
 * Uses shared WebSocket handler with graphql-ws and crossws
 *
 * Note: This handler works independently from Apollo Server for subscriptions,
 * as Apollo Server v5 requires separate WebSocket handling.
 *
 * @see https://github.com/enisdenjo/graphql-ws
 */

import { defineWebSocketHandler } from 'nitro/h3'
import { wsHooks } from './_ws-handler'

export default defineWebSocketHandler(wsHooks)
