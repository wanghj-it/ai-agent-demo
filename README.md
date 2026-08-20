# AI Agent Toolkit

一个浏览器端运行的 AI Agent 工具链演示项目，展示 LLM Agent 架构的核心能力：**ReAct 推理循环**、**多工具编排**、**任务规划**、**记忆管理**。

## 技术亮点

- **ReAct Agent**：实现 Reasoning + Acting 循环，Agent 自主决策何时调用工具、何时返回最终答案
- **工具系统**：计算器、代码执行器、网络搜索、虚拟文件管理，支持扩展
- **任务规划**：复杂任务自动拆解为子任务，逐步执行并追踪进度
- **记忆管理**：短期对话历史 + 长期摘要压缩，控制 token 消耗
- **流式响应**：支持 OpenAI 兼容 API 的 SSE 流式输出
- **纯前端架构**：零依赖、零构建，浏览器直接打开即可运行

## 快速开始

1. 克隆仓库
```bash
git clone https://github.com/wanghj-it/ai-agent-demo.git
```

2. 用浏览器打开 `index.html`

3. 点击右上角 ⚙️ 设置，填入你的 API 信息：
   - **API Endpoint**：`https://api.openai.com/v1`（或其他兼容接口）
   - **API Key**：你的 API 密钥
   - **Model**：`gpt-4o` / `gpt-4o-mini` / `deepseek-chat` 等

4. 开始对话

## 项目结构

```
ai-agent-demo/
├── index.html          # 主页面 - Agent 控制台布局
├── css/style.css       # 深色终端风格 UI
├── js/
│   ├── app.js          # 入口：初始化、事件绑定
│   ├── agent.js        # Agent 核心：ReAct 循环
│   ├── tools.js        # 工具注册表 + 4 个工具实现
│   ├── planner.js      # 任务规划器
│   ├── memory.js       # 记忆管理
│   ├── api.js          # LLM API 通信
│   └── ui.js           # UI 渲染
└── README.md
```

## 架构

```
用户输入 → Planner（拆解任务）→ Agent（ReAct 循环）
                                    ↓
                            LLM API ← 对话历史 + 工具列表
                                    ↓
                            解析响应（思考 or 行动）
                           ↙              ↘
                    返回最终答案        执行工具 → 观察结果 → 循环
```

## License

MIT