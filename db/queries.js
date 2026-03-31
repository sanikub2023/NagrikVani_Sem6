/**
 * db/queries.js
 * All database queries live here in one place.
 *
 * RULE: No other file should write raw SQL.
 *       They call these functions instead.
 *       This makes it easy to change queries later.
 */

const db = require('./connection');

// ═══════════════════════════════════════════════════════════════
//  1. INSERT — Save a new complaint
// ═══════════════════════════════════════════════════════════════

/**
 * Insert a new complaint into the database.
 * @param {Object} data - complaint data
 * @returns {Object} inserted complaint info
 */
async function insertComplaint(data) {
  /*
    SQL EXPLAINED:
    INSERT INTO complaints (...columns...) VALUES (?, ?, ?, ...)
    The ? marks are placeholders — mysql2 fills them safely
    to prevent SQL injection attacks.
  */
  const sql = `
    INSERT INTO complaints (
      complaint_id,
      citizen_name, phone, email,
      original_text, translated_text, language,
      category, category_icon, nlp_confidence,
      state, district, location_address,
      latitude, longitude,
      priority, status,
      is_duplicate, duplicate_of
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `;

  const values = [
    data.complaint_id,
    data.citizen_name, data.phone, data.email || null,
    data.original_text, data.translated_text || data.original_text, data.language || 'en-IN',
    data.category, data.category_icon || '📌', data.nlp_confidence || 'low',
    data.state || null, data.district || null, data.location_address || null,
    data.latitude || null, data.longitude || null,
    data.priority || 'Medium',
    data.is_duplicate || false, data.duplicate_of || null
  ];

  const [result] = await db.execute(sql, values);
  return result;
}


// ═══════════════════════════════════════════════════════════════
//  2. INSERT — Add a timeline event for a complaint
// ═══════════════════════════════════════════════════════════════

/**
 * Log an activity/status update to the timeline.
 * @param {string} complaint_id
 * @param {string} event_title
 * @param {string} event_note
 * @param {string} updated_by
 */
async function insertTimeline(complaint_id, event_title, event_note = '', updated_by = 'System') {
  const sql = `
    INSERT INTO complaint_timeline (complaint_id, event_title, event_note, updated_by)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await db.execute(sql, [complaint_id, event_title, event_note, updated_by]);
  return result;
}


// ═══════════════════════════════════════════════════════════════
//  3. SELECT — Track complaint by ID
// ═══════════════════════════════════════════════════════════════

/**
 * Find a complaint by its complaint_id (e.g. NV-2026-04821).
 * Also fetches the full activity timeline.
 * @param {string} complaint_id
 * @returns {Object|null} complaint with timeline
 */
async function getComplaintById(complaint_id) {

  // Get the complaint
  const complaintSql = `
    SELECT *
    FROM complaints
    WHERE complaint_id = ?
    LIMIT 1
  `;
  const [rows] = await db.execute(complaintSql, [complaint_id]);

  if (rows.length === 0) return null;

  const complaint = rows[0];

  // Get its timeline
  const timelineSql = `
    SELECT event_title, event_note, updated_by, created_at
    FROM complaint_timeline
    WHERE complaint_id = ?
    ORDER BY created_at ASC
  `;
  const [timeline] = await db.execute(timelineSql, [complaint_id]);

  complaint.timeline = timeline;
  return complaint;
}


// ═══════════════════════════════════════════════════════════════
//  4. SELECT — Duplicate Detection
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a very similar complaint already exists.
 * We check: same phone number + same category + same district
 * filed within the last 7 days.
 *
 * If found, we flag the new complaint as a duplicate.
 *
 * @param {string} phone
 * @param {string} category
 * @param {string} district
 * @returns {Object|null} existing complaint if duplicate found
 */
async function checkDuplicate(phone, category, district) {
  const sql = `
    SELECT complaint_id, citizen_name, category, district, submitted_at, status
    FROM complaints
    WHERE
      phone     = ?
      AND category = ?
      AND district = ?
      AND submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND is_duplicate = FALSE
    ORDER BY submitted_at DESC
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [phone, category, district]);
  return rows.length > 0 ? rows[0] : null;
}


// ═══════════════════════════════════════════════════════════════
//  5. SELECT — Heatmap Data
// ═══════════════════════════════════════════════════════════════

/**
 * Get complaint counts grouped by district and category.
 * Used to draw the heatmap on the map.
 *
 * Returns data like:
 * [
 *   { district: 'Pune',   category: 'Infrastructure', count: 45, lat: 18.52, lng: 73.85 },
 *   { district: 'Mumbai', category: 'Water',           count: 32, lat: 19.07, lng: 72.87 },
 *   ...
 * ]
 */
async function getHeatmapData(filters = {}) {
  /*
    We use AVG(latitude) and AVG(longitude) to get the
    center point of all complaints in a district.
    This gives us one map pin per district per category.
  */
  let sql = `
    SELECT
      district,
      category,
      category_icon,
      COUNT(*)          AS complaint_count,
      AVG(latitude)     AS avg_lat,
      AVG(longitude)    AS avg_lng,
      SUM(CASE WHEN status = 'open'        THEN 1 ELSE 0 END) AS open_count,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS progress_count,
      SUM(CASE WHEN status = 'resolved'    THEN 1 ELSE 0 END) AS resolved_count
    FROM complaints
    WHERE district IS NOT NULL
      AND latitude  IS NOT NULL
  `;

  const values = [];

  // Optional filters
  if (filters.category) {
    sql += ' AND category = ?';
    values.push(filters.category);
  }
  if (filters.state) {
    sql += ' AND state = ?';
    values.push(filters.state);
  }
  if (filters.fromDate) {
    sql += ' AND submitted_at >= ?';
    values.push(filters.fromDate);
  }

  sql += `
    GROUP BY district, category, category_icon
    ORDER BY complaint_count DESC
  `;

  const [rows] = await db.execute(sql, values);
  return rows;
}


// ═══════════════════════════════════════════════════════════════
//  6. SELECT — Dashboard Stats
// ═══════════════════════════════════════════════════════════════

/**
 * Get summary stats for the dashboard.
 * Returns total, open, in_progress, resolved counts.
 */
async function getDashboardStats() {
  const sql = `
    SELECT
      COUNT(*)                                                    AS total,
      SUM(CASE WHEN status = 'open'        THEN 1 ELSE 0 END)   AS open_count,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)   AS in_progress,
      SUM(CASE WHEN status = 'resolved'    THEN 1 ELSE 0 END)   AS resolved,
      SUM(CASE WHEN is_duplicate = TRUE    THEN 1 ELSE 0 END)   AS duplicates
    FROM complaints
  `;
  const [rows] = await db.execute(sql);
  return rows[0];
}


/**
 * Get recent complaints for dashboard table (newest first).
 * @param {number} limit - how many to return
 */
async function getRecentComplaints(limit = 10) {
  const sql = `
    SELECT
      complaint_id, citizen_name, phone, category, category_icon,
      district, state, priority, status, submitted_at, is_duplicate, language
    FROM complaints
    ORDER BY submitted_at DESC
    LIMIT ${parseInt(limit)}
  `;
  const [rows] = await db.execute(sql);
  return rows;
}


/**
 * Get complaint counts grouped by category (for pie/donut chart).
 */
async function getStatsByCategory() {
  const sql = `
    SELECT
      category,
      category_icon,
      COUNT(*) AS total
    FROM complaints
    GROUP BY category, category_icon
    ORDER BY total DESC
  `;
  const [rows] = await db.execute(sql);
  return rows;
}


// ═══════════════════════════════════════════════════════════════
//  7. UPDATE — Change complaint status (for admin/officer)
// ═══════════════════════════════════════════════════════════════

/**
 * Update the status of a complaint.
 * @param {string} complaint_id
 * @param {string} newStatus - 'open' | 'in_progress' | 'resolved' | 'rejected'
 * @param {string} updatedBy - officer name
 * @param {string} note      - reason/remark
 */
async function updateComplaintStatus(complaint_id, newStatus, updatedBy, note = '') {
  const sql = `
    UPDATE complaints
    SET
      status      = ?,
      updated_at  = NOW(),
      resolved_at = CASE WHEN ? = 'resolved' THEN NOW() ELSE resolved_at END
    WHERE complaint_id = ?
  `;
  const [result] = await db.execute(sql, [newStatus, newStatus, complaint_id]);

  // Log to timeline
  const eventTitle = {
    open:        'Complaint Reopened',
    in_progress: 'Work In Progress',
    resolved:    'Complaint Resolved',
    rejected:    'Complaint Rejected'
  }[newStatus] || 'Status Updated';

  await insertTimeline(complaint_id, eventTitle, note, updatedBy);

  return result;
}


// ── Export all query functions ──────────────────────────────────
module.exports = {
  insertComplaint,
  insertTimeline,
  getComplaintById,
  checkDuplicate,
  getHeatmapData,
  getDashboardStats,
  getRecentComplaints,
  getStatsByCategory,
  updateComplaintStatus
};