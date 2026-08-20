// UI Module - Rendering and interaction
const UI = (() => {
  let chatContainer, trackingPanel, inputEl, sendBtn, settingsBtn, settingsModal, settingsForm;
  let isStreaming = false;
  let currentAssistantMsg = null;

  function init() {
    chatContainer = document.getElementById('chat-messages');
    trackingPanel = document.getElementById('tracking-panel');
    inputEl = document.getElementById('user-input');
    sendBtn = document.getElementById('send-btn');
    settingsBtn = document.getElementById('settings-btn');
    settingsModal = document.getElementById('settings-modal');
    settingsForm = document.getElementById('settings-form');

    // Load config
    const cfg = API.load();
    document.getElementById('api-endpoint').value = cfg.endpoint || '';
    document.getElementById('api-key').value = cfg.apiKey || '';
    document.getElementById('api-model').value = cfg.model || 'gpt-4o-mini';

    // Settings
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.toggle('hidden');
    });

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      API.save({
        endpoint: document.getElementById('api-endpoint').value.trim(),
        apiKey: document.getElementById('api-key').value.trim(),
        model: document.getElementById('api-model').value.trim() || 'gpt-4o-mini'
      });
      settingsModal.classList.add('hidden');
      addSystemMessage('配置已保存');
    });
  }

  function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'message system';
    div.innerHTML = `<div class="msg-content">${escapeHtml(text)}</div>`;
    chatContainer.appendChild(div);
    scrollToBottom();
  }

  function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = `<div class="msg-role">👤 你</div><div class="msg-content">${escapeHtml(text)}</div>`;
    chatContainer.appendChild(div);
    scrollToBottom();
  }

  function createAssistantMessage() {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `<div class="msg-role">🤖 Agent</div><div class="msg-content"></div>`;
    chatContainer.appendChild(div);
    currentAssistantMsg = div.querySelector('.msg-content');
    return currentAssistantMsg;
  }

  function appendToken(token) {
    if (!currentAssistantMsg) createAssistantMessage();
    if (currentAssistantMsg) {
      currentAssistantMsg.textContent += token;
      scrollToBottom();
    }
  }

  function finalizeAssistantMessage() {
    currentAssistantMsg = null;
  }

  function addTrackingEntry(type, data) {
    const entry = document.createElement('div');
    entry.className = `tracking-entry ${type}`;

    let icon, label, content;
    switch (type) {
      case 'thinking':
        icon = '🧠'; label = '思考'; content = data;
        break;
      case 'tool':
        icon = '🔧'; label = `调用工具: ${data.name}`;
        content = `<div class="tool-args"><strong>参数:</strong> ${escapeHtml(data.args || '')}</div>`;
        if (data.result) {
          content += `<div class="tool-result ${data.result.startsWith('错误') || data.result.startsWith('执行错误') ? 'error' : ''}"><strong>结果:</strong> ${escapeHtml(data.result)}</div>`;
        }
        if (data.status === 'running') entry.classList.add('running');
        break;
      case 'error':
        icon = '❌'; label = '错误'; content = data;
        break;
      case 'complete':
        icon = '✅'; label = '完成'; content = '';
        break;
      default:
        icon = '📌'; label = ''; content = data;
    }

    if (content) {
      entry.innerHTML = `<div class="tracking-icon">${icon}</div><div class="tracking-body"><div class="tracking-label">${label}</div><div class="tracking-content">${content}</div></div>`;
    } else {
      entry.innerHTML = `<div class="tracking-icon">${icon}</div><div class="tracking-body"><div class="tracking-label">${label}</div></div>`;
    }

    trackingPanel.appendChild(entry);
    trackingPanel.scrollTop = trackingPanel.scrollHeight;
    return entry;
  }

  function updatePlanProgress(plan) {
    // Remove old plan
    const old = trackingPanel.querySelector('.plan-progress');
    if (old) old.remove();

    const div = document.createElement('div');
    div.className = 'plan-progress';
    div.innerHTML = `
      <div class="plan-header">📋 任务计划 (${plan.completed}/${plan.total})</div>
      ${plan.tasks.map((t, i) => {
        let icon = '⏳';
        let cls = 'pending';
        if (t.status === 'completed') { icon = '✅'; cls = 'completed'; }
        if (t.status === 'in_progress') { icon = '🔄'; cls = 'in-progress'; }
        if (t.status === 'failed') { icon = '❌'; cls = 'failed'; }
        return `<div class="plan-task ${cls}">${icon} ${i + 1}. ${escapeHtml(t.title)}</div>`;
      }).join('')}
    `;
    trackingPanel.insertBefore(div, trackingPanel.firstChild);
  }

  function clearTracking() {
    trackingPanel.innerHTML = '';
  }

  function setStreaming(v) {
    isStreaming = v;
    sendBtn.disabled = v;
    inputEl.disabled = v;
    if (v) {
      sendBtn.textContent = '⏹';
      sendBtn.classList.add('stop');
    } else {
      sendBtn.textContent = '发送';
      sendBtn.classList.remove('stop');
    }
  }

  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    init, addSystemMessage, addUserMessage, createAssistantMessage,
    appendToken, finalizeAssistantMessage, addTrackingEntry,
    updatePlanProgress, clearTracking, setStreaming, escapeHtml
  };
})();