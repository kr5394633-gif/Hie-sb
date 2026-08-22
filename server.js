const express = require('express');
const path = require('path');
const app = express();

app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

// ===== STORAGE =====
const users = { rintu: 'pookie' };
const tokens = {};

// ===== API ROUTES =====
app.post('/api/login', (req, res) => {
    console.log('📨 Login:', req.body);
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        res.json({ token: 'pookie_token_' + username, userId: username });
    } else {
        res.status(401).json({ error: 'Invalid. Use rintu/pookie' });
    }
});

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

// ===== SIMPLIFIED ADD TOKENS =====
app.post('/api/add-tokens', auth, (req, res) => {
    console.log('📨 Add tokens request received');
    console.log('📨 Body:', JSON.stringify(req.body));
    
    const { tokens: tokenList } = req.body;
    
    // Check if tokens exist
    if (!tokenList) {
        console.log('❌ No tokens field in request');
        return res.status(400).json({ error: 'No tokens field. Send { "tokens": ["token1", "token2"] }' });
    }
    
    // Check if it's an array
    if (!Array.isArray(tokenList)) {
        console.log('❌ Tokens is not an array');
        return res.status(400).json({ error: 'Tokens must be an array' });
    }
    
    if (tokenList.length === 0) {
        console.log('❌ Empty token array');
        return res.status(400).json({ error: 'No tokens provided' });
    }
    
    // Clean tokens - remove empty strings and trim
    const cleanTokens = tokenList
        .map(t => typeof t === 'string' ? t.trim() : String(t))
        .filter(t => t.length > 0);
    
    console.log('📨 Cleaned tokens:', cleanTokens.length);
    
    if (cleanTokens.length === 0) {
        return res.status(400).json({ error: 'No valid tokens after cleaning' });
    }
    
    // Initialize user tokens if needed
    if (!tokens[req.userId]) tokens[req.userId] = [];
    
    let added = 0;
    let skipped = 0;
    
    for (let token of cleanTokens) {
        // Check if token already exists
        const exists = tokens[req.userId].some(t => t.token === token);
        if (exists) {
            skipped++;
            continue;
        }
        
        const id = 'tok_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
        tokens[req.userId].push({
            token: token,
            status: 'inactive',
            id: id,
            username: 'Bot_' + id.slice(-6),
            inVC: false
        });
        added++;
        console.log(`✅ Added token ${id.slice(-8)}`);
    }
    
    console.log(`✅ Added: ${added}, Skipped: ${skipped}, Total: ${tokens[req.userId].length}`);
    
    res.json({
        success: true,
        added: added,
        skipped: skipped,
        total: tokens[req.userId].length,
        message: `Added ${added} tokens${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}`
    });
});

app.get('/api/tokens', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    res.json(userTokens.map(t => ({
        id: t.id,
        status: t.status,
        username: t.username || 'Bot',
        inVC: t.inVC || false,
        hasBot: false
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

app.post('/api/remove-all-tokens', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    const removed = userTokens.length;
    tokens[req.userId] = [];
    res.json({ success: true, removed });
});

app.post('/api/start-all', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let started = 0;
    for (let t of userTokens) {
        if (t.status === 'inactive') {
            t.status = 'active';
            started++;
        }
    }
    res.json({ started, total: userTokens.length });
});

app.post('/api/stop-all', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let stopped = 0;
    for (let t of userTokens) {
        if (t.status === 'active') {
            t.status = 'inactive';
            stopped++;
        }
    }
    res.json({ stopped });
});

app.get('/api/bots', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    const bots = [];
    for (let t of userTokens) {
        if (t.status === 'active') {
            bots.push({
                id: t.id,
                username: t.username || 'Bot',
                inVC: t.inVC || false,
                status: t.status
            });
        }
    }
    res.json(bots);
});

app.get('/api/status', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    res.json({
        totalTokens: userTokens.length,
        activeBots: userTokens.filter(t => t.status === 'active').length,
        inVC: userTokens.filter(t => t.inVC).length,
        tokens: userTokens.map(t => ({ id: t.id, status: t.status, username: t.username, inVC: t.inVC }))
    });
});

app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running!' });
});

app.get('/api/health', (req, res) => {
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
