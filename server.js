const express = require('express');
const path = require('path');
const app = express();
const Discord = require('discord.js-selfbot-v13');

app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

// ===== STORAGE =====
const users = { rintu: 'pookie' };
const tokens = {};
const botClients = {}; // { userId: { tokenId: client } }

// ===== SELFBOT ENGINE =====
async function startSelfBot(userId, tokenData) {
    const client = new Discord.Client({ checkUpdate: false });
    
    client.on('ready', () => {
        console.log(`✅ [${userId}] ${client.user.tag} is ONLINE!`);
        tokenData.status = 'active';
        tokenData.username = client.user.username;
        tokenData.tag = client.user.tag;
    });

    client.on('error', (error) => {
        console.error(`❌ [${userId}] Bot error:`, error.message);
        tokenData.status = 'error';
    });

    try {
        await client.login(tokenData.token);
        if (!botClients[userId]) botClients[userId] = {};
        botClients[userId][tokenData.id] = client;
        return client;
    } catch (error) {
        console.error(`❌ [${userId}] Login failed:`, error.message);
        tokenData.status = 'error';
        return null;
    }
}

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
    if (!token || !token.startsWith('pookie_token_')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = token.replace('pookie_token_', '');
    if (!users[req.userId]) return res.status(401).json({ error: 'Invalid user' });
    next();
}

// ===== ADD TOKENS AND AUTO-START =====
app.post('/api/add-tokens', auth, async (req, res) => {
    console.log('📨 Add tokens request');
    const { tokens: tokenList, autoStart } = req.body;
    
    if (!tokenList || !Array.isArray(tokenList) || tokenList.length === 0) {
        return res.status(400).json({ error: 'No tokens provided' });
    }
    
    const cleanTokens = tokenList.map(t => t.trim()).filter(t => t.length > 10);
    if (cleanTokens.length === 0) {
        return res.status(400).json({ error: 'No valid tokens found' });
    }
    
    if (!tokens[req.userId]) tokens[req.userId] = [];
    
    let added = 0;
    let skipped = 0;
    let started = 0;
    let errors = [];
    
    for (let token of cleanTokens) {
        if (tokens[req.userId].find(t => t.token === token)) {
            skipped++;
            continue;
        }
        
        const id = 'tok_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
        const tokenData = {
            token,
            status: 'pending',
            id,
            username: 'Bot_' + id.slice(-6),
            inVC: false,
            tag: 'Unknown'
        };
        tokens[req.userId].push(tokenData);
        added++;
        
        // Auto-start if enabled
        if (autoStart !== false) {
            tokenData.status = 'starting';
            const client = await startSelfBot(req.userId, tokenData);
            if (client) {
                started++;
            } else {
                tokenData.status = 'error';
                errors.push(token.slice(-8));
            }
        }
    }
    
    console.log(`✅ Added: ${added}, Started: ${started}, Errors: ${errors.length}`);
    
    res.json({
        success: true,
        added,
        skipped,
        started,
        errors,
        total: tokens[req.userId].length,
        message: `Added ${added} tokens${started > 0 ? `, started ${started} bots` : ''}${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    });
});

// ===== START INDIVIDUAL OR ALL =====
app.post('/api/start-all', auth, async (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let started = 0;
    let errors = [];
    
    for (let t of userTokens) {
        if (t.status === 'inactive' || t.status === 'pending' || t.status === 'error') {
            t.status = 'starting';
            const client = await startSelfBot(req.userId, t);
            if (client) {
                started++;
            } else {
                t.status = 'error';
                errors.push(t.id.slice(-8));
            }
        }
    }
    
    res.json({ started, total: userTokens.length, errors });
});

app.post('/api/stop-all', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let stopped = 0;
    
    for (let t of userTokens) {
        if (botClients[req.userId]?.[t.id]) {
            try {
                botClients[req.userId][t.id].destroy();
                delete botClients[req.userId][t.id];
                t.status = 'inactive';
                stopped++;
            } catch(e) {}
        }
    }
    
    res.json({ stopped });
});

app.get('/api/tokens', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    res.json(userTokens.map(t => ({
        id: t.id,
        status: t.status,
        username: t.username || 'Bot',
        tag: t.tag || 'Unknown',
        inVC: t.inVC || false,
        hasBot: !!botClients[req.userId]?.[t.id]
    })));
});

app.get('/api/bots', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    const bots = [];
    for (let t of userTokens) {
        if (t.status === 'active' && botClients[req.userId]?.[t.id]) {
            bots.push({
                id: t.id,
                username: t.username || 'Bot',
                tag: t.tag || 'Unknown',
                inVC: t.inVC || false,
                status: t.status
            });
        }
    }
    res.json(bots);
});

app.get('/api/status', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    const active = userTokens.filter(t => t.status === 'active' && botClients[req.userId]?.[t.id]);
    res.json({
        totalTokens: userTokens.length,
        activeBots: active.length,
        inVC: userTokens.filter(t => t.inVC).length,
        tokens: userTokens.map(t => ({
            id: t.id,
            status: t.status,
            username: t.username,
            tag: t.tag,
            inVC: t.inVC
        }))
    });
});

app.post('/api/remove-token', auth, (req, res) => {
    const { id } = req.body;
    const userTokens = tokens[req.userId] || [];
    const idx = userTokens.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    
    if (botClients[req.userId]?.[id]) {
        try { botClients[req.userId][id].destroy(); } catch(e) {}
        delete botClients[req.userId][id];
    }
    userTokens.splice(idx, 1);
    res.json({ success: true });
});

app.post('/api/remove-all-tokens', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    const removed = userTokens.length;
    
    if (botClients[req.userId]) {
        for (let id in botClients[req.userId]) {
            try { botClients[req.userId][id].destroy(); } catch(e) {}
        }
        delete botClients[req.userId];
    }
    tokens[req.userId] = [];
    res.json({ success: true, removed });
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
