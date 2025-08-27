import axios from 'axios';
import { AIService, TranslationTask, ContextoConfig } from './types';
import { Logger } from './logger';

export class OpenAIService implements AIService {
    private config: ContextoConfig['aiService'];
    private logger: Logger;

    constructor(config: ContextoConfig['aiService']) {
        this.config = config;
        this.logger = Logger.getInstance();
    }

    /**
     * 翻译文本
     */
    async translateText(tasks: TranslationTask[]): Promise<Record<string, string>> {
        const results: Record<string, string> = {};

        // 按目标语言分组任务
        const tasksByLang = new Map<string, TranslationTask[]>();
        for (const task of tasks) {
            if (!tasksByLang.has(task.targetLang)) {
                tasksByLang.set(task.targetLang, []);
            }
            tasksByLang.get(task.targetLang)!.push(task);
        }

        // 为每种语言进行批量翻译
        for (const [targetLang, langTasks] of tasksByLang) {
            try {
                const prompt = this.buildTranslationPrompt(langTasks, targetLang);
                
                // 记录翻译请求日志
                this.logger.logAIRequest(prompt, `TRANSLATION_REQUEST_${targetLang}`);
                
                const response = await this.callAI(prompt);
                
                // 记录翻译响应日志
                this.logger.logAIResponse(response, `TRANSLATION_RESPONSE_${targetLang}`);
                
                // 解析AI响应
                const translations = this.parseTranslationResponse(response, langTasks);
                Object.assign(results, translations);
            } catch (error) {
                console.error(`翻译失败 (${targetLang}):`, error);
                // 为失败的任务设置空值
                for (const task of langTasks) {
                    results[`${task.key}_${task.targetLang}`] = '';
                }
            }
        }

        return results;
    }

    /**
     * 分析上下文
     */
    async analyzeContext(key: string, source: string, filePath: string, fileContent: string): Promise<{
        businessContext: string;
        uiContext?: string;
    }> {
        const prompt = this.buildContextAnalysisPrompt(key, source, filePath, fileContent);
        
        try {
            // 记录上下文分析请求日志
            this.logger.logAIRequest(prompt, 'CONTEXT_ANALYSIS_REQUEST');
            
            const response = await this.callAI(prompt);
            
            // 记录上下文分析响应日志
            this.logger.logAIResponse(response, 'CONTEXT_ANALYSIS_RESPONSE');
            
            return this.parseContextResponse(response);
        } catch (error) {
            console.error(`文本上下文分析失败：`, error);
            return {
                businessContext: '业务上下文分析失败',
                uiContext: 'UI 上下文分析失败'
            };
        }
    }

    /**
     * 构建翻译提示词
     */
    private buildTranslationPrompt(tasks: TranslationTask[], targetLang: string): string {
        const langMap: Record<string, string> = {
            'en': 'English',
            'ja': 'Japanese',
            'ko': 'Korean',
            'fr': 'French',
            'de': 'German',
            'es': 'Spanish',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ar': 'Arabic',
            'th': 'Thai',
            'vi': 'Vietnamese'
        };

        const targetLangName = langMap[targetLang] || targetLang;

        let prompt = `请将以下中文文本翻译成 ${targetLangName}，严格遵循软件国际化标准。

🌍 翻译要求：
1. 保持原文的语气、语调和专业水准
2. 深度理解业务场景和UI上下文，确保翻译贴合使用场景
3. 采用目标语言的地道表达，避免翻译腔
4. 准确传达技术术语和业务概念
5. 保持文本长度适中，符合界面展示需求

📋 返回格式：每行一个翻译结果，格式为 "序号. 翻译结果"

📝 待翻译内容：

`;

        tasks.forEach((task, index) => {
            prompt += `${index + 1}. 📝 原文：${task.source}\n`;
            if (task.businessContext) {
                prompt += `   💼 业务场景：${task.businessContext}\n`;
            }
            if (task.uiContext) {
                prompt += `   🎨 UI场景：${task.uiContext}\n`;
            }
            prompt += '\n';
        });

        return prompt;
    }

    /**
     * 构建上下文分析提示词
     */
    private buildContextAnalysisPrompt(key: string, source: string, filePath: string, fileContent: string): string {
        return `请深入分析以下代码中文本的使用上下文，提供详细的业务场景和UI场景描述。

📁 文件路径：${filePath}
🔑 文本标识：${key}
📝 文本内容：${source}

代码上下文：
\`\`\`
${this.extractRelevantCode(fileContent, key)}
\`\`\`

请按以下格式返回分析结果：
业务场景：[详细描述这个文本在业务逻辑中的具体作用、使用时机和业务含义]
UI场景：[具体描述文本在用户界面中的展示位置、交互场景、展示时机等，如非UI文本请说明"非UI文本"]

分析要求：
1. 业务场景分析要深入准确，说明文本的具体业务价值
2. UI场景描述要具体详细，包括展示位置、用户交互、显示条件等
3. 避免模糊描述，提供有价值的上下文信息`;
    }

    /**
     * 提取相关代码片段
     */
    private extractRelevantCode(fileContent: string, key: string): string {
        const lines = fileContent.split('\n');
        const relevantLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(key)) {
                // 提取前后各3行作为上下文
                const startIndex = Math.max(0, i - 3);
                const endIndex = Math.min(lines.length - 1, i + 3);
                
                for (let j = startIndex; j <= endIndex; j++) {
                    if (!relevantLines.includes(lines[j])) {
                        relevantLines.push(lines[j]);
                    }
                }
            }
        }
        
        return relevantLines.join('\n').substring(0, 1000); // 限制长度
    }

    /**
     * 调用AI服务
     */
    private async callAI(prompt: string): Promise<string> {
        const response = await axios.post(
            `${this.config.base}/chat/completions`,
            {
                model: this.config.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    }

    /**
     * 解析翻译响应
     */
    private parseTranslationResponse(response: string, tasks: TranslationTask[]): Record<string, string> {
        const results: Record<string, string> = {};
        const lines = response.split('\n').filter(line => line.trim());
        
        for (let i = 0; i < Math.min(lines.length, tasks.length); i++) {
            const line = lines[i];
            const match = line.match(/^\d+\.\s*(.+)$/);
            
            if (match && tasks[i]) {
                const translation = match[1].trim();
                const key = `${tasks[i].key}_${tasks[i].targetLang}`;
                results[key] = translation;
            }
        }
        
        return results;
    }

    /**
     * 解析上下文分析响应
     */
    private parseContextResponse(response: string): { businessContext: string; uiContext?: string } {
        const businessMatch = response.match(/业务场景[：:]\s*(.+?)(?=\nUI场景|$)/s);
        const uiMatch = response.match(/UI场景[：:]\s*(.+?)$/s);
        
        return {
            businessContext: businessMatch ? businessMatch[1].trim() : '无法识别业务场景',
            uiContext: uiMatch ? uiMatch[1].trim() : undefined
        };
    }
}
