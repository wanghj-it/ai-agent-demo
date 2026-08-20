// API Module - OpenAI-compatible LLM communication
const API = (() => {
  const KEY = 'ai_agent_config';
  let cfg = { endpoint: '', apiKey: '', model: 'gpt-4o-mini' };

  function load() {
    try { const s = localStorage.getItem(KEY); if (s) cfg = { ...cfg, ...JSON.parse(s) }; } catch (e) {}
    return cfg;
  }

  function save(u) { cfg = { ...cfg, ...u }; localStorage.setItem(KEY, JSON.stringify(cfg)); }
  function ready() { return !!(cfg.endpoint && cfg.apiKey); }
  function get() { return { ...cfg }; }

  async function chat(messages, tools, { onToken, signal } = {}) {
    if (!ready()) throw new Error('请先在设置中配置 API 信息');

    const url = cfg.endpoint.replace(/\/+$/, '') + '/chat/completions';
    const body = { model: cfg.model, messages, stream: true, temperature: 0.7, max_tokens: 4096 };
    if (tools?.length) { body.tools = tools; body.tool_choice = 'auto'; }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body), signal
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      let m = `API 错误 (${resp.status})`;
      try { m = JSON.parse(t).error?.message || m; } catch (e) {}
      throw new Error(m);
    }

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let content = '', buf = '', toolCalls = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data: ')) continue;
        const d = t.slice(6);
        if (d === '[DONE]') continue;
        try {
          const p = JSON.parse(d);
          const delta = p.choices?.[0]?.delta;
          if (delta?.content) { content += delta.content; if (onToken) onToken(delta.content); }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const i = tc.index || 0;
              if (!toolCalls[i]) toolCalls[i] = { id: '', type: 'function', function: { name: '', arguments: '' } };
              if (tc.id) toolCalls[i].id = tc.id;
              if (tc.function?.name) toolCalls[i].function.name += tc.function.name;
              if (tc.function?.arguments) toolCalls[i].function.arguments += tc.function.arguments;
            }
          }
        } catch (e) {}
      }
    }

    const valid = toolCalls.filter(tc => tc?.function?.name);
    return { content, toolCalls: valid.length ? valid : null };
  }

  return { load, save, ready, get, chat };
})();