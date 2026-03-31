/**
 * routes/translate.js  (UPDATED — MyMemory free API, no Whisper, no Google)
 *
 * MyMemory is a free translation API:
 *   - No API key needed
 *   - Supports Marathi (mr) and Hindi (hi) to English
 *   - Free up to 5000 words per day
 *
 * POST /api/translate  — translate text to English
 */

const express = require('express');
const router  = express.Router();
const https   = require('https');

// ── MyMemory free translation API ──────────────────────────────
function myMemoryTranslate(text, sourceLang) {
  return new Promise((resolve, reject) => {

    const langMap = {
      'hi-IN': 'hi', 'mr-IN': 'mr', 'en-IN': 'en',
      'hi': 'hi', 'mr': 'mr', 'en': 'en'
    };

    const fromLang = langMap[sourceLang] || 'mr';

    // Skip if already English
    if (fromLang === 'en') {
      return resolve({ translatedText: text, detectedLanguage: 'en', skipped: true });
    }

    const encodedText = encodeURIComponent(text);
    const path = `/get?q=${encodedText}&langpair=${fromLang}|en`;

    console.log(`Translating [${fromLang} -> en]: "${text.substring(0, 60)}"`);

    const req = https.request({
      hostname: 'api.mymemory.translated.net',
      path,
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.responseStatus === 200 && parsed.responseData) {
            const translated = parsed.responseData.translatedText;
            console.log(`Translation result: "${translated}"`);
            resolve({ translatedText: translated, detectedLanguage: fromLang, skipped: false });
          } else {
            reject(new Error('MyMemory error: ' + JSON.stringify(parsed)));
          }
        } catch (e) {
          reject(new Error('Failed to parse MyMemory response'));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error('Cannot reach MyMemory API. Check internet. ' + err.message));
    });

    req.end();
  });
}

// ── POST /api/translate ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { text, sourceLang } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Text is required.' });
    }

    const result = await myMemoryTranslate(text, sourceLang || 'mr-IN');

    return res.json({
      success:          true,
      translatedText:   result.translatedText,
      detectedLanguage: result.detectedLanguage,
      skipped:          result.skipped || false,
      method:           'mymemory-free',
      message:          result.skipped
        ? 'Already in English — no translation needed.'
        : `Translated from ${result.detectedLanguage} to English via MyMemory (free).`
    });

  } catch (err) {
    console.error('Translation error:', err.message);
    // Fallback — return original text so system still works
    return res.json({
      success:          true,
      translatedText:   req.body.text,
      detectedLanguage: 'unknown',
      skipped:          true,
      warning:          'Translation failed — using original text. ' + err.message
    });
  }
});

module.exports = router;