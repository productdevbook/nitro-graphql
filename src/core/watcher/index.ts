/**
 * Core watcher module barrel export
 */

export {
  classifyChange,
  closeWatcher,
  createCoreWatcher,
  createIgnoredFunction,
  getFileType,
  isWatchableFile,
  shouldSkipPath,
} from './create-watcher'

export type {
  ChangeType,
  CoreWatcherCallbacks,
  CoreWatcherConfig,
  FileType,
} from './create-watcher'
