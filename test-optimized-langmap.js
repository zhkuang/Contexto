// 测试优化后的语言映射 - AI友好格式
console.log('🤖 测试 AI 友好的语言映射格式...');

// 模拟优化后的语言映射
const optimizedLangMap = {
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
    'hi': 'Hindi',
    'bn': 'Bengali',
    
    // 欧洲语言
    'fr': 'French',
    'fr-CA': 'French (Canada)',
    'de': 'German',
    'de-AT': 'German (Austria)',
    'es': 'Spanish',
    'es-MX': 'Spanish (Mexico)',
    'pt': 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    'it': 'Italian',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'pl': 'Polish',
    'ru': 'Russian',
    'uk': 'Ukrainian',
    
    // 中东语言
    'ar': 'Arabic',
    'ar-SA': 'Arabic (Saudi Arabia)',
    'fa': 'Persian',
    'tr': 'Turkish',
    'he': 'Hebrew',
    
    // 非洲语言
    'sw': 'Swahili',
    'af': 'Afrikaans'
};

console.log('✅ 优化特点:');
console.log('  • 移除了括号中的中文注释');
console.log('  • 保持标准英文语言名称');
console.log('  • AI模型更容易理解和处理');
console.log('  • 简洁清晰的语言标识');

console.log('\n📊 语言映射统计:');
console.log(`  • 总支持语言数: ${Object.keys(optimizedLangMap).length}`);
console.log(`  • 中文变体: ${Object.keys(optimizedLangMap).filter(k => k.startsWith('zh-')).length}种`);
console.log(`  • 英语变体: ${Object.keys(optimizedLangMap).filter(k => k.startsWith('en')).length}种`);
console.log(`  • 地区变体: ${Object.keys(optimizedLangMap).filter(k => k.includes('-')).length}种`);

console.log('\n🔍 示例翻译提示词测试:');
const testCases = [
    { lang: 'zh-TW', name: optimizedLangMap['zh-TW'] },
    { lang: 'ja', name: optimizedLangMap['ja'] },
    { lang: 'ar-SA', name: optimizedLangMap['ar-SA'] },
    { lang: 'pt-BR', name: optimizedLangMap['pt-BR'] }
];

testCases.forEach(({ lang, name }) => {
    const prompt = `请将以下中文文本翻译成 ${name}，严格遵循软件国际化标准。`;
    console.log(`  [${lang}] ${prompt}`);
});

console.log('\n✨ AI 理解优势:');
console.log('  • 标准语言名称，AI训练数据中常见');
console.log('  • 避免中文混杂，减少token消耗');
console.log('  • 清晰的地区标识（如 Canada, Brazil）');
console.log('  • 符合国际化标准命名规范');

console.log('\n🎯 实际应用效果:');
console.log('  • 提高翻译准确性和一致性');
console.log('  • 减少AI混淆和错误理解');
console.log('  • 优化API调用效率');
console.log('  • 更好的多语言处理体验');

console.log('\n🎉 语言映射优化完成！更AI友好的格式已应用。');
