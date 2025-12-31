/**
 * Shell tab completions for nitro-graphql CLI
 * Supports zsh, bash, fish, and PowerShell
 */

import type { ArgsDef, CommandDef } from 'citty'
import { AVAILABLE_TEMPLATES } from './commands/init'

export async function initCompletions<T extends ArgsDef = ArgsDef>(
  command: CommandDef<T>,
): Promise<void> {
  const { default: tab } = await import('@bomb.sh/tab/citty')

  // Define completion handlers via config
  await tab(command, {
    subCommands: {
      init: {
        options: {
          template: (complete) => {
            // Add available templates
            for (const template of AVAILABLE_TEMPLATES) {
              complete(template.name, template.description)
            }
            // Add custom template hints
            complete('gh:', 'GitHub shorthand (gh:user/repo)')
            complete('github:', 'GitHub template (github:user/repo/path)')
            complete('gitlab:', 'GitLab template (gitlab:user/repo)')
          },
          cwd: (complete) => {
            complete('.', 'Current directory')
          },
        },
      },
      generate: {
        options: {
          cwd: (complete) => {
            complete('.', 'Current directory')
          },
        },
      },
      'generate:server': {
        options: {
          cwd: (complete) => {
            complete('.', 'Current directory')
          },
        },
      },
      'generate:client': {
        options: {
          cwd: (complete) => {
            complete('.', 'Current directory')
          },
        },
      },
      validate: {
        options: {
          cwd: (complete) => {
            complete('.', 'Current directory')
          },
        },
      },
    },
  })
}
