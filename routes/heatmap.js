/**
 * routes/heatmap.js
 * Returns complaint data grouped by location for map visualization.
 *
 * GET /api/heatmap              — all districts, all categories
 * GET /api/heatmap?category=Water  — filter by category
 * GET /api/heatmap?state=Maharashtra — filter by state
 */

const express = require('express');
const router  = express.Router();
const { getHeatmapData, getDashboardStats, getStatsByCategory } = require('../db/queries');

// ── GET /api/heatmap ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category || null,
      state:    req.query.state    || null,
      fromDate: req.query.from     || null
    };

    const data = await getHeatmapData(filters);

    return res.json({
      success: true,
      total:   data.length,
      points:  data
    });

  } catch (err) {
    console.error('❌ Heatmap error:', err.message);
    return res.status(500).json({ success: false, error: 'Database error.' });
  }
});

// ── GET /api/heatmap/stats ──────────────────────────────────────
// Returns dashboard summary numbers
router.get('/stats', async (req, res) => {
  try {
    const [stats, byCategory] = await Promise.all([
      getDashboardStats(),
      getStatsByCategory()
    ]);
    return res.json({ success: true, stats, byCategory });

  } catch (err) {
    console.error('❌ Stats error:', err.message);
    return res.status(500).json({ success: false, error: 'Database error.' });
  }
});

module.exports = router;