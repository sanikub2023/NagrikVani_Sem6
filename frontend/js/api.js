/**
 * frontend/js/api.js
 * All calls to the NagrikVaani backend live here.
 * Other JS files import these functions instead of using fetch() directly.
 *
 * This keeps API URLs in one place — easy to change later.
 */

const API_BASE = 'http://localhost:3001/api';

/**
 * Submit a new complaint to the backend.
 *
 * @param {Object} data — complaint form data
 * @returns {Promise<Object>} API response
 */
async function submitComplaint(data) {
  const res = await fetch(`${API_BASE}/complaints`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data)
  });
  return res.json();
}

/**
 * Track a complaint by its ID.
 *
 * @param {string} id — e.g. "NV-2026-04821"
 * @returns {Promise<Object>} API response
 */
async function trackComplaint(id) {
  const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(id)}`);
  return res.json();
}

/**
 * Translate text to English.
 *
 * @param {string} text       — original text
 * @param {string} sourceLang — language code, e.g. 'hi-IN', 'mr-IN', 'en-IN'
 * @returns {Promise<Object>} { translatedText, detectedLanguage, ... }
 */
async function translateText(text, sourceLang) {
  const res = await fetch(`${API_BASE}/translate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text, sourceLang })
  });
  return res.json();
}

/**
 * Auto-categorize complaint text.
 *
 * @param {string} text
 * @returns {Promise<Object>} { category, icon, confidence }
 */
async function categorizeText(text) {
  const res = await fetch(`${API_BASE}/categorize`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ text })
  });
  return res.json();
}

// Export so other scripts can use these
window.NagrikAPI = { submitComplaint, trackComplaint, translateText, categorizeText };