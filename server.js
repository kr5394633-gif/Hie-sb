
const express = require('express');
const path = require('path');
const app = express();
const Discord = require('discord.js-selfbot-v13');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');

app.use(express.static('public'));
app.use(express.json());

// ===== STORAGE =====
const users = { rintu: 'pookie' };
const tokens = {};
const sessions = {};
const players = {};
const botClients = {};

// ===== SELFBOT ENGINE =====
async function startSelfBot(userId, tokenData, autoJoin = null) {
    const client = new Discord.Client({ checkUpdate: false });
    
    client.on('ready', async () => {
        console.log(`✅ [${userId}] ${client.user.tag} ONLINE`);
        tokenData.status = 'active';
        tokenData.username = client.user.username;
        
        if (!sessions[userId]) sessions[userId] = {};
        sessions[userId][tokenData.id] = client;
        botClients[tokenData.id] = client;
        
        // AUTO-JOIN VOICE CHANNEL if specified
        if (autoJoin && autoJoin.channelId && autoJoin.guildId) {
            try {
                const guild = client.guilds.cache.get(autoJoin.guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(autoJoin.channelId);
                    if (channel && channel.type === 'GUILD_VOICE') {
                        const connection = joinVoiceChannel({
                            channelId: channel.id,
                            guildId: guild.id,
                            adapterCreator: guild.voiceAdapterCreator,
                        });
                        const player = createAudioPlayer({
                            behaviors: { noSubscriber: NoSubscriberBehavior.Play }
                        });
                        connection.subscribe(player);
                        
                        if (!players[userId]) players[userId] = {};
                        players[userId][tokenData.id] = { 
                            connection, 
                            player, 
                            channelId: channel.id,
                            guildId: guild.id,
                            volume: 200,
                            blastMode: true
                        };
                        
                        tokenData.inVC = true;
                        console.log(`🔊 ${client.user.tag} joined VC: ${channel.name}`);
                        
                        // Start blast mode with loop
                        await startBlastMode(userId, tokenData.id);
                    }
                }
            } catch (e) {
                console.error('Auto-join error:', e.message);
            }
        }
    });

    client.on('messageCreate', async (msg) => {
        if (msg.author.id !== client.user.id) return;
        
        if (msg.content.startsWith('.play ')) {
            const query = msg.content.slice(6);
            await playMusic(userId, tokenData.id, query, msg);
        }
        if (msg.content === '.stop') {
            await stopMusic(userId, tokenData.id);
            msg.channel.send('⏹️ Stopped');
        }
        if (msg.content === '.pause') {
            await pauseMusic(userId, tokenData.id);
            msg.channel.send('⏸️ Paused');
        }
        if (msg.content === '.resume') {
            await resumeMusic(userId, tokenData.id);
            msg.channel.send('▶️ Resumed');
        }
        if (msg.content === '.blast') {
            await startBlastMode(userId, tokenData.id);
            msg.channel.send('💥 BLAST MODE! 20000% VOLUME + LOOP!');
        }
        if (msg.content === '.leave') {
            await leaveVoice(userId, tokenData.id);
            msg.channel.send('🚪 Left VC');
        }
        if (msg.content.startsWith('.volume ')) {
            const vol = parseInt(msg.content.split(' ')[1]) || 200;
            await setVolume(userId, tokenData.id, vol);
            msg.channel.send(`🔊 Volume set to ${vol * 100}%`);
        }
    });

    try {
        await client.login(tokenData.token);
        return client;
    } catch (error) {
        console.error(`❌ Login failed:`, error.message);
        tokenData.status = 'error';
        return null;
    }
}

// ===== MUSIC FUNCTIONS =====
async function getYoutubeUrl(query) {
    if (ytdl.validateURL(query)) return query;
    const result = await ytSearch(query);
    if (result && result.videos.length > 0) return result.videos[0].url;
    return null;
}

async function playMusic(userId, botId, query, msg) {
    const client = botClients[botId];
    if (!client) return;
    
    const url = await getYoutubeUrl(query);
    if (!url) {
        if (msg) msg.channel.send('❌ No results');
        return;
    }
    
    let connection = players[userId]?.[botId]?.connection;
    let player = players[userId]?.[botId]?.player;
    
    if (!connection || !player) {
        const voiceChannel = client.voice?.connection?.channel || 
                            msg?.member?.voice?.channel || 
                            client.channels.cache.get(msg?.channelId)?.guild?.channels?.cache?.find(c => c.type === 'GUILD_VOICE');
        if (!voiceChannel) {
            if (msg) msg.channel.send('❌ Join a VC first!');
            return;
        }
        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
        connection.subscribe(player);
        
        if (!players[userId]) players[userId] = {};
        players[userId][botId] = { connection, player, volume: 200, blastMode: true };
    }
    
    const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream, { inlineVolume: true });
    resource.volume.setVolume(players[userId][botId].volume || 200);
    
    player.play(resource);
    players[userId][botId].resource = resource;
    players[userId][botId].stream = stream;
    
    if (msg) msg.channel.send(`🎵 Now playing: ${url}`);
}

async function stopMusic(userId, botId) {
    if (players[userId]?.[botId]) {
        players[userId][botId].player?.stop();
        players[userId][botId].connection?.destroy();
        delete players[userId][botId];
    }
}

async function pauseMusic(userId, botId) {
    if (players[userId]?.[botId]) players[userId][botId].player?.pause();
}

async function resumeMusic(userId, botId) {
    if (players[userId]?.[botId]) players[userId][botId].player?.unpause();
}

async function setVolume(userId, botId, volume) {
    if (players[userId]?.[botId]?.resource) {
        players[userId][botId].resource.volume.setVolume(volume);
        players[userId][botId].volume = volume;
    }
}

async function startBlastMode(userId, botId) {
    await setVolume(userId, botId, 200);
    if (players[userId]?.[botId]) {
        players[userId][botId].blastMode = true;
        players[userId][botId].player?.on(AudioPlayerStatus.Idle, () => {
            if (players[userId]?.[botId]?.blastMode) {
                const oldResource = players[userId][botId].resource;
                if (oldResource) {
                    const newResource = createAudioResource(oldResource.stream, { inlineVolume: true });
                    newResource.volume.setVolume(200);
                    players[userId][botId].player?.play(newResource);
                    players[userId][botId].resource = newResource;
                }
            }
        });
    }
}

async function leaveVoice(userId, botId) {
    if (players[userId]?.[botId]) {
        players[userId][botId].connection?.destroy();
        delete players[userId][botId];
    }
}

// ===== API ROUTES =====
app.post('/api/login', (req, res) => {
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

// ===== ADD TOKENS WITH AUTO-START =====
app.post('/api/add-tokens-bulk', auth, async (req, res) => {
    const { tokens: tokenList, autoStart, guildId, channelId } = req.body;
    
    if (!tokenList || !Array.isArray(tokenList) || tokenList.length === 0) {
        return res.status(400).json({ error: 'No tokens provided' });
    }
    
    if (!tokens[req.userId]) tokens[req.userId] = [];
    
    let added = 0;
    let skipped = 0;
    let started = 0;
    
    const autoJoin = (guildId && channelId) ? { guildId, channelId } : null;
    
    for (let token of tokenList) {
        token = token.trim();
        if (!token) continue;
        if (tokens[req.userId].find(t => t.token === token)) {
            skipped++;
            continue;
        }
        const id = 'tok_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
        const tokenData = {
            token,
            status: 'inactive',
            id,
            username: 'Bot_' + id.slice(-6),
            blastMode: true,
            inVC: false
        };
        tokens[req.userId].push(tokenData);
        added++;
        
        // AUTO-START if enabled
        if (autoStart) {
            tokenData.status = 'starting';
            const client = await startSelfBot(req.userId, tokenData, autoJoin);
            if (client) {
                tokenData.status = 'active';
                started++;
                if (autoJoin) tokenData.inVC = true;
            } else {
                tokenData.status = 'error';
            }
        }
    }
    
    res.json({ 
        success: true, 
        added, 
        skipped, 
        started,
        total: tokens[req.userId].length,
        autoJoined: autoStart && autoJoin ? true : false,
        guildId: guildId || null,
        channelId: channelId || null
    });
});

app.get('/api/status', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    res.json(userTokens.map(t => ({
        id: t.id,
        status: t.status,
        hasBot: !!sessions[req.userId]?.[t.id],
        username: t.username || 'Bot',
        inVC: t.inVC || !!players[req.userId]?.[t.id],
        blastMode: t.blastMode || false
    })));
});

app.post('/api/start-all', auth, async (req, res) => {
    const { guildId, channelId } = req.body;
    const userTokens = tokens[req.userId] || [];
    const autoJoin = (guildId && channelId) ? { guildId, channelId } : null;
    let started = 0;
    
    for (let t of userTokens) {
        if (t.status === 'inactive' || t.status === 'error') {
            t.status = 'starting';
            const client = await startSelfBot(req.userId, t, autoJoin);
            if (client) {
                started++;
                t.status = 'active';
                if (autoJoin) t.inVC = true;
            } else {
                t.status = 'error';
            }
        }
    }
    res.json({ started, total: userTokens.length });
});

app.post('/api/stop-all', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let stopped = 0;
    for (let t of userTokens) {
        if (t.status === 'active' && sessions[req.userId]?.[t.id]) {
            try {
                sessions[req.userId][t.id].destroy();
                delete sessions[req.userId][t.id];
                if (players[req.userId]?.[t.id]) {
                    players[req.userId][t.id].connection?.destroy();
                    delete players[req.userId][t.id];
                }
                t.status = 'inactive';
                t.inVC = false;
                stopped++;
            } catch(e) {}
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
                inVC: t.inVC || !!players[req.userId]?.[t.id],
                status: t.status,
                blastMode: t.blastMode || false
            });
        }
    }
    res.json(bots);
});

app.post('/api/bot-action', auth, (req, res) => {
    const { id, action, value } = req.body;
    const userTokens = tokens[req.userId] || [];
    const t = userTokens.find(t => t.id === id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    
    if (action === 'join') {
        // Mark as in VC
        t.inVC = true;
        res.json({ success: true });
    } else if (action === 'leave') {
        leaveVoice(req.userId, id);
        t.inVC = false;
        res.json({ success: true });
    } else if (action === 'volume') {
        setVolume(req.userId, id, parseFloat(value) || 200);
        res.json({ success: true });
    } else if (action === 'blast') {
        t.blastMode = !t.blastMode;
        if (t.blastMode) startBlastMode(req.userId, id);
        res.json({ success: true, blastMode: t.blastMode });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/rename-all', auth, (req, res) => {
    const { name } = req.body;
    const userTokens = tokens[req.userId] || [];
    let renamed = 0;
    for (let t of userTokens) {
        if (t.status === 'active' && sessions[req.userId]?.[t.id]) {
            try {
                sessions[req.userId][t.id].user.setUsername(name + '_' + t.id.slice(-4));
                t.username = name + '_' + t.id.slice(-4);
                renamed++;
            } catch(e) {}
        }
    }
    res.json({ renamed });
});

app.post('/api/remove-all-tokens', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let removed = userTokens.length;
    tokens[req.userId] = [];
    if (sessions[req.userId]) sessions[req.userId] = {};
    if (players[req.userId]) players[req.userId] = {};
    res.json({ success: true, removed });
});

app.post('/api/play-all', auth, async (req, res) => {
    const { query } = req.body;
    const userTokens = tokens[req.userId] || [];
    let played = 0;
    for (let t of userTokens) {
        if (t.status === 'active' && sessions[req.userId]?.[t.id]) {
            const client = sessions[req.userId][t.id];
            if (client) {
                const voiceChannel = client.voice?.connection?.channel || 
                                    client.channels.cache.get(t.currentChannel);
                if (voiceChannel) {
                    await playMusic(req.userId, t.id, query, null);
                    played++;
                }
            }
        }
    }
    res.json({ success: true, played });
});

app.post('/api/blast-all', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let blasted = 0;
    for (let t of userTokens) {
        if (t.status === 'active') {
            t.blastMode = true;
            startBlastMode(req.userId, t.id);
            blasted++;
        }
    }
    res.json({ blasted });
});

app.post('/api/stop-all-music', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let stopped = 0;
    for (let t of userTokens) {
        if (players[req.userId]?.[t.id]) {
            stopMusic(req.userId, t.id);
            stopped++;
        }
    }
    res.json({ stopped });
});

app.post('/api/set-channel', auth, (req, res) => {
    const { guildId, channelId } = req.body;
    const userTokens = tokens[req.userId] || [];
    for (let t of userTokens) {
        t.currentGuild = guildId;
        t.currentChannel = channelId;
    }
    res.json({ success: true, guildId, channelId });
});

app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: '🌸 Ultimate Pookie Army is alive!' });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🔥 ==========================================');
    console.log('🌸 ULTIMATE POOKIE ARMY LIVE on port ' + PORT);
    console.log('🌐 Open: http://localhost:' + PORT);
    console.log('🔐 Login: rintu / pookie');
    console.log('🔥 ==========================================');
});
