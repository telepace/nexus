import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface LLMAnalysis {
  id: string;
  type: 'summary' | 'key_points' | 'questions' | 'insights' | 'custom';
  title: string;
  content: string;
  prompt?: string;
  isExpanded: boolean;
  isLoading: boolean;
  error?: string;
  created_at: string;
  contentId: string;
}

export interface PromptRecommendation {
  id: string;
  name: string;
  description: string;
  prompt: string;
  type: LLMAnalysis['type'];
  icon?: string;
}

interface LLMAnalysisState {
  analyses: LLMAnalysis[];
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  addAnalysis: (analysis: Omit<LLMAnalysis, 'id' | 'created_at'>) => void;
  updateAnalysis: (id: string, updates: Partial<LLMAnalysis>) => void;
  removeAnalysis: (id: string) => void;
  toggleExpanded: (id: string) => void;
  clearAnalyses: () => void;
  setGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
  
  // Generate analysis
  generateAnalysis: (contentId: string, prompt: string, type: LLMAnalysis['type'], title: string) => Promise<void>;
}

// 默认的prompt推荐
export const defaultPromptRecommendations: PromptRecommendation[] = [
  {
    id: 'summary',
    name: '生成摘要',
    description: '为内容生成简洁的摘要',
    prompt: '请为以下内容生成一个简洁明了的摘要，突出主要观点和关键信息：',
    type: 'summary',
    icon: '📝'
  },
  {
    id: 'key_points',
    name: '提取要点',
    description: '提取内容中的关键要点',
    prompt: '请从以下内容中提取关键要点，以清晰的列表形式呈现：',
    type: 'key_points',
    icon: '🎯'
  },
  {
    id: 'questions',
    name: '生成问题',
    description: '基于内容生成思考问题',
    prompt: '基于以下内容，生成一些深入思考的问题，帮助更好地理解和分析：',
    type: 'questions',
    icon: '❓'
  },
  {
    id: 'insights',
    name: '深度洞察',
    description: '提供深度分析和洞察',
    prompt: '请对以下内容进行深度分析，提供有价值的洞察和观点：',
    type: 'insights',
    icon: '💡'
  }
];

export const useLLMAnalysisStore = create<LLMAnalysisState>()(
  devtools(
    (set, get) => ({
      analyses: [],
      isGenerating: false,
      error: null,

      addAnalysis: (analysis) => {
        const newAnalysis: LLMAnalysis = {
          ...analysis,
          id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
        };
        
        set((state) => ({
          analyses: [...state.analyses, newAnalysis],
        }));
      },

      updateAnalysis: (id, updates) => {
        set((state) => ({
          analyses: state.analyses.map((analysis) =>
            analysis.id === id ? { ...analysis, ...updates } : analysis
          ),
        }));
      },

      removeAnalysis: (id) => {
        set((state) => ({
          analyses: state.analyses.filter((analysis) => analysis.id !== id),
        }));
      },

      toggleExpanded: (id) => {
        set((state) => ({
          analyses: state.analyses.map((analysis) =>
            analysis.id === id
              ? { ...analysis, isExpanded: !analysis.isExpanded }
              : analysis
          ),
        }));
      },

      clearAnalyses: () => {
        set({ analyses: [] });
      },

      setGenerating: (isGenerating) => {
        set({ isGenerating });
      },

      setError: (error) => {
        set({ error });
      },

      generateAnalysis: async (contentId, prompt, type, title) => {
        const { addAnalysis, updateAnalysis, setGenerating, setError } = get();
        
        // 创建一个loading状态的分析
        const loadingAnalysis = {
          type,
          title,
          content: '',
          prompt,
          isExpanded: true,
          isLoading: true,
          contentId,
        };
        
        addAnalysis(loadingAnalysis);
        setGenerating(true);
        setError(null);
        
        try {
          // 这里应该调用实际的API
          // 暂时使用模拟数据
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const mockContent = generateMockContent(type, title);
          
          // 找到刚创建的分析并更新
          const currentAnalyses = get().analyses;
          const targetAnalysis = currentAnalyses.find(
            a => a.contentId === contentId && a.isLoading && a.type === type
          );
          
          if (targetAnalysis) {
            updateAnalysis(targetAnalysis.id, {
              content: mockContent,
              isLoading: false,
            });
          }
          
        } catch (error) {
          console.error('生成分析失败:', error);
          setError(error instanceof Error ? error.message : '生成分析失败');
          
          // 移除失败的分析
          const currentAnalyses = get().analyses;
          const targetAnalysis = currentAnalyses.find(
            a => a.contentId === contentId && a.isLoading && a.type === type
          );
          
          if (targetAnalysis) {
            updateAnalysis(targetAnalysis.id, {
              isLoading: false,
              error: '生成失败，请重试',
            });
          }
        } finally {
          setGenerating(false);
        }
      },
    }),
    {
      name: 'llm-analysis-store',
    }
  )
);

// 生成模拟内容的辅助函数
function generateMockContent(type: LLMAnalysis['type'], title: string): string {
  switch (type) {
    case 'summary':
      return `这是一个关于"${title}"的内容摘要。本文档主要讨论了相关主题的核心概念、实际应用和未来发展趋势。通过深入分析，我们可以看到该领域的重要性和发展潜力。`;
      
    case 'key_points':
      return `• 核心概念和基本定义\n• 主要特点和优势\n• 实际应用场景和案例\n• 当前面临的挑战\n• 未来发展方向和趋势\n• 对相关领域的影响`;
      
    case 'questions':
      return `1. 这个主题的核心价值是什么？\n2. 在实际应用中可能遇到哪些挑战？\n3. 如何评估其效果和影响？\n4. 与其他相关方法相比有什么优势？\n5. 未来可能的发展方向是什么？`;
      
    case 'insights':
      return `通过深入分析，我们发现这个主题具有重要的战略意义。它不仅在当前环境中发挥着关键作用，还为未来的发展提供了新的可能性。值得注意的是，成功实施需要考虑多个因素的协调配合。`;
      
    default:
      return `这是一个自定义分析结果。基于提供的内容和要求，我们进行了详细的分析和思考。`;
  }
} 