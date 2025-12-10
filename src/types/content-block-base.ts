/**
 * Base class for all content blocks.
 *
 * This abstract class enables instanceof checks to determine if an object
 * is a content block. All specific content block types (TextBlock, ToolUseBlock, etc.)
 * extend this base class.
 *
 * @example
 * ```typescript
 * if (obj instanceof ContentBlockBase) {
 *   console.log('This is a content block')
 * }
 * ```
 *
 * Note: For type narrowing and exhaustive checks, use the ContentBlock union type instead.
 */
export abstract class ContentBlockBase {
  /**
   * Discriminator for content block type.
   * Each derived class narrows this to a specific string literal.
   */
  abstract readonly type: string
}
