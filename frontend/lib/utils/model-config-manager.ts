"use client";

/**
 * 统一的AI模型配置管理系统
 * 
 * 🎯 解决问题：
 * - 消除硬编码模型名称
 * - 提供统一的模型选择接口
 * - 支持环境变量和运行时配置
 * - 确保前后端配置一致性
 */

export type AITaskType = 
  | "chat"         // 聊天对话
  | "summary"      // 内容摘要
  | "key_points"   // 关键要点
  | "labels"       // 标签生成
  | "analysis"     // 深度分析
  | "code"         // 代码相关
  | "reasoning"    // 复杂推理
  | "chinese"      // 中文优化
  | "default";     // 默认任务

export type ModelProvider = 
  | "openai"       // OpenAI GPT系列
  | "anthropic"    // Claude系列
  | "google"       // Gemini系列
  | "deepseek"     // DeepSeek系列
  | "openrouter"   // OpenRouter集成
  | "custom";      // 自定义模型

export interface ModelConfig {
  /** 模型名称 */
  name: string;
  /** 模型提供商 */
  provider: ModelProvider;
  /** 最大Token限制 */
  maxTokens?: number;
  /** 是否支持流式输出 */
  supportsStreaming?: boolean;
  /** 成本等级 (1-5, 1最低) */
  costLevel?: number;
  /** 质量等级 (1-5, 5最高) */
  qualityLevel?: number;
  /** 速度等级 (1-5, 5最快) */
  speedLevel?: number;
  /** 描述 */
  description?: string;
}

export interface TaskModelMapping {
  /** 任务类型 */
  taskType: AITaskType;
  /** 首选模型 */
  primaryModel: string;
  /** 备用模型列表 */
  fallbackModels?: string[];
  /** 任务特定配置 */
  taskConfig?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  };
}

/**
 * 预定义的模型配置
 * 基于 .env 文件中的模型映射和LiteLLM配置
 */
const PREDEFINED_MODELS: Record<string, ModelConfig> = {
  // Google Gemini 系列
  "gemini-pro": {
    name: "gemini-pro",
    provider: "google",
    maxTokens: 30000,
    supportsStreaming: true,
    costLevel: 3,
    qualityLevel: 5,
    speedLevel: 3,
    description: "Google旗舰模型，质量最高，适合复杂分析"
  },
  "gemini-flash": {
    name: "gemini-flash",
    provider: "google",
    maxTokens: 20000,
    supportsStreaming: true,
    costLevel: 2,
    qualityLevel: 4,
    speedLevel: 4,
    description: "Google快速版，平衡性能和成本"
  },
  "gemini-flash-lite": {
    name: "gemini-flash-lite",
    provider: "google",
    maxTokens: 15000,
    supportsStreaming: true,
    costLevel: 1,
    qualityLevel: 3,
    speedLevel: 5,
    description: "Google轻量版，成本最低，速度最快"
  },

  // DeepSeek 系列
  "deepseek-v3": {
    name: "deepseek-v3",
    provider: "deepseek",
    maxTokens: 25000,
    supportsStreaming: true,
    costLevel: 2,
    qualityLevel: 4,
    speedLevel: 3,
    description: "DeepSeek对话版，中文优秀，性价比高"
  },
  "deepseek-r1": {
    name: "deepseek-r1",
    provider: "deepseek",
    maxTokens: 20000,
    supportsStreaming: true,
    costLevel: 3,
    qualityLevel: 5,
    speedLevel: 2,
    description: "DeepSeek推理版，逻辑分析能力强"
  },

  // 其他模型
  "coder-large": {
    name: "coder-large",
    provider: "custom",
    maxTokens: 20000,
    supportsStreaming: true,
    costLevel: 3,
    qualityLevel: 4,
    speedLevel: 3,
    description: "代码专用模型，编程任务优化"
  },
  "doubao-pro": {
    name: "doubao-pro",
    provider: "custom",
    maxTokens: 20000,
    supportsStreaming: true,
    costLevel: 2,
    qualityLevel: 4,
    speedLevel: 3,
    description: "字节跳动模型，中文优化"
  }
};

/**
 * 默认的任务-模型映射
 * 基于 .env 文件的最佳实践配置
 */
const DEFAULT_TASK_MAPPINGS: Record<AITaskType, TaskModelMapping> = {
  chat: {
    taskType: "chat",
    primaryModel: "gemini-flash-lite",
    fallbackModels: ["gemini-flash", "deepseek-v3"],
    taskConfig: {
      maxTokens: 20000,
      temperature: 0.7,
    }
  },
  summary: {
    taskType: "summary",
    primaryModel: "gemini-pro",
    fallbackModels: ["gemini-flash", "deepseek-v3"],
    taskConfig: {
      maxTokens: 20000,
      temperature: 0.3,
    }
  },
  key_points: {
    taskType: "key_points", 
    primaryModel: "gemini-flash",
    fallbackModels: ["gemini-pro", "deepseek-v3"],
    taskConfig: {
      maxTokens: 15000,
      temperature: 0.2,
    }
  },
  labels: {
    taskType: "labels",
    primaryModel: "gemini-flash-lite",
    fallbackModels: ["gemini-flash", "deepseek-v3"],
    taskConfig: {
      maxTokens: 10000,
      temperature: 0.1,
    }
  },
  analysis: {
    taskType: "analysis",
    primaryModel: "deepseek-r1",
    fallbackModels: ["gemini-pro", "deepseek-v3"],
    taskConfig: {
      maxTokens: 25000,
      temperature: 0.4,
    }
  },
  code: {
    taskType: "code",
    primaryModel: "coder-large",
    fallbackModels: ["deepseek-v3", "gemini-pro"],
    taskConfig: {
      maxTokens: 20000,
      temperature: 0.1,
    }
  },
  reasoning: {
    taskType: "reasoning",
    primaryModel: "deepseek-r1",
    fallbackModels: ["gemini-pro", "deepseek-v3"],
    taskConfig: {
      maxTokens: 25000,
      temperature: 0.3,
    }
  },
  chinese: {
    taskType: "chinese",
    primaryModel: "doubao-pro",
    fallbackModels: ["deepseek-v3", "gemini-pro"],
    taskConfig: {
      maxTokens: 20000,
      temperature: 0.5,
    }
  },
  default: {
    taskType: "default",
    primaryModel: "gemini-flash",
    fallbackModels: ["gemini-pro", "deepseek-v3"],
    taskConfig: {
      maxTokens: 20000,
      temperature: 0.5,
    }
  }
};

/**
 * 统一的模型配置管理器
 */
export class ModelConfigManager {
  private static instance: ModelConfigManager;
  private taskMappings: Record<AITaskType, TaskModelMapping>;
  private modelConfigs: Record<string, ModelConfig>;

  private constructor() {
    this.modelConfigs = { ...PREDEFINED_MODELS };
    this.taskMappings = { ...DEFAULT_TASK_MAPPINGS };
    this.loadEnvironmentConfig();
  }

  static getInstance(): ModelConfigManager {
    if (!ModelConfigManager.instance) {
      ModelConfigManager.instance = new ModelConfigManager();
    }
    return ModelConfigManager.instance;
  }

  /**
   * 🎯 从后端API加载配置 - 使用统一的配置源
   * 前端不再维护独立的环境变量，通过API获取后端配置
   */
  private async loadConfigurationFromBackend() {
    try {
      // 在实际应用中，这里应该调用后端API获取模型配置
      // const response = await fetch('/api/v1/config/models');
      // const config = await response.json();
      
      // 🎯 暂时使用默认配置，后续可通过API动态获取
      console.log(`🌐 [ModelConfig] 使用默认配置，后端统一管理模型选择`);
    } catch (error) {
      console.warn(`⚠️ [ModelConfig] 无法从后端加载配置，使用默认配置: ${error}`);
    }
  }

  /**
   * 🎯 简化的配置加载 - 移除环境变量依赖
   * 前端使用默认配置，实际模型选择由后端统一管理
   */
  private loadEnvironmentConfig() {
    // 前端保持默认配置，实际的模型选择由后端API处理
    console.log(`🎯 [ModelConfig] 前端使用预设配置，后端负责实际模型路由`);
    
    // 可选：如果需要在开发环境覆盖某些配置
    if (process.env.NODE_ENV === 'development') {
      // 开发环境可以通过少量环境变量覆盖用于测试
      const devChatModel = process.env.DEV_CHAT_MODEL;
      if (devChatModel) {
        this.taskMappings.chat.primaryModel = devChatModel;
        console.log(`🔧 [ModelConfig] 开发环境覆盖聊天模型: ${devChatModel}`);
      }
    }
  }

  /**
   * 获取指定任务的模型名称
   */
  getModelForTask(taskType: AITaskType): string {
    const mapping = this.taskMappings[taskType] || this.taskMappings.default;
    return mapping.primaryModel;
  }

  /**
   * 获取指定任务的完整配置
   */
  getTaskMapping(taskType: AITaskType): TaskModelMapping {
    return this.taskMappings[taskType] || this.taskMappings.default;
  }

  /**
   * 获取模型配置信息
   */
  getModelConfig(modelName: string): ModelConfig | null {
    return this.modelConfigs[modelName] || null;
  }

  /**
   * 获取指定任务的备用模型列表
   */
  getFallbackModels(taskType: AITaskType): string[] {
    const mapping = this.taskMappings[taskType] || this.taskMappings.default;
    return mapping.fallbackModels || [];
  }

  /**
   * 获取所有可用模型
   */
  getAllModels(): ModelConfig[] {
    return Object.values(this.modelConfigs);
  }

  /**
   * 获取指定任务的最佳模型（考虑性价比）
   */
  getBestModelForTask(
    taskType: AITaskType,
    priorityType: 'cost' | 'quality' | 'speed' = 'cost'
  ): string {
    const mapping = this.getTaskMapping(taskType);
    const allModels = [mapping.primaryModel, ...(mapping.fallbackModels || [])];
    
    // 根据优先级排序
    const sortedModels = allModels
      .map(modelName => ({
        name: modelName,
        config: this.getModelConfig(modelName)
      }))
      .filter(item => item.config !== null)
      .sort((a, b) => {
        const configA = a.config!;
        const configB = b.config!;
        
        switch (priorityType) {
          case 'cost':
            return (configA.costLevel || 3) - (configB.costLevel || 3);
          case 'quality':
            return (configB.qualityLevel || 3) - (configA.qualityLevel || 3);
          case 'speed':
            return (configB.speedLevel || 3) - (configA.speedLevel || 3);
          default:
            return 0;
        }
      });

    return sortedModels[0]?.name || mapping.primaryModel;
  }

  /**
   * 动态更新任务模型映射
   */
  updateTaskMapping(taskType: AITaskType, modelName: string) {
    if (this.taskMappings[taskType]) {
      this.taskMappings[taskType].primaryModel = modelName;
      console.log(`📝 [ModelConfig] 更新 ${taskType} 模型为: ${modelName}`);
    }
  }

  /**
   * 添加自定义模型配置
   */
  addCustomModel(modelName: string, config: ModelConfig) {
    this.modelConfigs[modelName] = config;
    console.log(`➕ [ModelConfig] 添加自定义模型: ${modelName}`);
  }

  /**
   * 获取模型使用统计（用于监控和优化）
   */
  getModelUsageRecommendation(taskType: AITaskType): {
    recommended: string;
    reason: string;
    alternatives: Array<{ model: string; reason: string }>;
  } {
    const mapping = this.getTaskMapping(taskType);
    const primaryConfig = this.getModelConfig(mapping.primaryModel);
    
    return {
      recommended: mapping.primaryModel,
      reason: primaryConfig?.description || "基于任务类型的最佳选择",
      alternatives: (mapping.fallbackModels || []).map(model => {
        const config = this.getModelConfig(model);
        return {
          model,
          reason: config?.description || "备用选择"
        };
      })
    };
  }

  /**
   * 调试信息 - 打印当前配置
   */
  debugConfig(): void {
    console.group("🔧 [ModelConfig] 当前配置");
    console.log("📋 任务映射:", this.taskMappings);
    console.log("🤖 模型配置:", this.modelConfigs);
    console.groupEnd();
  }
}

// 创建全局单例实例
const modelConfigManager = ModelConfigManager.getInstance();

// 导出便捷函数
export const getModelForTask = (taskType: AITaskType) => 
  modelConfigManager.getModelForTask(taskType);

export const getTaskMapping = (taskType: AITaskType) => 
  modelConfigManager.getTaskMapping(taskType);

export const getModelConfig = (modelName: string) => 
  modelConfigManager.getModelConfig(modelName);

export const getBestModelForTask = (
  taskType: AITaskType, 
  priorityType: 'cost' | 'quality' | 'speed' = 'cost'
) => modelConfigManager.getBestModelForTask(taskType, priorityType);

// 开发环境下输出调试信息
if (process.env.NODE_ENV === 'development') {
  console.log("🚀 [ModelConfig] 模型配置管理器已初始化");
  modelConfigManager.debugConfig();
}

export default modelConfigManager;