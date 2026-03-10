/**
 * Plugin registry for managing plugins attached to an agent.
 *
 * This module provides the PluginRegistry class for tracking and managing
 * plugins that have been initialized with an agent instance.
 */

import type { Plugin, PluginAgent } from './plugin.js'

/**
 * Registry for managing plugins attached to an agent.
 *
 * The PluginRegistry tracks plugins that have been initialized with an agent,
 * providing methods to add plugins and invoke their initialization.
 *
 * The registry handles:
 * 1. Checking for duplicate plugin names
 * 2. Calling the plugin's initAgent() method for custom initialization
 */
export class PluginRegistry {
  private readonly _plugins: Map<string, Plugin>

  constructor() {
    this._plugins = new Map()
  }

  /**
   * Add and initialize a plugin with the agent.
   *
   * This method:
   * 1. Checks for duplicate plugin names
   * 2. Registers the plugin in the registry
   * 3. Calls the plugin's initAgent method for custom initialization
   *
   * Handles both sync and async initAgent implementations automatically.
   *
   * @param plugin - The plugin to add and initialize
   * @param agent - The agent instance to initialize the plugin with
   * @throws Error if a plugin with the same name is already registered
   */
  async addAndInit(plugin: Plugin, agent: PluginAgent): Promise<void> {
    if (this._plugins.has(plugin.name)) {
      throw new Error(`plugin_name=<${plugin.name}> | plugin already registered`)
    }

    this._plugins.set(plugin.name, plugin)

    // Call plugin's initAgent for hook registration, tool registration, and custom initialization
    await plugin.initAgent(agent)
  }
}
