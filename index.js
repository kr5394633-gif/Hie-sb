const express = require('express');
const app = express();
app.use(express.json());

// Simple HTML with error handling
app.get('/', (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🌸 POOKIE ARMY 🌸</title>
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
            text-align: center;
          }
          h1 {
            font-size: 3em;
            background: linear-gradient(135deg, #ff69b4, #ff1493);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .sub { color: #ffb6c1; margin: 10px 0; letter-spacing: 3px; }
          .status { color: #00ffcc; font-size: 1.2em; margin: 20px 0; }
          .detail { color: #ff69b488; font-size: 0.9em; }
          .footer {
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
          <div class="sub">💖 <span style="color:#ff69b4;font-weight:bold;">RINTU'S PRIVATE</span> · NO RULES 💖</div>
          <div class="status">✅ SERVER IS RUNNING!</div>
          <div class="detail">🚀 Ready for tokens and chaos</div>
          <div class="footer">🌸 RINTU'S ARMY · v7.0 · 💕</div>
        </div>
      </body>
      </html>
    `);
  } catch (e) {
    res.send('Error: ' + e.message);
  }
});

// Test API
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Pookie Army is alive!' });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Catch all - 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🔥 ==========================================');
  console.log('🌸 POOKIE ARMY LIVE on port ' + PORT);
  console.log('🌐 Open: http://localhost:' + PORT);
  console.log('🔥 ==========================================');
});
