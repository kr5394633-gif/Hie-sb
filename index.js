const express = require('express');
const app = express();

// Simple HTML page - nothing else
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>🌸 POOKIE ARMY 🌸</title>
      <style>
        body {
          background: #0a0011;
          color: #ff69b4;
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          flex-direction: column;
        }
        h1 { font-size: 4em; margin: 0; }
        p { color: #ffb6c1; font-size: 1.2em; }
        .status { color: #00ffcc; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>🌸 POOKIE ARMY 🌸</h1>
      <p>✨ RINTU'S PRIVATE VERSION ✨</p>
      <div class="status">✅ SERVER IS RUNNING!</div>
      <p style="color:#ffb6c155; font-size:0.8em; margin-top:30px;">Deployed successfully on Railway</p>
    </body>
    </html>
  `);
});

// Simple test API
app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Pookie Army is alive!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🔥 POOKIE ARMY LIVE on port ' + PORT);
});
