/**
 * Plugin interface for extending multi-agent orchestrator functionality.
 *
 * This module defines the MultiAgentPlugin interface, which provides a composable
 * way to add behavior to multi-agent orchestrators (e.g. Swarm, Graph) through
 * hook registration and custom initialization.
 */

import type { MultiAgentBase } from './base.js'

/**
 * Interface for plugins that extend multi-agent orchestrator functionality.
 *
 * MultiAgentPlugins provide a composable way to add behavior to orchestrators
 * by registering hook callbacks in their `initOrchestrator` method.
 *
 * @example
 * ```typescript
 * class LoggingPlugin implements MultiAgentPlugin {
 *   get name(): string {
 *     return 'logging-plugin'
 *   }
 *
 *   initMultiAgent(orchestrator: MultiAgentBase): void {
 *     orchestrator.addHook(BeforeNodeCallEvent, (event) => {
 *       console.log(`Node ${event.nodeId} starting`)
 *     })
 *   }
 * }
 *
 * const swarm = new Swarm({
 *   nodes: [agentA, agentB],
 *   start: 'agentA',
 *   plugins: [new LoggingPlugin()],
 * })
 * ```
 */
export interface MultiAgentPlugin {
  /**
   * A stable string identifier for the plugin.
   * Used for logging, duplicate detection, and plugin management.
   */
  readonly name: string

  /**
   * Initialize the plugin with the orchestrator instance.
   *
   * @param orchestrator - The orchestrator this plugin is being attached to
   */
  initMultiAgent(orchestrator: MultiAgentBase): void | Promise<void>
}
