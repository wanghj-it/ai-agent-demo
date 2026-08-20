// Tools Module - Registry, definitions, and execution
const Tools = (() => {
  const registry = {};

  // ---- Calculator ----
  registry.calculator = {
    definition: {
      type: 'function',
      function: {
        name: 'calculator',
        description: '安全计算数学表达式。支持四则运算、幂运算、三角函数、对数等。',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: '数学表达式，如 "2+3*4" 或 "Math.sqrt(144)"' }
          },
          required: ['expression']
        }
      }
    },
    execute(args) {
      const expr = args.expression.trim();
      const forbidden = /\b(eval|Function|constructor|__proto__|prototype|import|require|fetch|XMLHttpRequest|document|window|global|process)\b/;
      if (forbidden.test(expr)) throw new Error('表达式包含禁止的关键词');
      const result = new Function(`"use strict"; return (${expr})`)();
      if (typeof result !== 'number' || !isFinite(result)) throw new Error(`结果无效: ${result}`);
      return `计算结果: ${result}`;
    }
  };

  // ---- Code Executor ----
  registry.code_executor = {
    definition: {
      type: 'function',
      function: {
        name: 'code_executor',
        description: '在沙箱中执行 JavaScript 代码。适合算法验证、数据处理、快速原型。',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '要执行的 JavaScript 代码' }
          },
          required: ['code']
        }
      }
    },
    execute(args) {
      let output = '';
      const capture = (...v) => {
        output += v.map(x => typeof x === 'object' ? JSON.stringify(x, null, 2) : String(x)).join(' ') + '\n';
      };
      const sandbox = {
        console: { log: capture, warn: capture, error: capture, info: capture },
        Math, Date, JSON, Array, Object, String, Number, Boolean, RegExp,
        Map, Set, Promise, parseInt, parseFloat, isNaN, isFinite
      };
      try {
        const fn = new Function(...Object.keys(sandbox), `"use strict"; ${args.code}`);
        const result = fn(...Object.values(sandbox));
        if (result !== undefined) {
          output += typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        }
        return output.trim() || '代码执行完毕（无输出）';
      } catch (e) {
        return `执行错误: ${e.message}`;
      }
    }
  };

  // ---- Web Search ----
  registry.web_search = {
    definition: {
      type: 'function',
      function: {
        name: 'web_search',
        description: '搜索互联网获取实时信息。用于查找最新资料、事实核查。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' }
          },
          required: ['query']
        }
      }
    },
    async execute(args) {
      try {
        const resp = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const results = [];
        if (data.AbstractText) results.push(`摘要: ${data.AbstractText}`);
        if (data.RelatedTopics) {
          for (const t of data.RelatedTopics.slice(0, 5)) {
            if (t.Text) results.push(`- ${t.Text}${t.FirstURL ? ' (' + t.FirstURL + ')' : ''}`);
          }
        }
        return results.length > 0 ? results.join('\n') : `未找到关于 "${args.query}" 的结果。`;
      } catch (e) {
        return `搜索失败: ${e.message}。请尝试其他关键词。`;
      }
    }
  };

  // ---- File Manager ----
  const vfs = new Map();

  registry.file_manager = {
    definition: {
      type: 'function',
      function: {
        name: 'file_manager',
        description: '管理虚拟文件系统。创建、读取、列出、删除文件。用于存储中间结果、笔记、数据。',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['create', 'read', 'list', 'delete'], description: '操作类型' },
            filename: { type: 'string', description: '文件名' },
            content: { type: 'string', description: '文件内容（创建时）' }
          },
          required: ['action']
        }
      }
    },
    execute(args) {
      const { action, filename, content } = args;
      switch (action) {
        case 'create': {
          if (!filename) throw new Error('需要文件名');
          vfs.set(filename, content || '');
          return `文件 "${filename}" 已创建 (${(content || '').length} 字符)`;
        }
        case 'read': {
          if (!filename) throw new Error('需要文件名');
          if (!vfs.has(filename)) throw new Error(`文件 "${filename}" 不存在`);
          return `--- ${filename} ---\n${vfs.get(filename)}`;
        }
        case 'list': {
          if (vfs.size === 0) return '虚拟文件系统为空';
          return `文件列表 (${vfs.size} 个):\n${[...vfs].map(([n, c]) => `- ${n} (${c.length} 字符)`).join('\n')}`;
        }
        case 'delete': {
          if (!filename) throw new Error('需要文件名');
          if (!vfs.has(filename)) throw new Error(`文件 "${filename}" 不存在`);
          vfs.delete(filename);
          return `文件 "${filename}" 已删除`;
        }
        default:
          throw new Error(`未知操作: ${action}`);
      }
    }
  };

  function getDefinitions() {
    return Object.values(registry).map(t => t.definition);
  }

  function getNames() {
    return Object.keys(registry);
  }

  async function execute(name, args) {
    const tool = registry[name];
    if (!tool) throw new Error(`未知工具: ${name}`);
    try {
      const parsed = typeof args === 'string' ? JSON.parse(args) : args;
      return await tool.execute(parsed);
    } catch (e) {
      return `工具执行错误: ${e.message}`;
    }
  }

  return { getDefinitions, getNames, execute };
})();