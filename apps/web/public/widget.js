(function () {
  'use strict';

  // Leer configuración del script tag
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var clientSlug = script.getAttribute('data-client');
  var apiUrl = script.getAttribute('data-api') || 'http://localhost:3001';

  if (!clientSlug) {
    console.warn('GoldenBot Widget: falta el atributo data-client');
    return;
  }

  // Generar sessionId único para este visitante
  var sessionId = localStorage.getItem('gb_session_' + clientSlug);
  if (!sessionId) {
    sessionId = 'gb_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('gb_session_' + clientSlug, sessionId);
  }

  var primaryColor = '#f59e0b';
  var businessName = 'Asistente Virtual';
  var welcomeMessage = '¡Hola! ¿En qué puedo ayudarte?';
  var isOpen = false;
  var messages = [];
  var conversationId = null;
  var socket = null;

  // Cargar configuración del negocio
  fetch(apiUrl + '/webchat/config/' + clientSlug)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.success) {
        primaryColor = data.config.primaryColor || primaryColor;
        businessName = data.config.businessName || businessName;
        welcomeMessage = data.config.welcomeMessage || welcomeMessage;
        updateHeader();
      }
    })
    .catch(function () {});

  // Inyectar estilos
  var style = document.createElement('style');
  style.textContent = [
    '#gb-widget{position:fixed;bottom:24px;right:24px;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '#gb-btn{width:56px;height:56px;border-radius:50%;background:' + primaryColor + ';border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:24px;transition:transform 0.2s}',
    '#gb-btn:hover{transform:scale(1.1)}',
    '#gb-box{position:absolute;bottom:68px;right:0;width:340px;height:480px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);display:none;flex-direction:column;overflow:hidden}',
    '#gb-box.open{display:flex}',
    '#gb-header{background:' + primaryColor + ';padding:16px;color:#fff;display:flex;align-items:center;gap:10px}',
    '#gb-avatar{width:36px;height:36px;background:rgba(255,255,255,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px}',
    '#gb-name{font-weight:600;font-size:15px}',
    '#gb-status{font-size:12px;opacity:0.85}',
    '#gb-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}',
    '#gb-messages::-webkit-scrollbar{width:4px}',
    '#gb-messages::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}',
    '.gb-msg{max-width:80%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-wrap:break-word}',
    '.gb-msg.bot{background:#f3f4f6;color:#111;border-bottom-left-radius:4px;align-self:flex-start}',
    '.gb-msg.user{background:' + primaryColor + ';color:#fff;border-bottom-right-radius:4px;align-self:flex-end}',
    '.gb-msg.agent{background:#22c55e;color:#fff;border-bottom-right-radius:4px;align-self:flex-start}',
    '.gb-label{font-size:11px;opacity:0.7;margin-bottom:2px}',
    '.gb-typing{display:flex;gap:4px;padding:8px 14px;background:#f3f4f6;border-radius:16px;border-bottom-left-radius:4px;align-self:flex-start;width:52px}',
    '.gb-dot{width:8px;height:8px;background:#aaa;border-radius:50%;animation:gb-bounce 1.2s infinite}',
    '.gb-dot:nth-child(2){animation-delay:0.2s}',
    '.gb-dot:nth-child(3){animation-delay:0.4s}',
    '@keyframes gb-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}',
    '#gb-input-area{padding:12px;border-top:1px solid #f0f0f0;display:flex;gap:8px}',
    '#gb-input{flex:1;border:1px solid #e5e7eb;border-radius:24px;padding:8px 14px;font-size:14px;outline:none;font-family:inherit}',
    '#gb-input:focus{border-color:' + primaryColor + '}',
    '#gb-send{background:' + primaryColor + ';border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.2s}',
    '#gb-send:hover{opacity:0.85}',
    '#gb-send svg{width:16px;height:16px;fill:#fff}',
  ].join('');
  document.head.appendChild(style);

  // Crear HTML del widget
  var container = document.createElement('div');
  container.id = 'gb-widget';
  container.innerHTML = [
    '<div id="gb-box">',
    '  <div id="gb-header">',
    '    <div id="gb-avatar">🤖</div>',
    '    <div>',
    '      <div id="gb-name">' + businessName + '</div>',
    '      <div id="gb-status">En línea · Respuesta inmediata</div>',
    '    </div>',
    '  </div>',
    '  <div id="gb-messages"></div>',
    '  <div id="gb-input-area">',
    '    <input id="gb-input" type="text" placeholder="Escribe tu mensaje..." autocomplete="off" />',
    '    <button id="gb-send">',
    '      <svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>',
    '    </button>',
    '  </div>',
    '</div>',
    '<button id="gb-btn" title="Chat con nosotros">💬</button>',
  ].join('');
  document.body.appendChild(container);

  var box = document.getElementById('gb-box');
  var btn = document.getElementById('gb-btn');
  var messagesEl = document.getElementById('gb-messages');
  var input = document.getElementById('gb-input');
  var sendBtn = document.getElementById('gb-send');

  function updateHeader() {
    var nameEl = document.getElementById('gb-name');
    if (nameEl) nameEl.textContent = businessName;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, content) {
    var div = document.createElement('div');
    div.className = 'gb-msg ' + role;
    if (role === 'bot') {
      div.innerHTML = '<div class="gb-label">🤖 Asistente</div>' + escapeHtml(content);
    } else if (role === 'agent') {
      div.innerHTML = '<div class="gb-label">👤 Agente</div>' + escapeHtml(content);
    } else {
      div.textContent = content;
    }
    messagesEl.appendChild(div);
    scrollToBottom();
    messages.push({ role: role, content: content });
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'gb-typing';
    div.id = 'gb-typing';
    div.innerHTML = '<div class="gb-dot"></div><div class="gb-dot"></div><div class="gb-dot"></div>';
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function hideTyping() {
    var t = document.getElementById('gb-typing');
    if (t) t.remove();
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  // Conectar socket.io para recibir mensajes del agente en tiempo real
  function connectSocket() {
    if (socket) return;
    var s = document.createElement('script');
    s.src = apiUrl + '/socket.io/socket.io.js';
    s.onload = function () {
      socket = window.io(apiUrl, { transports: ['websocket', 'polling'] });
      socket.on('connect', function () {
        if (conversationId) {
          socket.emit('join:conversation', conversationId);
        }
      });
      socket.on('message:new', function (data) {
        // Solo mostrar mensajes del agente (los del bot llegan por HTTP)
        if (data.role === 'agent' && data.conversationId === conversationId) {
          addMessage('agent', data.content);
        }
      });
    };
    document.head.appendChild(s);
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    showTyping();

    fetch(apiUrl + '/webchat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId,
        clientSlug: clientSlug,
        message: text,
      }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        hideTyping();
        // Guardar conversationId y unirse al room de socket
        if (data.conversationId && !conversationId) {
          conversationId = data.conversationId;
          if (socket && socket.connected) {
            socket.emit('join:conversation', conversationId);
          }
        }
        if (data.reply) {
          addMessage('bot', data.reply);
        }
      })
      .catch(function () {
        hideTyping();
        addMessage('bot', 'Lo siento, tuve un problema. ¿Puedes intentarlo de nuevo?');
      });
  }

  // Abrir/cerrar widget
  btn.addEventListener('click', function () {
    isOpen = !isOpen;
    if (isOpen) {
      box.classList.add('open');
      btn.textContent = '✕';
      input.focus();
      connectSocket(); // Conectar socket al abrir para recibir mensajes del agente
      // Mostrar mensaje de bienvenida si es la primera vez
      if (messages.length === 0) {
        setTimeout(function () {
          addMessage('bot', welcomeMessage);
        }, 300);
      }
    } else {
      box.classList.remove('open');
      btn.textContent = '💬';
    }
  });

  // Enviar con Enter
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
})();
