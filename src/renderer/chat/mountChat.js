(function() {
  'use strict';

  function mountChat(options) {
    options = options || {};
    const api = options.api;
    const app = options.app;
    const status = options.status;
    const reviewBasket = options.reviewBasket;
    const contextState = options.contextState || null;
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
      const pending = appendMessage(chatLog, 'assistant', 'Thinking...', { allowSave: false });

      try {
        const preflight = await runReadContextPreflight({ api, content, contextState });
        if (preflight && preflight.handled) {
          pending.remove();
          messages.push({ role: 'assistant', content: preflight.historyContent || preflight.message });
          appendMessage(chatLog, 'assistant', preflight.message, { allowSave: false });
          setText(status, 'Read context handled.');
          return;
        }

        const outboundMessages = buildOutboundMessages(messages, content, contextState);
        const result = await api.chat.send({ messages: outboundMessages });
        pending.remove();
        if (result && result.ok && result.message && result.message.content) {
          const handled = await handleAssistantContent({
            api,
            chatLog,
            content: result.message.content,
            messages,
            contextState,
            reviewBasket,
            status
          });
          if (!handled) {
            messages.push({ role: 'assistant', content: result.message.content });
            appendMessage(chatLog, 'assistant', result.message.content, { reviewBasket, status });
          }
          setText(status, 'Response received.');
        } else {
          appendMessage(chatLog, 'assistant', 'Provider error: ' + ((result && result.error) || 'No response.'), { allowSave: false });
          setText(status, 'Provider error.');
        }
      } catch (error) {
        pending.remove();
        const message = error && error.message ? error.message : 'request failed';
        appendMessage(chatLog, 'assistant', 'Chat pipeline error: ' + message, { allowSave: false });
        setText(status, 'Chat pipeline failed.');
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


  async function runReadContextPreflight(options) {
    const preflight = typeof window !== 'undefined' ? window.ZeusReadContextPreflight : null;
    if (!preflight || typeof preflight.runReadContextPreflight !== 'function') return { handled: false };
    return preflight.runReadContextPreflight({
      api: options.api,
      userText: options.content,
      selection: options.contextState && typeof options.contextState.snapshot === 'function'
        ? options.contextState.snapshot()
        : null
    });
  }
  function buildOutboundMessages(messages, userText, contextState) {
    const outboundMessages = messages.slice();
    if (!contextState || !window.ZeusContextState || !window.ZeusContextState.buildChatContextPackage) return outboundMessages;

    const contextPackage = window.ZeusContextState.buildChatContextPackage({
      userText,
      selection: contextState.snapshot()
    });
    if (!contextPackage.shouldAttach || !contextPackage.content || outboundMessages.length === 0) return outboundMessages;

    const last = outboundMessages[outboundMessages.length - 1];
    if (!last || last.role !== 'user') return outboundMessages;

    outboundMessages[outboundMessages.length - 1] = {
      role: 'user',
      content: contextPackage.content + '\n\n## User Request\n\n' + userText
    };
    return outboundMessages;
  }

  async function handleAssistantContent(options) {
    const runner = typeof window !== 'undefined' ? window.ZeusModelReadActionRunner : null;
    if (!runner || typeof runner.runModelReadActions !== 'function') return false;

    const result = await runner.runModelReadActions({
      api: options.api,
      content: options.content,
      selection: options.contextState && typeof options.contextState.snapshot === 'function'
        ? options.contextState.snapshot()
        : null
    });

    if (!result || !result.handled) return false;

    if (result.visibleText) {
      options.messages.push({ role: 'assistant', content: result.visibleText });
      appendMessage(options.chatLog, 'assistant', result.visibleText, {
        reviewBasket: options.reviewBasket,
        status: options.status
      });
    }

    result.messages.forEach((message) => {
      options.messages.push({ role: 'assistant', content: message });
      appendMessage(options.chatLog, 'assistant', message, { allowSave: false });
    });

    return true;
  }
  function appendMessage(chatLog, role, content, options) {
    options = options || {};
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
    renderMessageBody(body, role, content);

    message.appendChild(label);
    message.appendChild(body);
    if (role === 'assistant' && options.allowSave !== false) {
      message.appendChild(createSaveAsNoteButton(content, options));
    }
    chatLog.appendChild(message);

    if (stickToBottom) chatLog.scrollTop = chatLog.scrollHeight;
    return message;
  }

  function getMarkdownRenderer() {
    return typeof window !== 'undefined' ? window.ZeusMarkdownRenderer : null;
  }

  function renderMessageBody(body, role, content) {
    const renderer = getMarkdownRenderer();
    if (role === 'assistant' && renderer && typeof renderer.renderMarkdown === 'function') {
      body.classList.add('chat-message-markdown');
      body.innerHTML = renderer.renderMarkdown(content);
      return;
    }

    body.textContent = content;
  }

  function createSaveAsNoteButton(content, options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chat-save-note-button';
    button.textContent = 'Save as Note';
    button.addEventListener('click', () => {
      const factory = window.ZeusReviewBasketState && window.ZeusReviewBasketState.createSaveAssistantResponseProposal;
      if (!options.reviewBasket || typeof options.reviewBasket.addProposal !== 'function' || !factory) {
        setText(options.status, 'Review Basket unavailable.');
        return;
      }
      const proposal = factory(content);
      options.reviewBasket.addProposal(proposal);
      setText(options.status, 'Added to Review Basket.');
    });
    return button;
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
    module.exports = { mountChat, appendMessage, buildOutboundMessages };
  }

  if (typeof window !== 'undefined') {
    window.ZeusChat = Object.freeze({ mountChat });
  }
})();
