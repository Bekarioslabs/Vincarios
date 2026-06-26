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
    let activeRequest = null;

    if (!chatLog || !input || !sendButton) return null;

    if (!api || !api.chat || typeof api.chat.send !== 'function') {
      setText(status, 'Chat API unavailable.');
      setInputEnabled(input, sendButton, false);
      return null;
    }

    setInputEnabled(input, sendButton, true);
    setText(status, 'Chat ready.');

    async function sendCurrentMessage() {
      if (activeRequest) {
        await cancelCurrentRequest();
        return;
      }

      const content = input.value.trim();
      if (!content) return;

      const requestId = createChatRequestId();
      activeRequest = { requestId, canceled: false, pending: null };
      input.value = '';
      messages.push({ role: 'user', content });
      appendMessage(chatLog, 'user', content);
      setChatBusy(input, sendButton, true);
      setText(status, 'Waiting for provider...');
      const pending = appendMessage(chatLog, 'assistant', 'Thinking...', { allowSave: false });
      activeRequest.pending = pending;

      try {
        const preflight = await runReadContextPreflight({ api, content, contextState });
        if (!isRequestActive(activeRequest, requestId)) {
          pending.remove();
          setText(status, 'Request canceled.');
          return;
        }
        if (preflight && preflight.handled) {
          pending.remove();
          appendPreflightResult({
            api,
            chatLog,
            input,
            sendButton,
            messages,
            preflight,
            contextState,
            status
          });
          return;
        }

        await runProviderRequest({
          api,
          chatLog,
          content,
          messages,
          contextState,
          reviewBasket,
          status,
          pending,
          requestId,
          isRequestActive: () => isRequestActive(activeRequest, requestId)
        });
      } catch (error) {
        pending.remove();
        const message = error && error.message ? error.message : 'request failed';
        appendMessage(chatLog, 'assistant', 'Chat pipeline error: ' + message, { allowSave: false });
        setText(status, 'Chat pipeline failed.');
      } finally {
        if (activeRequest && activeRequest.requestId === requestId) activeRequest = null;
        setChatBusy(input, sendButton, false);
        input.focus();
      }
    }

    function cancelCurrentRequest() {
      cancelActiveChatRequest({
        api,
        activeRequest,
        setActiveRequest(next) { activeRequest = next; },
        input,
        sendButton,
        status
      });
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
      scopeChoice: options.scopeChoice,
      selection: options.contextState && typeof options.contextState.snapshot === 'function'
        ? options.contextState.snapshot()
        : null,
      blockedActionId: options.blockedActionId
    });
  }

  function appendPreflightResult(options) {
    const preflight = options.preflight || {};
    const scopeActions = Array.isArray(preflight.scopeActions)
      ? preflight.scopeActions.map((action) => ({
          label: action.label,
          onClick: () => runScopeAction(Object.assign({}, options, { scopeChoice: action.scopeChoice }))
        }))
      : [];
    const blockedActions = Array.isArray(preflight.blockedActions)
      ? preflight.blockedActions.map((action) => ({
          label: action.label,
          onClick: () => runBlockedAction(Object.assign({}, options, { blockedActionId: action.blockedActionId }))
        }))
      : [];
    const actions = scopeActions.concat(blockedActions);

    options.messages.push({ role: 'assistant', content: preflight.historyContent || preflight.message });
    appendMessage(options.chatLog, 'assistant', preflight.message, { allowSave: false, actions });
    setText(options.status, preflight.kind === 'scope_request' ? 'Folder scope requested.' : 'Read context handled.');
  }

  async function runScopeAction(options) {
    setInputEnabled(options.input, options.sendButton, false);
    setText(options.status, 'Reading folder scope...');
    const pending = appendMessage(options.chatLog, 'assistant', 'Reading folder scope...', { allowSave: false });
    try {
      const result = await runReadContextPreflight({
        api: options.api,
        content: '',
        scopeChoice: options.scopeChoice,
        contextState: options.contextState
      });
      pending.remove();
      if (result && result.handled) {
        appendPreflightResult(Object.assign({}, options, { preflight: result }));
      } else {
        appendMessage(options.chatLog, 'assistant', 'Folder scope is no longer available. Please select the folder again.', { allowSave: false });
        setText(options.status, 'Folder scope expired.');
      }
    } catch (error) {
      pending.remove();
      appendMessage(options.chatLog, 'assistant', 'Folder scope error: ' + ((error && error.message) || 'request failed'), { allowSave: false });
      setText(options.status, 'Folder scope failed.');
    } finally {
      setInputEnabled(options.input, options.sendButton, true);
      options.input.focus();
    }
  }

  async function runBlockedAction(options) {
    setInputEnabled(options.input, options.sendButton, false);
    setText(options.status, 'Retrying blocked action...');
    const pending = appendMessage(options.chatLog, 'assistant', 'Retrying blocked action...', { allowSave: false });
    try {
      const result = await runReadContextPreflight({
        api: options.api,
        content: '',
        blockedActionId: options.blockedActionId,
        contextState: options.contextState
      });

      if (result && result.kind === 'retry_provider_request') {
        await runProviderRequest({
          api: options.api,
          chatLog: options.chatLog,
          content: result.retryUserText,
          messages: options.messages,
          contextState: options.contextState,
          reviewBasket: options.reviewBasket,
          status: options.status,
          pending,
          includeUserMessage: false
        });
        return;
      }

      pending.remove();
      if (result && result.handled) {
        appendPreflightResult(Object.assign({}, options, { preflight: result }));
      } else {
        appendMessage(options.chatLog, 'assistant', 'Blocked action is no longer available. Please run the request again.', { allowSave: false });
        setText(options.status, 'Blocked action expired.');
      }
    } catch (error) {
      pending.remove();
      appendMessage(options.chatLog, 'assistant', 'Blocked action error: ' + ((error && error.message) || 'request failed'), { allowSave: false });
      setText(options.status, 'Blocked action failed.');
    } finally {
      setInputEnabled(options.input, options.sendButton, true);
      options.input.focus();
    }
  }

  async function runProviderRequest(options) {
    const providerMessages = options.includeUserMessage === false
      ? options.messages.concat({ role: 'user', content: options.content })
      : options.messages;
    const outboundMessages = buildOutboundMessages(providerMessages, options.content, options.contextState);
    const result = await options.api.chat.send({ messages: outboundMessages });
    options.pending.remove();
    if (result && result.ok && result.message && result.message.content) {
      const handled = await handleAssistantContent({
        api: options.api,
        chatLog: options.chatLog,
        content: result.message.content,
        messages: options.messages,
        contextState: options.contextState,
        reviewBasket: options.reviewBasket,
        status: options.status
      });
      if (!handled) {
        options.messages.push({ role: 'assistant', content: result.message.content });
        appendMessage(options.chatLog, 'assistant', result.message.content, { reviewBasket: options.reviewBasket, status: options.status });
      }
      setText(options.status, 'Response received.');
    } else {
      appendMessage(options.chatLog, 'assistant', 'Provider error: ' + ((result && result.error) || 'No response.'), { allowSave: false });
      setText(options.status, 'Provider error.');
    }
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
    if (Array.isArray(options.actions) && options.actions.length > 0) {
      message.appendChild(createMessageActions(options.actions));
    }
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

  function createMessageActions(actions) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-message-actions';
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-message-action-button';
      button.textContent = action.label || 'Action';
      button.addEventListener('click', () => {
        Array.from(wrapper.querySelectorAll('button')).forEach((item) => { item.disabled = true; });
        if (typeof action.onClick === 'function') action.onClick();
      });
      wrapper.appendChild(button);
    });
    return wrapper;
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
    if (enabled) {
      sendButton.textContent = '>';
      delete sendButton.dataset.chatState;
    }
  }

  function setChatBusy(input, sendButton, busy) {
    input.readOnly = busy;
    input.setAttribute('aria-disabled', String(busy));
    sendButton.disabled = false;
    sendButton.textContent = busy ? 'X' : '>';
    sendButton.dataset.chatState = busy ? 'running' : 'idle';
  }

  function cancelActiveChatRequest(options) {
    options = options || {};
    const request = options.activeRequest;
    if (!request) return { ok: false, code: 'no_active_request' };

    request.canceled = true;
    if (request.pending && typeof request.pending.remove === 'function') request.pending.remove();
    if (typeof options.setActiveRequest === 'function') options.setActiveRequest(null);
    setChatBusy(options.input, options.sendButton, false);
    if (options.input && typeof options.input.focus === 'function') options.input.focus();
    setText(options.status, 'Request canceled.');

    if (options.api && options.api.chat && typeof options.api.chat.cancel === 'function') {
      try {
        Promise.resolve(options.api.chat.cancel({ requestId: request.requestId })).catch(() => {});
      } catch (error) {}
    }

    return { ok: true, requestId: request.requestId };
  }
  function createChatRequestId() {
    return 'chat-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function isRequestActive(activeRequest, requestId) {
    return Boolean(activeRequest && activeRequest.requestId === requestId && activeRequest.canceled !== true);
  }

  function isNearBottom(node) {
    return node.scrollHeight - node.scrollTop - node.clientHeight < 48;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountChat, appendMessage, buildOutboundMessages, createChatRequestId, isRequestActive, setChatBusy, cancelActiveChatRequest };
  }

  if (typeof window !== 'undefined') {
    window.ZeusChat = Object.freeze({ mountChat });
  }
})();
