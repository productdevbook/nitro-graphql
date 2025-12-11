/// <reference types="vite/client" />

declare module 'virtual:metadata' {
  import type { MetadataIndex } from '../metadata/types'
  const metadata: MetadataIndex
  export default metadata
}

declare module 'virtual:contributors' {
  import type { ContributorsData } from '../metadata/types'
  const contributors: ContributorsData
  export default contributors
}

declare module 'virtual:changelog' {
  import type { ChangelogData } from '../metadata/types'
  const changelog: ChangelogData
  export default changelog
}
