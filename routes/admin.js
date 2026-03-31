/**
 * routes/admin.js
 * PUT /api/admin/update-status
 * GET /api/admin/complaints
 * GET /api/admin/stats
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');
const { insertTimeline } = require('../db/queries');

router.put('/update-status', async (req, res) => {
  try {
    const { complaint_id, status, remarks = '' } = req.body;
    if (!complaint_id || !status) {
      return res.status(400).json({ success: false, error: 'complaint_id and status are required.' });
    }
    const validStatuses = ['Registered','Under Review','Assigned','In Progress','Resolved','Closed','Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    const [existing] = await db.execute(
      'SELECT complaint_id FROM complaints WHERE complaint_id = ?',
      [complaint_id.trim().toUpperCase()]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Complaint not found: ' + complaint_id });
    }
    const dbStatus = status === 'In Progress' ? 'in_progress'
                   : status === 'Resolved' || status === 'Closed' ? 'resolved'
                   : status === 'Rejected' ? 'rejected' : 'open';
    const isResolved = (status === 'Resolved' || status === 'Closed');
    if (isResolved) {
      await db.execute(
        'UPDATE complaints SET status=?, remarks=?, updated_at=NOW(), resolved_at=NOW() WHERE complaint_id=?',
        [dbStatus, remarks, complaint_id.trim().toUpperCase()]
      );
    } else {
      await db.execute(
        'UPDATE complaints SET status=?, remarks=?, updated_at=NOW() WHERE complaint_id=?',
        [dbStatus, remarks, complaint_id.trim().toUpperCase()]
      );
    }
    await insertTimeline(
      complaint_id.trim().toUpperCase(),
      'Status Updated: ' + status,
      remarks || 'Status changed to ' + status + ' by Admin Officer.',
      'Admin Officer'
    );
    return res.json({ success: true, message: 'Complaint ' + complaint_id + ' updated to "' + status + '".' });
  } catch (err) {
    console.error('Admin update error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/complaints', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const [rows] = await db.execute(
      'SELECT complaint_id, citizen_name, phone, category, category_icon, district, state, priority, status, remarks, original_text, translated_text, language, is_duplicate, submitted_at, updated_at FROM complaints ORDER BY submitted_at DESC LIMIT ' + limit
    );
    return res.json({ success: true, total: rows.length, complaints: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS total, SUM(CASE WHEN status="open" THEN 1 ELSE 0 END) AS open_count, SUM(CASE WHEN status="in_progress" THEN 1 ELSE 0 END) AS in_progress, SUM(CASE WHEN status="resolved" THEN 1 ELSE 0 END) AS resolved, SUM(CASE WHEN is_duplicate=TRUE THEN 1 ELSE 0 END) AS duplicates FROM complaints'
    );
    return res.json({ success: true, stats: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
