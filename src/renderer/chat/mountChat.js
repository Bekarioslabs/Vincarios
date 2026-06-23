(function() {
  'use strict';

  function mountChat(options) {
    options = options || {};
    const api = options.api;
    const app = options.app;
    const status = options.status;
    if (!app) return null;

    const chatLog = app.querySelector('#chat-log');
    const input = app.querySelector('#chat-input');
    const sendButton = app.querySelector('#chat-send');
    const messages = [];

    if (!chatLog || !input || !sendButton) return null;

    if (!api || !api.chat || typeof api.chat.send !== 'function') {
      setText(status, 'Chat API unavailable.');
      setInputEnabled(input, sendButton, false);
      return null;
    }

    setInputEnabled(input, sendButton, true);
    setText(status, 'Chat ready.');

    async function sendCurrentMessage() {
      const content = input.value.trim();
      if (!content) return;

      input.value = '';
      messages.push({ role: 'user', content });
      appendMessage(chatLog, 'user', content);
      setInputEnabled(input, sendButton, false);
      setText(status, 'Waiting for provider...');
      const pending = appendMessage(chatLog, 'assistant', 'Thinking...');

      try {
        const result = await api.chat.send({ messages: messages.slice() });
        pending.remove();
        if (result && result.ok && result.message && result.message.content) {
          messages.push({ role: 'assistant', content: result.message.content });
          appendMessage(chatLog, 'assistant', result.message.content);
          setText(status, 'Response received.');
        } else {
          appendMessage(chatLog, 'assistant', 'Provider error: ' + ((result && result.error) || 'No response.'));
          setText(status, 'Provider error.');
        }
      } catch (error) {
        pending.remove();
        appendMessage(chatLog, 'assistant', 'Provider error: request failed.');
        setText(status, 'Provider request failed.');
      } finally {
        setInputEnabled(input, sendButton, true);
        input.focus();
      }
    }

    sendButton.addEventListener('click', sendCurrentMessage);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendCurrentMessage();
      }
    });

    return Object.freeze({ sendCurrentMessage, messages });
  }

  function appendMessage(chatLog, role, content) {
    const stickToBottom = isNearBottom(chatLog);
    const emptyState = chatLog.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();

    const message = document.createElement('article');
    message.className = 'chat-message chat-message-' + role;

    const label = document.createElement('div');
    label.className = 'chat-message-label';
    label.textContent = role === 'user' ? 'You' : 'ZEUS';

    const body = document.createElement('div');
    body.className = 'chat-message-body';
    body.textContent = content;

    message.appendChild(label);
    message.appendChild(body);
    chatLog.appendChild(message);

    if (stickToBottom) chatLog.scrollTop = chatLog.scrollHeight;
    return message;
  }

  function setInputEnabled(input, sendButton, enabled) {
    input.readOnly = !enabled;
    input.setAttribute('aria-disabled', String(!enabled));
    sendButton.disabled = !enabled;
  }

  function isNearBottom(node) {
    return node.scrollHeight - node.scrollTop - node.clientHeight < 48;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountChat, appendMessage };
  }

  if (typeof window !== 'undefined') {
    window.ZeusChat = Object.freeze({ mountChat });
  }
})();