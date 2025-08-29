/**
 * 项目配置文件
 * 存放项目内的全局配置数据
 */

import { ContextoConfig } from './types';

/**
 * 默认项目配置
 */
export const defaultConfig: ContextoConfig = {
    sourceLangDict: "",
    targetLangs: [],
    ignore: ["./contexto", "./node_modules", "./.git", "./.vscode"],
    aiService: {
        type: "openai",
        apiKey: "",
        base: "https://api.openai.com/v1",
        model: "gpt-4"
    }
};

/**
 * 语言代码到语言名称的映射表
 * 用于AI翻译服务的语言识别
 */
export const langMap: Record<string, string> = {
    // 主要语言
    'en': 'English',
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    
    // 中文变体
    'zh-CN': 'Simplified Chinese',
    'zh-TW': 'Traditional Chinese',
    'zh-HK': 'Traditional Chinese (Hong Kong)',
    'zh-SG': 'Simplified Chinese (Singapore)',
    
    // 亚洲语言
    'ja': 'Japanese',
    'ko': 'Korean',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'tl': 'Filipino',
    'my': 'Burmese',
    'km': 'Khmer',
    'lo': 'Lao',
    'si': 'Sinhala',
    'ta': 'Tamil',
    'te': 'Telugu',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'ur': 'Urdu',
    
    // 欧洲语言
    'fr': 'French',
    'fr-CA': 'French (Canada)',
    'de': 'German',
    'de-AT': 'German (Austria)',
    'de-CH': 'German (Switzerland)',
    'es': 'Spanish',
    'es-MX': 'Spanish (Mexico)',
    'es-AR': 'Spanish (Argentina)',
    'pt': 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    'it': 'Italian',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
    'is': 'Icelandic',
    'pl': 'Polish',
    'cs': 'Czech',
    'sk': 'Slovak',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sr': 'Serbian',
    'sl': 'Slovenian',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'et': 'Estonian',
    'mt': 'Maltese',
    'ga': 'Irish',
    'cy': 'Welsh',
    'eu': 'Basque',
    'ca': 'Catalan',
    'gl': 'Galician',
    
    // 俄语及周边
    'ru': 'Russian',
    'uk': 'Ukrainian',
    'be': 'Belarusian',
    'kk': 'Kazakh',
    'ky': 'Kyrgyz',
    'uz': 'Uzbek',
    'tg': 'Tajik',
    'mn': 'Mongolian',
    
    // 中东及北非
    'ar': 'Arabic',
    'ar-SA': 'Arabic (Saudi Arabia)',
    'ar-EG': 'Arabic (Egypt)',
    'ar-AE': 'Arabic (UAE)',
    'fa': 'Persian',
    'tr': 'Turkish',
    'he': 'Hebrew',
    'ku': 'Kurdish',
    'am': 'Amharic',
    
    // 非洲语言
    'sw': 'Swahili',
    'zu': 'Zulu',
    'xh': 'Xhosa',
    'af': 'Afrikaans',
    'yo': 'Yoruba',
    'ig': 'Igbo',
    'ha': 'Hausa',
    
    // 美洲原住民语言
    'qu': 'Quechua',
    'gn': 'Guarani',
    
    // 其他重要语言
    'el': 'Greek',
    'mk': 'Macedonian',
    'sq': 'Albanian',
    'hy': 'Armenian',
    'ka': 'Georgian',
    'az': 'Azerbaijani',
    'ne': 'Nepali',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'pa': 'Punjabi',
    'ml': 'Malayalam',
    'kn': 'Kannada',
    'or': 'Odia',
    'as': 'Assamese',
    'sd': 'Sindhi',
    'sa': 'Sanskrit',
    'bo': 'Tibetan',
    'dz': 'Dzongkha',
    
    // 太平洋地区
    'mi': 'Maori',
    'sm': 'Samoan',
    'to': 'Tongan',
    'fj': 'Fijian',
};
