// 数据类型定义

// 插件配置
export interface ContextoConfig {
    sourceLangDict: string;
    targetLangs: string[];
    ignore: string[];
    aiService: {
        type: string;
        apiKey: string;
        base: string;
        model: string;
    };
}

// 翻译项
export interface TranslationItem {
    source: string;
    sourceFile: string;
    businessContext?: string;
    uiContext?: string;
    translations: Record<string, string>;
}

// 翻译缓存
export interface I18nCache {
    [key: string]: TranslationItem;
}

// Key状态
export enum KeyStatus {
    NEW = 'new',
    UPDATED = 'updated',
    PENDING = 'pending',
    OBSOLETE = 'obsolete'
}

// Key分析结果
export interface KeyAnalysis {
    newKeys: string[];
    updatedKeys: string[];
    pendingKeys: string[];
    obsoleteKeys: string[];
}

// 文件扫描结果
export interface ScanResult {
    [key: string]: string; // key -> source text
}

// 支持的字典格式
export interface DictParser {
    canParse(filePath: string): boolean;
    parse(filePath: string): Promise<ScanResult>;
}

// 翻译任务
export interface TranslationTask {
    key: string;
    source: string;
    businessContext?: string;
    uiContext?: string;
    targetLang: string;
}

// AI服务接口
export interface AIService {
    translateText(tasks: TranslationTask[]): Promise<Record<string, string>>;
    analyzeContext(key: string, source: string, filePath: string, fileContent: string): Promise<{
        businessContext: string;
        uiContext?: string;
    }>;
}
