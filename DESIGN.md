# Contexto产品设计文档

## 产品简介
Contexto是一个vscode插件，目标是帮助开发者在软件国际化过程中，对工程中的文案进行符合业务场景和UI场景的本土化翻译。

## 软件架构

### 数据层
要将所有Contexto相关的数据都存入开发者软件工程的根目录，构建contexto目录，其中有两个文件
1. 插件配置：config.json
2. 翻译缓存：i18n.json

config.json格式
```json
{
    // 原始语种字典文件地址(需要配置基于软件工程根目录的相对路径，便于多人协作)
    "sourceLangDict": "./contexto/sourceLangDict.json",
    
    // 待翻译的目标语种列表
    "targetLangs": [
        "en",
        "fr",
        "de"
    ],

    // 避免扫描目录或文件列表
    "ignore": [
        "./contexto"
    ],

    // AI服务配置
    "aiService": {
        // AI服务类型
        "type": "openai",
        // API密钥
        "apiKey": "your-api-key",
        // base URL
        "base": "https://api.openai.com/v1",
        // 模型名称
        "model": "your-model-name"
    },

}
```

i18n.json格式
```json
{
    "key":  {
        "source": "原始语种文本",
        "sourceFile": "文本来源文件地址",
        "businessContext": "业务场景文本",
        "uiContext": "UI场景文本",
        "translations": {
            "en": "English translation",
            "fr": "French translation",
            "de": "German translation"
        }
    }
}
```

### 业务逻辑层

#### 兼容性

插件要兼容各种平台、各种框架的sourceLangDict文件格式，对于web、ios、android、macos、windows各个平台的各类框架如：vue、react、angular、flutter、electron、unity、xcode、android studio、Qt、svelte等各类客户端框架以及php、Python、Java、golang等各类后端工程的主流多语种方案产生的字典文件格式都要兼容

对这些格式的支持，最终都要转成Contexto所需的key-value形式的字典形式


#### 处理流程

1. 插件加载后首先要检测项目是否存在contexto目录且是否存在config.json文件，如果不存在则需要进入待初始化状态。
2. 如果存在config.json文件，则加载插件后进入初始化阶段，读取配置并初始化插件，包括加载翻译缓存和原始语种字典，如果i18n.json文件不存在则初始化一个空的。
3. 初始化结束后，插件进入运行状态，首先对原始语种字典文件进行扫描，无论原始语种文件是什么格式，只要是我们兼容的，都要转化成key-value的形式，然后与i18n.json中的key进行对比，识别出新增的key、i18n.json中需要删除的key，以及结合原始语种字典的原文文本与i18n.json中的source对比，识别出更新的key。
4. 识别config.json中的目标语种，再到i18n.json中看，每一个key是否已经有对应的翻译，如果没有则标记为待翻译状态。
5. 获取到新增、删除和更新的key以及待翻译的key，插件需要将这些信息反馈给用户，并为用户提供两个能力，第一：清空无用的key；第二，一键翻译新增、更新、待翻译的key；

#### 翻译流程

1. 收集到新增、更新的key后，用户要做翻译，首先要将key作为关键词在工程中进行搜索，搜索算法要快速高效，可以检索出包含该关键词的文件列表，如果没有检索到相关文件，要对这个key进行异常标记。
2. 将key关联的文件地址进行去重整合，找出能覆盖所有key的文件地址最小集合，并将其作为翻译的目标文件。
3. 将文件及文件内需要识别的key以及key对应的source文本整理在一起，进行AI服务请求，让AI进行每一个文本的业务场景、UI场景(客户端工程有，其他工程可忽略)的详细文本描述，要客观清晰描绘出文本出现上下文。最终可获取到每一个key对应的业务场景、UI场景描述，缓存入i18n.json中。
4. 待新增、更新的key也有上下文时，将新增、更新、待翻译的key，都所识别，判断出每一个key有哪些语种没有做翻译，最终整理成一个翻译任务列表，key、原始文本、业务场景、UI场景、目标语种整理在一个提示词模板中，利用AI进行符合场景的本土化翻译。将翻译结果缓存入i18n.json中。



### UI交互层

该插件有以UI形式为客户提供服务，插件会在vscode左侧边栏展示，避免命令的方式。
插件面板只需要一个tab，面板内容共有三个状态：
1. 没有项目打开状态，提示用户打开一个项目。页面只有一个主按钮，配置简要文字说明，按钮样式参照vscode中git的commit按钮样式。
2. 项目未初始化状态，提示用户初始化项目。页面只有一个主按钮，配置简要文字说明，按钮样式参照vscode中git的commit按钮样式。
3. 项目已初始化状态，展示待删除、新增、更新、待翻译的key列表，不同状态的key分三个列表展示。列表下面提供操作按钮，分别是：删除、翻译，按钮样式参照vscode中git的commit按钮样式。