/**
 * 标题处理工具函数
 * 用于优化LLM分析卡片的标题显示
 */

/**
 * 生成用户友好的分析标题
 * @param params 标题生成参数
 * @returns 优化后的标题
 */
export interface TitleGenerationParams {
  /** 用户输入的内容 */
  userInput?: string;
  /** 选择的prompt名称 */
  promptName?: string;
  /** prompt ID */
  promptId?: string;
  /** 原始标题 */
  originalTitle?: string;
  /** 分析类型 */
  analysisType?: 'prompt' | 'manual' | 'expand' | 'custom';
}

export function generateFriendlyTitle(params: TitleGenerationParams): string {
  const { userInput, promptName, promptId, originalTitle, analysisType } = params;

  // 1. 如果有prompt名称，优先使用
  if (promptName && promptName.trim()) {
    return truncateTitle(promptName, 30);
  }

  // 2. 如果有用户输入，使用用户输入作为标题
  if (userInput && userInput.trim()) {
    // 清理用户输入，移除多余的空白和换行
    const cleanInput = cleanUserInput(userInput);
    return truncateTitle(cleanInput, 40);
  }

  // 3. 如果有原始标题且不是默认的"AI 分析"
  if (originalTitle && originalTitle.trim() && originalTitle !== "AI 分析") {
    return truncateTitle(originalTitle, 30);
  }

  // 4. 根据分析类型提供默认标题
  switch (analysisType) {
    case 'prompt':
      return '模板分析';
    case 'manual':
      return '自定义分析';
    case 'expand':
      return '深度展开';
    default:
      return 'AI 分析';
  }
}

/**
 * 清理用户输入，移除多余的格式和空白
 * @param input 原始用户输入
 * @returns 清理后的输入
 */
function cleanUserInput(input: string): string {
  return input
    // 移除多余的空白和换行
    .replace(/\s+/g, ' ')
    // 移除开头和结尾的空白
    .trim()
    // 移除常见的prompt前缀
    .replace(/^(请|帮我|能否|可以|分析|总结|解释|说明|介绍|描述)\s*/i, '')
    // 移除问号和句号结尾（保持简洁）
    .replace(/[。？?！!]+$/, '');
}

/**
 * 智能截断标题
 * @param title 原始标题
 * @param maxLength 最大长度
 * @returns 截断后的标题
 */
export function truncateTitle(title: string, maxLength: number = 30): string {
  if (!title || title.length <= maxLength) {
    return title;
  }

  // 优先在句子边界截断
  const sentences = title.split(/[。！？!?]/);
  if (sentences.length > 1 && sentences[0].length <= maxLength) {
    return sentences[0];
  }

  // 优先在词语边界截断
  const words = title.split(/\s+/);
  let truncated = '';
  
  for (const word of words) {
    if ((truncated + word).length > maxLength - 3) {
      break;
    }
    truncated += (truncated ? ' ' : '') + word;
  }

  // 如果截断后太短，直接按字符截断
  if (truncated.length < maxLength * 0.6) {
    truncated = title.substring(0, maxLength - 3);
  }

  return truncated + '...';
}

/**
 * 检测文本是否为问题
 * @param text 文本内容
 * @returns 是否为问题
 */
export function isQuestion(text: string): boolean {
  // 检查是否以问号结尾
  if (/[？?]$/.test(text.trim())) {
    return true;
  }

  // 检查是否以疑问词开头
  const questionWords = [
    '什么', '为什么', '怎么', '如何', '哪个', '哪些', '谁', '什么时候', '在哪里',
    'what', 'why', 'how', 'which', 'who', 'when', 'where'
  ];

  const firstWords = text.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase();
  return questionWords.some(word => firstWords.includes(word.toLowerCase()));
}

/**
 * 为问题类型的输入生成更友好的标题
 * @param question 问题文本
 * @returns 优化后的问题标题
 */
export function formatQuestionTitle(question: string): string {
  const cleaned = cleanUserInput(question);
  
  // 如果已经是简短的问题，直接返回
  if (cleaned.length <= 25 && isQuestion(cleaned)) {
    return cleaned;
  }

  // 提取问题的核心部分
  const coreQuestion = extractQuestionCore(cleaned);
  return truncateTitle(coreQuestion, 35);
}

/**
 * 提取问题的核心部分
 * @param question 完整问题
 * @returns 问题核心
 */
function extractQuestionCore(question: string): string {
  // 移除常见的冗余表达
  return question
    .replace(/^(请问|想知道|我想了解|能告诉我|可以说说|帮我解释一下)\s*/i, '')
    .replace(/\s*(吗|呢|啊|呀)([？?]*)$/, '$2')
    .trim();
} 