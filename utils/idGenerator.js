/**
 * utils/idGenerator.js
 * Generates unique Complaint IDs in the format: NV-YYYY-XXXXX
 * Example: NV-2026-04821
 */

/**
 * Generate a complaint ID.
 * @returns {string}  e.g. "NV-2026-04821"
 */
function generateComplaintId() {
  const year   = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000; // 5-digit number
  return `NV-${year}-${random}`;
}

module.exports = { generateComplaintId };