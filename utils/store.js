/**
 * utils/store.js
 * Simple in-memory complaint store for the prototype.
 * In a real app, replace this with a database (e.g. MongoDB, PostgreSQL).
 *
 * All complaints are stored in a plain JavaScript array.
 * Data resets when the server restarts — that is fine for a prototype.
 */

const complaints = [];   // Our "database" for now

/**
 * Save a new complaint.
 * @param {Object} complaint
 * @returns {Object} saved complaint
 */
function saveComplaint(complaint) {
  complaints.push(complaint);
  return complaint;
}

/**
 * Find a complaint by its ID.
 * @param {string} id
 * @returns {Object|null}
 */
function findComplaintById(id) {
  return complaints.find(c => c.id === id) || null;
}

/**
 * Get all complaints (newest first).
 * @returns {Object[]}
 */
function getAllComplaints() {
  return [...complaints].reverse();
}

module.exports = { saveComplaint, findComplaintById, getAllComplaints };