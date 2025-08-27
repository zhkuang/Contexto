import * as path from 'path';
import * as fs from 'fs';
import { DictParser, ScanResult } from '../types';

// JSON格式字典解析器
export class JsonDictParser implements DictParser {
    canParse(filePath: string): boolean {
        return path.extname(filePath).toLowerCase() === '.json';
    }

    async parse(filePath: string): Promise<ScanResult> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            return this.flattenObject(data);
        } catch (error) {
            console.error(`解析JSON字典文件失败: ${filePath}`, error);
            return {};
        }
    }

    private flattenObject(obj: any, prefix: string = ''): ScanResult {
        const result: ScanResult = {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    Object.assign(result, this.flattenObject(obj[key], newKey));
                } else if (typeof obj[key] === 'string') {
                    result[newKey] = obj[key];
                }
            }
        }
        
        return result;
    }
}

// Vue i18n格式解析器
export class VueI18nParser implements DictParser {
    canParse(filePath: string): boolean {
        const fileName = path.basename(filePath).toLowerCase();
        return fileName.includes('i18n') || fileName.includes('locale') || fileName.includes('lang');
    }

    async parse(filePath: string): Promise<ScanResult> {
        // Vue i18n通常使用JSON格式，所以复用JsonDictParser
        const jsonParser = new JsonDictParser();
        return jsonParser.parse(filePath);
    }
}

// React i18next格式解析器
export class ReactI18nextParser implements DictParser {
    canParse(filePath: string): boolean {
        const fileName = path.basename(filePath).toLowerCase();
        return fileName.includes('translation') || fileName.includes('locale') || fileName.includes('i18n');
    }

    async parse(filePath: string): Promise<ScanResult> {
        const jsonParser = new JsonDictParser();
        return jsonParser.parse(filePath);
    }
}

// Android strings.xml解析器
export class AndroidStringsParser implements DictParser {
    canParse(filePath: string): boolean {
        return path.basename(filePath).toLowerCase() === 'strings.xml';
    }

    async parse(filePath: string): Promise<ScanResult> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const result: ScanResult = {};
            
            // 简单的XML解析（实际项目中建议使用专门的XML解析库）
            const stringMatches = content.match(/<string\s+name="([^"]+)"[^>]*>([^<]*)<\/string>/g);
            
            if (stringMatches) {
                stringMatches.forEach(match => {
                    const nameMatch = match.match(/name="([^"]+)"/);
                    const valueMatch = match.match(/>([^<]*)</);
                    
                    if (nameMatch && valueMatch) {
                        result[nameMatch[1]] = valueMatch[1];
                    }
                });
            }
            
            return result;
        } catch (error) {
            console.error(`解析Android strings.xml文件失败: ${filePath}`, error);
            return {};
        }
    }
}

// iOS Localizable.strings解析器
export class IOSStringsParser implements DictParser {
    canParse(filePath: string): boolean {
        return path.extname(filePath).toLowerCase() === '.strings';
    }

    async parse(filePath: string): Promise<ScanResult> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const result: ScanResult = {};
            
            // 解析 "key" = "value"; 格式
            const matches = content.match(/"([^"]+)"\s*=\s*"([^"]+)";/g);
            
            if (matches) {
                matches.forEach(match => {
                    const keyValueMatch = match.match(/"([^"]+)"\s*=\s*"([^"]+)";/);
                    if (keyValueMatch) {
                        result[keyValueMatch[1]] = keyValueMatch[2];
                    }
                });
            }
            
            return result;
        } catch (error) {
            console.error(`解析iOS strings文件失败: ${filePath}`, error);
            return {};
        }
    }
}

// Flutter ARB格式解析器
export class FlutterArbParser implements DictParser {
    canParse(filePath: string): boolean {
        return path.extname(filePath).toLowerCase() === '.arb';
    }

    async parse(filePath: string): Promise<ScanResult> {
        // ARB文件本质上是JSON格式
        const jsonParser = new JsonDictParser();
        const data = await jsonParser.parse(filePath);
        
        // 过滤掉元数据字段（以@开头的字段）
        const result: ScanResult = {};
        for (const key in data) {
            if (!key.startsWith('@')) {
                result[key] = data[key];
            }
        }
        
        return result;
    }
}

// 字典解析器管理器
export class DictParserManager {
    private parsers: DictParser[] = [
        new JsonDictParser(),
        new VueI18nParser(),
        new ReactI18nextParser(),
        new AndroidStringsParser(),
        new IOSStringsParser(),
        new FlutterArbParser()
    ];

    /**
     * 根据文件路径选择合适的解析器
     */
    getParser(filePath: string): DictParser | null {
        for (const parser of this.parsers) {
            if (parser.canParse(filePath)) {
                return parser;
            }
        }
        return null;
    }

    /**
     * 解析字典文件
     */
    async parseDict(filePath: string): Promise<ScanResult> {
        const parser = this.getParser(filePath);
        if (!parser) {
            throw new Error(`不支持的字典文件格式: ${filePath}`);
        }
        
        return parser.parse(filePath);
    }
}
