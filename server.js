const express = require('express');
const path = require('path');
const app = express();

// Serve static files from public folder
app.use(express.static('public'));
app.use(express.json());

// ===== BACKEND STORAGE =====
const users = { rintu: 'pookie' };
const tokens = {};
const sessions = {};

// ===== API ROUTES =====
app.post('/api/login', (req, res) => {
  console.log('📨 Login:', req.body);
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    res.json({ token: 'pookie_token_' + username, userId: username });
  } else {
    res.status(401).json({ error: 'Invalid' });
  }
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
  console.log('📨 Add token for:', req.userId);
  const { token } = req.body;
  if (!tokens[req.userId]) tokens[req.userId] = [];
  if (tokens[req.userId].find(t => t.token === token)) {
    return res.status(400).json({ error: 'Already added' });
  }
  const id = 'tok_' + Date.now().toString(36);
  tokens[req.userId].push({ token, status: 'inactive', id });
  res.json({ success: true, id: id });
});

app.get('/api/status', auth, (req, res) => {
  const userTokens = tokens[req.userId] || [];
  res.json(userTokens.map(t => ({
    id: t.id,
    status: t.status,
    hasBot: !!sessions[req.userId]?.[t.id]
  })));
});

app.post('/api/remove-token', auth, (req, res) => {
  const { id } = req.body;
  const userTokens = tokens[req.userId] || [];
  const idx = userTokens.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  userTokens.splice(idx, 1);
  res.json({ success: true });
});

app.post('/api/start-all', auth, (req, res) => {
  const userTokens = tokens[req.userId] || [];
  let started = 0;
  for (let t of userTokens) {
    if (t.status === 'inactive') {
      t.status = 'active';
      if (!sessions[req.userId]) sessions[req.userId] = {};
      sessions[req.userId][t.id] = { username: 'Bot_' + t.id.slice(-4), inVC: false };
      started++;
    }
  }
  res.json({ started });
});

app.post('/api/stop-all', auth, (req, res) => {
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

app.get('/api/bots', auth, (req, res) => {
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

app.post('/api/bot-action', auth, (req, res) => {
  const { id, action, value } = req.body;
  const bot = sessions[req.userId]?.[id];
  if (bot) {
    if (action === 'join') bot.inVC = true;
    if (action === 'leave') bot.inVC = false;
  }
  res.json({ success: true });
});

app.post('/api/rename-all', auth, (req, res) => {
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

app.post('/api/reset-names', auth, (req, res) => {
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

app.post('/api/invite-join', auth, (req, res) => {
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

app.post('/api/leave-all', auth, (req, res) => {
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

app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: '🌸 Pookie Army is alive!' });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🔥 ==========================================');
  console.log('🌸 POOKIE ARMY LIVE on port ' + PORT);
  console.log('🌐 Open: http://localhost:' + PORT);
  console.log('🔐 Login: rintu / pookie');
  console.log('🔥 ==========================================');
});
