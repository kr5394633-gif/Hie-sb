const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const Discord = require('discord.js-selfbot-v13');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, NoSubscriberBehavior } = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
const { spawn } = require('child_process');

app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' }));

// ===== LIVE LOG STREAM =====
const logClients = [];

function broadcastLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    console.log(`[${timestamp}] ${message}`);
    logClients.forEach(client => {
        try { client.write(`data: ${JSON.stringify(logEntry)}\n\n`); } catch(e) {}
    });
}

app.get('/api/logs', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    logClients.push(res);
    broadcastLog('📡 Live log stream connected', 'system');
    req.on('close', () => {
        const idx = logClients.indexOf(res);
        if (idx > -1) logClients.splice(idx, 1);
    });
});

// ===== STORAGE =====
const users = { rintu: 'pookie' };
const tokens = {};
const clients = {};
const connections = {};
const players = {};
const activeResources = {};
const ffmpegProcesses = {};
const settings = {};

function getDefaultSettings() {
    return {
        loop: false,
        paused: false,
        bassboost: false,
        blastMode: false,
        blastVolume: 50,
        pungiMode: false,
        pungiIntensity: 50,
        loudMode: false,
        superLoudMode: false,
        forceLoudMode: false,
        volumeMultiplier: 1.0,
        currentUrl: null,
        currentTitle: 'Unknown',
        currentChannelId: null,
        currentGuildId: null
    };
}

// ===== AUDIO ENGINE =====
function stopFFmpeg(userId, botId) {
    if (ffmpegProcesses[userId]?.[botId]) {
        try { ffmpegProcesses[userId][botId].kill('SIGKILL'); } catch(e) {}
        delete ffmpegProcesses[userId][botId];
    }
}

function startFFmpegStream(userId, botId, inputSource) {
    stopFFmpeg(userId, botId);
    const userSettings = settings[userId] || getDefaultSettings();
    let audioFilters = ['highpass=f=60'];
    
    if (userSettings.superLoudMode) {
        audioFilters.push('compand=attacks=0.01:decays=0.01:points=-80/-80|-30/-15|-12/-6|-6/-3|0/-2|20/-1');
        audioFilters.push('volume=15dB', 'acompressor=threshold=0.05:ratio=20:attack=5:release=50');
        audioFilters.push('alimiter=level_in=15:level_out=0:limit=0.99:attack=1:release=50');
        audioFilters.push('dynaudnorm=p=0.95:m=100:g=20', 'volume=amplitude=8');
    }
    if (userSettings.forceLoudMode) {
        audioFilters.push('compand=attacks=0.001:decays=0.001:points=-80/-80|-40/-25|-20/-10|0/-5|10/-2|20/0|30/5');
        audioFilters.push('acompressor=threshold=0.01:ratio=50:attack=1:release=100');
        audioFilters.push('alimiter=level_in=25:level_out=0.99:limit=1:attack=1:release=100');
        audioFilters.push('dynaudnorm=p=1:m=100:g=30', 'volume=20dB', 'aecho=0.8:0.9:1000:0.3');
    }
    if (userSettings.bassboost) {
        audioFilters.push('equalizer=f=60:width_type=h:width=50:g=15');
    }
    if (userSettings.pungiMode) {
        audioFilters.push('acrusher=bits=4:mode=log:aa=1');
        audioFilters.push('equalizer=f=30:width_type=h:width=80:g=20');
        audioFilters.push('equalizer=f=1000:width_type=h:width=500:g=10');
        audioFilters.push(`volume=${userSettings.pungiIntensity}`);
        audioFilters.push('aphaser=0.8:0.8:2000:0.4', 'aecho=0.8:0.9:1000:0.3');
    } else if (userSettings.blastMode) {
        audioFilters.push(`volume=${userSettings.blastVolume}`);
        audioFilters.push('dynaudnorm=p=0.9:m=50.0:g=15');
        audioFilters.push('alimiter=level_in=2.0:level_out=0.98:limit=0.99:attack=5:release=50');
    } else {
        if (userSettings.volumeMultiplier > 1.0) audioFilters.push(`volume=${userSettings.volumeMultiplier}`);
    }
    
    broadcastLog(`🎵 Audio filters: ${audioFilters.join(', ')}`, 'audio');
    
    const process = spawn('ffmpeg', [
        '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
        '-i', inputSource,
        '-filter:a', audioFilters.join(','),
        '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'
    ]);
    
    if (!ffmpegProcesses[userId]) ffmpegProcesses[userId] = {};
    ffmpegProcesses[userId][botId] = process;
    
    const player = players[userId]?.[botId];
    if (player && process) {
        const resource = createAudioResource(process.stdout, {
            inputType: StreamType.Raw,
            inlineVolume: true
        });
        let vol = userSettings.volumeMultiplier;
        if (userSettings.pungiMode) vol = Math.min(userSettings.pungiIntensity, 200);
        else if (userSettings.blastMode) vol = Math.min(userSettings.blastVolume, 500);
        else if (userSettings.superLoudMode) vol = Math.min(userSettings.volumeMultiplier * 20, 2000);
        else if (userSettings.forceLoudMode) vol = Math.min(userSettings.volumeMultiplier * 30, 3000);
        else vol = Math.min(userSettings.volumeMultiplier * 2, 200);
        resource.volume.setVolume(vol);
        if (!activeResources[userId]) activeResources[userId] = {};
        activeResources[userId][botId] = resource;
        player.play(resource);
        broadcastLog(`🔊 Stream active at ${Math.round(vol * 100)}% volume`, 'audio');
    }
}

// ===== SELFBOT ENGINE =====
async function startSelfBot(userId, tokenData) {
    const client = new Discord.Client({ checkUpdate: false });
    client.on('ready', async () => {
        broadcastLog(`✅ ${client.user.tag} ONLINE`, 'success');
        tokenData.status = 'active';
        tokenData.username = client.user.username;
        if (!clients[userId]) clients[userId] = {};
        clients[userId][tokenData.id] = client;
        const userSettings = settings[userId] || getDefaultSettings();
        if (userSettings.currentChannelId && userSettings.currentGuildId) {
            try {
                const guild = client.guilds.cache.get(userSettings.currentGuildId);
                if (guild) {
                    const channel = guild.channels.cache.get(userSettings.currentChannelId);
                    if (channel && channel.type === 'GUILD_VOICE') {
                        const conn = joinVoiceChannel({
                            channelId: channel.id,
                            guildId: guild.id,
                            adapterCreator: guild.voiceAdapterCreator,
                            selfMute: false, selfDeaf: false, group: client.user.id
                        });
                        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
                        conn.subscribe(player);
                        if (!connections[userId]) connections[userId] = {};
                        if (!players[userId]) players[userId] = {};
                        connections[userId][tokenData.id] = conn;
                        players[userId][tokenData.id] = player;
                        tokenData.inVC = true;
                        broadcastLog(`🔊 ${client.user.tag} joined VC`, 'voice');
                    }
                }
            } catch(e) { broadcastLog(`⚠️ Auto-join error: ${e.message}`, 'error'); }
        }
    });
    try {
        await client.login(tokenData.token);
        return client;
    } catch(error) {
        broadcastLog(`❌ Login failed: ${error.message}`, 'error');
        tokenData.status = 'error';
        return null;
    }
}

// ===== API ROUTES =====
app.post('/api/login', (req, res) => {
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

// ===== TOKEN MANAGEMENT =====
app.post('/api/add-tokens', auth, async (req, res) => {
    const { tokens: tokenList, autoStart } = req.body;
    if (!tokenList || !Array.isArray(tokenList) || tokenList.length === 0) {
        return res.status(400).json({ error: 'No tokens provided' });
    }
    const cleanTokens = tokenList.map(t => t.trim()).filter(t => t.length > 10);
    if (cleanTokens.length === 0) {
        return res.status(400).json({ error: 'No valid tokens found' });
    }
    if (!tokens[req.userId]) tokens[req.userId] = [];
    let added = 0, skipped = 0, started = 0;
    broadcastLog(`📥 Adding ${cleanTokens.length} tokens...`, 'system');
    for (let token of cleanTokens) {
        if (tokens[req.userId].find(t => t.token === token)) { skipped++; continue; }
        const id = 'tok_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
        const tokenData = { token, status: 'inactive', id, username: 'Bot_' + id.slice(-6), inVC: false };
        tokens[req.userId].push(tokenData);
        added++;
        if (autoStart) {
            tokenData.status = 'starting';
            const client = await startSelfBot(req.userId, tokenData);
            if (client) { tokenData.status = 'active'; started++; }
            else { tokenData.status = 'error'; }
        }
    }
    broadcastLog(`✅ Added ${added} tokens, started ${started}`, 'success');
    res.json({ success: true, added, skipped, started, total: tokens[req.userId].length });
});

app.get('/api/tokens', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    res.json(userTokens.map(t => ({
        id: t.id, status: t.status, username: t.username || 'Bot',
        inVC: t.inVC || false, hasBot: !!clients[req.userId]?.[t.id]
    })));
});

app.post('/api/remove-token', auth, (req, res) => {
    const { id } = req.body;
    const userTokens = tokens[req.userId] || [];
    const idx = userTokens.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    if (clients[req.userId]?.[id]) {
        try { clients[req.userId][id].destroy(); } catch(e) {}
        delete clients[req.userId][id];
    }
    userTokens.splice(idx, 1);
    broadcastLog(`🗑️ Token ${id.slice(-8)} removed`, 'system');
    res.json({ success: true });
});

app.post('/api/remove-all-tokens', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let removed = userTokens.length;
    tokens[req.userId] = [];
    if (clients[req.userId]) clients[req.userId] = {};
    if (connections[req.userId]) connections[req.userId] = {};
    if (players[req.userId]) players[req.userId] = {};
    broadcastLog(`🗑️ Removed ${removed} tokens`, 'system');
    res.json({ success: true, removed });
});

app.post('/api/start-all', auth, async (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let started = 0;
    broadcastLog(`🚀 Starting ${userTokens.length} bots...`, 'system');
    for (let t of userTokens) {
        if (t.status === 'inactive' || t.status === 'error') {
            t.status = 'starting';
            const client = await startSelfBot(req.userId, t);
            if (client) { t.status = 'active'; started++; }
            else { t.status = 'error'; }
        }
    }
    broadcastLog(`✅ Started ${started} bots`, 'success');
    res.json({ started, total: userTokens.length });
});

app.post('/api/stop-all', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let stopped = 0;
    for (let t of userTokens) {
        if (t.status === 'active' && clients[req.userId]?.[t.id]) {
            try {
                clients[req.userId][t.id].destroy();
                delete clients[req.userId][t.id];
                t.status = 'inactive';
                t.inVC = false;
                stopped++;
            } catch(e) {}
        }
    }
    broadcastLog(`⏹️ Stopped ${stopped} bots`, 'system');
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
                inVC: t.inVC || !!connections[req.userId]?.[t.id],
                status: t.status
            });
        }
    }
    res.json(bots);
});

// ===== VOICE CHANNEL =====
app.post('/api/join-channel', auth, async (req, res) => {
    const { channelId, guildId } = req.body;
    if (!channelId || !guildId) {
        return res.status(400).json({ error: 'Channel ID and Guild ID required' });
    }
    if (!settings[req.userId]) settings[req.userId] = getDefaultSettings();
    settings[req.userId].currentChannelId = channelId;
    settings[req.userId].currentGuildId = guildId;
    const userTokens = tokens[req.userId] || [];
    let joined = 0;
    broadcastLog(`🔊 Joining channel ${channelId}...`, 'voice');
    for (let t of userTokens) {
        if (t.status === 'active' && clients[req.userId]?.[t.id]) {
            const client = clients[req.userId][t.id];
            try {
                const guild = client.guilds.cache.get(guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(channelId);
                    if (channel && channel.type === 'GUILD_VOICE') {
                        const conn = joinVoiceChannel({
                            channelId: channel.id,
                            guildId: guild.id,
                            adapterCreator: guild.voiceAdapterCreator,
                            selfMute: false, selfDeaf: false, group: client.user.id
                        });
                        const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
                        conn.subscribe(player);
                        if (!connections[req.userId]) connections[req.userId] = {};
                        if (!players[req.userId]) players[req.userId] = {};
                        connections[req.userId][t.id] = conn;
                        players[req.userId][t.id] = player;
                        t.inVC = true;
                        joined++;
                    }
                }
            } catch(e) { broadcastLog(`⚠️ Join error: ${e.message}`, 'error'); }
        }
    }
    broadcastLog(`✅ ${joined} bots joined VC`, 'success');
    res.json({ success: true, joined, channelId, guildId });
});

app.post('/api/leave-channel', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let left = 0;
    for (let t of userTokens) {
        if (connections[req.userId]?.[t.id]) {
            try {
                connections[req.userId][t.id].destroy();
                delete connections[req.userId][t.id];
                t.inVC = false;
                left++;
            } catch(e) {}
        }
    }
    broadcastLog(`🚪 ${left} bots left VC`, 'voice');
    res.json({ success: true, left });
});

// ===== MUSIC =====
app.post('/api/play', auth, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    if (!settings[req.userId]) settings[req.userId] = getDefaultSettings();
    settings[req.userId].currentUrl = url;
    broadcastLog(`🎵 Loading: ${url}`, 'audio');
    try {
        const result = await youtubedl(url, {
            dumpSingleJson: true, noPlaylist: true,
            format: 'bestaudio[ext=webm]/bestaudio/best', noWarnings: true
        });
        settings[req.userId].currentUrl = result.url;
        settings[req.userId].currentTitle = result.title || 'YouTube Audio';
        broadcastLog(`▶️ Now Playing: ${result.title}`, 'audio');
        const userTokens = tokens[req.userId] || [];
        let played = 0;
        for (let t of userTokens) {
            if (t.status === 'active' && players[req.userId]?.[t.id]) {
                startFFmpegStream(req.userId, t.id, result.url);
                played++;
            }
        }
        res.json({ success: true, played, title: result.title });
    } catch(err) {
        broadcastLog(`❌ Play error: ${err.message}`, 'error');
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stop-music', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let stopped = 0;
    for (let t of userTokens) {
        if (players[req.userId]?.[t.id]) {
            players[req.userId][t.id].stop();
            stopFFmpeg(req.userId, t.id);
            stopped++;
        }
    }
    broadcastLog(`⏹️ Music stopped on ${stopped} bots`, 'audio');
    res.json({ success: true, stopped });
});

app.post('/api/pause-music', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let paused = 0;
    for (let t of userTokens) {
        if (players[req.userId]?.[t.id]) {
            players[req.userId][t.id].pause();
            paused++;
        }
    }
    if (!settings[req.userId]) settings[req.userId] = getDefaultSettings();
    settings[req.userId].paused = true;
    broadcastLog(`⏸️ Music paused on ${paused} bots`, 'audio');
    res.json({ success: true, paused });
});

app.post('/api/resume-music', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let resumed = 0;
    for (let t of userTokens) {
        if (players[req.userId]?.[t.id]) {
            players[req.userId][t.id].unpause();
            resumed++;
        }
    }
    if (!settings[req.userId]) settings[req.userId] = getDefaultSettings();
    settings[req.userId].paused = false;
    broadcastLog(`▶️ Music resumed on ${resumed} bots`, 'audio');
    res.json({ success: true, resumed });
});

// ===== SETTINGS =====
app.post('/api/settings', auth, (req, res) => {
    const { setting, value } = req.body;
    if (!settings[req.userId]) settings[req.userId] = getDefaultSettings();
    const validSettings = ['loop', 'bassboost', 'blastMode', 'pungiMode', 'loudMode', 'superLoudMode', 'forceLoudMode'];
    const validValues = ['blastVolume', 'pungiIntensity', 'volumeMultiplier'];
    if (validSettings.includes(setting)) {
        settings[req.userId][setting] = value;
        broadcastLog(`⚙️ ${setting} = ${value}`, 'system');
    } else if (validValues.includes(setting)) {
        settings[req.userId][setting] = parseFloat(value) || 1;
        broadcastLog(`⚙️ ${setting} = ${value}`, 'system');
    } else {
        return res.status(400).json({ error: 'Invalid setting' });
    }
    if (settings[req.userId].currentUrl) {
        const userTokens = tokens[req.userId] || [];
        for (let t of userTokens) {
            if (t.status === 'active') {
                startFFmpegStream(req.userId, t.id, settings[req.userId].currentUrl);
            }
        }
    }
    res.json({ success: true, settings: settings[req.userId] });
});

app.get('/api/settings', auth, (req, res) => {
    if (!settings[req.userId]) settings[req.userId] = getDefaultSettings();
    res.json(settings[req.userId]);
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

app.get('/api/health', (req, res) => {
    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🔥 ==========================================');
    console.log('🌸 ULTIMATE POOKIE ARMY LIVE on port ' + PORT);
    console.log('🌐 Open: http://localhost:' + PORT);
    console.log('🔐 Login: rintu / pookie');
    console.log('🔥 ==========================================');
    broadcastLog('🚀 Server started!', 'system');
});
