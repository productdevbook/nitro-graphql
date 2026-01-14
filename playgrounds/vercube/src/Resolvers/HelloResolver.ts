import type { MutationResolvers, QueryResolvers } from '#graphql/server';
import { Mutation, Query, Resolver } from 'nitro-graphql/vercube';

@Resolver()
export class HelloResolver {
  @Query('hello')
  hello: QueryResolvers['hello'] = (_parent, _args, ctx) => {
    console.log('Request URL:', ctx.request.url);
    return 'Hello from Vercube GraphQL!';
  };

  @Query('greet')
  greet: QueryResolvers['greet'] = (_parent, args, _ctx) => {
    return `Hello, ${args.name}!`;
  };

  @Mutation('setMessage')
  setMessage: MutationResolvers['setMessage'] = (_parent, args, _ctx) => {
    return `Message set: ${args.message}`;
  };
}
