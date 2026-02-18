import { describe, expect, test, it } from 'vitest'
import {
  Message,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ReasoningBlock,
  CachePointBlock,
  GuardContentBlock,
  JsonBlock,
  type MessageData,
  type MessageJSON,
  type SystemPromptData,
  systemPromptFromData,
} from '../messages.js'
import { ImageBlock, VideoBlock, DocumentBlock, encodeBase64 } from '../media.js'

describe('Message', () => {
  test('creates message with role and content', () => {
    const content = [new TextBlock('test')]
    const message = new Message({ role: 'user', content })

    expect(message).toEqual({
      type: 'message',
      role: 'user',
      content,
    })
  })
})

describe('TextBlock', () => {
  test('creates text block with text', () => {
    const block = new TextBlock('hello')

    expect(block).toEqual({
      type: 'textBlock',
      text: 'hello',
    })
  })
})

describe('ToolUseBlock', () => {
  test('creates tool use block', () => {
    const block = new ToolUseBlock({
      name: 'test-tool',
      toolUseId: '123',
      input: { param: 'value' },
    })

    expect(block).toEqual({
      type: 'toolUseBlock',
      name: 'test-tool',
      toolUseId: '123',
      input: { param: 'value' },
    })
  })
})

describe('ToolResultBlock', () => {
  test('creates tool result block', () => {
    const block = new ToolResultBlock({
      toolUseId: '123',
      status: 'success',
      content: [new TextBlock('result')],
    })

    expect(block).toEqual({
      type: 'toolResultBlock',
      toolUseId: '123',
      status: 'success',
      content: [new TextBlock('result')],
    })
  })
})

describe('ReasoningBlock', () => {
  test('creates reasoning block with text', () => {
    const block = new ReasoningBlock({ text: 'thinking...' })

    expect(block).toEqual({
      type: 'reasoningBlock',
      text: 'thinking...',
    })
  })
})

describe('CachePointBlock', () => {
  test('creates cache point block', () => {
    const block = new CachePointBlock({ cacheType: 'default' })

    expect(block).toEqual({
      type: 'cachePointBlock',
      cacheType: 'default',
    })
  })
})

describe('JsonBlock', () => {
  test('creates json block', () => {
    const block = new JsonBlock({ json: { key: 'value' } })

    expect(block).toEqual({
      type: 'jsonBlock',
      json: { key: 'value' },
    })
  })
})

describe('Message.fromMessageData', () => {
  it('converts text block data to TextBlock', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [{ text: 'hello world' }],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]).toEqual(new TextBlock('hello world'))
  })

  it('converts tool use block data to ToolUseBlock', () => {
    const messageData: MessageData = {
      role: 'assistant',
      content: [
        {
          toolUse: {
            toolUseId: 'tool-123',
            name: 'test-tool',
            input: { key: 'value' },
          },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]).toBeInstanceOf(ToolUseBlock)
    expect(message.content[0]!.type).toBe('toolUseBlock')
  })

  it('converts tool result block data to ToolResultBlock with text content', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [
        {
          toolResult: {
            toolUseId: 'tool-123',
            status: 'success',
            content: [{ text: 'result text' }],
          },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]).toBeInstanceOf(ToolResultBlock)
    const toolResultBlock = message.content[0] as ToolResultBlock
    expect(toolResultBlock.content).toHaveLength(1)
    expect(toolResultBlock.content[0]).toBeInstanceOf(TextBlock)
  })

  it('converts tool result block data to ToolResultBlock with json content', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [
        {
          toolResult: {
            toolUseId: 'tool-123',
            status: 'success',
            content: [{ json: { result: 'value' } }],
          },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    const toolResultBlock = message.content[0] as ToolResultBlock
    expect(toolResultBlock.content).toHaveLength(1)
    expect(toolResultBlock.content[0]).toBeInstanceOf(JsonBlock)
  })

  it('converts reasoning block data to ReasoningBlock', () => {
    const messageData: MessageData = {
      role: 'assistant',
      content: [
        {
          reasoning: { text: 'thinking about it...' },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]).toBeInstanceOf(ReasoningBlock)
    expect(message.content[0]!.type).toBe('reasoningBlock')
  })

  it('converts cache point block data to CachePointBlock', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [
        {
          cachePoint: { cacheType: 'default' },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]).toBeInstanceOf(CachePointBlock)
    expect(message.content[0]!.type).toBe('cachePointBlock')
  })

  it('converts guard content block data to GuardContentBlock', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [
        {
          guardContent: {
            text: {
              text: 'guard this content',
              qualifiers: ['guard_content'],
            },
          },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]!.type).toBe('guardContentBlock')
  })

  it('converts image block data to ImageBlock', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [
        {
          image: {
            format: 'jpeg',
            source: { bytes: new Uint8Array([1, 2, 3]) },
          },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]).toBeInstanceOf(ImageBlock)
    expect(message.content[0]!.type).toBe('imageBlock')
  })

  it('converts video block data to VideoBlock', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [
        {
          video: {
            format: 'mp4',
            source: { bytes: new Uint8Array([1, 2, 3]) },
          },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]).toBeInstanceOf(VideoBlock)
    expect(message.content[0]!.type).toBe('videoBlock')
  })

  it('converts document block data to DocumentBlock', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [
        {
          document: {
            name: 'test.pdf',
            format: 'pdf',
            source: { bytes: new Uint8Array([1, 2, 3]) },
          },
        },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(1)
    expect(message.content[0]).toBeInstanceOf(DocumentBlock)
    expect(message.content[0]!.type).toBe('documentBlock')
  })

  it('converts multiple content blocks', () => {
    const messageData: MessageData = {
      role: 'user',
      content: [
        { text: 'first block' },
        { image: { format: 'png', source: { bytes: new Uint8Array([1, 2, 3]) } } },
        { text: 'second block' },
      ],
    }
    const message = Message.fromMessageData(messageData)
    expect(message.content).toHaveLength(3)
    expect(message.content[0]).toBeInstanceOf(TextBlock)
    expect(message.content[1]).toBeInstanceOf(ImageBlock)
    expect(message.content[2]).toBeInstanceOf(TextBlock)
  })

  it('throws error for unknown content block type', () => {
    const messageData = {
      role: 'user',
      content: [{ unknownType: { data: 'value' } }],
    } as unknown as MessageData
    expect(() => Message.fromMessageData(messageData)).toThrow('Unknown ContentBlockData type')
  })
})

describe('systemPromptFromData', () => {
  describe('when called with string', () => {
    it('returns the string unchanged', () => {
      const data: SystemPromptData = 'You are a helpful assistant'
      const result = systemPromptFromData(data)
      expect(result).toBe('You are a helpful assistant')
    })
  })

  describe('when called with TextBlockData', () => {
    it('converts to TextBlock', () => {
      const data: SystemPromptData = [{ text: 'System prompt text' }]
      const result = systemPromptFromData(data)
      expect(result).toEqual([new TextBlock('System prompt text')])
    })
  })

  describe('when called with CachePointBlockData', () => {
    it('converts to CachePointBlock', () => {
      const data: SystemPromptData = [{ text: 'prompt' }, { cachePoint: { cacheType: 'default' } }]
      const result = systemPromptFromData(data)
      expect(result).toEqual([new TextBlock('prompt'), new CachePointBlock({ cacheType: 'default' })])
    })
  })

  describe('when called with GuardContentBlockData', () => {
    it('converts to GuardContentBlock', () => {
      const data: SystemPromptData = [
        {
          guardContent: {
            text: {
              text: 'guard this content',
              qualifiers: ['guard_content'],
            },
          },
        },
      ]
      const result = systemPromptFromData(data)
      expect(result).toEqual([
        new GuardContentBlock({
          text: {
            text: 'guard this content',
            qualifiers: ['guard_content'],
          },
        }),
      ])
    })
  })

  describe('when called with mixed content blocks', () => {
    it('converts all block types correctly', () => {
      const data: SystemPromptData = [
        { text: 'First text block' },
        { cachePoint: { cacheType: 'default' } },
        { text: 'Second text block' },
        {
          guardContent: {
            text: {
              text: 'guard content',
              qualifiers: ['guard_content'],
            },
          },
        },
      ]
      const result = systemPromptFromData(data)
      expect(result).toEqual([
        new TextBlock('First text block'),
        new CachePointBlock({ cacheType: 'default' }),
        new TextBlock('Second text block'),
        new GuardContentBlock({
          text: {
            text: 'guard content',
            qualifiers: ['guard_content'],
          },
        }),
      ])
    })
  })

  describe('when called with empty array', () => {
    it('returns empty array', () => {
      const data: SystemPromptData = []
      const result = systemPromptFromData(data)
      expect(result).toEqual([])
    })
  })

  describe('when called with unknown block type', () => {
    it('throws error', () => {
      const data = [{ unknownType: { data: 'value' } }] as unknown as SystemPromptData
      expect(() => systemPromptFromData(data)).toThrow('Unknown SystemContentBlockData type')
    })
  })

  describe('when called with class instances', () => {
    it('returns them unchanged', () => {
      const systemPrompt = [new TextBlock('prompt'), new CachePointBlock({ cacheType: 'default' })]
      const result = systemPromptFromData(systemPrompt)
      expect(result).toEqual(systemPrompt)
    })
  })
})

describe('TextBlock', () => {
  describe('toJSON', () => {
    it('serializes to flat object with type discriminator', () => {
      const block = new TextBlock('hello world')
      expect(block.toJSON()).toEqual({
        type: 'textBlock',
        text: 'hello world',
      })
    })
  })
})

describe('ToolUseBlock', () => {
  describe('toJSON', () => {
    it('serializes to flat object with type discriminator', () => {
      const block = new ToolUseBlock({
        name: 'search',
        toolUseId: 'tool-123',
        input: { query: 'test' },
      })
      expect(block.toJSON()).toEqual({
        type: 'toolUseBlock',
        name: 'search',
        toolUseId: 'tool-123',
        input: { query: 'test' },
      })
    })

    it('includes reasoningSignature when present', () => {
      const block = new ToolUseBlock({
        name: 'search',
        toolUseId: 'tool-123',
        input: {},
        reasoningSignature: 'sig123',
      })
      expect(block.toJSON()).toEqual({
        type: 'toolUseBlock',
        name: 'search',
        toolUseId: 'tool-123',
        input: {},
        reasoningSignature: 'sig123',
      })
    })
  })
})

describe('ToolResultBlock', () => {
  describe('toJSON', () => {
    it('serializes to flat object with type discriminator', () => {
      const block = new ToolResultBlock({
        toolUseId: 'tool-123',
        status: 'success',
        content: [new TextBlock('result')],
      })
      expect(block.toJSON()).toEqual({
        type: 'toolResultBlock',
        toolUseId: 'tool-123',
        status: 'success',
        content: [{ type: 'textBlock', text: 'result' }],
      })
    })

    it('excludes error property from serialization', () => {
      const block = new ToolResultBlock({
        toolUseId: 'tool-123',
        status: 'error',
        content: [new TextBlock('error message')],
        error: new Error('Something went wrong'),
      })
      const serialized = block.toJSON()
      expect(serialized).toEqual({
        type: 'toolResultBlock',
        toolUseId: 'tool-123',
        status: 'error',
        content: [{ type: 'textBlock', text: 'error message' }],
      })
      expect('error' in serialized).toBe(false)
    })

    it('serializes JsonBlock content', () => {
      const block = new ToolResultBlock({
        toolUseId: 'tool-123',
        status: 'success',
        content: [new JsonBlock({ json: { key: 'value' } })],
      })
      expect(block.toJSON()).toEqual({
        type: 'toolResultBlock',
        toolUseId: 'tool-123',
        status: 'success',
        content: [{ type: 'jsonBlock', json: { key: 'value' } }],
      })
    })
  })
})

describe('ReasoningBlock', () => {
  describe('toJSON', () => {
    it('serializes text content', () => {
      const block = new ReasoningBlock({ text: 'thinking...' })
      expect(block.toJSON()).toEqual({
        type: 'reasoningBlock',
        text: 'thinking...',
      })
    })

    it('serializes signature', () => {
      const block = new ReasoningBlock({ signature: 'sig123' })
      expect(block.toJSON()).toEqual({
        type: 'reasoningBlock',
        signature: 'sig123',
      })
    })

    it('serializes redactedContent as base64', () => {
      const bytes = new Uint8Array([1, 2, 3])
      const block = new ReasoningBlock({ redactedContent: bytes })
      expect(block.toJSON()).toEqual({
        type: 'reasoningBlock',
        redactedContent: encodeBase64(bytes),
      })
    })

    it('serializes all fields together', () => {
      const bytes = new Uint8Array([4, 5, 6])
      const block = new ReasoningBlock({
        text: 'thinking...',
        signature: 'sig456',
        redactedContent: bytes,
      })
      expect(block.toJSON()).toEqual({
        type: 'reasoningBlock',
        text: 'thinking...',
        signature: 'sig456',
        redactedContent: encodeBase64(bytes),
      })
    })
  })
})

describe('CachePointBlock', () => {
  describe('toJSON', () => {
    it('serializes to flat object with type discriminator', () => {
      const block = new CachePointBlock({ cacheType: 'default' })
      expect(block.toJSON()).toEqual({
        type: 'cachePointBlock',
        cacheType: 'default',
      })
    })
  })
})

describe('GuardContentBlock', () => {
  describe('toJSON', () => {
    it('serializes text content', () => {
      const block = new GuardContentBlock({
        text: { text: 'check this', qualifiers: ['query'] },
      })
      expect(block.toJSON()).toEqual({
        type: 'guardContentBlock',
        text: { text: 'check this', qualifiers: ['query'] },
      })
    })

    it('serializes image content with base64 bytes', () => {
      const bytes = new Uint8Array([1, 2, 3])
      const block = new GuardContentBlock({
        image: { format: 'png', source: { bytes } },
      })
      expect(block.toJSON()).toEqual({
        type: 'guardContentBlock',
        image: { format: 'png', source: { bytes: encodeBase64(bytes) } },
      })
    })
  })
})

describe('JsonBlock', () => {
  describe('toJSON', () => {
    it('serializes to flat object with type discriminator', () => {
      const block = new JsonBlock({ json: { nested: { data: [1, 2, 3] } } })
      expect(block.toJSON()).toEqual({
        type: 'jsonBlock',
        json: { nested: { data: [1, 2, 3] } },
      })
    })
  })
})

describe('Message', () => {
  describe('toJSON', () => {
    it('serializes with text content', () => {
      const message = new Message({
        role: 'user',
        content: [new TextBlock('Hello')],
      })
      expect(message.toJSON()).toEqual({
        type: 'message',
        role: 'user',
        content: [{ type: 'textBlock', text: 'Hello' }],
      })
    })

    it('serializes with multiple content blocks', () => {
      const message = new Message({
        role: 'assistant',
        content: [
          new TextBlock('Let me help'),
          new ToolUseBlock({ name: 'search', toolUseId: 'abc', input: { q: 'test' } }),
        ],
      })
      expect(message.toJSON()).toEqual({
        type: 'message',
        role: 'assistant',
        content: [
          { type: 'textBlock', text: 'Let me help' },
          { type: 'toolUseBlock', name: 'search', toolUseId: 'abc', input: { q: 'test' } },
        ],
      })
    })

    it('serializes with media blocks', () => {
      const bytes = new Uint8Array([1, 2, 3])
      const message = new Message({
        role: 'user',
        content: [new ImageBlock({ format: 'jpeg', source: { bytes } })],
      })
      expect(message.toJSON()).toEqual({
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'imageBlock',
            format: 'jpeg',
            source: { type: 'imageSourceBytes', bytes: encodeBase64(bytes) },
          },
        ],
      })
    })
  })

  describe('fromJSON', () => {
    it('deserializes text content', () => {
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [{ type: 'textBlock' as const, text: 'Hello' }],
      }
      const message = Message.fromJSON(json)
      expect(message).toBeInstanceOf(Message)
      expect(message.role).toBe('user')
      expect(message.content).toHaveLength(1)
      expect(message.content[0]).toBeInstanceOf(TextBlock)
      expect((message.content[0] as TextBlock).text).toBe('Hello')
    })

    it('deserializes tool use content', () => {
      const json = {
        type: 'message' as const,
        role: 'assistant' as const,
        content: [
          {
            type: 'toolUseBlock' as const,
            name: 'search',
            toolUseId: 'tool-123',
            input: { query: 'test' },
          },
        ],
      }
      const message = Message.fromJSON(json)
      expect(message.content[0]).toBeInstanceOf(ToolUseBlock)
      const toolUse = message.content[0] as ToolUseBlock
      expect(toolUse.name).toBe('search')
      expect(toolUse.toolUseId).toBe('tool-123')
      expect(toolUse.input).toEqual({ query: 'test' })
    })

    it('deserializes tool result content', () => {
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [
          {
            type: 'toolResultBlock' as const,
            toolUseId: 'tool-123',
            status: 'success' as const,
            content: [{ type: 'textBlock' as const, text: 'result' }],
          },
        ],
      }
      const message = Message.fromJSON(json)
      expect(message.content[0]).toBeInstanceOf(ToolResultBlock)
      const toolResult = message.content[0] as ToolResultBlock
      expect(toolResult.toolUseId).toBe('tool-123')
      expect(toolResult.status).toBe('success')
      expect(toolResult.content[0]).toBeInstanceOf(TextBlock)
    })

    it('deserializes reasoning content with base64 redactedContent', () => {
      const bytes = new Uint8Array([1, 2, 3])
      const json = {
        type: 'message' as const,
        role: 'assistant' as const,
        content: [
          {
            type: 'reasoningBlock' as const,
            text: 'thinking...',
            redactedContent: encodeBase64(bytes),
          },
        ],
      }
      const message = Message.fromJSON(json)
      expect(message.content[0]).toBeInstanceOf(ReasoningBlock)
      const reasoning = message.content[0] as ReasoningBlock
      expect(reasoning.text).toBe('thinking...')
      expect(reasoning.redactedContent).toEqual(bytes)
    })

    it('deserializes cache point content', () => {
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [{ type: 'cachePointBlock' as const, cacheType: 'default' as const }],
      }
      const message = Message.fromJSON(json)
      expect(message.content[0]).toBeInstanceOf(CachePointBlock)
    })

    it('deserializes guard content with text', () => {
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [
          {
            type: 'guardContentBlock' as const,
            text: { text: 'check this', qualifiers: ['query' as const] },
          },
        ],
      }
      const message = Message.fromJSON(json)
      expect(message.content[0]).toBeInstanceOf(GuardContentBlock)
    })

    it('deserializes guard content with image bytes', () => {
      const bytes = new Uint8Array([4, 5, 6])
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [
          {
            type: 'guardContentBlock' as const,
            image: { format: 'jpeg' as const, source: { bytes: encodeBase64(bytes) } },
          },
        ],
      }
      const message = Message.fromJSON(json)
      const guard = message.content[0] as GuardContentBlock
      expect(guard.image?.source.bytes).toEqual(bytes)
    })

    it('deserializes image block with bytes', () => {
      const bytes = new Uint8Array([7, 8, 9])
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [
          {
            type: 'imageBlock' as const,
            format: 'png' as const,
            source: { type: 'imageSourceBytes' as const, bytes: encodeBase64(bytes) },
          },
        ],
      }
      const message = Message.fromJSON(json)
      expect(message.content[0]).toBeInstanceOf(ImageBlock)
      const image = message.content[0] as ImageBlock
      expect(image.format).toBe('png')
      expect(image.source.type).toBe('imageSourceBytes')
      if (image.source.type === 'imageSourceBytes') {
        expect(image.source.bytes).toEqual(bytes)
      }
    })

    it('deserializes video block with S3 location', () => {
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [
          {
            type: 'videoBlock' as const,
            format: 'mp4' as const,
            source: {
              type: 'videoSourceS3Location' as const,
              s3Location: { type: 's3Location' as const, uri: 's3://bucket/video.mp4' },
            },
          },
        ],
      }
      const message = Message.fromJSON(json)
      expect(message.content[0]).toBeInstanceOf(VideoBlock)
    })

    it('deserializes document block', () => {
      const bytes = new Uint8Array([10, 11, 12])
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [
          {
            type: 'documentBlock' as const,
            name: 'doc.pdf',
            format: 'pdf' as const,
            source: { type: 'documentSourceBytes' as const, bytes: encodeBase64(bytes) },
          },
        ],
      }
      const message = Message.fromJSON(json)
      expect(message.content[0]).toBeInstanceOf(DocumentBlock)
    })

    it('round-trips complex message correctly', () => {
      const bytes = new Uint8Array([1, 2, 3])
      const original = new Message({
        role: 'assistant',
        content: [
          new TextBlock('Here is the result'),
          new ToolUseBlock({ name: 'search', toolUseId: 'abc', input: { q: 'test' } }),
          new ReasoningBlock({ text: 'thinking', redactedContent: bytes }),
        ],
      })
      const json = original.toJSON()
      const restored = Message.fromJSON(json)

      expect(restored.role).toBe(original.role)
      expect(restored.content).toHaveLength(original.content.length)
      expect(restored.content[0]).toBeInstanceOf(TextBlock)
      expect(restored.content[1]).toBeInstanceOf(ToolUseBlock)
      expect(restored.content[2]).toBeInstanceOf(ReasoningBlock)
      expect((restored.content[2] as ReasoningBlock).redactedContent).toEqual(bytes)
    })

    it('throws error for unknown content block type', () => {
      const json = {
        type: 'message' as const,
        role: 'user' as const,
        content: [{ type: 'unknownBlock' as const }],
      }
      expect(() => Message.fromJSON(json as unknown as MessageJSON)).toThrow('Unknown content block type')
    })
  })
})
