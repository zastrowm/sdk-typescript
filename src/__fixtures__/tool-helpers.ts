/**
 * Test fixtures and helpers for Tool testing.
 * This module provides utilities for testing Tool implementations.
 */

import type { Tool, ToolContext } from '../tools/tool.js'
import { ToolResultBlock, TextBlock, JsonBlock } from '../types/messages.js'
import type { JSONValue } from '../types/json.js'
import { AgentState } from '../agent/state.js'

/**
 * Input type for tool result that accepts both plain objects and class instances.
 * This allows tests to pass simple objects without needing to instantiate classes.
 */
export type ToolResultBlockInput = {
  type: 'toolResultBlock'
  toolUseId: string
  status: 'success' | 'error'
  content: ({ type: 'textBlock'; text: string } | { type: 'jsonBlock'; json: JSONValue })[]
}

/**
 * Helper to create a mock ToolContext for testing.
 *
 * @param toolUse - The tool use request
 * @param agentState - Optional initial agent state
 * @returns Mock ToolContext object
 */
export function createMockContext(
  toolUse: { name: string; toolUseId: string; input: JSONValue },
  agentState?: Record<string, JSONValue>
): ToolContext {
  return {
    toolUse,
    agent: {
      state: new AgentState(agentState),
      messages: [],
    },
  }
}

/**
 * Converts a ToolResultBlockInput to a ToolResultBlock instance.
 */
function toToolResultBlock(input: ToolResultBlock | ToolResultBlockInput): ToolResultBlock {
  if (input instanceof ToolResultBlock) {
    return input
  }
  return new ToolResultBlock({
    toolUseId: input.toolUseId,
    status: input.status,
    content: input.content.map((c) => {
      if (c.type === 'textBlock') {
        return new TextBlock(c.text)
      } else {
        return new JsonBlock({ json: c.json })
      }
    }),
  })
}

/**
 * Helper to create a mock tool for testing.
 *
 * @param name - The name of the mock tool
 * @param resultFn - Function that returns a ToolResultBlock (or plain object) or an AsyncGenerator that yields nothing and returns a ToolResultBlock
 * @returns Mock Tool object
 */
export function createMockTool(
  name: string,
  resultFn: () =>
    | ToolResultBlock
    | ToolResultBlockInput
    | AsyncGenerator<never, ToolResultBlock | ToolResultBlockInput, never>
): Tool {
  return {
    name,
    description: `Mock tool ${name}`,
    toolSpec: {
      name,
      description: `Mock tool ${name}`,
      inputSchema: { type: 'object', properties: {} },
    },
    // eslint-disable-next-line require-yield
    async *stream(_context): AsyncGenerator<never, ToolResultBlock, never> {
      const result = resultFn()
      if (typeof result === 'object' && result !== null && Symbol.asyncIterator in result) {
        // For generators that throw errors
        const gen = result as AsyncGenerator<never, ToolResultBlock | ToolResultBlockInput, never>
        let done = false
        while (!done) {
          const { value, done: isDone } = await gen.next()
          done = isDone ?? false
          if (done) {
            return toToolResultBlock(value)
          }
        }
        // This should never be reached but TypeScript needs a return
        throw new Error('Generator ended unexpectedly')
      } else {
        return toToolResultBlock(result)
      }
    },
  }
}

/**
 * Helper to create a simple mock tool with minimal configuration for testing.
 * This is a lighter-weight version of createMockTool for scenarios where the tool's
 * execution behavior is not relevant to the test.
 *
 * @param name - Optional name of the mock tool (defaults to a random UUID)
 * @returns Mock Tool object
 */
export function createRandomTool(name?: string): Tool {
  const toolName = name ?? globalThis.crypto.randomUUID()
  return createMockTool(
    toolName,
    () =>
      new ToolResultBlock({
        toolUseId: 'test-id',
        status: 'success' as const,
        content: [],
      })
  )
}
