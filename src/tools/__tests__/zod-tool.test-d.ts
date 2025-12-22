import { describe, it, expectTypeOf } from 'vitest'
import { z } from 'zod'
import { tool } from '../zod-tool.js'

describe('zod-tool type tests', () => {
  describe('invoke return type matches callback return type', () => {
    it('should return string when callback returns string', () => {
      const stringTool = tool({
        name: 'stringTool',
        inputSchema: z.object({ value: z.string() }),
        callback: (input) => input.value,
      })

      expectTypeOf(stringTool.invoke).returns.resolves.toEqualTypeOf<string>()
    })

    it('should return number when callback returns number', () => {
      const numberTool = tool({
        name: 'numberTool',
        inputSchema: z.object({ a: z.number(), b: z.number() }),
        callback: (input) => input.a + input.b,
      })

      expectTypeOf(numberTool.invoke).returns.resolves.toEqualTypeOf<number>()
    })

    it('should return boolean when callback returns boolean', () => {
      const booleanTool = tool({
        name: 'booleanTool',
        inputSchema: z.object({ value: z.number() }),
        callback: (input) => input.value > 0,
      })

      expectTypeOf(booleanTool.invoke).returns.resolves.toEqualTypeOf<boolean>()
    })

    it('should return object when callback returns object', () => {
      const objectTool = tool({
        name: 'objectTool',
        inputSchema: z.object({ name: z.string(), age: z.number() }),
        callback: (input) => ({ greeting: `Hello ${input.name}`, isAdult: input.age >= 18 }),
      })

      expectTypeOf(objectTool.invoke).returns.resolves.toEqualTypeOf<{
        greeting: string
        isAdult: boolean
      }>()
    })

    it('should return array when callback returns array', () => {
      const arrayTool = tool({
        name: 'arrayTool',
        inputSchema: z.object({ count: z.number() }),
        callback: (input) => Array.from({ length: input.count }, (_, i) => i + 1),
      })

      expectTypeOf(arrayTool.invoke).returns.resolves.toEqualTypeOf<number[]>()
    })

    it('should return null when callback returns null', () => {
      const nullTool = tool({
        name: 'nullTool',
        inputSchema: z.object({ value: z.string() }),
        callback: () => null,
      })

      expectTypeOf(nullTool.invoke).returns.resolves.toEqualTypeOf<null>()
    })
  })

  describe('async callback return types', () => {
    it('should return string when async callback returns string', () => {
      const asyncStringTool = tool({
        name: 'asyncStringTool',
        inputSchema: z.object({ value: z.string() }),
        callback: async (input): Promise<string> => `Result: ${input.value}`,
      })

      expectTypeOf(asyncStringTool.invoke).returns.resolves.toEqualTypeOf<string>()
    })

    it('should return number when async callback returns number', () => {
      const asyncNumberTool = tool({
        name: 'asyncNumberTool',
        inputSchema: z.object({ value: z.number() }),
        callback: async (input) => input.value * 2,
      })

      expectTypeOf(asyncNumberTool.invoke).returns.resolves.toEqualTypeOf<number>()
    })

    it('should return complex object when async callback returns complex object', () => {
      const asyncComplexTool = tool({
        name: 'asyncComplexTool',
        inputSchema: z.object({ id: z.string() }),
        callback: async (input) => ({
          id: input.id,
          timestamp: Date.now(),
          metadata: { processed: true },
        }),
      })

      expectTypeOf(asyncComplexTool.invoke).returns.resolves.toEqualTypeOf<{
        id: string
        timestamp: number
        metadata: { processed: boolean }
      }>()
    })
  })

  describe('async generator callback return types', () => {
    it('should return the final return value from async generator', () => {
      const generatorTool = tool({
        name: 'generatorTool',
        inputSchema: z.object({ count: z.number() }),
        callback: async function* (input) {
          for (let i = 1; i <= input.count; i++) {
            yield `Step ${i}`
          }
          return input.count
        },
      })

      expectTypeOf(generatorTool.invoke).returns.resolves.toEqualTypeOf<number>()
    })

    it('should return string when async generator returns string', () => {
      const generatorStringTool = tool({
        name: 'generatorStringTool',
        inputSchema: z.object({ message: z.string() }),
        callback: async function* (input): AsyncGenerator<string, string, unknown> {
          yield 'Processing...'
          yield 'Almost done...'
          return `Completed: ${input.message}`
        },
      })

      expectTypeOf(generatorStringTool.invoke).returns.resolves.toEqualTypeOf<string>()
    })

    it('should return object when async generator returns object', () => {
      const generatorObjectTool = tool({
        name: 'generatorObjectTool',
        inputSchema: z.object({ data: z.array(z.string()) }),
        callback: async function* (input) {
          for (const item of input.data) {
            yield `Processing ${item}`
          }
          return { processed: input.data.length, success: true }
        },
      })

      expectTypeOf(generatorObjectTool.invoke).returns.resolves.toEqualTypeOf<{
        processed: number
        success: boolean
      }>()
    })
  })

  describe('union return types', () => {
    it('should handle union return types correctly', () => {
      const unionTool = tool({
        name: 'unionTool',
        inputSchema: z.object({ returnType: z.enum(['string', 'number']) }),
        callback: (input): string | number => {
          if (input.returnType === 'string') {
            return 'hello'
          } else {
            return 42
          }
        },
      })

      expectTypeOf(unionTool.invoke).returns.resolves.toEqualTypeOf<string | number>()
    })

    it('should handle conditional return types', () => {
      const conditionalTool = tool({
        name: 'conditionalTool',
        inputSchema: z.object({ includeMetadata: z.boolean(), value: z.string() }),
        callback: (input) => {
          if (input.includeMetadata) {
            return { value: input.value, metadata: { timestamp: Date.now() } }
          } else {
            return input.value
          }
        },
      })

      expectTypeOf(conditionalTool.invoke).returns.resolves.toEqualTypeOf<
        string | { value: string; metadata: { timestamp: number } }
      >()
    })
  })

  describe('input type validation', () => {
    it('should enforce correct input types', () => {
      const typedTool = tool({
        name: 'typedTool',
        inputSchema: z.object({
          name: z.string(),
          age: z.number(),
          active: z.boolean(),
        }),
        callback: (input) => input.name,
      })

      // Should accept correct input type
      expectTypeOf(typedTool.invoke).parameter(0).toEqualTypeOf<{
        name: string
        age: number
        active: boolean
      }>()
    })

    it('should handle optional fields in input', () => {
      const optionalTool = tool({
        name: 'optionalTool',
        inputSchema: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
        callback: (input) => input.required,
      })

      expectTypeOf(optionalTool.invoke).parameter(0).toEqualTypeOf<{
        required: string
        optional?: string
      }>()
    })

    it('should handle complex nested input types', () => {
      const nestedTool = tool({
        name: 'nestedTool',
        inputSchema: z.object({
          user: z.object({
            name: z.string(),
            profile: z.object({
              age: z.number(),
              preferences: z.array(z.string()),
            }),
          }),
          metadata: z.object({
            created: z.number(),
            tags: z.array(z.string()),
          }),
        }),
        callback: (input) => input.user.name,
      })

      expectTypeOf(nestedTool.invoke).parameter(0).toEqualTypeOf<{
        user: {
          name: string
          profile: {
            age: number
            preferences: string[]
          }
        }
        metadata: {
          created: number
          tags: string[]
        }
      }>()
    })
  })

  describe('generic type constraints', () => {
    it('should maintain type safety with explicit generic parameters', () => {
      // Test with explicit return type
      const explicitTool = tool<z.ZodObject<{ value: z.ZodString }>, string>({
        name: 'explicitTool',
        inputSchema: z.object({ value: z.string() }),
        callback: (input) => input.value,
      })

      expectTypeOf(explicitTool.invoke).returns.resolves.toEqualTypeOf<string>()
    })

    it('should work with complex generic constraints', () => {
      type CustomResult = {
        id: string
        data: number[]
        success: boolean
      }

      const customTool = tool<z.ZodObject<{ id: z.ZodString; count: z.ZodNumber }>, CustomResult>({
        name: 'customTool',
        inputSchema: z.object({ id: z.string(), count: z.number() }),
        callback: (input): CustomResult => ({
          id: input.id,
          data: Array.from({ length: input.count }, (_, i) => i),
          success: true,
        }),
      })

      expectTypeOf(customTool.invoke).returns.resolves.toEqualTypeOf<CustomResult>()
    })
  })

  describe('interface return types', () => {
    it('should accept interface types as return values', () => {
      interface Product {
        id: string
        name: string
        price: number
        stock: number
      }

      const interfaceTool = tool({
        name: 'getProduct',
        inputSchema: z.object({ productId: z.string() }),
        callback: (input): Product => ({
          id: input.productId,
          name: 'Widget',
          price: 9.99,
          stock: 100,
        }),
      })

      expectTypeOf(interfaceTool.invoke).returns.resolves.toEqualTypeOf<Product>()
    })

    it('should accept nested interface types', () => {
      interface Address {
        street: string
        city: string
        zip: string
      }

      interface User {
        id: string
        name: string
        address: Address
      }

      const nestedInterfaceTool = tool({
        name: 'getUser',
        inputSchema: z.object({ userId: z.string() }),
        callback: (input): User => ({
          id: input.userId,
          name: 'John Doe',
          address: {
            street: '123 Main St',
            city: 'Springfield',
            zip: '12345',
          },
        }),
      })

      expectTypeOf(nestedInterfaceTool.invoke).returns.resolves.toEqualTypeOf<User>()
    })

    it('should accept objects containing interfaces in arrays', () => {
      interface Product {
        id: string
        name: string
        price: number
      }

      const arrayInterfaceTool = tool({
        name: 'getCatalog',
        inputSchema: z.object({ category: z.string() }),
        callback: (input) => {
          const products: Product[] = [
            { id: '1', name: 'Widget', price: 9.99 },
            { id: '2', name: 'Gadget', price: 19.99 },
          ]
          return { products, totalProducts: products.length, category: input.category }
        },
      })

      expectTypeOf(arrayInterfaceTool.invoke).returns.resolves.toEqualTypeOf<{
        products: Product[]
        totalProducts: number
        category: string
      }>()
    })

    it('should work with both interfaces and type aliases', () => {
      interface ProductInterface {
        id: string
        name: string
      }

      type ProductType = {
        id: string
        name: string
      }

      const interfaceToolA = tool({
        name: 'getProductA',
        inputSchema: z.object({ id: z.string() }),
        callback: (input): ProductInterface => ({ id: input.id, name: 'Product A' }),
      })

      const typeToolB = tool({
        name: 'getProductB',
        inputSchema: z.object({ id: z.string() }),
        callback: (input): ProductType => ({ id: input.id, name: 'Product B' }),
      })

      expectTypeOf(interfaceToolA.invoke).returns.resolves.toEqualTypeOf<ProductInterface>()
      expectTypeOf(typeToolB.invoke).returns.resolves.toEqualTypeOf<ProductType>()
    })
  })
})
