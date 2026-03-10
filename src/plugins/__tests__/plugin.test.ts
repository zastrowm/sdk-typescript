import { describe, it, expect } from 'vitest'
import { Plugin, type PluginAgent } from '../plugin.js'
import { BeforeInvocationEvent, type HookableEvent } from '../../hooks/events.js'
import { ToolRegistry } from '../../registry/tool-registry.js'
import type { HookableEventConstructor, HookCallback, HookCleanup } from '../../hooks/types.js'

/**
 * Concrete implementation of Plugin for testing purposes.
 */
class TestPlugin extends Plugin {
  callbacks: Array<{ eventType: unknown; callback: unknown }> = []

  get name(): string {
    return 'test-plugin'
  }

  override initAgent(agent: PluginAgent): void {
    agent.addHook(BeforeInvocationEvent, () => {
      // No-op for testing
    })
  }
}

/**
 * Plugin with custom name for testing.
 */
class CustomNamePlugin extends Plugin {
  private readonly _name: string

  constructor(name: string) {
    super()
    this._name = name
  }

  get name(): string {
    return this._name
  }

  // Uses default empty initAgent
}

/**
 * Plugin with initAgent implementation for testing.
 */
class InitializablePlugin extends Plugin {
  public initialized = false

  get name(): string {
    return 'initializable-plugin'
  }

  override initAgent(_agent: PluginAgent): void {
    this.initialized = true
  }
}

describe('Plugin', () => {
  describe('name', () => {
    it('returns the plugin name', () => {
      const plugin = new TestPlugin()
      expect(plugin.name).toBe('test-plugin')
    })

    it('supports custom names via constructor', () => {
      const plugin = new CustomNamePlugin('my-custom-plugin')
      expect(plugin.name).toBe('my-custom-plugin')
    })
  })

  describe('initAgent', () => {
    it('registers callbacks via agent.addHook', () => {
      const plugin = new TestPlugin()
      const callbacks: Array<{
        eventType: HookableEventConstructor<HookableEvent>
        callback: HookCallback<HookableEvent>
      }> = []
      const mockAgent: PluginAgent = {
        addHook: <T extends HookableEvent>(
          eventType: HookableEventConstructor<T>,
          callback: HookCallback<T>
        ): HookCleanup => {
          callbacks.push({
            eventType: eventType as HookableEventConstructor<HookableEvent>,
            callback: callback as HookCallback<HookableEvent>,
          })
          return () => {}
        },
        toolRegistry: new ToolRegistry(),
      }

      plugin.initAgent(mockAgent)

      expect(callbacks).toHaveLength(1)
      expect(callbacks[0]?.eventType).toBe(BeforeInvocationEvent)
    })

    it('has a default empty implementation', () => {
      const plugin = new CustomNamePlugin('test')
      const mockAgent: PluginAgent = {
        addHook: () => () => {},
        toolRegistry: new ToolRegistry(),
      }

      // Should not throw
      const result = plugin.initAgent(mockAgent)
      expect(result).toBeUndefined()
    })

    it('can be overridden for custom initialization', () => {
      const plugin = new InitializablePlugin()
      const mockAgent: PluginAgent = {
        addHook: () => () => {},
        toolRegistry: new ToolRegistry(),
      }

      expect(plugin.initialized).toBe(false)

      plugin.initAgent(mockAgent)

      expect(plugin.initialized).toBe(true)
    })
  })

  describe('getTools', () => {
    it('returns empty array by default', () => {
      const plugin = new TestPlugin()
      expect(plugin.getTools()).toEqual([])
    })
  })
})
