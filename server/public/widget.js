/* ตอบไว — website chat widget.
   <script src="https://YOUR-SERVER/widget.js" data-bot="BOT_ID" async></script>
   Shadow DOM keeps the host page's CSS out; no build step, no dependencies besides the socket.io client
   the server already serves at /socket.io/socket.io.min.js. */
(function () {
  var script = document.currentScript || document.querySelector('script[data-bot]');
  if (!script || window.__tobwai) return;
  window.__tobwai = true;
  var botId = script.getAttribute('data-bot');
  var base = new URL(script.src).origin;
  var api = base + '/api/widget/' + botId;
  var storeKey = 'tobwai:' + botId;

  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483000;right:0;bottom:0';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var color = '#0f766e';
  root.innerHTML =
    '<style>' +
    ':host{all:initial}*{box-sizing:border-box;line-height:1.5;font-family:"IBM Plex Sans Thai","Noto Sans Thai","Leelawadee UI",Tahoma,system-ui,sans-serif;letter-spacing:0}' +
    '.fab{position:fixed;right:20px;bottom:20px;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;color:#fff;background:var(--c);box-shadow:0 6px 20px rgba(27,37,48,.25);display:flex;align-items:center;justify-content:center;transition:transform .15s}' +
    '.fab:hover{transform:scale(1.05)}.fab:focus-visible,.send:focus-visible,button:focus-visible{outline:2px solid #1b2530;outline-offset:2px}' +
    '.dot{position:absolute;top:4px;right:4px;width:12px;height:12px;border-radius:50%;background:#d9920b;border:2px solid #fff;display:none}' +
    '.panel{position:fixed;right:20px;bottom:92px;width:370px;height:min(600px,calc(100vh - 120px));background:#f4f6f3;border-radius:16px;box-shadow:0 12px 40px rgba(27,37,48,.25);display:none;flex-direction:column;overflow:hidden;color:#1b2530}' +
    '.panel.open{display:flex}' +
    '.head{background:var(--c);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}' +
    '.head b{font-size:15px;font-weight:600;flex:1}.head small{display:block;font-size:12px;opacity:.85;font-weight:400}' +
    '.x{background:transparent;border:0;color:#fff;cursor:pointer;padding:6px;border-radius:8px;line-height:0}.x:hover{background:rgba(255,255,255,.15)}' +
    '.log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}' +
    '.m{max-width:82%;padding:8px 12px;border-radius:14px;font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word}' +
    '.them{align-self:flex-start;background:#fff;border:1px solid #dfe4de;border-bottom-left-radius:4px}' +
    '.me{align-self:flex-end;background:var(--c);color:#fff;border-bottom-right-radius:4px}' +
    '.m img{max-width:100%;border-radius:8px;display:block;margin-bottom:4px}' +
    '.greet{align-self:center;text-align:center;color:#5b6672;font-size:13px;padding:6px 12px}' +
    '.btns{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:90%}' +
    '.btns button{border:1px solid var(--c);color:var(--c);background:#fff;border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}' +
    '.btns button:hover{background:#eef7f5}.btns button:disabled{opacity:.45;cursor:default}' +
    '.bar{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #dfe4de}' +
    '.bar textarea{flex:1;resize:none;border:1px solid #dfe4de;border-radius:10px;padding:8px 10px;font-size:14px;max-height:96px;outline:none;line-height:1.5}' +
    '.bar textarea:focus{border-color:var(--c)}' +
    '.send{width:40px;border:0;border-radius:10px;background:var(--c);color:#fff;cursor:pointer}.send:disabled{background:#dfe4de;cursor:default}' +
    '.err{font-size:12px;color:#b42318;padding:0 14px 6px}' +
    '.foot{font-size:11px;color:#9aa39c;text-align:center;padding:4px 0 8px;background:#fff}' +
    '@media (max-width:480px){.panel{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0}.panel.open~.fab{display:none}}' +
    '@media (prefers-reduced-motion:reduce){.fab{transition:none}}' +
    '</style>' +
    '<div class="panel" role="dialog" aria-label="แชทกับร้าน">' +
    '  <div class="head"><b><span class="name">แชท</span><small>ตอบกลับโดยเร็วที่สุด</small></b><button class="x" aria-label="ปิดแชท"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
    '  <div class="log" aria-live="polite"></div>' +
    '  <div class="err" hidden></div>' +
    '  <form class="bar"><textarea rows="1" placeholder="พิมพ์ข้อความ" aria-label="ข้อความ"></textarea><button class="send" aria-label="ส่ง" disabled><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg></button></form>' +
    '</div>' +
    '<button class="fab" aria-label="เปิดแชทกับร้าน"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span class="dot"></span></button>';

  var $ = function (s) { return root.querySelector(s); };
  var panel = $('.panel'), log = $('.log'), form = $('.bar'), input = $('textarea'), send = $('.send'), fab = $('.fab'), dot = $('.dot'), err = $('.err');
  var token = null, socket = null, started = false, greeting = '';

  function setColor(c) { host.style.setProperty('--c', c); root.host.style.setProperty('--c', c); panel.style.setProperty('--c', c); fab.style.setProperty('--c', c); }
  setColor(color);

  function showError(t) { err.textContent = t || ''; err.hidden = !t; }

  function add(m) {
    // only the latest set of buttons stays clickable
    root.querySelectorAll('.btns button').forEach(function (b) { b.disabled = true; });
    var mine = m.sender === 'contact';
    if (m.content || m.imageUrl) {
      var el = document.createElement('div');
      el.className = 'm ' + (mine ? 'me' : 'them');
      if (m.imageUrl) { var img = document.createElement('img'); img.src = m.imageUrl; img.alt = ''; el.appendChild(img); }
      if (m.content) el.appendChild(document.createTextNode(m.content));
      log.appendChild(el);
    }
    if (!mine && m.buttons && m.buttons.length) {
      var row = document.createElement('div');
      row.className = 'btns';
      m.buttons.forEach(function (b) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = b.label;
        btn.onclick = function () { post({ text: b.label, payload: b.payload }); };
        row.appendChild(btn);
      });
      log.appendChild(row);
    }
    log.scrollTop = log.scrollHeight;
    if (!mine && !panel.classList.contains('open')) dot.style.display = 'block';
  }

  function request(path, body) {
    return fetch(api + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
  }

  function post(body) {
    showError('');
    add({ sender: 'contact', content: body.text });
    body.token = token;
    return request('/messages', body).catch(function () { showError('ส่งไม่สำเร็จ ลองอีกครั้ง'); });
  }

  function connect() {
    if (socket || !window.io) return;
    socket = window.io(base + '/widget', { auth: { botId: botId, token: token }, transports: ['websocket', 'polling'] });
    socket.on('message', add);
  }

  function start() {
    if (started) return;
    started = true;
    var saved = null;
    try { saved = localStorage.getItem(storeKey); } catch (e) {}
    request('/session', { token: saved }).then(function (r) {
      token = r.data.token;
      try { localStorage.setItem(storeKey, token); } catch (e) {}
      if (greeting) { var g = document.createElement('div'); g.className = 'greet'; g.textContent = greeting; log.appendChild(g); }
      r.data.messages.forEach(add);
      dot.style.display = 'none';
      send.disabled = !input.value.trim();
      if (window.io) connect();
      else {
        var s = document.createElement('script');
        s.src = base + '/socket.io/socket.io.min.js';
        s.onload = connect;
        document.head.appendChild(s);
      }
    }).catch(function () { started = false; showError('เชื่อมต่อแชทไม่ได้ ลองใหม่อีกครั้ง'); });
  }

  function toggle(open) {
    panel.classList.toggle('open', open);
    fab.setAttribute('aria-expanded', String(open));
    if (open) { dot.style.display = 'none'; start(); setTimeout(function () { input.focus(); }, 50); }
  }

  fab.onclick = function () { toggle(!panel.classList.contains('open')); };
  $('.x').onclick = function () { toggle(false); fab.focus(); };
  input.oninput = function () { send.disabled = !input.value.trim() || !token; };
  input.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } };
  form.onsubmit = function (e) {
    e.preventDefault();
    var t = input.value.trim();
    if (!t || !token) return;
    input.value = '';
    send.disabled = true;
    post({ text: t });
  };

  request('/config').then(function (r) {
    $('.name').textContent = r.data.name;
    greeting = r.data.greeting || '';
    setColor(r.data.color || color);
  }).catch(function () { host.remove(); }); // bot inactive or missing: show nothing
})();
