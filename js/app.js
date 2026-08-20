// App - Entry point, initialization, event binding
const App = (() => {
  function init() {
    UI.init();
    Agent.init();

    const input = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    sendBtn.addEventListener('click', () => handleSend());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    // Load config and show status
    const cfg = API.get();
    if (API.ready()) {
      UI.addSystemMessage(`已就绪。模型: ${cfg.model}`);
    } else {
      UI.addSystemMessage('请点击右上角 ⚙️ 配置 API 信息后开始使用');
    }

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    });
  }

  async function handleSend() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    if (!API.ready()) {
      UI.addSystemMessage('请先点击右上角 ⚙️ 配置 API 信息');
      return;
    }

    input.value = '';
    input.style.height = 'auto';
    UI.setStreaming(true);
    UI.clearTracking();
    UI.addUserMessage(text);
    UI.createAssistantMessage();

    let trackingEntry = null;

    try {
      await Agent.run(text, {
        onThink: (msg) => {
          trackingEntry = UI.addTrackingEntry('thinking', msg);
        },
        onTool: (data) => {
          if (data.status === 'running') {
            trackingEntry = UI.addTrackingEntry('tool', data);
          } else {
            if (trackingEntry) {
              trackingEntry.classList.remove('running');
              const resultDiv = trackingEntry.querySelector('.tool-result');
              if (!resultDiv) {
                const div = document.createElement('div');
                div.className = 'tool-result';
                if (data.result && (data.result.startsWith('错误') || data.result.startsWith('执行错误'))) {
                  div.classList.add('error');
                }
                div.innerHTML = `<strong>结果:</strong> ${UI.escapeHtml(data.result || '')}`;
                trackingEntry.querySelector('.tracking-content').appendChild(div);
              }
            }
          }
        },
        onToken: (token) => {
          UI.appendToken(token);
        },
        onPlan: (plan) => {
          UI.updatePlanProgress(plan);
        },
        onError: (err) => {
          UI.addTrackingEntry('error', err);
        },
        onDone: (answer) => {
          UI.addTrackingEntry('complete', '');
          UI.finalizeAssistantMessage();
        }
      });
    } catch (e) {
      UI.addTrackingEntry('error', e.message);
      UI.finalizeAssistantMessage();
    } finally {
      UI.setStreaming(false);
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());