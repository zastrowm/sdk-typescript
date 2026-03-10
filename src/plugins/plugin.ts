/**
 * Plugin base class for extending agent functionality.
 *
 * This module defines the Plugin base class, which provides a composable way to
 * add behavior changes to agents through hook registration and custom initialization.
 */

import type { HookableEvent } from '../hooks/events.js'
import type { HookCallback, HookableEventConstructor, HookCleanup } from '../hooks/types.js'
import type { Tool } from '../tools/tool.js'
import type { ToolRegistry } from '../registry/tool-registry.js'

/**
 * Interface representing the agent capabilities available to plugins.
 * Plugins receive this interface in initAgent to register hooks and access agent data.
 */
export interface PluginAgent {
  /**
   * Register a hook callback for a specific event type.
   *
   * @param eventType - The event class constructor to register the callback for
   * @param callback - The callback function to invoke when the event occurs
   * @returns Cleanup function that removes the callback when invoked
   */
  addHook<T extends HookableEvent>(eventType: HookableEventConstructor<T>, callback: HookCallback<T>): HookCleanup

  /**
   * The tool registry for registering tools with the agent.
   */
  readonly toolRegistry: ToolRegistry
}

/**
 * Abstract base class for objects that extend agent functionality.
 *
 * Plugins provide a composable way to add behavior changes to agents by registering
 * hook callbacks in their `initAgent` method. Each plugin must have a unique name
 * for identification, logging, and duplicate prevention.
 *
 * @example
 * ```typescript
 * class LoggingPlugin extends Plugin {
 *   get name(): string {
 *     return 'logging-plugin'
 *   }
 *
 *   initAgent(agent: PluginAgent): void {
 *     agent.addHook(BeforeInvocationEvent, (event) => {
 *       console.log('Agent invocation started')
 *     })
 *   }
 * }
 *
 * const agent = new Agent({
 *   model,
 *   plugins: [new LoggingPlugin()],
 * })
 * ```
 *
 * @example With tools
 * ```typescript
 * class MyToolPlugin extends Plugin {
 *   get name(): string {
 *     return 'my-tool-plugin'
 *   }
 *
 *   getTools(): Tool[] {
 *     return [myTool]
 *   }
 * }
 * ```
 */
export abstract class Plugin {
  /**
   * A stable string identifier for the plugin.
   * Used for logging, duplicate detection, and plugin management.
   *
   * For strands-vended plugins, names should be prefixed with `strands:`.
   */
  abstract get name(): string

  /**
   * Initialize the plugin with the agent instance.
   *
   * Override this method to register hooks and perform custom initialization.
   *
   * The default implementation registers tools from {@link getTools}.
   *
   * @param agent - The agent instance this plugin is being attached to
   */
  initAgent(agent: PluginAgent): void | Promise<void> {
    const tools = this.getTools()
    if (tools.length > 0) {
      agent.toolRegistry.addAll(tools)
    }
  }

  /**
   * Returns tools provided by this plugin for auto-registration.
   * Override to provide plugin-specific tools.
   *
   * @returns Array of tools to register with the agent
   */
  getTools(): Tool[] {
    return []
  }
}
