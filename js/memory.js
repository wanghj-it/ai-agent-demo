// Memory Module - Conversation history, context management, long-term memory
const Memory = (() => {
  const MAX_TOKENS = 8000;
  const SUMMARY_INTERVAL = 6; // Summarize every 6 messages

  let messages = [];
  let longTerm = {}; // key-value store for important facts
  let summary = '';

  function init() {
    messages = [];
    longTerm = {};
    summary = '';
  }

  function estimateTokens(text) {
    // Rough estimate: ~4 chars per token for Chinese, ~4 chars for English
    let total = 0;
    for (const char of text) {
      total += /[\u4e00-\u9fff]/.test(char) ? 1.5 : 1;
    }
    return Math.ceil(total / 3.5);
  }

  function estimateMessageTokens(msg) {
    let text = '';
    if (msg.content) text += msg.content;
    if (msg.tool_calls) text += JSON.stringify(msg.tool_calls);
    if (msg.tool_call_id) text += msg.tool_call_id;
    return estimateTokens(text);
  }

  function totalTokens() {
    return messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  }

  function addMessage(msg) {
    // Skip empty assistant messages that only have tool_calls
    if (msg.role === 'assistant' && !msg.content && !msg.tool_calls) return;

    messages.push(msg);
    trimIfNeeded();
    checkSummary();
  }

  function addToolResult(toolCallId, result) {
    messages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: typeof result === 'string' ? result : JSON.stringify(result)
    });
    trimIfNeeded();
  }

  function trimIfNeeded() {
    while (totalTokens() > MAX_TOKENS && messages.length > 4) {
      // Keep system message and first user message, trim from the middle
      const removed = messages.splice(1, 2);
      const keyPoints = extractKeyPoints(
        removed.map(m => m.content || '').join(' ')
      );
      if (keyPoints) {
        longTerm[`trimmed_${Date.now()}`] = keyPoints;
      }
    }
  }

  function checkSummary() {
    if (messages.length >= SUMMARY_INTERVAL) {
      const recent = messages.slice(-SUMMARY_INTERVAL);
      const text = recent.map(m => m.content || '').filter(Boolean).join(' ');
      if (text.length > 200) {
        summary = text.slice(0, 500) + (text.length > 500 ? '...' : '');
      }
    }
  }

  function extractKeyPoints(text) {
    const sentences = text.split(/[。！？.!?\n]/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).join('。');
  }

  function getMessages() {
    return [...messages];
  }

  function getSummary() {
    return summary;
  }

  function getLongTerm() {
    return { ...longTerm };
  }

  function setLongTerm(key, value) {
    longTerm[key] = value;
  }

  function getStats() {
    return {
      messageCount: messages.length,
      estimatedTokens: totalTokens(),
      longTermKeys: Object.keys(longTerm).length,
      hasSummary: summary.length > 0
    };
  }

  return { init, addMessage, addToolResult, getMessages, getSummary, getLongTerm, setLongTerm, getStats, estimateTokens };
})();