const express = require('express');
const app = express();
app.use(express.json());

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🌸 RINTU'S POOKIE ARMY 🌸</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #0a0011, #1a0020);
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      width: 100%;
      background: rgba(255,20,147,0.06);
      border: 2px solid rgba(255,105,180,0.25);
      border-radius: 30px;
      padding: 40px;
    }
    h1 {
      text-align: center;
      font-size: 2.8em;
      background: linear-gradient(135deg, #ff69b4, #ff1493);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .sub {
      text-align: center;
      color: #ffb6c1;
      margin: 10px 0 25px 0;
      letter-spacing: 3px;
    }
    .sub span { color: #ff69b4; font-weight: bold; }
    .status-box {
      background: rgba(255,105,180,0.05);
      border-radius: 20px;
      padding: 30px;
      text-align: center;
      border: 1px solid rgba(255,105,180,0.1);
    }
    .status-box .icon { font-size: 3.5em; display: block; }
    .status-box .msg { color: #ffb6c1; font-size: 1.2em; margin: 8px 0; }
    .status-box .detail { color: #ff69b488; font-size: 0.9em; }
    .input-area {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin: 20px 0;
    }
    .input-area input {
      padding: 14px 20px;
      border-radius: 14px;
      border: 1px solid rgba(255,105,180,0.25);
      background: rgba(255,255,255,0.03);
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
    #tokenList {
      margin-top: 15px;
      color: #ffb6c1;
    }
    .token-item {
      background: rgba(255,105,180,0.04);
      padding: 10px 18px;
      margin: 6px 0;
      border-radius: 12px;
      border-left: 3px solid #ff69b4;
      display: flex;
      justify-content: space-between;
    }
    .token-item .online { color: #00ffcc; }
    .token-item .offline { color: #ff69b488; }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #ffb6c133;
      font-size: 0.75em;
      border-top: 1px solid rgba(255,105,180,0.06);
      padding-top: 20px;
    }
  </style>
</head>
<body>
<div class="container">
  <h1>🌸 POOKIE ARMY 🌸</h1>
  <div class="sub">💖 <span>RINTU'S PRIVATE</span> · NO RULES 💖</div>
  
  <div class="status-box">
    <span class="icon">🚀</span>
    <div class="msg" id="statusMsg">✅ Server Running!</div>
    <div class="detail" id="detailMsg">Add tokens to start</div>
  </div>

  <div class="input-area">
    <input id="tokenInput" placeholder="Paste Discord token...">
    <button onclick="addToken()">➕ Add</button>
    <button onclick="startAll()" class="green">🚀 Start All</button>
  </div>
  
  <div id="tokenList"><div style="color:#ffb6c155; text-align:center; padding:15px;">💖 No tokens yet</div></div>

  <div class="footer">🌸 <strong>RINTU'S ARMY</strong> · v5.0 · 💕</div>
</div>

<script>
  let auth = '';
  
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
        document.getElementById('statusMsg').textContent = '✅ Logged in!';
        loadTokens();
        setInterval(loadTokens, 5000);
      }
    } catch(e) {
      document.getElementById('statusMsg').textContent = '⚠️ Connecting...';
    }
  }

  async function apiCall(endpoint, method = 'GET', body = null) {
    const opts = {
      method,
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(endpoint, opts);
    return res.json();
  }

  async function addToken() {
    const token = document.getElementById('tokenInput').value.trim();
    if (!token) return alert('🌸 Paste a token!');
    const data = await apiCall('/api/add-token', 'POST', { token });
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
      container.innerHTML = data.map(t => 
        `<div class="token-item">
          <span>🔑 ${t.id.slice(-8)}</span>
          <span class="${t.hasBot ? 'online' : 'offline'}">${t.hasBot ? '🩷 ONLINE' : '💤 OFFLINE'}</span>
        </div>`
      ).join('');
    } catch(e) {}
  }

  async function startAll() {
    const data = await apiCall('/api/start-all', 'POST');
    document.getElementById('statusMsg').textContent = '🚀 Started ' + (data.started || 0) + ' bot(s)!';
    loadTokens();
  }

  autoLogin();
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HTML));

const users = { rintu: 'pookie' };
const tokens = {};
const sessions = {};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    res.json({ token: 'pookie_token_' + username, userId: username });
  } else {
    res.status(401).json({ error: 'Invalid' });
  }
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.status(400).json({ error: 'Taken' });
  users[username] = password;
  tokens[username] = [];
  res.json({ success: true });
});

function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token || !token.startsWith('pookie_token_')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = token.replace('pookie_token_', '');
  if (!users[req.userId]) return res.status(401).json({ error: 'Invalid' });
  next();
}

app.post('/api/add-token', auth, (req, res) => {
  const { token } = req.body;
  if (!tokens[req.userId]) tokens[req.userId] = [];
  if (tokens[req.userId].find(t => t.token === token)) {
    return res.status(400).json({ error: 'Already added' });
  }
  tokens[req.userId].push({ token, status: 'inactive', id: Date.now().toString() });
  res.json({ success: true });
});

app.get('/api/status', auth, (req, res) => {
  const userTokens = tokens[req.userId] || [];
  res.json(userTokens.map(t => ({
    id: t.id,
    status: t.status,
    hasBot: !!sessions[req.userId]?.[t.id]
  })));
});

app.post('/api/start-all', auth, (req, res) => {
  const userTokens = tokens[req.userId] || [];
  let started = 0;
  for (let t of userTokens) {
    if (t.status === 'inactive') {
      t.status = 'active';
      if (!sessions[req.userId]) sessions[req.userId] = {};
      sessions[req.userId][t.id] = { username: 'Bot_' + t.id.slice(-4) };
      started++;
    }
  }
  res.json({ started });
});

app.get('/api/test', (req, res) => {
  res.json({ status: 'alive', message: '🌸 Pookie Army Running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🔥 ==========================================');
  console.log('🌸 POOKIE ARMY LIVE on port ' + PORT);
  console.log('🌐 Open: http://localhost:' + PORT);
  console.log('🔥 ==========================================');
});
