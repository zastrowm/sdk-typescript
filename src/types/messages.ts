import type { JSONValue } from './json.js'
import type {
  ImageBlockData,
  VideoBlockData,
  DocumentBlockData,
  ImageBlockJSON,
  VideoBlockJSON,
  DocumentBlockJSON,
  S3LocationData,
} from './media.js'
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
   * Creates a Message instance from a serialized JSON object.
   * This is the counterpart to toJSON() for deserialization.
   *
   * @param json - The serialized message JSON to deserialize
   * @returns A Message instance with fully reconstructed content blocks
   */
  public static fromJSON(json: MessageJSON): Message {
    const contentBlocks: ContentBlock[] = json.content.map(contentBlockFromJSON)

    return new Message({
      role: json.role,
      content: contentBlocks,
    })
  }

  /**
   * Serializes this Message to a JSON-compatible object.
   * This enables JSON.stringify(message) to work automatically via JavaScript's toJSON protocol.
   *
   * @returns A flat object with type discriminator suitable for JSON serialization
   */
  toJSON(): MessageJSON {
    return {
      type: 'message',
      role: this.role,
      content: this.content.map((block) => block.toJSON()),
    }
  }
}

/**
 * JSON representation of a Message.
 */
export interface MessageJSON {
  type: 'message'
  role: Role
  content: ContentBlockJSON[]
}

/**
 * Union of all content block JSON types.
 */
export type ContentBlockJSON =
  | TextBlockJSON
  | ToolUseBlockJSON
  | ToolResultBlockJSON
  | ReasoningBlockJSON
  | CachePointBlockJSON
  | GuardContentBlockJSON
  | ImageBlockJSON
  | VideoBlockJSON
  | DocumentBlockJSON

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
   * @returns A flat object with type discriminator suitable for JSON serialization
   */
  toJSON(): TextBlockJSON {
    return {
      type: 'textBlock',
      text: this.text,
    }
  }
}

/**
 * JSON representation of a TextBlock.
 */
export interface TextBlockJSON {
  type: 'textBlock'
  text: string
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
   * @returns A flat object with type discriminator suitable for JSON serialization
   */
  toJSON(): ToolUseBlockJSON {
    const result: ToolUseBlockJSON = {
      type: 'toolUseBlock',
      name: this.name,
      toolUseId: this.toolUseId,
      input: this.input,
    }
    if (this.reasoningSignature !== undefined) {
      result.reasoningSignature = this.reasoningSignature
    }
    return result
  }
}

/**
 * JSON representation of a ToolUseBlock.
 */
export interface ToolUseBlockJSON {
  type: 'toolUseBlock'
  name: string
  toolUseId: string
  input: JSONValue
  reasoningSignature?: string
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
   * Note: This property is excluded from JSON serialization.
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
   * Note: The `error` property is excluded from serialization as Error objects
   * are not JSON-serializable and may contain sensitive stack trace information.
   *
   * @returns A flat object with type discriminator suitable for JSON serialization
   */
  toJSON(): ToolResultBlockJSON {
    return {
      type: 'toolResultBlock',
      toolUseId: this.toolUseId,
      status: this.status,
      content: this.content.map((block) => block.toJSON()),
    }
  }
}

/**
 * JSON representation of a ToolResultBlock.
 */
export interface ToolResultBlockJSON {
  type: 'toolResultBlock'
  toolUseId: string
  status: 'success' | 'error'
  content: ToolResultContentJSON[]
}

/**
 * JSON representation of tool result content.
 */
export type ToolResultContentJSON = TextBlockJSON | JsonBlockJSON

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
   * Uint8Array redactedContent is encoded as a base64 string.
   *
   * @returns A flat object with type discriminator suitable for JSON serialization
   */
  toJSON(): ReasoningBlockJSON {
    const result: ReasoningBlockJSON = {
      type: 'reasoningBlock',
    }
    if (this.text !== undefined) {
      result.text = this.text
    }
    if (this.signature !== undefined) {
      result.signature = this.signature
    }
    if (this.redactedContent !== undefined) {
      result.redactedContent = encodeBase64(this.redactedContent)
    }
    return result
  }
}

/**
 * JSON representation of a ReasoningBlock.
 */
export interface ReasoningBlockJSON {
  type: 'reasoningBlock'
  text?: string
  signature?: string
  redactedContent?: string
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
   * @returns A flat object with type discriminator suitable for JSON serialization
   */
  toJSON(): CachePointBlockJSON {
    return {
      type: 'cachePointBlock',
      cacheType: this.cacheType,
    }
  }
}

/**
 * JSON representation of a CachePointBlock.
 */
export interface CachePointBlockJSON {
  type: 'cachePointBlock'
  cacheType: 'default'
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
   * @returns A flat object with type discriminator suitable for JSON serialization
   */
  toJSON(): JsonBlockJSON {
    return {
      type: 'jsonBlock',
      json: this.json,
    }
  }
}

/**
 * JSON representation of a JsonBlock.
 */
export interface JsonBlockJSON {
  type: 'jsonBlock'
  json: JSONValue
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
   * Uint8Array image bytes are encoded as base64 strings.
   *
   * @returns A flat object with type discriminator suitable for JSON serialization
   */
  toJSON(): GuardContentBlockJSON {
    const result: GuardContentBlockJSON = {
      type: 'guardContentBlock',
    }
    if (this.text !== undefined) {
      result.text = this.text
    }
    if (this.image !== undefined) {
      result.image = {
        format: this.image.format,
        source: { bytes: encodeBase64(this.image.source.bytes) },
      }
    }
    return result
  }
}

/**
 * JSON representation of a GuardContentBlock.
 */
export interface GuardContentBlockJSON {
  type: 'guardContentBlock'
  text?: GuardContentText
  image?: GuardContentImageJSON
}

/**
 * JSON representation of guard content image.
 */
export interface GuardContentImageJSON {
  format: GuardImageFormat
  source: { bytes: string }
}

/**
 * Converts ContentBlockData to a ContentBlock instance.
 * Handles all content block types including text, tool use/result, reasoning, cache points, guard content, and media blocks.
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
    return new ReasoningBlock(data.reasoning)
  } else if ('cachePoint' in data) {
    return new CachePointBlock(data.cachePoint)
  } else if ('guardContent' in data) {
    return new GuardContentBlock(data.guardContent)
  } else if ('image' in data) {
    return new ImageBlock(data.image)
  } else if ('video' in data) {
    return new VideoBlock(data.video)
  } else if ('document' in data) {
    return new DocumentBlock(data.document)
  } else {
    throw new Error('Unknown ContentBlockData type')
  }
}

/**
 * Converts a serialized ContentBlockJSON to a ContentBlock instance.
 * Handles deserialization of all content block types, including base64 decoding of binary data.
 *
 * @param json - The serialized content block JSON to convert
 * @returns A ContentBlock instance of the appropriate type
 * @throws Error if the content block type is unknown
 */
export function contentBlockFromJSON(json: ContentBlockJSON): ContentBlock {
  switch (json.type) {
    case 'textBlock':
      return new TextBlock(json.text)

    case 'toolUseBlock': {
      const data: ToolUseBlockData = {
        name: json.name,
        toolUseId: json.toolUseId,
        input: json.input,
      }
      if (json.reasoningSignature !== undefined) {
        data.reasoningSignature = json.reasoningSignature
      }
      return new ToolUseBlock(data)
    }

    case 'toolResultBlock':
      return new ToolResultBlock({
        toolUseId: json.toolUseId,
        status: json.status,
        content: json.content.map((item) => {
          if (item.type === 'textBlock') {
            return new TextBlock(item.text)
          } else {
            return new JsonBlock({ json: item.json })
          }
        }),
      })

    case 'reasoningBlock': {
      const data: ReasoningBlockData = {}
      if (json.text !== undefined) {
        data.text = json.text
      }
      if (json.signature !== undefined) {
        data.signature = json.signature
      }
      if (json.redactedContent !== undefined) {
        data.redactedContent = decodeBase64(json.redactedContent)
      }
      return new ReasoningBlock(data)
    }

    case 'cachePointBlock':
      return new CachePointBlock({ cacheType: json.cacheType })

    case 'guardContentBlock': {
      if (json.text) {
        return new GuardContentBlock({ text: json.text })
      } else if (json.image) {
        return new GuardContentBlock({
          image: {
            format: json.image.format,
            source: { bytes: decodeBase64(json.image.source.bytes) },
          },
        })
      }
      throw new Error('GuardContentBlock must have either text or image')
    }

    case 'imageBlock':
      return new ImageBlock({
        format: json.format,
        source: imageSourceFromJSON(json.source),
      })

    case 'videoBlock':
      return new VideoBlock({
        format: json.format,
        source: videoSourceFromJSON(json.source),
      })

    case 'documentBlock': {
      const data: DocumentBlockData = {
        name: json.name,
        format: json.format,
        source: documentSourceFromJSON(json.source),
      }
      if (json.citations !== undefined) {
        data.citations = json.citations
      }
      if (json.context !== undefined) {
        data.context = json.context
      }
      return new DocumentBlock(data)
    }

    default:
      throw new Error(`Unknown content block type: ${(json as { type: string }).type}`)
  }
}

/**
 * Converts a serialized ImageSourceJSON to ImageSourceData.
 */
function imageSourceFromJSON(
  source: ImageBlockJSON['source']
): { bytes: Uint8Array } | { s3Location: S3LocationData } | { url: string } {
  switch (source.type) {
    case 'imageSourceBytes':
      return { bytes: decodeBase64(source.bytes) }
    case 'imageSourceS3Location': {
      const s3Location: S3LocationData = { uri: source.s3Location.uri }
      if (source.s3Location.bucketOwner !== undefined) {
        s3Location.bucketOwner = source.s3Location.bucketOwner
      }
      return { s3Location }
    }
    case 'imageSourceUrl':
      return { url: source.url }
  }
}

/**
 * Converts a serialized VideoSourceJSON to VideoSourceData.
 */
function videoSourceFromJSON(
  source: VideoBlockJSON['source']
): { bytes: Uint8Array } | { s3Location: S3LocationData } {
  switch (source.type) {
    case 'videoSourceBytes':
      return { bytes: decodeBase64(source.bytes) }
    case 'videoSourceS3Location': {
      const s3Location: S3LocationData = { uri: source.s3Location.uri }
      if (source.s3Location.bucketOwner !== undefined) {
        s3Location.bucketOwner = source.s3Location.bucketOwner
      }
      return { s3Location }
    }
  }
}

/**
 * Converts a serialized DocumentSourceJSON to DocumentSourceData.
 */
function documentSourceFromJSON(
  source: DocumentBlockJSON['source']
): { bytes: Uint8Array } | { text: string } | { content: { text: string }[] } | { s3Location: S3LocationData } {
  switch (source.type) {
    case 'documentSourceBytes':
      return { bytes: decodeBase64(source.bytes) }
    case 'documentSourceText':
      return { text: source.text }
    case 'documentSourceContentBlock':
      return { content: source.content.map((block) => ({ text: block.text })) }
    case 'documentSourceS3Location': {
      const s3Location: S3LocationData = { uri: source.s3Location.uri }
      if (source.s3Location.bucketOwner !== undefined) {
        s3Location.bucketOwner = source.s3Location.bucketOwner
      }
      return { s3Location }
    }
  }
}
