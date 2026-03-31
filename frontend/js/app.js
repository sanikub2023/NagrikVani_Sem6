/**
 * frontend/js/app.js  (UPDATED — Web Speech API + MyMemory translation)
 *
 * Flow for Hindi/Marathi:
 *   1. Web Speech API captures speech as text
 *   2. Text sent to /api/translate (MyMemory free API)
 *   3. English text returned
 *   4. English text goes into NLP categorization
 *   5. Complaint submitted as normal
 */

const State = {
  catVal:         'Infrastructure',
  priVal:         'Medium',
  isRecording:    false,
  recSeconds:     0,
  recTimer:       null,
  selectedLang:   'en-IN',
  translatedText: ''
};

// ── Page Navigation ────────────────────────────────────────────
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Category & Priority ────────────────────────────────────────
function selCat(el, v) {
  document.querySelectorAll('.cpill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  State.catVal = v;
}

function selPri(el, v) {
  document.querySelectorAll('.ppill').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  State.priVal = v;
}

// ── Language Selector ──────────────────────────────────────────
function setLanguage(code) {
  State.selectedLang = code;
  const labels = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'mr-IN': 'Marathi' };
  showToast('🌐', `Language set to ${labels[code] || code}`);
}

// ── Waveform animation ─────────────────────────────────────────
function buildWave() {
  const w = document.getElementById('wformSm');
  if (!w) return;
  for (let i = 0; i < 28; i++) {
    const b = document.createElement('div');
    b.className = 'wb';
    b.style.setProperty('--h', (Math.random() * 24 + 6) + 'px');
    b.style.setProperty('--s', (Math.random() * 0.35 + 0.38) + 's');
    b.style.animationDelay = (i * 0.05) + 's';
    w.appendChild(b);
  }
}

// ── Recording Controls ─────────────────────────────────────────
function toggleRec() {
  if (State.isRecording) stopRec();
  else startRec();
}

function startRec() {
  State.isRecording    = true;
  State.recSeconds     = 0;
  State.translatedText = '';

  document.getElementById('ta').value = '';
  document.getElementById('liveSpeechText').textContent = '';
  const transEl = document.getElementById('translationBox');
  if (transEl) transEl.style.display = 'none';

  // UI — recording state
  document.getElementById('micXL').classList.add('live');
  document.getElementById('micXL').textContent = '⏹';
  document.getElementById('vrBox').classList.add('live');
  document.getElementById('rLbl').textContent = '🔴 Listening…';
  document.getElementById('rTimer').style.display = 'block';
  document.getElementById('rSub').textContent = 'Speak clearly — will auto-stop on pause.';
  document.getElementById('rActs').style.display = 'none';
  document.getElementById('voiceStatusBar').classList.add('show');
  document.getElementById('voiceHint').style.display = 'flex';
  document.getElementById('liveSpeechText').classList.add('show');
  document.querySelectorAll('.wb').forEach(b => b.classList.add('a'));

  // Timer
  State.recTimer = setInterval(() => {
    State.recSeconds++;
    const m = String(Math.floor(State.recSeconds / 60)).padStart(2, '0');
    const s = String(State.recSeconds % 60).padStart(2, '0');
    document.getElementById('rTimer').textContent = m + ':' + s;
    document.querySelectorAll('.wb').forEach(b =>
      b.style.setProperty('--h', (Math.random() * 28 + 5) + 'px'));
  }, 1000);

  // Start Web Speech API
  SpeechHandler.start(
    State.selectedLang,

    // onTranscript — live text update while speaking
    (displayed, finalSoFar) => {
      document.getElementById('liveSpeechText').textContent = displayed || '…';
      document.getElementById('ta').value = finalSoFar;
    },

    // onEnd — speech stopped, now translate if needed
    async (spokenText) => {
      clearInterval(State.recTimer);
      State.isRecording = false;

      // Reset recording UI
      document.getElementById('micXL').classList.remove('live');
      document.getElementById('micXL').textContent = '✅';
      document.getElementById('vrBox').classList.remove('live');
      document.getElementById('rLbl').textContent = 'Recording complete!';
      document.getElementById('rSub').textContent = 'Done · ' + document.getElementById('rTimer').textContent;
      document.getElementById('rActs').style.display = 'flex';
      document.getElementById('voiceStatusBar').classList.remove('show');
      document.getElementById('voiceHint').style.display = 'none';
      document.querySelectorAll('.wb').forEach(b => {
        b.classList.remove('a');
        b.style.height = '4px';
      });

      if (!spokenText || spokenText.trim().length === 0) {
        showToast('⚠️', 'No speech detected. Please try again.');
        return;
      }

      // Put spoken text in textarea first
      document.getElementById('ta').value = spokenText;

      // ── Translate if Hindi or Marathi ──────────────────────
      if (!State.selectedLang.startsWith('en')) {
        showToast('⏳', 'Translating to English…');

        try {
          const tResult = await NagrikAPI.translateText(spokenText, State.selectedLang);

          if (tResult.success && tResult.translatedText) {
            State.translatedText = tResult.translatedText;

            // Show translation box
            const transEl = document.getElementById('translationBox');
            if (transEl) {
              transEl.style.display = 'block';
              document.getElementById('translatedTextDisplay').textContent = tResult.translatedText;
            }

            showToast('✅', 'Translated to English successfully!');

            // Use translated text for NLP
            await runCategorization(tResult.translatedText);

          } else {
            // Translation failed — use original text
            State.translatedText = spokenText;
            showToast('⚠️', 'Translation unavailable — using original text.');
            await runCategorization(spokenText);
          }

        } catch (e) {
          console.warn('Translation error:', e);
          State.translatedText = spokenText;
          showToast('⚠️', 'Translation failed — using original text.');
          await runCategorization(spokenText);
        }

      } else {
        // English — no translation needed
        State.translatedText = spokenText;
        showToast('✅', 'Speech captured successfully!');
        await runCategorization(spokenText);
      }
    },

    // onError
    (errMsg) => {
      clearInterval(State.recTimer);
      State.isRecording = false;
      showToast('🚫', errMsg);
      resetRec();
    }
  );
}

// ── Run NLP categorization ─────────────────────────────────────
async function runCategorization(text) {
  try {
    const cResult = await NagrikAPI.categorizeText(text);
    if (cResult.success && cResult.category) {
      document.querySelectorAll('.cpill').forEach(p => {
        if (p.textContent.includes(cResult.category)) {
          p.classList.add('on');
          State.catVal = cResult.category;
          const lbl = document.getElementById('autoDetectLabel');
          if (lbl) lbl.textContent = `✨ Auto-detected (${cResult.confidence})`;
        } else {
          p.classList.remove('on');
        }
      });
      showToast(cResult.icon, `Category: ${cResult.category} (${cResult.confidence})`);
    }
  } catch (e) {
    console.warn('Categorization failed:', e);
  }
}

function stopRec() {
  SpeechHandler.stop();
}

function resetRec() {
  SpeechHandler.reset();
  clearInterval(State.recTimer);
  State.isRecording    = false;
  State.recSeconds     = 0;
  State.translatedText = '';

  document.getElementById('micXL').textContent = '🎙️';
  document.getElementById('micXL').classList.remove('live');
  document.getElementById('vrBox').classList.remove('live');
  document.getElementById('rLbl').textContent = 'Click microphone to record your complaint';
  document.getElementById('rTimer').style.display = 'none';
  document.getElementById('rTimer').textContent = '00:00';
  document.getElementById('rSub').textContent = 'Speak clearly in the language you selected above';
  document.getElementById('rActs').style.display = 'none';
  document.getElementById('ta').value = '';
  document.getElementById('liveSpeechText').textContent = '';
  document.getElementById('liveSpeechText').classList.remove('show');
  document.getElementById('voiceStatusBar').classList.remove('show');
  document.getElementById('voiceHint').style.display = 'none';
  const transEl = document.getElementById('translationBox');
  if (transEl) transEl.style.display = 'none';
}

// ── Form Submission ────────────────────────────────────────────
async function submitLodge() {
  const name  = document.getElementById('fn').value.trim();
  const phone = document.getElementById('fp').value.trim();
  const text  = document.getElementById('ta').value.trim();

  if (!name)  { highlight('fn'); showToast('⚠️', 'Please enter your full name.');          return; }
  if (!phone) { highlight('fp'); showToast('⚠️', 'Please enter your mobile number.');      return; }
  if (!text)  { highlight('ta'); showToast('⚠️', 'Please record or type your complaint.'); return; }

  const btn = document.querySelector('.btn-submit-f');
  btn.textContent = '⏳ Submitting…';
  btn.disabled    = true;

  try {
    const payload = {
      name,
      phone,
      email:          document.getElementById('fe').value.trim(),
      text,
      translatedText: State.translatedText || text,
      district:       document.getElementById('fd').value.trim(),
      state:          document.getElementById('fst').value,
      location:       document.getElementById('fl').value.trim(),
      priority:       State.priVal,
      language:       State.selectedLang
    };

    const result = await NagrikAPI.submitComplaint(payload);

    if (!result.success) {
      showToast('❌', result.error || 'Submission failed. Please try again.');
      btn.textContent = '📤 Submit Complaint';
      btn.disabled    = false;
      return;
    }

    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('successId').textContent  = result.complaintId;
    document.getElementById('sCat').textContent       = result.category;
    document.getElementById('sPri').textContent       = State.priVal;
    document.getElementById('sName').textContent      = name;
    document.getElementById('sDate').textContent      = dateStr;
    document.getElementById('successOverlay').classList.add('open');

    setTimeout(() => {
      ['fn','fp','fe','ta','fd','fl','fst'].forEach(id => {
        document.getElementById(id).value = '';
      });
      resetRec();
      btn.textContent = '📤 Submit Complaint';
      btn.disabled    = false;
    }, 500);

  } catch (err) {
    console.error('Submission error:', err);
    showToast('❌', 'Could not connect to server. Make sure backend is running.');
    btn.textContent = '📤 Submit Complaint';
    btn.disabled    = false;
  }
}

// ── Success screen ─────────────────────────────────────────────
function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('open');
}
function trackSuccess() {
  const id = document.getElementById('successId').textContent;
  document.getElementById('successOverlay').classList.remove('open');
  document.getElementById('trackInp').value = id;
  goPage('track');
  setTimeout(doTrack, 300);
}

// ── Track ──────────────────────────────────────────────────────
function trackFromHome() {
  const v = document.getElementById('homeTrackInp').value.trim();
  document.getElementById('trackInp').value = v;
  goPage('track');
  if (v) setTimeout(doTrack, 350);
}

async function doTrack() {
  const id = document.getElementById('trackInp').value.trim();
  if (!id) { showToast('⚠️', 'Please enter a Complaint ID.'); return; }

  document.getElementById('trackRes').style.display   = 'none';
  document.getElementById('trackEmpty').style.display = 'none';

  try {
    const result = await NagrikAPI.trackComplaint(id.toUpperCase());

    if (!result.success || !result.complaint) {
      document.getElementById('emptyId').textContent = id;
      document.getElementById('trackEmpty').style.display = 'block';
      return;
    }

    const c = result.complaint;

    // ── Fix field names (DB returns snake_case) ──────────────
    const complaintId    = c.complaint_id   || c.id            || id;
    const originalText   = c.original_text  || c.originalText  || '';
    const translatedText = c.translated_text|| c.translatedText|| '';
    const submittedAt    = c.submitted_at   || c.submittedAt   || new Date();
    const updatedAt      = c.updated_at     || c.updatedAt     || submittedAt;

    // ── Populate tracking card ────────────────────────────────
    document.getElementById('trId').textContent    = complaintId;
    document.getElementById('trTitle').textContent = translatedText || originalText;
    document.getElementById('trCat').textContent   = c.category  || '—';
    document.getElementById('trPri').textContent   = c.priority  || 'Medium';
    document.getElementById('trDate').textContent  = new Date(submittedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    document.getElementById('trUpd').textContent   = new Date(updatedAt).toLocaleDateString('en-IN',   { day:'numeric', month:'short', year:'numeric' });
    document.getElementById('trOfficer').textContent = 'Admin Officer';
    document.getElementById('trEta').textContent     = 'Based on priority SLA';

    // ── Status badge (use real status from DB) ────────────────
    const badge  = document.getElementById('trBadge');
    const status = c.status || 'open';
    const statusMap = {
      'open':        { label: 'Open',        cls: 'open' },
      'in_progress': { label: 'In Progress', cls: 'prog' },
      'resolved':    { label: 'Resolved',    cls: 'res'  },
      'rejected':    { label: 'Rejected',    cls: 'rej'  }
    };
    const s = statusMap[status] || { label: 'Open', cls: 'open' };
    badge.textContent = s.label;
    badge.className   = 'sbadge ' + s.cls;

    // ── Officer Remarks ───────────────────────────────────────
    const remarkEl = document.getElementById('trRemark');
    if (remarkEl) {
      if (c.remarks && c.remarks.trim() !== '') {
        remarkEl.textContent = c.remarks;
        remarkEl.style.color = '#0d1b2e';
      } else {
        remarkEl.textContent = 'No remarks yet.';
        remarkEl.style.color = '#5a6a85';
      }
    }

    // ── Timeline from DB ──────────────────────────────────────
    const tlEl = document.getElementById('trTimeline');
    if (tlEl && c.timeline && c.timeline.length > 0) {
      tlEl.innerHTML = c.timeline.map(function(t, i) {
        var isLast = i === c.timeline.length - 1;
        return '<div class="tl-item">' +
          '<div class="tl-dot' + (isLast ? ' done' : '') + '"></div>' +
          '<div class="tl-content">' +
            '<div class="tl-title">' + t.event_title + '</div>' +
            (t.event_note ? '<div class="tl-note">' + t.event_note + '</div>' : '') +
            '<div class="tl-time">' + new Date(t.created_at).toLocaleString('en-IN') + ' · ' + t.updated_by + '</div>' +
          '</div></div>';
      }).join('');
    }

    document.getElementById('trackRes').style.display = 'block';

  } catch (err) {
    console.error('Track error:', err);
    showToast('❌', 'Could not reach server. Please make sure backend is running.');
  }
}
// ── Helpers ────────────────────────────────────────────────────
function highlight(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = 'var(--red)';
  el.focus();
  setTimeout(() => { el.style.borderColor = ''; }, 2500);
}

function showToast(icon, msg) {
  document.getElementById('tIcon').textContent = icon;
  document.getElementById('tMsg').textContent  = msg;
  const t = document.getElementById('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4200);
}

// ── Dashboard ──────────────────────────────────────────────────
const dashData = [
  { id:'NV-2026-04781', cat:'Infrastructure', district:'Pune',   pri:'High',   status:'open' },
  { id:'NV-2026-04780', cat:'Electricity',    district:'Mumbai', pri:'Medium', status:'progress' },
  { id:'NV-2026-04779', cat:'Health',         district:'Nagpur', pri:'Low',    status:'resolved' },
  { id:'NV-2026-04778', cat:'Water',          district:'Nashik', pri:'High',   status:'open' },
];

function renderDash() {
  const tb = document.getElementById('dashTbody');
  if (!tb) return;
  tb.innerHTML = dashData.map(d => `
    <tr>
      <td><span class="tid" onclick="viewC('${d.id}')">${d.id}</span></td>
      <td>${d.cat}</td><td>${d.district}</td>
      <td><span class="ptag ${d.pri.toLowerCase()}">${d.pri}</span></td>
      <td><span class="sbadge ${d.status==='open'?'open':d.status==='progress'?'prog':'res'}">
        ${d.status==='open'?'Open':d.status==='progress'?'In Progress':'Resolved'}
      </span></td>
    </tr>`).join('');
}

function viewC(id) {
  document.getElementById('trackInp').value = id;
  goPage('track');
  setTimeout(doTrack, 350);
}

// ── Init ───────────────────────────────────────────────────────
buildWave();
renderDash();