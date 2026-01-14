import { Body, Controller, FastResponse, Get, Post, Request as Req } from '@vercube/core';
import { Container, Inject } from '@vercube/di';
import { GRAPHQL_PLUGIN, GraphQLPlugin } from 'nitro-graphql/vercube';

@Controller('/api/graphql')
export class GraphQLController {
  @Inject(Container)
  private container!: Container;

  // Get plugin lazily to avoid timing issues during DI resolution
  private get graphqlPlugin(): GraphQLPlugin {
    return this.container.get(GRAPHQL_PLUGIN) as GraphQLPlugin;
  }

  @Get('/')
  async handleGet(@Req() request: Request): Promise<Response> {
    // Pass context to resolvers
    const context = { request, container: this.container };
    const response = await this.graphqlPlugin.handleRequest(request, context);
    return new FastResponse(await response.text(), {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  }

  @Post('/')
  async handlePost(@Req() request: Request, @Body() body: unknown): Promise<Response> {
    // Recreate request with body since Vercube may have consumed the original body
    const newRequest = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    });
    // Pass context to resolvers
    const context = { request: newRequest, container: this.container };
    const response = await this.graphqlPlugin.handleRequest(newRequest, context);
    return new FastResponse(await response.text(), {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  }

  @Get('/sandbox.js')
  async sandboxScript(): Promise<Response> {
    const response = await this.graphqlPlugin.handleSandboxScript();
    return new FastResponse(await response.text(), {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    });
  }
}
