/**
 * nlp/categorizer.js
 * Simple keyword-based complaint categorization.
 * Supports English, Hindi, and Marathi keywords.
 * No external AI — runs fully offline.
 */

// ── Category keyword map ────────────────────────────────────────
// Each category has English + Hindi + Marathi keywords.
const CATEGORIES = [
  {
    name: 'Infrastructure',
    icon: '🏗️',
    keywords: [
      // English
      'road', 'pothole', 'bridge', 'footpath', 'footbridge', 'street', 'drain',
      'drainage', 'gutter', 'construction', 'pavement', 'sidewalk', 'sewer',
      'building', 'wall', 'crack', 'broken road', 'bad road',
      // Hindi
      'sadak', 'raasta', 'nali', 'pul', 'nirman', 'khada',
      // Marathi
      'rasta', 'nala', 'pul', 'bandkam', 'khad'
    ]
  },
  {
    name: 'Electricity',
    icon: '💡',
    keywords: [
      // English
      'electricity', 'power', 'current', 'light', 'outage', 'blackout',
      'electric', 'wire', 'voltage', 'transformer', 'meter', 'bill', 'load shedding',
      'no power', 'power cut', 'streetlight', 'street light',
      // Hindi
      'bijli', 'light', 'current', 'bijlee', 'meter', 'bill',
      // Marathi
      'vij', 'diva', 'vijpuravtha', 'meter', 'bill'
    ]
  },
  {
    name: 'Water',
    icon: '💧',
    keywords: [
      // English
      'water', 'pipe', 'leakage', 'leak', 'supply', 'tap', 'tank', 'sewage',
      'drinking water', 'borewell', 'hand pump', 'dirty water', 'contaminated',
      // Hindi
      'paani', 'pani', 'naala', 'nala', 'nal', 'tanki', 'pipline',
      // Marathi
      'pani', 'nal', 'galaw', 'puravtha', 'tanki'
    ]
  },
  {
    name: 'Health',
    icon: '🏥',
    keywords: [
      // English
      'health', 'hospital', 'doctor', 'medicine', 'ambulance', 'dispensary',
      'clinic', 'nurse', 'treatment', 'sanitation', 'garbage', 'waste',
      'disease', 'infection', 'hygiene', 'toilet', 'open defecation',
      // Hindi
      'aspatal', 'dawai', 'doctor', 'beemari', 'safai', 'kachda', 'garbage',
      // Marathi
      'rugnalay', 'davakhana', 'safai', 'arogya', 'kachara'
    ]
  },
  {
    name: 'Education',
    icon: '🏫',
    keywords: [
      // English
      'school', 'college', 'teacher', 'student', 'education', 'classroom',
      'book', 'midday meal', 'mid day meal', 'scholarship', 'fees', 'admission',
      'blackboard', 'library', 'exam',
      // Hindi
      'school', 'shiksha', 'adhyapak', 'vidyalay', 'pathshala',
      // Marathi
      'shala', 'shikshan', 'shikshak', 'vidyalaya'
    ]
  },
  {
    name: 'Transport',
    icon: '🚌',
    keywords: [
      // English
      'bus', 'train', 'auto', 'rickshaw', 'taxi', 'cab', 'traffic', 'signal',
      'transport', 'vehicle', 'overcharging', 'route', 'stop', 'station',
      // Hindi
      'bus', 'rail', 'auto', 'challan', 'vaahan',
      // Marathi
      'bus', 'relwe', 'auto', 'riksha', 'vaahan'
    ]
  },
  {
    name: 'Govt Scheme',
    icon: '📋',
    keywords: [
      // English
      'pension', 'ration', 'card', 'scheme', 'benefit', 'subsidy', 'certificate',
      'document', 'aadhar', 'aadhaar', 'ration card', 'bpl', 'pm', 'yojana',
      // Hindi
      'yojana', 'ration', 'pension', 'anudaan', 'praman patra',
      // Marathi
      'yojana', 'ration', 'pension', 'anudan', 'praman patra'
    ]
  }
];

const DEFAULT_CATEGORY = { name: 'Other', icon: '📌' };

/**
 * Categorize a complaint text.
 * Returns the best matching category and a confidence score.
 *
 * @param {string} text - Complaint text (English or translated)
 * @returns {{ category: string, icon: string, confidence: string }}
 */
function categorize(text) {
  if (!text || text.trim().length === 0) {
    return { ...DEFAULT_CATEGORY, confidence: 'low' };
  }

  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const cat of CATEGORIES) {
    let score = 0;
    for (const keyword of cat.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        // Longer keywords → higher weight (more specific)
        score += keyword.length > 5 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  if (!bestMatch || bestScore === 0) {
    return { ...DEFAULT_CATEGORY, confidence: 'low' };
  }

  const confidence = bestScore >= 4 ? 'high' : bestScore >= 2 ? 'medium' : 'low';
  return { category: bestMatch.name, icon: bestMatch.icon, confidence };
}

module.exports = { categorize, CATEGORIES };