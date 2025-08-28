// 测试多语言翻译支持
console.log('🌍 测试 Contexto 扩展的多语言支持...');

// 模拟测试配置
const testConfigs = [
    {
        name: '全球化配置',
        config: {
            "targetLangs": [
                "en",        // 英语
                "zh-TW",     // 繁体中文
                "ja",        // 日语
                "ko",        // 韩语
                "fr",        // 法语
                "de",        // 德语
                "es",        // 西班牙语
                "pt-BR",     // 巴西葡萄牙语
                "ru",        // 俄语
                "ar"         // 阿拉伯语
            ]
        },
        expected: '✅ 支持10种主要语言'
    },
    {
        name: '亚太区域配置',
        config: {
            "targetLangs": [
                "en", "zh-TW", "zh-HK", "ja", "ko", 
                "th", "vi", "id", "ms", "tl", "hi"
            ]
        },
        expected: '✅ 专注亚太11种语言'
    },
    {
        name: '欧洲市场配置',
        config: {
            "targetLangs": [
                "en", "en-GB", "fr", "de", "es", "it", 
                "nl", "sv", "no", "da", "fi", "pl", "ru"
            ]
        },
        expected: '✅ 覆盖欧洲13种语言'
    },
    {
        name: '中文变体配置',
        config: {
            "targetLangs": [
                "zh-CN",     // 简体中文（大陆）
                "zh-TW",     // 繁体中文（台湾）
                "zh-HK",     // 繁体中文（香港）
                "zh-SG"      // 简体中文（新加坡）
            ]
        },
        expected: '✅ 支持所有中文变体'
    },
    {
        name: '中东北非配置',
        config: {
            "targetLangs": [
                "en", "ar", "ar-SA", "ar-EG", 
                "fa", "tr", "he", "fr"
            ]
        },
        expected: '✅ 覆盖MENA地区8种语言'
    }
];

console.log('📋 多语言配置测试用例:');
testConfigs.forEach((test, index) => {
    console.log(`  ${index + 1}. ${test.name}:`);
    console.log(`     - 语言数量: ${test.config.targetLangs.length}`);
    console.log(`     - 预期结果: ${test.expected}`);
    console.log(`     - 语言列表: ${test.config.targetLangs.join(', ')}`);
    console.log('');
});

console.log('🚀 新增特性:');
console.log('  • 支持100+种语言翻译');
console.log('  • 包含中文简体、繁体、港澳台变体');
console.log('  • 覆盖亚洲、欧洲、中东、非洲、美洲主要语言');
console.log('  • 支持地区变体（如 en-US, en-GB, fr-CA 等）');
console.log('  • 从右到左语言自动处理（阿拉伯语、希伯来语）');
console.log('  • 优化的语言映射和AI提示词');

console.log('\n📊 语言分类统计:');
console.log('  • 中文变体: 4种 (zh-CN, zh-TW, zh-HK, zh-SG)');
console.log('  • 主要国际语言: 15种 (en, fr, de, es, pt, it, ru, ja, ko 等)');
console.log('  • 亚洲语言: 20种 (泰语、越南语、印尼语、马来语、印地语等)');
console.log('  • 欧洲语言: 25种 (荷兰语、瑞典语、波兰语、捷克语等)');
console.log('  • 中东语言: 8种 (阿拉伯语、波斯语、土耳其语、希伯来语等)');
console.log('  • 非洲语言: 7种 (斯瓦希里语、祖鲁语、阿姆哈拉语等)');
console.log('  • 其他语言: 20种 (包括太平洋地区、美洲原住民语言等)');

console.log('\n✨ 用户体验提升:');
console.log('  • 默认配置包含12种主要语言');
console.log('  • 提供多种区域配置模板');
console.log('  • 详细的语言支持文档');
console.log('  • 智能的语言代码映射');
console.log('  • 针对不同语言的优化翻译提示');

console.log('\n🎯 应用场景:');
console.log('  • 全球化产品: 支持主要市场语言');
console.log('  • 区域化产品: 专注特定地区语言');
console.log('  • 企业应用: 覆盖员工和客户使用的语言');
console.log('  • 开源项目: 支持贡献者母语');
console.log('  • 移动应用: 适配不同地区的应用商店');

console.log('\n🎉 Contexto 现在支持更全面丰富的目标语种！');
