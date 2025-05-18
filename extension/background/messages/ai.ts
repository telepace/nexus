import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { LOG_PREFIX } from "~/utils/config"

// AI模型配置
interface AIModelConfig {
  id: string
  name: string
  provider: string
  apiKey?: string
  baseUrl?: string
  contextLength: number
  systemPrompts?: {
    [key: string]: string
  }
}

// 默认系统提示词
const DEFAULT_SYSTEM_PROMPTS = {
  summary: "请对以下内容进行摘要总结，提取核心观点，以简洁清晰的方式呈现。内容如下：",
  keypoints: "请从以下内容提取关键要点，以便更容易理解和记忆。以简洁的要点列表形式返回。内容如下：",
  explain: "请解释以下内容的含义，使用简单易懂的语言进行阐述：",
  translate: "请将以下内容翻译成中文，保持原文的意思和风格：",
  chat: "你是一个智能AI助手，能够基于给定的上下文回答问题。请提供有帮助、真实、无害的回答。"
}

// 默认AI模型配置
const DEFAULT_AI_MODELS: AIModelConfig[] = [
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    contextLength: 16385,
    systemPrompts: DEFAULT_SYSTEM_PROMPTS
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "openai",
    contextLength: 8192,
    systemPrompts: DEFAULT_SYSTEM_PROMPTS
  },
  {
    id: "local",
    name: "本地模型 (Ollama)",
    provider: "ollama",
    baseUrl: "http://localhost:11434",
    contextLength: 4096,
    systemPrompts: DEFAULT_SYSTEM_PROMPTS
  }
]

/**
 * 获取可用AI模型
 */
const getAvailableModels = async () => {
  try {
    const storage = new Storage({ area: "local" })
    let aiModels = await storage.get("aiModels") as AIModelConfig[]
    
    // 如果没有存储过模型配置，使用默认配置
    if (!aiModels || !Array.isArray(aiModels) || aiModels.length === 0) {
      aiModels = DEFAULT_AI_MODELS
      await storage.set("aiModels", aiModels)
    }
    
    // 返回模型时不包含敏感信息
    return aiModels.map(model => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      hasApiKey: !!model.apiKey,
      contextLength: model.contextLength
    }))
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取AI模型失败:`, error)
    return []
  }
}

/**
 * 获取AI模型配置
 */
const getModelConfig = async (modelId: string): Promise<AIModelConfig | null> => {
  try {
    const storage = new Storage({ area: "local" })
    const aiModels = await storage.get("aiModels") as AIModelConfig[]
    
    if (!aiModels || !Array.isArray(aiModels)) {
      return null
    }
    
    return aiModels.find(model => model.id === modelId) || null
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取模型配置失败:`, error)
    return null
  }
}

/**
 * 获取默认AI模型ID
 */
const getDefaultModelId = async (): Promise<string> => {
  try {
    const storage = new Storage({ area: "local" })
    const defaultModelId = await storage.get("defaultAIModel") as string
    
    if (defaultModelId) {
      return defaultModelId
    }
    
    // 如果没有设置默认模型，使用第一个可用模型
    const aiModels = await storage.get("aiModels") as AIModelConfig[]
    
    if (aiModels && Array.isArray(aiModels) && aiModels.length > 0) {
      return aiModels[0].id
    }
    
    // 兜底使用GPT-3.5
    return "gpt-3.5-turbo"
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取默认模型ID失败:`, error)
    return "gpt-3.5-turbo"
  }
}

/**
 * 获取系统提示词
 */
const getSystemPrompt = async (modelId: string, type: string): Promise<string> => {
  try {
    const modelConfig = await getModelConfig(modelId)
    
    if (!modelConfig || !modelConfig.systemPrompts) {
      return DEFAULT_SYSTEM_PROMPTS[type] || DEFAULT_SYSTEM_PROMPTS.chat
    }
    
    return modelConfig.systemPrompts[type] || DEFAULT_SYSTEM_PROMPTS[type] || DEFAULT_SYSTEM_PROMPTS.chat
  } catch (error) {
    console.error(`${LOG_PREFIX} 获取系统提示词失败:`, error)
    return DEFAULT_SYSTEM_PROMPTS.chat
  }
}

/**
 * AI聊天请求处理
 */
const handleChatRequest = async (messages: any[], modelId?: string) => {
  try {
    // 使用提供的模型ID或获取默认模型
    const targetModelId = modelId || await getDefaultModelId()
    const modelConfig = await getModelConfig(targetModelId)
    
    if (!modelConfig) {
      throw new Error("模型配置不存在")
    }
    
    if (!modelConfig.apiKey && modelConfig.provider !== "local") {
      throw new Error("未配置API密钥")
    }
    
    // 构建请求
    let apiUrl = ""
    let requestBody = {}
    let headers = {}
    
    if (modelConfig.provider === "openai") {
      apiUrl = modelConfig.baseUrl || "https://api.openai.com/v1/chat/completions"
      requestBody = {
        model: modelConfig.id,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      }
      headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${modelConfig.apiKey}`
      }
    } else if (modelConfig.provider === "ollama") {
      apiUrl = `${modelConfig.baseUrl || "http://localhost:11434"}/api/chat`
      requestBody = {
        model: "llama3",
        messages: messages,
        stream: false
      }
      headers = {
        "Content-Type": "application/json"
      }
    } else {
      throw new Error("不支持的AI提供商")
    }
    
    // 发送请求
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json()
    
    // 解析不同提供商的响应
    if (modelConfig.provider === "openai") {
      return {
        message: data.choices[0].message,
        usage: data.usage
      }
    } else if (modelConfig.provider === "ollama") {
      return {
        message: data.message,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      }
    }
    
    throw new Error("无法处理模型响应")
  } catch (error) {
    console.error(`${LOG_PREFIX} AI聊天请求失败:`, error)
    throw error
  }
}

/**
 * 生成摘要
 */
const generateSummary = async (content: string, modelId?: string) => {
  try {
    // 使用提供的模型ID或获取默认模型
    const targetModelId = modelId || await getDefaultModelId()
    
    // 获取摘要系统提示词
    const systemPrompt = await getSystemPrompt(targetModelId, "summary")
    
    // 构建消息
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: content }
    ]
    
    // 发送请求
    const result = await handleChatRequest(messages, targetModelId)
    
    return {
      summary: result.message.content,
      model: targetModelId
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 生成摘要失败:`, error)
    throw error
  }
}

/**
 * 提取要点
 */
const extractKeyPoints = async (content: string, modelId?: string) => {
  try {
    // 使用提供的模型ID或获取默认模型
    const targetModelId = modelId || await getDefaultModelId()
    
    // 获取要点系统提示词
    const systemPrompt = await getSystemPrompt(targetModelId, "keypoints")
    
    // 构建消息
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: content }
    ]
    
    // 发送请求
    const result = await handleChatRequest(messages, targetModelId)
    
    return {
      points: result.message.content,
      model: targetModelId
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 提取要点失败:`, error)
    throw error
  }
}

/**
 * AI消息处理程序
 */
export async function handler(req: PlasmoMessaging.Request<any>) {
  const { action } = req.body
  
  try {
    switch (action) {
      case "getAvailableModels":
        return await getAvailableModels()
        
      case "chat":
        const { messages, model } = req.body
        return await handleChatRequest(messages, model)
        
      case "summarize":
        const { content: summaryContent, model: summaryModel } = req.body
        return await generateSummary(summaryContent, summaryModel)
        
      case "extractPoints":
        const { content: pointsContent, model: pointsModel } = req.body
        return await extractKeyPoints(pointsContent, pointsModel)
        
      default:
        throw new Error(`未知的AI操作: ${action}`)
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} AI操作失败:`, error)
    return {
      error: true,
      message: error.message || "AI操作失败"
    }
  }
} 