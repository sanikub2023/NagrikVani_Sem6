/**
 * routes/complaints.js  (UPDATED — now uses MySQL database)
 *
 * Handles:
 *   POST /api/complaints        — submit a new complaint
 *   GET  /api/complaints/:id    — track by complaint ID
 *   GET  /api/complaints        — list recent complaints
 *   PUT  /api/complaints/:id/status — update status (admin)
 */

const express    = require('express');
const router     = express.Router();

const { generateComplaintId }  = require('../utils/idGenerator');
const { categorize }           = require('../nlp/categorizer');
const {
  insertComplaint,
  insertTimeline,
  getComplaintById,
  checkDuplicate,
  getRecentComplaints
} = require('../db/queries');


// ── POST /api/complaints ────────────────────────────────────────
// Submit a new complaint (with duplicate detection)
router.post('/', async (req, res) => {
  try {
    const {
      name, phone, email = '',
      text, translatedText,
      district = '', state = '', location = '',
      priority = 'Medium', language = 'en-IN'
    } = req.body;

    // ── Validate required fields ──────────────────────────────
    if (!name || !phone || !text) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone number, and complaint text are required.'
      });
    }

    // ── NLP categorization ────────────────────────────────────
    const textForNLP = translatedText || text;
    const { category, icon, confidence } = categorize(textForNLP);

    // ── Duplicate Detection ───────────────────────────────────
    // Check if same person filed same type of complaint in same
    // district within the last 7 days
    let isDuplicate   = false;
    let duplicateOf   = null;

    if (district && phone) {
      const existing = await checkDuplicate(phone, category, district);
      if (existing) {
        isDuplicate = true;
        duplicateOf = existing.complaint_id;
        console.log(`⚠️  Duplicate detected: ${duplicateOf}`);
      }
    }

    // ── Generate unique Complaint ID ──────────────────────────
    const complaintId = generateComplaintId();

    // ── Save to database ──────────────────────────────────────
    await insertComplaint({
      complaint_id:     complaintId,
      citizen_name:     name,
      phone,
      email,
      original_text:    text,
      translated_text:  translatedText || text,
      language,
      category,
      category_icon:    icon,
      nlp_confidence:   confidence,
      state,
      district,
      location_address: location,
      priority,
      is_duplicate:     isDuplicate,
      duplicate_of:     duplicateOf
    });

    // ── Add first timeline entry ──────────────────────────────
    await insertTimeline(
      complaintId,
      'Complaint Registered',
      `Complaint submitted by ${name}. Category auto-detected as ${category}.`,
      'System'
    );

    // ── Build response ────────────────────────────────────────
    const response = {
      success:      true,
      complaintId,
      category,
      categoryIcon: icon,
      confidence,
      message: `Complaint filed successfully. Your ID is ${complaintId}`
    };

    // Tell citizen if it was flagged as a duplicate
    if (isDuplicate) {
      response.warning    = `A similar complaint (${duplicateOf}) was already filed from this number in the last 7 days.`;
      response.isDuplicate = true;
      response.duplicateOf = duplicateOf;
    }

    return res.status(201).json(response);

  } catch (err) {
    console.error('❌ Error submitting complaint:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Server error. Please try again. If problem persists, check database connection.'
    });
  }
});


// ── GET /api/complaints/:id ─────────────────────────────────────
// Track a complaint — returns full details + timeline
router.get('/:id', async (req, res) => {
  try {
    const id       = req.params.id.trim().toUpperCase();
    const complaint = await getComplaintById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: `No complaint found with ID "${id}". Please check and try again.`
      });
    }

    return res.json({ success: true, complaint });

  } catch (err) {
    console.error('❌ Error tracking complaint:', err.message);
    return res.status(500).json({ success: false, error: 'Database error.' });
  }
});


// ── GET /api/complaints ─────────────────────────────────────────
// List recent complaints for dashboard
router.get('/', async (req, res) => {
  try {
    const limit      = parseInt(req.query.limit) || 10;
    const complaints = await getRecentComplaints(limit);
    return res.json({ success: true, total: complaints.length, complaints });

  } catch (err) {
    console.error('❌ Error fetching complaints:', err.message);
    return res.status(500).json({ success: false, error: 'Database error.' });
  }
});


// ── PUT /api/complaints/:id/status ──────────────────────────────
// Update complaint status (for admin/officer use)
// Body: { status: 'resolved', updatedBy: 'Officer Name', note: 'Fixed the pothole' }
router.put('/:id/status', async (req, res) => {
  try {
    const id        = req.params.id.trim().toUpperCase();
    const { status, updatedBy = 'Admin', note = '' } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const { updateComplaintStatus } = require('../db/queries');
    await updateComplaintStatus(id, status, updatedBy, note);

    return res.json({
      success: true,
      message: `Complaint ${id} status updated to "${status}"`
    });

  } catch (err) {
    console.error('❌ Error updating status:', err.message);
    return res.status(500).json({ success: false, error: 'Database error.' });
  }
});
module.exports = router;

// UPDATE STATUS (ADMIN)
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, note, updatedBy } = req.body;

  try {
    const [result] = await db.execute(
      `UPDATE complaints 
       SET status = ?, remarks = ?, updated_at = NOW()
       WHERE complaint_id = ?`,
      [status, note || null, id]
    );

    if (result.affectedRows === 0) {
      return res.json({ success: false, error: "Complaint not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});