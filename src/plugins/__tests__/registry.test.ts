import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PluginRegistry } from '../registry.js'
import { Plugin } from '../plugin.js'
import { BeforeInvocationEvent, type HookableEvent } from '../../hooks/events.js'
import { ToolRegistry } from '../../registry/tool-registry.js'
import type { Tool } from '../../tools/tool.js'
import type { HookableEventConstructor, HookCallback, HookCleanup } from '../../hooks/types.js'
import type { AgentData } from '../../types/agent.js'

/**
 * Test plugin implementation.
 */
class TestPlugin extends Plugin {
  public hookRegistered = false
  private readonly _name: string

  constructor(name: string = 'test-plugin') {
    super()
    this._name = name
  }

  get name(): string {
    return this._name
  }

  override initAgent(agent: AgentData): void {
    agent.addHook(BeforeInvocationEvent, () => {
      this.hookRegistered = true
    })
  }
}

/**
 * Plugin with initAgent for testing initialization.
 */
class InitializableTestPlugin extends Plugin {
  public initialized = false

  constructor(private readonly _name: string = 'initializable-plugin') {
    super()
  }

  get name(): string {
    return this._name
  }

  override initAgent(_agent: AgentData): void {
    this.initialized = true
  }
}

/**
 * Plugin that provides tools.
 */
class ToolProviderPlugin extends Plugin {
  private readonly _tools: Tool[]

  constructor(
    private readonly _name: string,
    tools: Tool[]
  ) {
    super()
    this._tools = tools
  }

  get name(): string {
    return this._name
  }

  override getTools(): Tool[] {
    return this._tools
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry
  let mockAgent: AgentData
  let toolRegistry: ToolRegistry
  let registeredHooks: Array<{
    eventType: HookableEventConstructor<HookableEvent>
    callback: HookCallback<HookableEvent>
  }>

  beforeEach(() => {
    registeredHooks = []
    toolRegistry = new ToolRegistry()
    mockAgent = {
      addHook: <T extends HookableEvent>(
        eventType: HookableEventConstructor<T>,
        callback: HookCallback<T>
      ): HookCleanup => {
        registeredHooks.push({
          eventType: eventType as HookableEventConstructor<HookableEvent>,
          callback: callback as HookCallback<HookableEvent>,
        })
        return () => {}
      },
      toolRegistry,
    } as unknown as AgentData
    registry = new PluginRegistry()
  })

  describe('addAndInit', () => {
    it('adds a plugin and calls initAgent', async () => {
      const plugin = new InitializableTestPlugin()

      await registry.addAndInit(plugin, mockAgent)

      expect(plugin.initialized).toBe(true)
    })

    it('registers hooks via agent.addHook', async () => {
      const plugin = new TestPlugin()

      await registry.addAndInit(plugin, mockAgent)

      expect(registeredHooks).toHaveLength(1)
      expect(registeredHooks[0]?.eventType).toBe(BeforeInvocationEvent)
    })

    it('throws error when adding duplicate plugin name', async () => {
      const plugin1 = new TestPlugin('duplicate-name')
      const plugin2 = new TestPlugin('duplicate-name')

      await registry.addAndInit(plugin1, mockAgent)

      await expect(registry.addAndInit(plugin2, mockAgent)).rejects.toThrow(
        'plugin_name=<duplicate-name> | plugin already registered'
      )
    })

    it('allows adding plugins with different names', async () => {
      const plugin1 = new TestPlugin('plugin-1')
      const plugin2 = new TestPlugin('plugin-2')

      await registry.addAndInit(plugin1, mockAgent)
      await registry.addAndInit(plugin2, mockAgent)

      // Both should have registered hooks
      expect(registeredHooks).toHaveLength(2)
    })

    it('auto-registers tools from plugin.getTools()', async () => {
      const mockTool = {
        name: 'mock-tool',
        description: 'A mock tool',
        getDefinition: () => ({
          name: 'mock-tool',
          description: 'A mock tool',
          inputSchema: { type: 'object', properties: {} },
        }),
      } as unknown as Tool

      const plugin = new ToolProviderPlugin('tool-provider', [mockTool])

      await registry.addAndInit(plugin, mockAgent)

      expect(toolRegistry.get(mockTool.name)).toBe(mockTool)
    })

    it('handles async initAgent', async () => {
      class AsyncPlugin extends Plugin {
        public initialized = false

        get name(): string {
          return 'async-plugin'
        }

        override async initAgent(_agent: AgentData): Promise<void> {
          await vi.waitFor(() => Promise.resolve())
          this.initialized = true
        }
      }

      const plugin = new AsyncPlugin()
      await registry.addAndInit(plugin, mockAgent)

      expect(plugin.initialized).toBe(true)
    })
  })

  describe('hook invocation', () => {
    it('hooks are invoked when callbacks are called', async () => {
      const plugin = new TestPlugin()
      await registry.addAndInit(plugin, mockAgent)

      // Simulate invoking the registered hook
      const callback = registeredHooks[0]?.callback
      const mockAgentData = {} as AgentData
      callback?.(new BeforeInvocationEvent({ agent: mockAgentData }))

      expect(plugin.hookRegistered).toBe(true)
    })
  })
})
