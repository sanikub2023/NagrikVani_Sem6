/**
 * routes/categorize.js
 * Handles:
 *   POST /api/categorize  — run NLP keyword categorization on a complaint text
 *
 * This is a lightweight route so the frontend can get category suggestions
 * in real-time as the user types or after speech-to-text completes.
 */

const express         = require('express');
const router          = express.Router();
const { categorize }  = require('../nlp/categorizer');

// ── POST /api/categorize ────────────────────────────────────────
// Body: { text: "There is a big pothole near my house" }
// Returns: { category, icon, confidence }
router.post('/', (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text is required.' });
    }

    const result = categorize(text);

    return res.json({
      success:    true,
      category:   result.category,
      icon:       result.icon,
      confidence: result.confidence,
      message:    `Auto-detected category: ${result.icon} ${result.category} (${result.confidence} confidence)`
    });

  } catch (err) {
    console.error('Categorize error:', err.message);
    return res.status(500).json({ success: false, error: 'Categorization failed.' });
  }
});

module.exports = router;