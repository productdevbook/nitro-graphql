import type { YogaServerOptions } from 'graphql-yoga'
import type { GraphQLSchemaConfig, Resolvers } from 'nitro-graphql/types'
import type { Nitro } from 'nitropack'
import { join, relative } from 'pathe'
import { glob } from 'tinyglobby'

export const GLOB_SCAN_PATTERN = "**/*.{graphql,gql,js,mjs,cjs,ts,mts,cts,tsx,jsx}"
type FileInfo = { path: string; fullPath: string };


// TODO: check used.
export function defineGraphQLSchema(config: GraphQLSchemaConfig): GraphQLSchemaConfig {
  return config
}

export function defineResolver(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

/**
 * Helper function to define GraphQL Yoga configuration with type safety
 */
export function defineYogaConfig<TServerContext = any, TUserContext = any>(
  config: Partial<YogaServerOptions<TServerContext, TUserContext>>,
): Partial<YogaServerOptions<TServerContext, TUserContext>> {
  return config
}
const RELATIVE_RE = /^\.{1,2}\//

export function relativeWithDot(from: string, to: string) {
  const rel = relative(from, to)
  return RELATIVE_RE.test(rel) ? rel : `./${rel}`
}

export async function scanGraphql(nitro: Nitro) {
  const files = await scanFiles(nitro, "graphql");
  return files.map((f) => f.fullPath);
}

export async function scanResolvers(nitro: Nitro) {
  const files = await scanFiles(nitro, "graphql", '**/*.resolver.{ts,js}');
  return files.map((f) => f.fullPath);
}

export async function scanDirectives(nitro: Nitro) {
  const files = await scanFiles(nitro, "graphql", '**/*.directive.{ts,js}');
  return files.map((f) => f.fullPath);
}

export async function scanTypeDefs(nitro: Nitro) {
  const files = await scanFiles(nitro, "graphql", '**/*.typedef.{ts,js}');
  return files.map((f) => f.fullPath);
}

export async function scanSchema(nitro: Nitro) {
  const files = await scanFiles(nitro, "graphql", '**/*.graphql');
  return files.map((f) => f.fullPath);
}

async function scanFiles(nitro: Nitro, name: string, globPattern = GLOB_SCAN_PATTERN): Promise<FileInfo[]> {
  const files = await Promise.all(
    nitro.options.scanDirs.map((dir) => scanDir(nitro, dir, name, globPattern))
  ).then((r) => r.flat());
  return files;
}

async function scanDir(
  nitro: Nitro,
  dir: string,
  name: string,
  globPattern = GLOB_SCAN_PATTERN
): Promise<FileInfo[]> {
  const fileNames = await glob(join(name, globPattern), {
    cwd: dir,
    dot: true,
    ignore: nitro.options.ignore,
    absolute: true,
  }).catch((error) => {
    if (error?.code === "ENOTDIR") {
      nitro.logger.warn(
        `Ignoring \`${join(dir, name)}\`. It must be a directory.`
      );
      return [];
    }
    throw error;
  });
  return fileNames
    .map((fullPath) => {
      return {
        fullPath,
        path: relative(join(dir, name), fullPath),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function unique(arr: any[]) {
  return [...new Set(arr)];
}