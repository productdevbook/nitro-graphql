/**
 * Fixture: Resolver file with syntax error
 * Should generate an error during parsing
 */
import { defineQuery } from '../../../src/define'

export const broken = defineQuery({
  // Missing closing brace and parenthesis
  hello: () => 'Hello'
// File ends with syntax error
