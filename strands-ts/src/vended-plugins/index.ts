/**
 * Barrel export for all vended plugins.
 *
 * Provides a single import path for consumers who want all built-in plugins:
 * ```typescript
 * import { AgentSkills, ContextOffloader, InMemoryStorage } from '@strands-agents/sdk/vended-plugins'
 * ```
 */

export { Skill, AgentSkills } from './skills/index.js'
export type { SkillConfig, AgentSkillsConfig, SkillSource } from './skills/index.js'

export { ContextOffloader, InMemoryStorage, FileStorage, S3Storage } from './context-offloader/index.js'
export type { ContextOffloaderConfig, Storage } from './context-offloader/index.js'
