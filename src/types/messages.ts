import type { JSONValue } from './json.js'
import type { ImageBlockData, VideoBlockData, DocumentBlockData } from './media.js'
import { ImageBlock, VideoBlock, DocumentBlock, encodeBase64, decodeBase64 } from './media.js'

/**
 * Message types and content blocks for conversational AI interactions.
 *
 * This module follows a pattern where <name>Data interfaces define the structure
 * for objects, while corresponding classes extend those interfaces with additional
 * functionality and type discrimination.
 */

/**
 * Data for a message.
 */
export interface MessageData {
  /**
   * The role of the message sender.
   */
  role: Role

  /**
   * Array of content blocks that make up this message.
   */
  content: ContentBlockData[]
}

/**
 * A message in a conversation between user and assistant.
 * Each message has a role (user or assistant) and an array of content blocks.
 */
export class Message {
  /**
   * Discriminator for message type.
   */
  readonly type = 'message' as const

  /**
   * The role of the message sender.
   */
  readonly role: Role

  /**
   * Array of content blocks that make up this message.
   */
  readonly content: ContentBlock[]

  constructor(data: { role: Role; content: ContentBlock[] }) {
    this.role = data.role
    this.content = data.content
  }

  /**
   * Creates a Message instance from MessageData.
   *
   * @param data - The message data to convert
   * @returns A Message instance
   */
  public static fromMessageData(data: MessageData): Message {
    const contentBlocks: ContentBlock[] = data.content.map(contentBlockFromData)

    return new Message({
      role: data.role,
      content: contentBlocks,
    })
  }

  /**
   * Creates a Message instance from a serialized JSON object (MessageData format).
   * This is the counterpart to toJSON() for deserialization.
   *
   * @param data - The serialized message data to deserialize
   * @returns A Message instance with fully reconstructed content blocks
   */
  public static fromJSON(data: MessageData): Message {
    return Message.fromMessageData(data)
  }

  /**
   * Serializes this Message to a JSON-compatible object.
   * Returns MessageData format that can be used with JSON.stringify().
   *
   * @returns MessageData object with serialized content blocks
   */
  toJSON(): MessageData {
    return {
      role: this.role,
      content: this.content.map((block) => block.toJSON() as ContentBlockData),
    }
  }
}

/**
 * Role of a message in a conversation.
 * Can be either 'user' (human input) or 'assistant' (model response).
 */
export type Role = 'user' | 'assistant'

/**
 * A block of content within a message.
 * Content blocks can contain text, tool usage requests, tool results, reasoning content, cache points, guard content, or media (image, video, document).
 *
 * This is a discriminated union where the object key determines the content format.
 *
 * @example
 * ```typescript
 * if ('text' in block) {
 *   console.log(block.text.text)
 * }
 * ```
 */
export type ContentBlockData =
  | TextBlockData
  | { toolUse: ToolUseBlockData }
  | { toolResult: ToolResultBlockData }
  | { reasoning: ReasoningBlockData }
  | { cachePoint: CachePointBlockData }
  | { guardContent: GuardContentBlockData }
  | { image: ImageBlockData }
  | { video: VideoBlockData }
  | { document: DocumentBlockData }

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock
  | ReasoningBlock
  | CachePointBlock
  | GuardContentBlock
  | ImageBlock
  | VideoBlock
  | DocumentBlock

/**
 * Data for a text block.
 */
export interface TextBlockData {
  /**
   * Plain text content.
   */
  text: string
}

/**
 * Text content block within a message.
 */
export class TextBlock implements TextBlockData {
  /**
   * Discriminator for text content.
   */
  readonly type = 'textBlock' as const

  /**
   * Plain text content.
   */
  readonly text: string

  constructor(data: string) {
    this.text = data
  }

  /**
   * Serializes this TextBlock to a JSON-compatible object.
   *
   * @returns TextBlockData object
   */
  toJSON(): TextBlockData {
    return { text: this.text }
  }
}

/**
 * Data for a tool use block.
 */
export interface ToolUseBlockData {
  /**
   * The name of the tool to execute.
   */
  name: string

  /**
   * Unique identifier for this tool use instance.
   */
  toolUseId: string

  /**
   * The input parameters for the tool.
   * This can be any JSON-serializable value.
   */
  input: JSONValue

  /**
   * Reasoning signature from thinking models (e.g., Gemini).
   * Must be preserved and sent back to the model for multi-turn tool use.
   */
  reasoningSignature?: string
}

/**
 * Tool use content block.
 */
export class ToolUseBlock implements ToolUseBlockData {
  /**
   * Discriminator for tool use content.
   */
  readonly type = 'toolUseBlock' as const

  /**
   * The name of the tool to execute.
   */
  readonly name: string

  /**
   * Unique identifier for this tool use instance.
   */
  readonly toolUseId: string

  /**
   * The input parameters for the tool.
   * This can be any JSON-serializable value.
   */
  readonly input: JSONValue

  /**
   * Reasoning signature from thinking models (e.g., Gemini).
   * Must be preserved and sent back to the model for multi-turn tool use.
   */
  readonly reasoningSignature?: string

  constructor(data: ToolUseBlockData) {
    this.name = data.name
    this.toolUseId = data.toolUseId
    this.input = data.input
    if (data.reasoningSignature !== undefined) {
      this.reasoningSignature = data.reasoningSignature
    }
  }

  /**
   * Serializes this ToolUseBlock to a JSON-compatible object.
   *
   * @returns Object in { toolUse: ToolUseBlockData } format
   */
  toJSON(): { toolUse: ToolUseBlockData } {
    const data: ToolUseBlockData = {
      name: this.name,
      toolUseId: this.toolUseId,
      input: this.input,
    }
    if (this.reasoningSignature !== undefined) {
      data.reasoningSignature = this.reasoningSignature
    }
    return { toolUse: data }
  }
}

/**
 * Content within a tool result.
 * Can be either text or structured JSON data.
 *
 * This is a discriminated union where the object key determines the content format.
 */
export type ToolResultContentData = TextBlockData | JsonBlockData

export type ToolResultContent = TextBlock | JsonBlock

/**
 * Data for a tool result block.
 */
export interface ToolResultBlockData {
  /**
   * The ID of the tool use that this result corresponds to.
   */
  toolUseId: string

  /**
   * Status of the tool execution.
   */
  status: 'success' | 'error'

  /**
   * The content returned by the tool.
   */
  content: ToolResultContentData[]

  /**
   * The original error object when status is 'error'.
   * Available for inspection by hooks, error handlers, and event loop.
   * Tools must wrap non-Error thrown values into Error objects.
   */
  error?: Error
}

/**
 * Tool result content block.
 */
export class ToolResultBlock implements ToolResultBlockData {
  /**
   * Discriminator for tool result content.
   */
  readonly type = 'toolResultBlock' as const

  /**
   * The ID of the tool use that this result corresponds to.
   */
  readonly toolUseId: string

  /**
   * Status of the tool execution.
   */
  readonly status: 'success' | 'error'

  /**
   * The content returned by the tool.
   */
  readonly content: ToolResultContent[]

  /**
   * The original error object when status is 'error'.
   * Available for inspection by hooks, error handlers, and event loop.
   * Tools must wrap non-Error thrown values into Error objects.
   */
  readonly error?: Error

  constructor(data: { toolUseId: string; status: 'success' | 'error'; content: ToolResultContent[]; error?: Error }) {
    this.toolUseId = data.toolUseId
    this.status = data.status
    this.content = data.content
    if (data.error !== undefined) {
      this.error = data.error
    }
  }

  /**
   * Serializes this ToolResultBlock to a JSON-compatible object.
   * Note: The error property is excluded from serialization as Error objects
   * are not JSON-serializable and may contain sensitive stack traces.
   *
   * @returns Object in { toolResult: ToolResultBlockData } format (without error)
   */
  toJSON(): { toolResult: Omit<ToolResultBlockData, 'error'> } {
    return {
      toolResult: {
        toolUseId: this.toolUseId,
        status: this.status,
        content: this.content.map((block) => {
          if (block.type === 'textBlock') {
            return { text: block.text }
          } else {
            return { json: block.json }
          }
        }),
      },
    }
  }
}

/**
 * Data for a reasoning block.
 */
export interface ReasoningBlockData {
  /**
   * The text content of the reasoning process.
   */
  text?: string

  /**
   * A cryptographic signature for verification purposes.
   */
  signature?: string

  /**
   * The redacted content of the reasoning process.
   */
  redactedContent?: Uint8Array
}

/**
 * Reasoning content block within a message.
 */
export class ReasoningBlock implements ReasoningBlockData {
  /**
   * Discriminator for reasoning content.
   */
  readonly type = 'reasoningBlock' as const

  /**
   * The text content of the reasoning process.
   */
  readonly text?: string

  /**
   * A cryptographic signature for verification purposes.
   */
  readonly signature?: string

  /**
   * The redacted content of the reasoning process.
   */
  readonly redactedContent?: Uint8Array

  constructor(data: ReasoningBlockData) {
    if (data.text !== undefined) {
      this.text = data.text
    }
    if (data.signature !== undefined) {
      this.signature = data.signature
    }
    if (data.redactedContent !== undefined) {
      this.redactedContent = data.redactedContent
    }
  }

  /**
   * Serializes this ReasoningBlock to a JSON-compatible object.
   * Binary redactedContent is encoded as a base64 string.
   *
   * @returns Object in { reasoning: ReasoningBlockData } format with base64-encoded redactedContent
   */
  toJSON(): { reasoning: ReasoningBlockData | { text?: string; signature?: string; redactedContent?: string } } {
    const data: { text?: string; signature?: string; redactedContent?: string } = {}
    if (this.text !== undefined) {
      data.text = this.text
    }
    if (this.signature !== undefined) {
      data.signature = this.signature
    }
    if (this.redactedContent !== undefined) {
      data.redactedContent = encodeBase64(this.redactedContent)
    }
    return { reasoning: data }
  }
}

/**
 * Data for a cache point block.
 */
export interface CachePointBlockData {
  /**
   * The cache type. Currently only 'default' is supported.
   */
  cacheType: 'default'
}

/**
 * Cache point block for prompt caching.
 * Marks a position in a message or system prompt where caching should occur.
 */
export class CachePointBlock implements CachePointBlockData {
  /**
   * Discriminator for cache point.
   */
  readonly type = 'cachePointBlock' as const

  /**
   * The cache type. Currently only 'default' is supported.
   */
  readonly cacheType: 'default'

  constructor(data: CachePointBlockData) {
    this.cacheType = data.cacheType
  }

  /**
   * Serializes this CachePointBlock to a JSON-compatible object.
   *
   * @returns Object in { cachePoint: CachePointBlockData } format
   */
  toJSON(): { cachePoint: CachePointBlockData } {
    return { cachePoint: { cacheType: this.cacheType } }
  }
}

/**
 * Data for a JSON block.
 */
export interface JsonBlockData {
  /**
   * Structured JSON data.
   */
  json: JSONValue
}

/**
 * JSON content block within a message.
 * Used for structured data returned from tools or model responses.
 */
export class JsonBlock implements JsonBlockData {
  /**
   * Discriminator for JSON content.
   */
  readonly type = 'jsonBlock' as const

  /**
   * Structured JSON data.
   */
  readonly json: JSONValue

  constructor(data: JsonBlockData) {
    this.json = data.json
  }

  /**
   * Serializes this JsonBlock to a JSON-compatible object.
   *
   * @returns JsonBlockData object
   */
  toJSON(): JsonBlockData {
    return { json: this.json }
  }
}

/**
 * Reason why the model stopped generating content.
 *
 * - `contentFiltered` - Content was filtered by safety mechanisms
 * - `endTurn` - Natural end of the model's turn
 * - `guardrailIntervened` - A guardrail policy stopped generation
 * - `maxTokens` - Maximum token limit was reached
 * - `stopSequence` - A stop sequence was encountered
 * - `toolUse` - Model wants to use a tool
 * - `modelContextWindowExceeded` - Input exceeded the model's context window
 */
export type StopReason =
  | 'contentFiltered'
  | 'endTurn'
  | 'guardrailIntervened'
  | 'maxTokens'
  | 'stopSequence'
  | 'toolUse'
  | 'modelContextWindowExceeded'
  | (string & {}) // Allow any string while preserving autocomplete for known values

/**
 * System prompt for guiding model behavior.
 * Can be a simple string or an array of content blocks for advanced caching.
 *
 * @example
 * ```typescript
 * // Simple string
 * const prompt: SystemPrompt = 'You are a helpful assistant'
 *
 * // Array with cache points for advanced caching
 * const prompt: SystemPrompt = [
 *   { textBlock: new TextBlock('You are a helpful assistant') },
 *   { textBlock: new TextBlock(largeContextDocument) },
 *   { cachePointBlock: new CachePointBlock({ cacheType: 'default' }) }
 * ]
 * ```
 */
export type SystemPrompt = string | SystemContentBlock[]

/**
 * Data representation of a system prompt.
 * Can be a simple string or an array of system content block data for advanced caching.
 *
 * This is the data interface counterpart to SystemPrompt, following the <name>Data pattern.
 */
export type SystemPromptData = string | SystemContentBlockData[]

/**
 * Converts SystemPromptData to SystemPrompt by converting data blocks to class instances.
 * If already in SystemPrompt format (class instances), returns as-is.
 *
 * @param data - System prompt data to convert
 * @returns SystemPrompt with class-based content blocks
 */
export function systemPromptFromData(data: SystemPromptData | SystemPrompt): SystemPrompt {
  if (typeof data === 'string') {
    return data
  }

  // Convert data format to class instances
  return data.map((block) => {
    if ('type' in block) {
      return block
    } else if ('cachePoint' in block) {
      return new CachePointBlock(block.cachePoint)
    } else if ('guardContent' in block) {
      return new GuardContentBlock(block.guardContent)
    } else if ('text' in block) {
      return new TextBlock(block.text)
    } else {
      throw new Error('Unknown SystemContentBlockData type')
    }
  })
}

/**
 * A block of content within a system prompt.
 * Supports text content, cache points, and guard content for prompt caching and guardrail evaluation.
 *
 * This is a discriminated union where the object key determines the block format.
 */
export type SystemContentBlockData =
  | TextBlockData
  | { cachePoint: CachePointBlockData }
  | { guardContent: GuardContentBlockData }

export type SystemContentBlock = TextBlock | CachePointBlock | GuardContentBlock

/**
 * Qualifier for guard content.
 * Specifies how the content should be evaluated by guardrails.
 *
 * - `grounding_source` - Content to check for grounding/factuality
 * - `query` - User query to evaluate
 * - `guard_content` - General content for guardrail evaluation
 */
export type GuardQualifier = 'grounding_source' | 'query' | 'guard_content'

/**
 * Image format for guard content.
 * Only formats supported by Bedrock guardrails.
 */
export type GuardImageFormat = 'png' | 'jpeg'

/**
 * Source for guard content image.
 * Only supports raw bytes.
 */
export type GuardImageSource = { bytes: Uint8Array }

/**
 * Text content to be evaluated by guardrails.
 */
export interface GuardContentText {
  /**
   * Qualifiers that specify how this content should be evaluated.
   */
  qualifiers: GuardQualifier[]

  /**
   * The text content to be evaluated.
   */
  text: string
}

/**
 * Image content to be evaluated by guardrails.
 */
export interface GuardContentImage {
  /**
   * Image format.
   */
  format: GuardImageFormat

  /**
   * Image source (bytes only).
   */
  source: GuardImageSource
}

/**
 * Data for a guard content block.
 * Can contain either text or image content for guardrail evaluation.
 */
export interface GuardContentBlockData {
  /**
   * Text content with evaluation qualifiers.
   */
  text?: GuardContentText

  /**
   * Image content with evaluation qualifiers.
   */
  image?: GuardContentImage
}

/**
 * Guard content block for guardrail evaluation.
 * Marks content that should be evaluated by guardrails for safety, grounding, or other policies.
 * Can be used in both message content and system prompts.
 */
export class GuardContentBlock implements GuardContentBlockData {
  /**
   * Discriminator for guard content.
   */
  readonly type = 'guardContentBlock' as const

  /**
   * Text content with evaluation qualifiers.
   */
  readonly text?: GuardContentText

  /**
   * Image content with evaluation qualifiers.
   */
  readonly image?: GuardContentImage

  constructor(data: GuardContentBlockData) {
    if (!data.text && !data.image) {
      throw new Error('GuardContentBlock must have either text or image content')
    }
    if (data.text && data.image) {
      throw new Error('GuardContentBlock cannot have both text and image content')
    }
    if (data.text) {
      this.text = data.text
    }
    if (data.image) {
      this.image = data.image
    }
  }

  /**
   * Serializes this GuardContentBlock to a JSON-compatible object.
   * Binary image bytes are encoded as base64 strings.
   *
   * @returns Object in { guardContent: GuardContentBlockData } format with base64-encoded image bytes
   */
  toJSON(): { guardContent: GuardContentBlockData | { text?: GuardContentText; image?: { format: GuardImageFormat; source: { bytes: string } } } } {
    if (this.text) {
      return { guardContent: { text: this.text } }
    }
    if (this.image) {
      return {
        guardContent: {
          image: {
            format: this.image.format,
            source: { bytes: encodeBase64(this.image.source.bytes) },
          },
        },
      }
    }
    throw new Error('GuardContentBlock has no content')
  }
}

/**
 * Converts ContentBlockData to a ContentBlock instance.
 * Handles all content block types including text, tool use/result, reasoning, cache points, guard content, and media blocks.
 * Also handles deserialization from JSON where Uint8Array fields are base64 encoded strings.
 *
 * @param data - The content block data to convert
 * @returns A ContentBlock instance of the appropriate type
 * @throws Error if the content block type is unknown
 */
export function contentBlockFromData(data: ContentBlockData): ContentBlock {
  if ('text' in data) {
    return new TextBlock(data.text)
  } else if ('toolUse' in data) {
    return new ToolUseBlock(data.toolUse)
  } else if ('toolResult' in data) {
    return new ToolResultBlock({
      toolUseId: data.toolResult.toolUseId,
      status: data.toolResult.status,
      content: data.toolResult.content.map((contentItem) => {
        if ('text' in contentItem) {
          return new TextBlock(contentItem.text)
        } else if ('json' in contentItem) {
          return new JsonBlock(contentItem)
        } else {
          throw new Error('Unknown ToolResultContentData type')
        }
      }),
    })
  } else if ('reasoning' in data) {
    const reasoningData = data.reasoning
    // Handle base64-encoded redactedContent from JSON deserialization
    if (reasoningData.redactedContent !== undefined && typeof reasoningData.redactedContent === 'string') {
      return new ReasoningBlock({
        ...reasoningData,
        redactedContent: decodeBase64(reasoningData.redactedContent as unknown as string),
      })
    }
    return new ReasoningBlock(reasoningData)
  } else if ('cachePoint' in data) {
    return new CachePointBlock(data.cachePoint)
  } else if ('guardContent' in data) {
    const guardData = data.guardContent
    // Handle base64-encoded image bytes from JSON deserialization
    if (guardData.image?.source.bytes !== undefined && typeof guardData.image.source.bytes === 'string') {
      return new GuardContentBlock({
        image: {
          format: guardData.image.format,
          source: { bytes: decodeBase64(guardData.image.source.bytes as unknown as string) },
        },
      })
    }
    return new GuardContentBlock(guardData)
  } else if ('image' in data) {
    const imageData = data.image
    // Handle base64-encoded bytes from JSON deserialization
    if ('bytes' in imageData.source && typeof imageData.source.bytes === 'string') {
      return new ImageBlock({
        format: imageData.format,
        source: { bytes: decodeBase64(imageData.source.bytes as unknown as string) },
      })
    }
    return new ImageBlock(imageData)
  } else if ('video' in data) {
    const videoData = data.video
    // Handle base64-encoded bytes from JSON deserialization
    if ('bytes' in videoData.source && typeof videoData.source.bytes === 'string') {
      return new VideoBlock({
        format: videoData.format,
        source: { bytes: decodeBase64(videoData.source.bytes as unknown as string) },
      })
    }
    return new VideoBlock(videoData)
  } else if ('document' in data) {
    const docData = data.document
    // Handle base64-encoded bytes from JSON deserialization
    if ('bytes' in docData.source && typeof docData.source.bytes === 'string') {
      const docBlockData: DocumentBlockData = {
        name: docData.name,
        format: docData.format,
        source: { bytes: decodeBase64(docData.source.bytes as unknown as string) },
      }
      if (docData.citations !== undefined) {
        docBlockData.citations = docData.citations
      }
      if (docData.context !== undefined) {
        docBlockData.context = docData.context
      }
      return new DocumentBlock(docBlockData)
    }
    return new DocumentBlock(docData)
  } else {
    throw new Error('Unknown ContentBlockData type')
  }
}
