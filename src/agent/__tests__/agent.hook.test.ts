import { beforeEach, describe, expect, it } from 'vitest'
import { Agent } from '../agent.js'
import {
  AfterInvocationEvent,
  AfterModelCallEvent,
  AfterToolCallEvent,
  BeforeInvocationEvent,
  BeforeModelCallEvent,
  BeforeToolCallEvent,
  MessageAddedEvent,
  ModelStreamEventHook,
  type HookRegistry,
} from '../../hooks/index.js'
import { MockMessageModel } from '../../__fixtures__/mock-message-model.js'
import { MockHookProvider } from '../../__fixtures__/mock-hook-provider.js'
import { collectIterator } from '../../__fixtures__/model-test-helpers.js'
import { FunctionTool } from '../../tools/function-tool.js'
import { Message, TextBlock, ToolResultBlock } from '../../types/messages.js'

describe('Agent Hooks Integration', () => {
  let mockProvider: MockHookProvider

  beforeEach(() => {
    mockProvider = new MockHookProvider()
  })

  describe('invocation lifecycle', () => {
    it('fires hooks during invoke', async () => {
      const lifecycleProvider = new MockHookProvider({ includeModelEvents: false })
      const model = new MockMessageModel().addTurn({ type: 'textBlock', text: 'Hello' })
      const agent = new Agent({ model, hooks: [lifecycleProvider] })

      await agent.invoke('Hi')

      expect(lifecycleProvider.invocations).toHaveLength(6)

      expect(lifecycleProvider.invocations[0]).toEqual(new BeforeInvocationEvent({ agent: agent }))
      expect(lifecycleProvider.invocations[1]).toEqual(
        new MessageAddedEvent({ agent: agent, message: new Message({ role: 'user', content: [new TextBlock('Hi')] }) })
      )
      expect(lifecycleProvider.invocations[2]).toEqual(new BeforeModelCallEvent({ agent: agent }))
      expect(lifecycleProvider.invocations[3]).toEqual(
        new AfterModelCallEvent({
          agent,
          stopData: {
            stopReason: 'endTurn',
            message: new Message({ role: 'assistant', content: [new TextBlock('Hello')] }),
          },
        })
      )
      expect(lifecycleProvider.invocations[4]).toEqual(
        new MessageAddedEvent({
          agent,
          message: new Message({ role: 'assistant', content: [new TextBlock('Hello')] }),
        })
      )
      expect(lifecycleProvider.invocations[5]).toEqual(new AfterInvocationEvent({ agent }))
    })

    it('fires hooks during stream', async () => {
      const lifecycleProvider = new MockHookProvider({ includeModelEvents: false })
      const model = new MockMessageModel().addTurn({ type: 'textBlock', text: 'Hello' })
      const agent = new Agent({ model, hooks: [lifecycleProvider] })

      await collectIterator(agent.stream('Hi'))

      expect(lifecycleProvider.invocations).toHaveLength(6)

      expect(lifecycleProvider.invocations[0]).toEqual(new BeforeInvocationEvent({ agent: agent }))
      expect(lifecycleProvider.invocations[1]).toEqual(
        new MessageAddedEvent({
          agent: agent,
          message: new Message({ role: 'user', content: [new TextBlock('Hi')] }),
        })
      )
      expect(lifecycleProvider.invocations[2]).toEqual(new BeforeModelCallEvent({ agent: agent }))
      expect(lifecycleProvider.invocations[3]).toEqual(
        new AfterModelCallEvent({
          agent,
          stopData: {
            stopReason: 'endTurn',
            message: new Message({ role: 'assistant', content: [new TextBlock('Hello')] }),
          },
        })
      )
      expect(lifecycleProvider.invocations[4]).toEqual(
        new MessageAddedEvent({
          agent,
          message: new Message({ role: 'assistant', content: [new TextBlock('Hello')] }),
        })
      )
      expect(lifecycleProvider.invocations[5]).toEqual(new AfterInvocationEvent({ agent }))
    })
  })

  describe('runtime hook registration', () => {
    it('allows adding hooks after agent creation', async () => {
      const lifecycleProvider = new MockHookProvider({ includeModelEvents: false })
      const model = new MockMessageModel().addTurn({ type: 'textBlock', text: 'Hello' })
      const agent = new Agent({ model })

      agent.hooks.addHook(lifecycleProvider)

      await agent.invoke('Hi')

      // Should have all lifecycle events
      expect(lifecycleProvider.invocations).toHaveLength(6)
      expect(lifecycleProvider.invocations[0]).toEqual(new BeforeInvocationEvent({ agent }))
      expect(lifecycleProvider.invocations[5]).toEqual(new AfterInvocationEvent({ agent }))
    })
  })

  describe('multi-turn conversations', () => {
    it('fires hooks for each invoke call', async () => {
      const lifecycleProvider = new MockHookProvider({ includeModelEvents: false })
      const model = new MockMessageModel()
        .addTurn({ type: 'textBlock', text: 'First response' })
        .addTurn({ type: 'textBlock', text: 'Second response' })

      const agent = new Agent({ model, hooks: [lifecycleProvider] })

      await agent.invoke('First message')

      // First turn should have: BeforeInvocation, MessageAdded, BeforeModelCall, AfterModelCall, MessageAdded, AfterInvocation
      expect(lifecycleProvider.invocations).toHaveLength(6)

      await agent.invoke('Second message')

      // Should have 10 events total (6 for each turn)
      expect(lifecycleProvider.invocations).toHaveLength(12)

      // Filter for just Invocation events to verify they fire for each turn
      const invocationEvents = lifecycleProvider.invocations.filter(
        (e) => e instanceof BeforeInvocationEvent || e instanceof AfterInvocationEvent
      )
      expect(invocationEvents).toHaveLength(4) // 2 for each turn
    })
  })

  describe('tool execution hooks', () => {
    it('fires tool hooks during tool execution', async () => {
      const tool = new FunctionTool({
        name: 'testTool',
        description: 'A test tool',
        inputSchema: {},
        callback: () => 'Tool result',
      })

      const model = new MockMessageModel()
        .addTurn({ type: 'toolUseBlock', name: 'testTool', toolUseId: 'tool-1', input: {} })
        .addTurn({ type: 'textBlock', text: 'Final response' })

      const agent = new Agent({
        model,
        tools: [tool],
        hooks: [mockProvider],
      })

      await agent.invoke('Test with tool')

      // Find key events
      const beforeToolCallEvents = mockProvider.invocations.filter((e) => e instanceof BeforeToolCallEvent)
      const afterToolCallEvents = mockProvider.invocations.filter((e) => e instanceof AfterToolCallEvent)
      const messageAddedEvents = mockProvider.invocations.filter((e) => e instanceof MessageAddedEvent)

      // Verify tool hooks fired
      expect(beforeToolCallEvents.length).toBe(1)
      expect(afterToolCallEvents.length).toBe(1)

      // Verify 3 MessageAdded events: input message, assistant with tool use, tool result, final assistant
      expect(messageAddedEvents.length).toBe(4)

      // Verify BeforeToolCallEvent
      const beforeToolCall = beforeToolCallEvents[0] as BeforeToolCallEvent
      expect(beforeToolCall).toEqual(
        new BeforeToolCallEvent({
          agent,
          toolUse: { name: 'testTool', toolUseId: 'tool-1', input: {} },
          tool,
        })
      )

      // Verify AfterToolCallEvent
      const afterToolCall = afterToolCallEvents[0] as AfterToolCallEvent
      expect(afterToolCall).toEqual(
        new AfterToolCallEvent({
          agent,
          toolUse: { name: 'testTool', toolUseId: 'tool-1', input: {} },
          tool,
          result: new ToolResultBlock({
            toolUseId: 'tool-1',
            status: 'success',
            content: [new TextBlock('Tool result')],
          }),
        })
      )
    })

    it('fires AfterToolCallEvent with error when tool fails', async () => {
      const tool = new FunctionTool({
        name: 'failingTool',
        description: 'A tool that fails',
        inputSchema: {},
        callback: () => {
          throw new Error('Tool execution failed')
        },
      })

      const model = new MockMessageModel()
        .addTurn({ type: 'toolUseBlock', name: 'failingTool', toolUseId: 'tool-1', input: {} })
        .addTurn({ type: 'textBlock', text: 'Handled error' })

      const agent = new Agent({
        model,
        tools: [tool],
        hooks: [mockProvider],
      })

      // Agent should complete successfully (tool errors are handled gracefully)
      const result = await agent.invoke('Test with failing tool')
      expect(result.stopReason).toBe('endTurn')

      // Find AfterToolCallEvent
      const afterToolCallEvents = mockProvider.invocations.filter((e) => e instanceof AfterToolCallEvent)
      expect(afterToolCallEvents.length).toBe(1)

      const afterToolCall = afterToolCallEvents[0] as AfterToolCallEvent
      expect(afterToolCall).toEqual(
        new AfterToolCallEvent({
          agent,
          toolUse: { name: 'failingTool', toolUseId: 'tool-1', input: {} },
          tool,
          result: new ToolResultBlock({
            error: new Error('Tool execution failed'),
            toolUseId: 'tool-1',
            status: 'error',
            content: [new TextBlock('Error: Tool execution failed')],
          }),
        })
      )
    })
  })

  describe('ModelStreamEventHook', () => {
    it('fires for each streaming event from the model', async () => {
      const model = new MockMessageModel().addTurn({ type: 'textBlock', text: 'Hello' })

      const agent = new Agent({
        model,
        hooks: [mockProvider],
      })

      // Collect all stream events
      const allStreamEvents = []
      for await (const event of agent.stream('Test')) {
        allStreamEvents.push(event)
      }

      const streamEventHooks = mockProvider.invocations.filter((e) => e instanceof ModelStreamEventHook)

      // Should have events
      expect(streamEventHooks.length).toBeGreaterThan(0)

      // Verify each hook event matches a stream event
      for (const hookEvent of streamEventHooks) {
        const event = (hookEvent as ModelStreamEventHook).event
        expect(allStreamEvents).toContain(event)
      }
    })
  })

  describe('MessageAddedEvent', () => {
    it('fires for initial user input', async () => {
      const initialMessage = { role: 'user' as const, content: [{ type: 'textBlock' as const, text: 'Initial' }] }

      const model = new MockMessageModel().addTurn({ type: 'textBlock', text: 'Response' })

      const agent = new Agent({
        model,
        messages: [initialMessage],
        hooks: [mockProvider],
      })

      await agent.invoke('New message')

      const messageAddedEvents = mockProvider.invocations.filter((e) => e instanceof MessageAddedEvent)

      // Should have 2 MessageAdded event
      expect(messageAddedEvents).toHaveLength(2)

      expect(messageAddedEvents[0]).toEqual(
        new MessageAddedEvent({
          agent,
          message: new Message({ role: 'user', content: [new TextBlock('New message')] }),
        })
      )
      expect(messageAddedEvents[1]).toEqual(
        new MessageAddedEvent({
          agent,
          message: new Message({ role: 'assistant', content: [new TextBlock('Response')] }),
        })
      )
    })
  })

  describe('AfterModelCallEvent retryModelCall', () => {
    it('retries model call when hook sets retryModelCall', async () => {
      let callCount = 0
      const retryHook = {
        registerCallbacks: (registry: HookRegistry) => {
          registry.addCallback(AfterModelCallEvent, (event: AfterModelCallEvent) => {
            callCount++
            if (callCount === 1 && event.error) {
              event.retryModelCall = true
            }
          })
        },
      }

      const model = new MockMessageModel()
        .addTurn(new Error('First attempt failed'))
        .addTurn({ type: 'textBlock', text: 'Success after retry' })

      const agent = new Agent({ model, hooks: [retryHook] })
      const result = await agent.invoke('Test')

      expect(result.lastMessage.content[0]).toEqual({ type: 'textBlock', text: 'Success after retry' })
      expect(callCount).toBe(2)
    })

    it('does not retry when retryModelCall is not set', async () => {
      const model = new MockMessageModel().addTurn(new Error('Failure'))
      const agent = new Agent({ model })

      await expect(agent.invoke('Test')).rejects.toThrow('Failure')
    })
  })

  describe('BeforeToolCallEvent writable properties', () => {
    it('allows hook to modify tool to switch to different tool', async () => {
      const tool1 = new FunctionTool({
        name: 'tool1',
        description: 'First tool',
        inputSchema: {},
        callback: () => 'Tool 1 result',
      })

      const tool2 = new FunctionTool({
        name: 'tool2',
        description: 'Second tool',
        inputSchema: {},
        callback: () => 'Tool 2 result',
      })

      const model = new MockMessageModel()
        .addTurn({ type: 'toolUseBlock', name: 'tool1', toolUseId: 'id-1', input: {} })
        .addTurn({ type: 'textBlock', text: 'Done' })

      const agent = new Agent({ model, tools: [tool1, tool2] })

      // Hook to switch tool
      agent.hooks.addCallback(BeforeToolCallEvent, (event: BeforeToolCallEvent) => {
        if (event.toolUse.name === 'tool1') {
          event.tool = tool2
        }
      })

      await agent.invoke('Test')

      // Verify tool2 was executed instead of tool1
      const toolResultMessage = agent.messages[2]!
      expect(toolResultMessage.role).toBe('user')
      expect(toolResultMessage.content[0]).toEqual(
        new ToolResultBlock({
          toolUseId: 'id-1',
          status: 'success',
          content: [new TextBlock('Tool 2 result')],
        })
      )
    })

    it('allows hook to modify tool to undefined causing error result', async () => {
      const tool = new FunctionTool({
        name: 'testTool',
        description: 'Test tool',
        inputSchema: {},
        callback: () => 'Tool result',
      })

      const model = new MockMessageModel()
        .addTurn({ type: 'toolUseBlock', name: 'testTool', toolUseId: 'id-1', input: {} })
        .addTurn({ type: 'textBlock', text: 'Done' })

      const agent = new Agent({ model, tools: [tool] })

      // Hook to set tool to undefined
      agent.hooks.addCallback(BeforeToolCallEvent, (event: BeforeToolCallEvent) => {
        event.tool = undefined
      })

      await agent.invoke('Test')

      // Verify error result was returned
      const toolResultMessage = agent.messages[2]!
      expect(toolResultMessage.role).toBe('user')
      const resultBlock = toolResultMessage.content[0] as ToolResultBlock
      expect(resultBlock.status).toBe('error')
      expect(resultBlock.content[0]).toEqual(new TextBlock("Tool 'testTool' not found in registry"))
    })

    it('allows hook to modify toolUse.input', async () => {
      let receivedInput: unknown = null

      const tool = new FunctionTool({
        name: 'calculator',
        description: 'Calculator tool',
        inputSchema: {},
        callback: (input) => {
          receivedInput = input
          return 'Result'
        },
      })

      const model = new MockMessageModel()
        .addTurn({ type: 'toolUseBlock', name: 'calculator', toolUseId: 'id-1', input: { value: 10 } })
        .addTurn({ type: 'textBlock', text: 'Done' })

      const agent = new Agent({ model, tools: [tool] })

      // Hook to modify input
      agent.hooks.addCallback(BeforeToolCallEvent, (event: BeforeToolCallEvent) => {
        event.toolUse = {
          ...event.toolUse,
          input: { value: 42 },
        }
      })

      await agent.invoke('Test')

      // Verify tool received modified input
      expect(receivedInput).toEqual({ value: 42 })
    })

    it('allows hook to modify toolUse.name', async () => {
      const tool1 = new FunctionTool({
        name: 'tool1',
        description: 'First tool',
        inputSchema: {},
        callback: () => 'Tool 1 result',
      })

      const tool2 = new FunctionTool({
        name: 'tool2',
        description: 'Second tool',
        inputSchema: {},
        callback: () => 'Tool 2 result',
      })

      const model = new MockMessageModel()
        .addTurn({ type: 'toolUseBlock', name: 'tool1', toolUseId: 'id-1', input: {} })
        .addTurn({ type: 'textBlock', text: 'Done' })

      const agent = new Agent({ model, tools: [tool1, tool2] })

      // Hook to modify toolUse.name and tool
      agent.hooks.addCallback(BeforeToolCallEvent, (event: BeforeToolCallEvent) => {
        if (event.toolUse.name === 'tool1') {
          event.toolUse = {
            ...event.toolUse,
            name: 'tool2',
          }
          event.tool = tool2
        }
      })

      await agent.invoke('Test')

      // Verify tool2 was executed
      const toolResultMessage = agent.messages[2]!
      expect(toolResultMessage.role).toBe('user')
      expect(toolResultMessage.content[0]).toEqual(
        new ToolResultBlock({
          toolUseId: 'id-1',
          status: 'success',
          content: [new TextBlock('Tool 2 result')],
        })
      )
    })
  })

  describe('AfterToolCallEvent writable properties', () => {
    it('allows hook to modify result content', async () => {
      const tool = new FunctionTool({
        name: 'testTool',
        description: 'Test tool',
        inputSchema: {},
        callback: () => 'Original result',
      })

      const model = new MockMessageModel()
        .addTurn({ type: 'toolUseBlock', name: 'testTool', toolUseId: 'id-1', input: {} })
        .addTurn({ type: 'textBlock', text: 'Done' })

      const agent = new Agent({ model, tools: [tool] })

      // Hook to modify result
      agent.hooks.addCallback(AfterToolCallEvent, (event: AfterToolCallEvent) => {
        event.result = new ToolResultBlock({
          toolUseId: event.result.toolUseId,
          status: event.result.status,
          content: [new TextBlock('Modified result')],
        })
      })

      await agent.invoke('Test')

      // Verify modified result appears in conversation
      const toolResultMessage = agent.messages[2]!
      expect(toolResultMessage.role).toBe('user')
      expect(toolResultMessage.content[0]).toEqual(
        new ToolResultBlock({
          toolUseId: 'id-1',
          status: 'success',
          content: [new TextBlock('Modified result')],
        })
      )
    })

    it('allows hook to modify result status from success to error', async () => {
      const tool = new FunctionTool({
        name: 'testTool',
        description: 'Test tool',
        inputSchema: {},
        callback: () => 'Success result',
      })

      const model = new MockMessageModel()
        .addTurn({ type: 'toolUseBlock', name: 'testTool', toolUseId: 'id-1', input: {} })
        .addTurn({ type: 'textBlock', text: 'Done' })

      const agent = new Agent({ model, tools: [tool] })

      // Hook to change status
      agent.hooks.addCallback(AfterToolCallEvent, (event: AfterToolCallEvent) => {
        event.result = new ToolResultBlock({
          toolUseId: event.result.toolUseId,
          status: 'error',
          content: [new TextBlock('Forced error')],
        })
      })

      await agent.invoke('Test')

      // Verify error status appears in conversation
      const toolResultMessage = agent.messages[2]!
      expect(toolResultMessage.role).toBe('user')
      const resultBlock = toolResultMessage.content[0] as ToolResultBlock
      expect(resultBlock.status).toBe('error')
      expect(resultBlock.content[0]).toEqual(new TextBlock('Forced error'))
    })
  })
})
