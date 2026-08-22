const express = require('express');
const app = express();
app.use(express.json());

// ===== HTML DASHBOARD =====
const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🌸 RINTU'S POOKIE ARMY 🌸</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #0a0011, #1a0020, #0a0011);
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      max-width: 1000px;
      width: 100%;
      background: rgba(255, 20, 147, 0.06);
      border: 2px solid rgba(255, 105, 180, 0.25);
      border-radius: 30px;
      padding: 40px;
      backdrop-filter: blur(10px);
    }
    h1 {
      text-align: center;
      font-size: 3em;
      background: linear-gradient(135deg, #ff69b4, #ff1493);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 5px;
    }
    .subtitle {
      text-align: center;
      color: #ffb6c1;
      font-size: 1em;
      letter-spacing: 4px;
      margin-bottom: 25px;
    }
    .subtitle span { color: #ff69b4; font-weight: bold; }
    .status-card {
      background: rgba(255, 105, 180, 0.05);
      border-radius: 20px;
      padding: 20px;
      text-align: center;
      border: 1px solid rgba(255, 105, 180, 0.1);
      margin-bottom: 20px;
    }
    .status-card .icon { font-size: 2.5em; display: block; }
    .status-card .msg { color: #ffb6c1; font-size: 1.1em; margin: 5px 0; }
    .status-card .detail { color: #ff69b488; font-size: 0.85em; }
    .input-area {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin: 15px 0;
    }
    .input-area input {
      padding: 14px 20px;
      border-radius: 14px;
      border: 1px solid rgba(255, 105, 180, 0.25);
      background: rgba(255, 255, 255, 0.03);
      color: #ffe4ec;
      font-size: 1em;
      flex: 2;
      min-width: 180px;
      outline: none;
    }
    .input-area input:focus { border-color: #ff69b4; }
    .input-area input::placeholder { color: #ffb6c155; }
    .input-area button {
      padding: 14px 25px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(135deg, #ff69b4, #ff1493);
      color: white;
      font-weight: bold;
      cursor: pointer;
      font-size: 1em;
      transition: 0.3s;
    }
    .input-area button:hover { transform: scale(1.03); box-shadow: 0 0 30px rgba(255,20,147,0.3); }
    .input-area button.green { background: linear-gradient(135deg, #00cc88, #009966); }
    .input-area button.red { background: linear-gradient(135deg, #ff4444, #cc0000); }
    .input-area button.orange { background: linear-gradient(135deg, #ff8800, #cc6600); }
    #tokenList {
      margin-top: 15px;
      color: #ffb6c1;
    }
    .token-item {
      background: rgba(255, 105, 180, 0.04);
      padding: 10px 18px;
      margin: 6px 0;
      border-radius: 12px;
      border-left: 3px solid #ff69b4;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .token-item .online { color: #00ffcc; }
    .token-item .offline { color: #ff69b488; }
    .token-item .remove {
      background: none;
      border: none;
      color: #ff444488;
      cursor: pointer;
      font-size: 1.2em;
    }
    .token-item .remove:hover { color: #ff4444; }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #ffb6c133;
      font-size: 0.75em;
      border-top: 1px solid rgba(255, 105, 180, 0.06);
      padding-top: 20px;
    }
    .footer strong { color: #ff69b466; }
    .tab-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
      margin: 15px 0;
    }
    .tab-btn {
      padding: 10px 25px;
      border: 1px solid rgba(255,105,180,0.2);
      background: rgba(255,20,147,0.05);
      color: #ffb6c188;
      border-radius: 30px;
      cursor: pointer;
      font-weight: bold;
      transition: 0.3s;
    }
    .tab-btn:hover { background: rgba(255,105,180,0.1); }
    .tab-btn.active {
      background: linear-gradient(135deg, #ff69b4, #ff1493);
      color: white;
      border-color: #ff69b4;
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .bot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 10px;
    }
    .bot-card {
      background: rgba(255,105,180,0.05);
      border-radius: 14px;
      padding: 15px;
      text-align: center;
      border: 1px solid rgba(255,105,180,0.08);
    }
    .bot-card .name { color: #ff69b4; font-weight: bold; }
    .bot-card .status { font-size: 0.8em; color: #ffb6c188; margin: 5px 0; }
    .bot-card .controls {
      display: flex;
      gap: 5px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .bot-card .controls button {
      padding: 5px 12px;
      font-size: 0.7em;
      border: 1px solid rgba(255,105,180,0.2);
      background: rgba(255,20,147,0.05);
      color: #ffb6c1;
      border-radius: 8px;
      cursor: pointer;
    }
    .bot-card .controls button:hover { background: rgba(255,105,180,0.15); }
    .invite-area {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin: 15px 0;
    }
    .invite-area input {
      padding: 14px 20px;
      border-radius: 14px;
      border: 1px solid rgba(255, 105, 180, 0.25);
      background: rgba(255, 255, 255, 0.03);
      color: #ffe4ec;
      font-size: 1em;
      flex: 2;
      min-width: 180px;
      outline: none;
    }
    .invite-area input::placeholder { color: #ffb6c155; }
    .invite-area button {
      padding: 14px 25px;
      border: none;
      border-radius: 14px;
      background: linear-gradient(135deg, #ff8800, #cc6600);
      color: white;
      font-weight: bold;
      cursor: pointer;
      font-size: 1em;
      transition: 0.3s;
    }
    .invite-area button:hover { transform: scale(1.03); box-shadow: 0 0 30px rgba(255,136,0,0.3); }
  </style>
</head>
<body>
<div class="container">
  <h1>🌸 POOKIE ARMY 🌸</h1>
  <div class="subtitle">💖 <span>RINTU'S PRIVATE</span> · NO RULES · ALL CUTE 💖</div>
  
  <div class="status-card">
    <span class="icon">🚀</span>
    <div class="msg" id="statusMsg">✅ Connected!</div>
    <div class="detail" id="detailMsg">Ready for chaos</div>
  </div>

  <div class="tab-bar">
    <button class="tab-btn active" data-tab="tokens">🪙 Tokens</button>
    <button class="tab-btn" data-tab="bots">🎮 Bots</button>
    <button class="tab-btn" data-tab="invite">🔗 Invite</button>
    <button class="tab-btn" data-tab="rename">✏️ Rename</button>
  </div>

  <div id="tab-tokens" class="tab-content active">
    <div class="input-area">
      <input id="tokenInput" placeholder="Paste Discord token...">
      <button onclick="addToken()">➕ Add</button>
      <button onclick="startAll()" class="green">🚀 Start All</button>
      <button onclick="stopAll()" class="red">⏹️ Stop All</button>
    </div>
    <div id="tokenList"><div style="color:#ffb6c155; text-align:center; padding:15px;">💖 No tokens yet</div></div>
  </div>

  <div id="tab-bots" class="tab-content">
    <div class="bot-grid" id="botGrid">
      <div style="color:#ffb6c155; text-align:center; padding:20px; grid-column:1/-1;">💤 No active bots</div>
    </div>
  </div>

  <div id="tab-invite" class="tab-content">
    <div style="text-align:center;">
      <div class="invite-area">
        <input id="inviteInput" placeholder="discord.gg/xxxx or invite code">
        <button onclick="inviteJoin()">🚀 Join All Bots</button>
        <button onclick="leaveAll()" class="red">🚪 Leave All</button>
      </div>
      <div style="color:#ffb6c155; font-size:0.85em;">💖 All active bots will join and BLAST volume 1000%+</div>
    </div>
  </div>

  <div id="tab-rename" class="tab-content">
    <div style="text-align:center;">
      <input id="newNameInput" placeholder="New name for all bots..." style="padding:14px 20px; border-radius:14px; border:1px solid rgba(255,105,180,0.25); background:rgba(255,255,255,0.03); color:#ffe4ec; font-size:1em; width:80%; max-width:400px; outline:none;">
      <br><br>
      <button onclick="renameAll()" class="green">🔄 Rename All</button>
      <button onclick="resetNames()" class="orange">↩️ Reset</button>
    </div>
  </div>

  <div class="footer">🌸 <strong>RINTU'S ARMY</strong> · v7.0 · 💕</div>
</div>

<script>
  let auth = '';
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
      });
      document.querySelectorAll('.tab-content').forEach(function(c) {
        c.classList.remove('active');
      });
      this.classList.add('active');
      var tabId = this.getAttribute('data-tab');
      document.getElementById('tab-' + tabId).classList.add('active');
      if (tabId === 'bots') loadBots();
    });
  });
  
  async function autoLogin() {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'rintu', password: 'pookie' })
      });
      const data = await res.json();
      if (data.token) {
        auth = data.token;
        document.getElementById('statusMsg').textContent = '✅ Logged in as rintu';
        loadTokens();
        loadBots();
        setInterval(loadTokens, 5000);
        setInterval(loadBots, 5000);
      } else {
        document.getElementById('statusMsg').textContent = '❌ Login failed - check server';
      }
    } catch(e) {
      document.getElementById('statusMsg').textContent = '⚠️ Connecting...';
      console.error('Login error:', e);
    }
  }

  async function apiCall(endpoint, method, body) {
    method = method || 'GET';
    const opts = {
      method: method,
      headers: { 
        'Authorization': auth, 
        'Content-Type': 'application/json' 
      }
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(endpoint, opts);
      return await res.json();
    } catch(e) {
      console.error('API Error:', e);
      return { error: 'Network error' };
    }
  }

  async function addToken() {
    const token = document.getElementById('tokenInput').value.trim();
    if (!token) return alert('🌸 Paste a token!');
    const data = await apiCall('/api/add-token', 'POST', { token: token });
    if (data.success) {
      document.getElementById('tokenInput').value = '';
      loadTokens();
      document.getElementById('statusMsg').textContent = '✅ Token added!';
    } else {
      alert('❌ ' + (data.error || 'Failed'));
    }
  }

  async function loadTokens() {
    if (!auth) return;
    try {
      const data = await apiCall('/api/status');
      const container = document.getElementById('tokenList');
      if (!data || data.length === 0) {
        container.innerHTML = '<div style="color:#ffb6c155; text-align:center; padding:15px;">💖 No tokens yet</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < data.length; i++) {
        var t = data[i];
        html += '<div class="token-item">';
        html += '<span>🔑 ' + t.id.slice(-8) + '</span>';
        html += '<span class="' + (t.hasBot ? 'online' : 'offline') + '">' + (t.hasBot ? '🩷 ONLINE' : '💤 OFFLINE') + '</span>';
        html += '<button class="remove" onclick="removeToken(\'' + t.id + '\')">✕</button>';
        html += '</div>';
      }
      container.innerHTML = html;
    } catch(e) {
      console.error('Load tokens error:', e);
    }
  }

  async function removeToken(id) {
    if (!confirm('Remove this token?')) return;
    const data = await apiCall('/api/remove-token', 'POST', { id: id });
    if (data.success) loadTokens();
  }

  async function startAll() {
    const data = await apiCall('/api/start-all', 'POST');
    document.getElementById('statusMsg').textContent = '🚀 Started ' + (data.started || 0) + ' bot(s)!';
    loadTokens();
    loadBots();
  }

  async function stopAll() {
    const data = await apiCall('/api/stop-all', 'POST');
    document.getElementById('statusMsg').textContent = '⏹️ Stopped ' + (data.stopped || 0) + ' bot(s)';
    loadTokens();
    loadBots();
  }

  async function loadBots() {
    if (!auth) return;
    try {
      const data = await apiCall('/api/bots');
      const container = document.getElementById('botGrid');
      if (!data || data.length === 0) {
        container.innerHTML = '<div style="color:#ffb6c155; text-align:center; padding:20px; grid-column:1/-1;">💤 No active bots</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < data.length; i++) {
        var b = data[i];
        html += '<div class="bot-card">';
        html += '<div class="name">' + (b.username || 'Bot') + '</div>';
        html += '<div class="status">' + (b.inVC ? '🔊 In VC' : '💤 Idle') + '</div>';
        html += '<div class="controls">';
        html += '<button onclick="botAction(\'' + b.id + '\',\'join\')">🔊 Join</button>';
        html += '<button onclick="botAction(\'' + b.id + '\',\'leave\')">🚪 Leave</button>';
        html += '<button onclick="botAction(\'' + b.id + '\',\'volume\',\'10\')">🔊 1000%</button>';
        html += '</div></div>';
      }
      container.innerHTML = html;
    } catch(e) {
      console.error('Load bots error:', e);
    }
  }

  async function botAction(id, action, value) {
    value = value || null;
    const data = await apiCall('/api/bot-action', 'POST', { id: id, action: action, value: value });
    if (data.success) loadBots();
  }

  async function renameAll() {
    const name = document.getElementById('newNameInput').value.trim();
    if (!name) return alert('🌸 Enter a name!');
    const data = await apiCall('/api/rename-all', 'POST', { name: name });
    document.getElementById('statusMsg').textContent = '✏️ Renamed ' + (data.renamed || 0) + ' bot(s)!';
    loadBots();
  }

  async function resetNames() {
    const data = await apiCall('/api/reset-names', 'POST');
    document.getElementById('statusMsg').textContent = '↩️ Reset ' + (data.reset || 0) + ' bot(s)';
    loadBots();
  }

  async function inviteJoin() {
    const invite = document.getElementById('inviteInput').value.trim();
    if (!invite) return alert('🌸 Enter an invite!');
    const data = await apiCall('/api/invite-join', 'POST', { invite: invite });
    document.getElementById('statusMsg').textContent = '🚀 ' + (data.joined || 0) + ' bot(s) joined!';
    loadBots();
  }

  async function leaveAll() {
    const data = await apiCall('/api/leave-all', 'POST');
    document.getElementById('statusMsg').textContent = '🚪 ' + (data.left || 0) + ' bot(s) left';
    loadBots();
  }

  // Start when page loads
  window.onload = function() {
    autoLogin();
  };
</script>
</body>
</html>`;

// ===== ROUTES =====
app.get('/', (req, res) => {
  res.send(HTML);
});

// ===== BACKEND STORAGE =====
const users = { rintu: 'pookie' };
const tokens = {};
const sessions = {};

// ===== API ROUTES =====

// Login
app.post('/api/login', (req, res) => {
  console.log('📨 Login request:', req.body);
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    res.json({ token: 'pookie_token_' + username, userId: username });
  } else {
    res.status(401).json({ error: 'Invalid. Use rintu/pookie' });
  }
});

// Auth middleware
function auth(req, res, next) {
  const token = req.headers['authorization'];
  console.log('🔑 Auth token:', token);
  if (!token || !token.startsWith('pookie_token_')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = token.replace('pookie_token_', '');
  if (!users[req.userId]) return res.status(401).json({ error: 'Invalid user' });
  next();
}

// Add token
app.post('/api/add-token', auth, (req, res) => {
  console.log('📨 Add token request for user:', req.userId);
  const { token } = req.body;
  if (!tokens[req.userId]) tokens[req.userId] = [];
  if (tokens[req.userId].find(t => t.token === token)) {
    return res.status(400).json({ error: 'Already added' });
  }
  const id = 'tok_' + Date.now().toString(36);
  tokens[req.userId].push({ token, status: 'inactive', id: id });
  console.log('✅ Token added:', id);
  res.json({ success: true, id: id });
});

// Get status
app.get('/api/status', auth, (req, res) => {
  console.log('📨 Status request for user:', req.userId);
  const userTokens = tokens[req.userId] || [];
  const result = userTokens.map(t => ({
    id: t.id,
    status: t.status,
    hasBot: !!sessions[req.userId]?.[t.id]
  }));
  res.json(result);
});

// Remove token
app.post('/api/remove-token', auth, (req, res) => {
  console.log('📨 Remove token request:', req.body);
  const { id } = req.body;
  const userTokens = tokens[req.userId] || [];
  const idx = userTokens.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (sessions[req.userId]?.[id]) {
    delete sessions[req.userId][id];
  }
  userTokens.splice(idx, 1);
  res.json({ success: true });
});

// Start all
app.post('/api/start-all', auth, (req, res) => {
  console.log('📨 Start all request for user:', req.userId);
  const userTokens = tokens[req.userId] || [];
  let started = 0;
  for (let t of userTokens) {
    if (t.status === 'inactive') {
      t.status = 'active';
      if (!sessions[req.userId]) sessions[req.userId] = {};
      sessions[req.userId][t.id] = { 
        username: 'Bot_' + t.id.slice(-4), 
        inVC: false,
        token: t.token
      };
      started++;
    }
  }
  console.log('✅ Started', started, 'bots');
  res.json({ started });
});

// Stop all
app.post('/api/stop-all', auth, (req, res) => {
  console.log('📨 Stop all request for user:', req.userId);
  const userTokens = tokens[req.userId] || [];
  let stopped = 0;
  for (let t of userTokens) {
    if (t.status === 'active') {
      t.status = 'inactive';
      if (sessions[req.userId]?.[t.id]) {
        delete sessions[req.userId][t.id];
        stopped++;
      }
    }
  }
  res.json({ stopped });
});

// Get bots
app.get('/api/bots', auth, (req, res) => {
  console.log('📨 Bots request for user:', req.userId);
  const userTokens = tokens[req.userId] || [];
  const bots = [];
  for (let t of userTokens) {
    const bot = sessions[req.userId]?.[t.id];
    if (bot && t.status === 'active') {
      bots.push({
        id: t.id,
        username: bot.username || 'Bot',
        inVC: bot.inVC || false,
        status: t.status
      });
    }
  }
  res.json(bots);
});

// Bot action
app.post('/api/bot-action', auth, (req, res) => {
  console.log('📨 Bot action:', req.body);
  const { id, action, value } = req.body;
  const userTokens = tokens[req.userId] || [];
  const t = userTokens.find(t => t.id === id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const bot = sessions[req.userId]?.[id];
  if (bot) {
    if (action === 'join') { bot.inVC = true; console.log('🔊 Bot', id, 'joined VC'); }
    if (action === 'leave') { bot.inVC = false; console.log('🚪 Bot', id, 'left VC'); }
    if (action === 'volume') { console.log('🔊 Volume set to', value); }
  }
  res.json({ success: true });
});

// Rename all
app.post('/api/rename-all', auth, (req, res) => {
  console.log('📨 Rename all request:', req.body);
  const { name } = req.body;
  const userTokens = tokens[req.userId] || [];
  let renamed = 0;
  for (let t of userTokens) {
    if (sessions[req.userId]?.[t.id]) {
      sessions[req.userId][t.id].username = name + '_' + t.id.slice(-4);
      renamed++;
    }
  }
  res.json({ renamed });
});

// Reset names
app.post('/api/reset-names', auth, (req, res) => {
  console.log('📨 Reset names request');
  const userTokens = tokens[req.userId] || [];
  let reset = 0;
  for (let t of userTokens) {
    if (sessions[req.userId]?.[t.id]) {
      sessions[req.userId][t.id].username = 'Bot_' + t.id.slice(-4);
      reset++;
    }
  }
  res.json({ reset });
});

// Invite join
app.post('/api/invite-join', auth, (req, res) => {
  console.log('📨 Invite join request:', req.body);
  const { invite } = req.body;
  const userTokens = tokens[req.userId] || [];
  let joined = 0;
  for (let t of userTokens) {
    if (sessions[req.userId]?.[t.id] && t.status === 'active') {
      sessions[req.userId][t.id].inVC = true;
      joined++;
    }
  }
  res.json({ joined });
});

// Leave all
app.post('/api/leave-all', auth, (req, res) => {
  console.log('📨 Leave all request');
  const userTokens = tokens[req.userId] || [];
  let left = 0;
  for (let t of userTokens) {
    if (sessions[req.userId]?.[t.id]) {
      sessions[req.userId][t.id].inVC = false;
      left++;
    }
  }
  res.json({ left });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: '🌸 Pookie Army is alive!' });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🔥 ==========================================');
  console.log('🌸 POOKIE ARMY LIVE on port ' + PORT);
  console.log('🌐 Open: http://localhost:' + PORT);
  console.log('🔐 Login: rintu / pookie');
  console.log('📨 All API routes are ready!');
  console.log('🔥 ==========================================');
});
