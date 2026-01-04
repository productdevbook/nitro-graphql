/**
 * Fixture: Resolver file with default export (deprecated pattern)
 * Should trigger a warning about using default exports
 */
import { defineQuery } from '../../../src/define'

// Default exports are not detected - this should trigger a warning
export default defineQuery({
  hello: () => 'Hello World',
})
