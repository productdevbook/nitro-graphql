// THIS FILE IS GENERATED, DO NOT EDIT!

/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */
import schemas from '#graphql/schema'
import type { StandardSchemaV1 } from 'nitro-graphql/types'
import { GraphQLResolveInfo } from 'graphql';
import { H3Event } from 'nitro/h3';

export interface NPMConfig {
  framework: 'graphql-yoga';
}

export type SchemaType = Partial<Record<Partial<keyof ResolversTypes>, StandardSchemaV1>>

// Check if schemas is empty object, return never if so
type SafeSchemaKeys<T> = T extends Record<PropertyKey, never> 
  ? never 
  : keyof T extends string | number | symbol
    ? keyof T extends never 
      ? never 
      : keyof T
    : never;
    

type SchemaKeys = SafeSchemaKeys<typeof schemas>;

type InferInput<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferInput<T> : unknown;
type InferOutput<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T> : unknown;

type InferInputFromSchema<T extends SchemaKeys> = InferInput<(typeof schemas)[T]>;
type InferOutputFromSchema<T extends SchemaKeys> = InferOutput<(typeof schemas)[T]>;

type Primitive =
| null
| undefined
| string
| number
| boolean
| symbol
| bigint;

type BuiltIns = Primitive | void | Date | RegExp;


type ResolverReturnType<T> = T extends BuiltIns
? T
: T extends (...args: any[]) => unknown
? T | undefined
: T extends object
? T extends Array<infer ItemType> // Test for arrays/tuples, per https://github.com/microsoft/TypeScript/issues/35156
  ? ItemType[] extends T // Test for arrays (non-tuples) specifically
    ? Array<ResolverReturnType<ItemType>>
    : ResolverReturnTypeObject<T> // Tuples behave properly
  : ResolverReturnTypeObject<T>
: unknown;

type ResolverReturnTypeObject<T extends object> =
  T extends { __typename?: infer TTypename }
    ? TTypename extends SchemaKeys
      ? InferOutputFromSchema<TTypename>
      : { [K in keyof T]: ResolverReturnType<T[K]> }
    : { [K in keyof T]: ResolverReturnType<T[K]> };

export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
}

export interface Book {
  __typename?: 'Book';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  author: Scalars['String']['output'];
  isbn?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  publishedYear?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  isAvailable: Scalars['Boolean']['output'];
}

export interface CreateBookInput {
  title: Scalars['String']['input'];
  author: Scalars['String']['input'];
  isbn?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  publishedYear?: InputMaybe<Scalars['String']['input']>;
}

export interface Mutation {
  __typename?: 'Mutation';
  createBook: Book;
  updateBook?: Maybe<Book>;
  deleteBook: Scalars['Boolean']['output'];
}


export interface MutationCreateBookArgs {
  input: CreateBookInput;
}


export interface MutationUpdateBookArgs {
  id: Scalars['ID']['input'];
  input: UpdateBookInput;
}


export interface MutationDeleteBookArgs {
  id: Scalars['ID']['input'];
}

export interface Query {
  __typename?: 'Query';
  books: Array<Book>;
  book?: Maybe<Book>;
}


export interface QueryBookArgs {
  id: Scalars['ID']['input'];
}

export interface UpdateBookInput {
  title?: InputMaybe<Scalars['String']['input']>;
  author?: InputMaybe<Scalars['String']['input']>;
  isbn?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  publishedYear?: InputMaybe<Scalars['String']['input']>;
}



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Book: ResolverTypeWrapper<ResolverReturnType<Book>>;
  ID: ResolverTypeWrapper<ResolverReturnType<Scalars['ID']['output']>>;
  CreateBookInput: ResolverTypeWrapper<ResolverReturnType<CreateBookInput>>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  UpdateBookInput: ResolverTypeWrapper<ResolverReturnType<UpdateBookInput>>;
  String: ResolverTypeWrapper<ResolverReturnType<Scalars['String']['output']>>;
  Int: ResolverTypeWrapper<ResolverReturnType<Scalars['Int']['output']>>;
  Boolean: ResolverTypeWrapper<ResolverReturnType<Scalars['Boolean']['output']>>;
  Float: ResolverTypeWrapper<ResolverReturnType<Scalars['Float']['output']>>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Book: ResolverReturnType<Book>;
  ID: ResolverReturnType<Scalars['ID']['output']>;
  CreateBookInput: ResolverReturnType<CreateBookInput>;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  UpdateBookInput: ResolverReturnType<UpdateBookInput>;
  String: ResolverReturnType<Scalars['String']['output']>;
  Int: ResolverReturnType<Scalars['Int']['output']>;
  Boolean: ResolverReturnType<Scalars['Boolean']['output']>;
  Float: ResolverReturnType<Scalars['Float']['output']>;
};

export type AuthDirectiveArgs = {
  requires?: Maybe<Scalars['String']['input']>;
};

export type AuthDirectiveResolver<Result, Parent, ContextType = H3Event, Args = AuthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type CacheDirectiveArgs = {
  ttl?: Maybe<Scalars['Int']['input']>;
  scope?: Maybe<Scalars['String']['input']>;
};

export type CacheDirectiveResolver<Result, Parent, ContextType = H3Event, Args = CacheDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type DeprecatedFieldDirectiveArgs = {
  reason?: Maybe<Scalars['String']['input']>;
  removeAt?: Maybe<Scalars['String']['input']>;
};

export type DeprecatedFieldDirectiveResolver<Result, Parent, ContextType = H3Event, Args = DeprecatedFieldDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type FormatDirectiveArgs = {
  operations?: Maybe<Array<Scalars['String']['input']>>;
  dateFormats?: Maybe<Array<Scalars['String']['input']>>;
  customPatterns?: Maybe<Array<Scalars['String']['input']>>;
};

export type FormatDirectiveResolver<Result, Parent, ContextType = H3Event, Args = FormatDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type HasRoleDirectiveArgs = {
  role: Scalars['String']['input'];
};

export type HasRoleDirectiveResolver<Result, Parent, ContextType = H3Event, Args = HasRoleDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ListDirectiveArgs = {
  max?: Maybe<Scalars['Int']['input']>;
  sort?: Maybe<Scalars['String']['input']>;
  sortDesc?: Maybe<Scalars['Boolean']['input']>;
  filter?: Maybe<Scalars['String']['input']>;
  reverse?: Maybe<Scalars['Boolean']['input']>;
  unique?: Maybe<Scalars['String']['input']>;
};

export type ListDirectiveResolver<Result, Parent, ContextType = H3Event, Args = ListDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type PermissionDirectiveArgs = {
  roles?: Maybe<Array<Scalars['String']['input']>>;
  scopes?: Maybe<Array<Scalars['String']['input']>>;
  requireAll?: Maybe<Scalars['Boolean']['input']>;
};

export type PermissionDirectiveResolver<Result, Parent, ContextType = H3Event, Args = PermissionDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type RateLimitDirectiveArgs = {
  limit: Scalars['Int']['input'];
  window?: Scalars['Int']['input'];
  skipIf?: Maybe<Array<Scalars['String']['input']>>;
  keyBy?: Maybe<Array<Scalars['String']['input']>>;
  message?: Maybe<Scalars['String']['input']>;
  burst?: Maybe<Scalars['Int']['input']>;
  cost?: Maybe<Scalars['Float']['input']>;
};

export type RateLimitDirectiveResolver<Result, Parent, ContextType = H3Event, Args = RateLimitDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type TransformDirectiveArgs = {
  upper?: Maybe<Scalars['Boolean']['input']>;
  lower?: Maybe<Scalars['Boolean']['input']>;
  trim?: Maybe<Scalars['Boolean']['input']>;
  truncate?: Maybe<Scalars['Int']['input']>;
  default?: Maybe<Scalars['String']['input']>;
};

export type TransformDirectiveResolver<Result, Parent, ContextType = H3Event, Args = TransformDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ValidateDirectiveArgs = {
  minLength?: Maybe<Scalars['Int']['input']>;
  maxLength?: Maybe<Scalars['Int']['input']>;
  pattern?: Maybe<Scalars['String']['input']>;
  min?: Maybe<Scalars['Int']['input']>;
  max?: Maybe<Scalars['Int']['input']>;
};

export type ValidateDirectiveResolver<Result, Parent, ContextType = H3Event, Args = ValidateDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type BookResolvers<ContextType = H3Event, ParentType extends ResolversParentTypes['Book'] = ResolversParentTypes['Book']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  author?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isbn?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  publishedYear?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isAvailable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = H3Event, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createBook?: Resolver<ResolversTypes['Book'], ParentType, ContextType, RequireFields<MutationCreateBookArgs, 'input'>>;
  updateBook?: Resolver<Maybe<ResolversTypes['Book']>, ParentType, ContextType, RequireFields<MutationUpdateBookArgs, 'id' | 'input'>>;
  deleteBook?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteBookArgs, 'id'>>;
};

export type QueryResolvers<ContextType = H3Event, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  books?: Resolver<Array<ResolversTypes['Book']>, ParentType, ContextType>;
  book?: Resolver<Maybe<ResolversTypes['Book']>, ParentType, ContextType, RequireFields<QueryBookArgs, 'id'>>;
};

export type Resolvers<ContextType = H3Event> = {
  Book?: BookResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = H3Event> = {
  auth?: AuthDirectiveResolver<any, any, ContextType>;
  cache?: CacheDirectiveResolver<any, any, ContextType>;
  deprecatedField?: DeprecatedFieldDirectiveResolver<any, any, ContextType>;
  format?: FormatDirectiveResolver<any, any, ContextType>;
  hasRole?: HasRoleDirectiveResolver<any, any, ContextType>;
  list?: ListDirectiveResolver<any, any, ContextType>;
  permission?: PermissionDirectiveResolver<any, any, ContextType>;
  rateLimit?: RateLimitDirectiveResolver<any, any, ContextType>;
  transform?: TransformDirectiveResolver<any, any, ContextType>;
  validate?: ValidateDirectiveResolver<any, any, ContextType>;
};
