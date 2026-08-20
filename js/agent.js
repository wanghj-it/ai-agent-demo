// Agent - ReAct loop engine
const Agent = (() => {
  const MAX_ITER = 8;
  let ctrl = null;

  const SYS = `你是 AI Agent，具备工具调用和任务规划能力。

## 核心能力
- 推理分析问题，拆解步骤逐步执行
- 调用 calculator / code_executor / web_search / file_manager 完成操作
- 记住对话上下文和重要信息

## 工作原则
1. 收到任务先分析需要哪些步骤
2. 需要计算调 calculator，搜索调 web_search，编程调 code_executor
3. 存储中间结果用 file_manager
4. 每步观察结果再决定下一步
5. 完成后给出完整总结，用中文呈现`;

  function init() {
    ctrl = null;
    Memory.init();
    Planner.init();
    Memory.addMessage({ role: 'system', content: SYS });
  }

  function abort() { if (ctrl) { ctrl.abort(); ctrl = null; } }

  function buildMsgs() {
    const msgs = Memory.getMessages();
    const p = Planner.progress();
    if (p.tasks.length > 0 && Planner.hasPending()) {
      const hint = { role: 'system', content: `任务分解: ${p.tasks.map(t => `[${t.status}] ${t.title}`).join(' | ')}。请完成下一个待处理任务。` };
      return [msgs[0], ...msgs.slice(1, -1), hint, msgs[msgs.length - 1]];
    }
    return msgs;
  }

  async function run(input, cb) {
    ctrl = new AbortController();
    const { onThink, onTool, onToken, onDone, onErr, onPlan } = cb || {};

    try {
      Planner.decompose(input);
      const plan = Planner.progress();
      if (onPlan) onPlan(plan);

      Memory.addMessage({ role: 'user', content: input });
      let iter = 0, answer = '';

      while (iter < MAX_ITER) {
        if (ctrl.signal.aborted) break;
        iter++;
        if (onThink) onThink(`思考中... (第 ${iter} 轮)`);

        const resp = await API.chat(buildMsgs(), Tools.getDefinitions(), {
          onToken: t => { if (onToken) onToken(t); },
          signal: ctrl.signal
        });

        if (resp.toolCalls) {
          for (const tc of resp.toolCalls) {
            const name = tc.function.name;
            const args = tc.function.arguments;
            if (onTool) onTool({ name, args, status: 'running' });
            const result = await Tools.execute(name, args);
            if (onTool) onTool({ name, args, result, status: 'done' });
            Memory.addMessage({ role: 'assistant', content: null, tool_calls: [tc] });
            Memory.addToolResult(tc.id, result);
          }
          continue;
        }

        answer = resp.content;
        break;
      }

      if (!answer) answer = '抱歉，Agent 未能在规定轮数内完成任务。请尝试简化问题。';
      Memory.addMessage({ role: 'assistant', content: answer });
      if (onDone) onDone(answer);
      return answer;

    } catch (e) {
      if (e.name === 'AbortError') { if (onDone) onDone('已取消。'); return '已取消。'; }
      if (onErr) onErr(e.message || '未知错误');
      throw e;
    } finally { ctrl = null; }
  }

  return { init, abort, run };
})();