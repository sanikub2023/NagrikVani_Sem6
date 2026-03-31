/**
 * frontend/js/speech.js  (SIMPLIFIED — Web Speech API for all languages)
 *
 * Goes back to using browser Web Speech API for ALL languages.
 * Much simpler, more reliable, works perfectly for Hindi and Marathi.
 *
 * Flow:
 *   User speaks in Hindi/Marathi
 *   → Web Speech API gives Hindi/Marathi TEXT (not audio)
 *   → Text sent to backend /api/translate
 *   → MyMemory free API translates to English
 *   → English text goes into NLP → categorization → database
 */

const SpeechHandler = (() => {

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognition    = null;
  let isListening    = false;
  let fullTranscript = '';
  let autoStopTimer  = null;

  let _onTranscript = null;
  let _onEnd        = null;
  let _onError      = null;

  function isSupported() {
    return !!SpeechRec;
  }

  function start(langCode, onTranscript, onEnd, onError) {
    if (!isSupported()) {
      if (onError) onError('Speech recognition not supported. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    _onTranscript  = onTranscript;
    _onEnd         = onEnd;
    _onError       = onError;
    fullTranscript = '';
    isListening    = true;

    recognition               = new SpeechRec();
    recognition.lang          = langCode || 'en-IN';
    recognition.continuous    = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log(`[Speech] Started listening in: ${langCode}`);
    };

    recognition.onresult = (event) => {
      let interim = '';
      fullTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const displayed = (fullTranscript + interim).trim();
      if (_onTranscript) _onTranscript(displayed, fullTranscript.trim());

      // Auto stop after 2.5 seconds of silence
      clearTimeout(autoStopTimer);
      if (fullTranscript.trim().length > 10) {
        autoStopTimer = setTimeout(() => {
          console.log('[Speech] Silence detected — auto stopping.');
          stop();
        }, 2500);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      let message = 'Speech error: ' + event.error;
      if (event.error === 'not-allowed') {
        message = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      } else if (event.error === 'network') {
        message = 'Network error. Please check your internet connection.';
      } else if (event.error === 'language-not-supported') {
        message = 'This language is not supported by your browser. Try switching to English.';
      }
      if (_onError) _onError(message);
      stop();
    };

    // Auto restart if browser stops (continuous mode)
    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch (e) {}
      }
    };

    recognition.start();
  }

  function stop() {
    isListening = false;
    clearTimeout(autoStopTimer);

    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }

    if (_onEnd) _onEnd(fullTranscript.trim());
  }

  function reset() {
    stop();
    fullTranscript = '';
    recognition    = null;
  }

  return { start, stop, reset, isSupported };

})();

window.SpeechHandler = SpeechHandler;