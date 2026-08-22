const express = require('express');
const path = require('path');
const app = express();
const Discord = require('discord.js-selfbot-v13');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');

app.use(express.static('public'));
app.use(express.json());

// ===== BACKEND STORAGE =====
const users = { rintu: 'pookie' };
const tokens = {};
const sessions = {};
const players = {};
const botClients = {};

// ===== SELFBOT ENGINE =====
async function startSelfBot(userId, tokenData) {
    const client = new Discord.Client({ checkUpdate: false });
    
    client.on('ready', async () => {
        console.log(`✅ [${userId}] Bot ${client.user.tag} ONLINE`);
        tokenData.status = 'active';
        tokenData.username = client.user.username;
        
        if (!sessions[userId]) sessions[userId] = {};
        sessions[userId][tokenData.id] = client;
        botClients[tokenData.id] = client;
        
        // Auto-play blast mode when connected
        if (tokenData.blastMode) {
            await startBlastMode(userId, tokenData.id);
        }
    });

    client.on('messageCreate', async (msg) => {
        if (msg.author.id !== client.user.id) return;
        
        // ===== MUSIC COMMANDS =====
        if (msg.content.startsWith('.play ')) {
            const query = msg.content.slice(6);
            await playMusic(userId, tokenData.id, query, msg);
        }
        
        if (msg.content === '.stop') {
            await stopMusic(userId, tokenData.id);
            msg.channel.send('⏹️ Stopped music');
        }
        
        if (msg.content === '.pause') {
            await pauseMusic(userId, tokenData.id);
            msg.channel.send('⏸️ Paused');
        }
        
        if (msg.content === '.resume') {
            await resumeMusic(userId, tokenData.id);
            msg.channel.send('▶️ Resumed');
        }
        
        if (msg.content === '.volume') {
            await setVolume(userId, tokenData.id, 200);
            msg.channel.send('🔊 Volume set to 20000% BLAST MODE!');
        }
        
        if (msg.content === '.blast') {
            await startBlastMode(userId, tokenData.id);
            msg.channel.send('💥 BLAST MODE ACTIVATED! 20000% VOLUME!');
        }
        
        if (msg.content === '.leave') {
            await leaveVoice(userId, tokenData.id);
            msg.channel.send('🚪 Left voice channel');
        }
    });

    try {
        await client.login(tokenData.token);
        return client;
    } catch (error) {
        console.error(`❌ Login failed for ${tokenData.id}:`, error.message);
        tokenData.status = 'error';
        return null;
    }
}

// ===== MUSIC FUNCTIONS =====
async function getYoutubeUrl(query) {
    if (ytdl.validateURL(query)) {
        return query;
    }
    const result = await ytSearch(query);
    if (result && result.videos.length > 0) {
        return result.videos[0].url;
    }
    return null;
}

async function playMusic(userId, botId, query, msg) {
    const client = botClients[botId];
    if (!client) return;
    
    const url = await getYoutubeUrl(query);
    if (!url) {
        msg.channel.send('❌ No results found');
        return;
    }
    
    // Get voice channel
    const voiceChannel = client.voice?.connection?.channel || 
                        msg.member?.voice?.channel || 
                        client.channels.cache.get(msg.channelId)?.guild?.channels?.cache?.find(c => c.type === 'GUILD_VOICE');
    
    if (!voiceChannel) {
        msg.channel.send('❌ Join a voice channel first!');
        return;
    }
    
    // Join voice channel
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });
    
    connection.subscribe(player);
    
    // Create audio resource with BLAST VOLUME (20000% = 200)
    const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream, {
        inlineVolume: true,
        inputType: 'arbitrary',
    });
    
    resource.volume.setVolume(200); // 200 = 20000%
    
    player.play(resource);
    
    // Store player
    if (!players[userId]) players[userId] = {};
    players[userId][botId] = { player, connection, stream, resource, volume: 200 };
    
    msg.channel.send(`🎵 Now playing: ${url}`);
}

async function stopMusic(userId, botId) {
    if (players[userId]?.[botId]) {
        players[userId][botId].player.stop();
        players[userId][botId].connection.destroy();
        delete players[userId][botId];
    }
}

async function pauseMusic(userId, botId) {
    if (players[userId]?.[botId]) {
        players[userId][botId].player.pause();
    }
}

async function resumeMusic(userId, botId) {
    if (players[userId]?.[botId]) {
        players[userId][botId].player.unpause();
    }
}

async function setVolume(userId, botId, volume) {
    if (players[userId]?.[botId]?.resource) {
        players[userId][botId].resource.volume.setVolume(volume);
        players[userId][botId].volume = volume;
    }
}

async function startBlastMode(userId, botId) {
    // Set volume to max (20000%)
    await setVolume(userId, botId, 200);
    
    // Loop the current song
    if (players[userId]?.[botId]) {
        players[userId][botId].player.on(AudioPlayerStatus.Idle, () => {
            // Replay the same song
            const oldResource = players[userId][botId].resource;
            if (oldResource) {
                const newResource = createAudioResource(oldResource.stream, {
                    inlineVolume: true,
                });
                newResource.volume.setVolume(200);
                players[userId][botId].player.play(newResource);
                players[userId][botId].resource = newResource;
            }
        });
    }
}

async function leaveVoice(userId, botId) {
    if (players[userId]?.[botId]) {
        players[userId][botId].connection.destroy();
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

app.post('/api/add-tokens-bulk', auth, async (req, res) => {
    const { tokens: tokenList } = req.body;
    if (!tokenList || !Array.isArray(tokenList) || tokenList.length === 0) {
        return res.status(400).json({ error: 'No tokens provided' });
    }
    
    if (!tokens[req.userId]) tokens[req.userId] = [];
    
    let added = 0;
    let skipped = 0;
    
    for (let token of tokenList) {
        token = token.trim();
        if (!token) continue;
        if (tokens[req.userId].find(t => t.token === token)) {
            skipped++;
            continue;
        }
        const id = 'tok_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
        tokens[req.userId].push({
            token,
            status: 'inactive',
            id,
            username: 'Bot_' + id.slice(-6),
            blastMode: true
        });
        added++;
    }
    
    res.json({ success: true, added, skipped, total: tokens[req.userId].length });
});

app.get('/api/status', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    res.json(userTokens.map(t => ({
        id: t.id,
        status: t.status,
        hasBot: !!sessions[req.userId]?.[t.id],
        username: t.username || 'Bot',
        inVC: !!players[req.userId]?.[t.id],
        blastMode: t.blastMode || false
    })));
});

app.post('/api/start-all', auth, async (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let started = 0;
    for (let t of userTokens) {
        if (t.status === 'inactive' || t.status === 'error') {
            t.status = 'starting';
            const client = await startSelfBot(req.userId, t);
            if (client) {
                started++;
                t.status = 'active';
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
                    players[req.userId][t.id].connection.destroy();
                    delete players[req.userId][t.id];
                }
                t.status = 'inactive';
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
        if (t.status === 'active' || t.status === 'starting') {
            bots.push({
                id: t.id,
                username: t.username || 'Bot',
                inVC: !!players[req.userId]?.[t.id],
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
        // Just mark as in VC - actual joining happens via commands
        res.json({ success: true });
    } else if (action === 'leave') {
        leaveVoice(req.userId, id);
        res.json({ success: true });
    } else if (action === 'volume') {
        setVolume(req.userId, id, parseFloat(value) || 200);
        res.json({ success: true });
    } else if (action === 'blast') {
        t.blastMode = !t.blastMode;
        if (t.blastMode) {
            startBlastMode(req.userId, id);
        }
        res.json({ success: true, blastMode: t.blastMode });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/join-channel', auth, (req, res) => {
    const { channelId, guildId } = req.body;
    const userTokens = tokens[req.userId] || [];
    let joined = 0;
    
    for (let t of userTokens) {
        if (t.status === 'active' && sessions[req.userId]?.[t.id]) {
            const client = sessions[req.userId][t.id];
            // Send command to bot
            if (client) {
                // Store channel info for the bot to join
                t.targetChannel = channelId;
                t.targetGuild = guildId;
                joined++;
            }
        }
    }
    res.json({ success: true, joined, message: `${joined} bot(s) will join the voice channel` });
});

app.post('/api/play-all', auth, (req, res) => {
    const { query } = req.body;
    const userTokens = tokens[req.userId] || [];
    let played = 0;
    
    for (let t of userTokens) {
        if (t.status === 'active' && sessions[req.userId]?.[t.id]) {
            const client = sessions[req.userId][t.id];
            if (client) {
                // Find a voice channel to join
                const voiceChannel = client.channels.cache.get(t.targetChannel) || 
                                    client.voice?.connection?.channel;
                if (voiceChannel) {
                    playMusic(req.userId, t.id, query, { channel: { send: () => {} }, member: { voice: { channel: voiceChannel } } });
                    played++;
                }
            }
        }
    }
    res.json({ success: true, played, message: `${played} bot(s) started playing` });
});

app.post('/api/remove-all-tokens', auth, (req, res) => {
    const userTokens = tokens[req.userId] || [];
    let removed = userTokens.length;
    tokens[req.userId] = [];
    if (sessions[req.userId]) sessions[req.userId] = {};
    if (players[req.userId]) players[req.userId] = {};
    res.json({ success: true, removed });
});

app.post('/api/rename-all', auth, (req, res) => {
    const { name } = req.body;
    const userTokens = tokens[req.userId] || [];
    let renamed = 0;
    for (let t of userTokens) {
        if (t.status === 'active' && sessions[req.userId]?.[t.id]) {
            const client = sessions[req.userId][t.id];
            try {
                client.user.setUsername(name + '_' + t.id.slice(-4));
                t.username = name + '_' + t.id.slice(-4);
                renamed++;
            } catch(e) {}
        }
    }
    res.json({ renamed });
});

app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: '🌸 Pookie Army with Selfbots is alive!' });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🔥 ==========================================');
    console.log('🌸 POOKIE ARMY WITH SELFBOTS LIVE on port ' + PORT);
    console.log('🌐 Open: http://localhost:' + PORT);
    console.log('🔐 Login: rintu / pookie');
    console.log('🎵 Music: .play songname, .blast, .volume');
    console.log('🔥 ==========================================');
});
