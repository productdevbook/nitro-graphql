/**
 * Vercube GraphQL Controller Factory
 *
 * Creates a controller class dynamically since decorators can't be in pre-compiled code.
 * Users should create their own controller using this as reference.
 */

import { GraphQLPlugin } from './plugin'

/**
 * Example controller implementation for Vercube GraphQL.
 *
 * Users should create their own controller file with decorators:
 *
 * @example
 * ```typescript
 * // src/controllers/GraphQLController.ts
 * import { Controller, Get, Post, Request as Req, FastResponse } from '@vercube/core'
 * import { Inject } from '@vercube/di'
 * import { GraphQLPlugin } from 'nitro-graphql/vercube'
 *
 * @Controller('/api/graphql')
 * export class GraphQLController {
 *   @Inject(GraphQLPlugin)
 *   private graphqlPlugin!: GraphQLPlugin
 *
 *   @Get('/')
 *   async handleGet(@Req() request: Request): Promise<Response> {
 *     const response = await this.graphqlPlugin.handleRequest(request)
 *     return new FastResponse(await response.text(), {
 *       status: response.status,
 *       statusText: response.statusText,
 *       headers: Object.fromEntries(response.headers.entries()),
 *     })
 *   }
 *
 *   @Post('/')
 *   async handlePost(@Req() request: Request): Promise<Response> {
 *     const response = await this.graphqlPlugin.handleRequest(request)
 *     return new FastResponse(await response.text(), {
 *       status: response.status,
 *       statusText: response.statusText,
 *       headers: Object.fromEntries(response.headers.entries()),
 *     })
 *   }
 *
 *   @Get('/sandbox.js')
 *   async sandboxScript(): Promise<Response> {
 *     const response = await this.graphqlPlugin.handleSandboxScript()
 *     return new FastResponse(await response.text(), {
 *       status: response.status,
 *       headers: Object.fromEntries(response.headers.entries()),
 *     })
 *   }
 * }
 * ```
 */
export { GraphQLPlugin }
