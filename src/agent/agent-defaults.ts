import type { SystemPrompt } from '../types/messages.js'
import { AgentPrinter, getDefaultAppender, type Printer } from './printer.js'
import type { Model } from '../models/model.js'
import { BedrockModel } from '../index.js'

interface AgentDefaultsShape {
  /**
   * Gets the default system prompt to use for the agent.
   */
  getSystemPrompt: () => SystemPrompt | undefined
  /**
   * Gets the default model to use for the agent.
   * @param modelId - the string id passed into the agent..
   */
  getModel: (modelId: string | undefined) => Model
  /**
   * The default printer to use for the agent.
   */
  getPrinter: () => Printer
}

/**
 * Providers default factory methods for Agent components; can be overridden by environments to provide
 * different default experiences per environment.
 */
export const AgentDefaults: AgentDefaultsShape = {
  getSystemPrompt() {
    return undefined
  },

  getPrinter() {
    return new AgentPrinter(getDefaultAppender())
  },

  getModel(modelId: string | undefined): Model {
    if (modelId) {
      return new BedrockModel({ modelId: modelId })
    } else {
      return new BedrockModel()
    }
  },
}
