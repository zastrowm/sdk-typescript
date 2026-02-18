/**
 * Test fixtures and helpers for Model testing.
 * This module provides utilities for testing Model implementations without
 * requiring actual API clients.
 */

import { Model } from '../models/model.js'
import {
  Message,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ReasoningBlock,
  CachePointBlock,
  GuardContentBlock,
  JsonBlock,
} from '../types/messages.js'
import type { ContentBlock, ToolResultContent, Role } from '../types/messages.js'
import type { ModelStreamEvent } from '../models/streaming.js'
import type { BaseModelConfig, StreamOptions } from '../models/model.js'
import type { JSONValue } from '../types/json.js'
import { ImageBlock, VideoBlock, DocumentBlock } from '../types/media.js'

/**
 * Plain object representation of a content block for test data.
 */
type ContentBlockInput =
  | ContentBlock
  | { type: 'textBlock'; text: string }
  | { type: 'toolUseBlock'; name: string; toolUseId: string; input: JSONValue }
  | {
      type: 'toolResultBlock'
      toolUseId: string
      status: 'success' | 'error'
      content: ({ type: 'textBlock'; text: string } | { type: 'jsonBlock'; json: JSONValue })[]
    }
  | { type: 'reasoningBlock'; text?: string; signature?: string; redactedContent?: Uint8Array }
  | { type: 'cachePointBlock'; cacheType?: 'default' | 'ephemeral' }
  | { type: 'guardContentBlock'; text?: { text: string; qualifiers: string[] }; image?: unknown }
  | { type: 'jsonBlock'; json: JSONValue }

/**
 * Plain object representation of a message for test data.
 */
type MessageData = {
  type?: 'message'
  role: Role
  content: ContentBlockInput[]
}

/**
 * Converts a plain content block object to a ContentBlock instance.
 */
function contentBlockFromInput(input: ContentBlockInput): ContentBlock {
  // If it's already a class instance, return it
  if (
    input instanceof TextBlock ||
    input instanceof ToolUseBlock ||
    input instanceof ToolResultBlock ||
    input instanceof ReasoningBlock ||
    input instanceof CachePointBlock ||
    input instanceof GuardContentBlock ||
    input instanceof JsonBlock ||
    input instanceof ImageBlock ||
    input instanceof VideoBlock ||
    input instanceof DocumentBlock
  ) {
    return input as ContentBlock
  }

  switch (input.type) {
    case 'textBlock':
      return new TextBlock(input.text)
    case 'toolUseBlock':
      return new ToolUseBlock({ name: input.name, toolUseId: input.toolUseId, input: input.input })
    case 'toolResultBlock':
      return new ToolResultBlock({
        toolUseId: input.toolUseId,
        status: input.status,
        content: input.content.map((c): ToolResultContent => {
          if (c.type === 'textBlock') {
            return new TextBlock(c.text)
          } else {
            return new JsonBlock({ json: c.json })
          }
        }),
      })
    case 'reasoningBlock': {
      const data: { text?: string; signature?: string; redactedContent?: Uint8Array } = {}
      if (input.text !== undefined) data.text = input.text
      if (input.signature !== undefined) data.signature = input.signature
      if (input.redactedContent !== undefined) data.redactedContent = input.redactedContent
      return new ReasoningBlock(data)
    }
    case 'cachePointBlock':
      return new CachePointBlock({ cacheType: (input.cacheType ?? 'default') as 'default' })
    case 'guardContentBlock': {
      const guardData: { text?: { text: string; qualifiers: string[] }; image?: unknown } = {}
      if (input.text !== undefined) {
        guardData.text = input.text
      }
      if (input.image !== undefined) {
        guardData.image = input.image
      }
      return new GuardContentBlock(guardData as never)
    }
    case 'jsonBlock':
      // JsonBlock is not in ContentBlock union, so we throw
      throw new Error('JsonBlock is not a valid ContentBlock type')
    default:
      throw new Error(`Unknown content block type: ${(input as ContentBlockInput).type}`)
  }
}

/**
 * Creates an array of Message instances from plain object data.
 * This helper allows tests to use plain objects for message data while
 * ensuring proper Message instances are created.
 *
 * @example
 * ```typescript
 * const messages = createMessages([
 *   { role: 'user', content: [{ type: 'textBlock', text: 'Hello' }] },
 *   { role: 'assistant', content: [{ type: 'textBlock', text: 'Hi!' }] }
 * ])
 * ```
 */
export function createMessages(data: (MessageData | Message)[]): Message[] {
  return data.map((m) => {
    if (m instanceof Message) {
      return m
    }
    return new Message({
      role: m.role,
      content: m.content.map(contentBlockFromInput),
    })
  })
}

/**
 * Test model provider that returns a predefined stream of events.
 * Useful for testing Model.streamAggregated() and other Model functionality
 * without requiring actual API calls.
 *
 * @example
 * ```typescript
 * const provider = new TestModelProvider(async function* () {
 *   yield { type: 'modelMessageStartEvent', role: 'assistant' }
 *   yield { type: 'modelContentBlockStartEvent' }
 *   yield { type: 'modelContentBlockDeltaEvent', delta: { type: 'textDelta', text: 'Hello' } }
 *   yield { type: 'modelContentBlockStopEvent' }
 *   yield { type: 'modelMessageStopEvent', stopReason: 'endTurn' }
 * })
 *
 * const message = await collectAggregated(provider.streamAggregated(messages))
 * ```
 */
export class TestModelProvider extends Model<BaseModelConfig> {
  private eventGenerator: (() => AsyncGenerator<ModelStreamEvent>) | undefined
  private config: BaseModelConfig = { modelId: 'test-model' }

  constructor(eventGenerator?: () => AsyncGenerator<ModelStreamEvent>) {
    super()
    this.eventGenerator = eventGenerator
  }

  setEventGenerator(eventGenerator: () => AsyncGenerator<ModelStreamEvent>): void {
    this.eventGenerator = eventGenerator
  }

  updateConfig(modelConfig: BaseModelConfig): void {
    this.config = { ...this.config, ...modelConfig }
  }

  getConfig(): BaseModelConfig {
    return this.config
  }

  async *stream(_messages: Message[], _options?: StreamOptions): AsyncGenerator<ModelStreamEvent> {
    if (!this.eventGenerator) {
      throw new Error('Event generator not set')
    }
    yield* this.eventGenerator()
  }
}

/**
 * Helper function to collect events and result from an async generator.
 * Properly handles AsyncGenerator where the final value is returned
 * rather than yielded.
 *
 * @param generator - An async generator that yields items and returns a final result
 * @returns Object with items array (yielded values) and result (return value)
 */
export async function collectGenerator<E, R>(
  generator: AsyncGenerator<E, R, never>
): Promise<{ items: E[]; result: R }> {
  const items: E[] = []
  let done = false
  let result: R | undefined

  while (!done) {
    const { value, done: isDone } = await generator.next()
    done = isDone ?? false
    if (!done) {
      items.push(value as E)
    } else {
      result = value as R
    }
  }

  return { items, result: result! }
}

/**
 * Helper function to collect all items from an async iterator.
 *
 * @param stream - An async iterable that yields items
 * @returns Array of all yielded items
 */
export async function collectIterator<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of stream) {
    items.push(item)
  }
  return items
}
