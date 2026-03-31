/**
 * NagrikVaani — Backend Server (Database Version)
 * Run: node server.js
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');

// ── Import routes ───────────────────────────────────────────────
const complaintRoutes  = require('./routes/complaints');
const translateRoutes  = require('./routes/translate');
const categorizeRoutes = require('./routes/categorize');
const heatmapRoutes    = require('./routes/heatmap');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ──────────────────────────────────────────────────
app.use('/api/complaints', complaintRoutes);
app.use('/api/translate',  translateRoutes);
app.use('/api/categorize', categorizeRoutes);
app.use('/api/heatmap',    heatmapRoutes);
app.use('/api/admin', adminRoutes);


// ── Health check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'ok',
    message: 'NagrikVaani API is running 🚀',
    db:      'MySQL connected',
    time:    new Date().toLocaleString('en-IN')
  });
});

// ── Start server ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n====================================');
  console.log('  NagrikVaani Backend (DB Version)');
  console.log('====================================');
  console.log(`✅  Server:     http://localhost:${PORT}`);
  console.log(`🗄️   Database:   ${process.env.DB_NAME || 'nagrikvaani'} @ ${process.env.DB_HOST || 'localhost'}`);
  console.log(`🔑  Translate:  ${process.env.GOOGLE_TRANSLATE_API_KEY && process.env.GOOGLE_TRANSLATE_API_KEY !== 'YOUR_API_KEY_HERE' ? 'Configured ✅' : 'Not set ⚠️'}`);
  console.log('====================================\n');
});
