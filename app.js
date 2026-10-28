// TypeWave: a small typing-practice SPA in plain JavaScript (no framework, no build step).
//
// How the file is organised (read it top to bottom):
//   1. Storage   - save/load small things in the browser (localStorage)
//   2. Language  - detect the browser language
//   3. Keyboard  - the on-screen keyboard (lights up the next key, flashes green/red)
//   4. Views     - the three "pages": home, levels, typing
//   5. Router    - looks at the URL (#/...) and draws the right page
//   6. Start     - theme + first render

(function () {
  'use strict';

  const app = document.getElementById('app');
  const PASS_ACCURACY = 90; // % needed to complete a level
  const MIN_HEAT_SAMPLES = 3; // a key needs this many attempts before it shows on the heatmap

  // ---------------------------------------------------------------
  // 1. Storage
  // Everything is saved under the "typewave:" prefix. The try/catch
  // protects us when the browser blocks storage (private mode, etc.).
  // To move to a real database later (e.g. Supabase), you only have
  // to change the functions in this section.
  // ---------------------------------------------------------------
  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem('typewave:' + key);
        return value === null ? fallback : JSON.parse(value);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('typewave:' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }
  };

  // Progress looks like: { en: { 1: {wpm: 32, acc: 97}, 2: {...} }, it: {...} }
  function getProgress(lang) {
    return store.get('progress', {})[lang] || {};
  }
  function saveResult(lang, levelId, wpm, acc) {
    const all = store.get('progress', {});
    const langProgress = all[lang] || {};
    const old = langProgress[levelId] || { wpm: 0, acc: 0 };
    langProgress[levelId] = { wpm: Math.max(old.wpm, wpm), acc: Math.max(old.acc, acc) };
    all[lang] = langProgress;
    store.set('progress', all);
  }
  function resetProgress(lang) {
    const all = store.get('progress', {});
    delete all[lang];
    store.set('progress', all);
  }

  // Per-key statistics for the heatmap: { a: {h: 120, m: 7}, ... }
  // h = how many times the key was needed, m = how many times it was missed.
  function getKeyStats() { return store.get('keystats', {}); }
  function addKeyStats(tally) {
    const all = getKeyStats();
    Object.keys(tally).forEach((id) => {
      const old = all[id] || { h: 0, m: 0 };
      all[id] = { h: old.h + tally[id].h, m: old.m + tally[id].m };
    });
    store.set('keystats', all);
  }
  function resetKeyStats() { store.set('keystats', {}); }

  // A level counts as "unlocked" if it is the first one or the previous level
  // has been completed. Locked levels only LOOK different: they can still be opened.
  function isUnlocked(lang, index) {
    if (index === 0) return true;
    const previous = window.CONTENT[lang].levels[index - 1];
    return Boolean(getProgress(lang)[previous.id]);
  }

  // ---------------------------------------------------------------
  // Sound: tiny beeps made by the browser itself (no audio files needed).
  // Right key = short light click. Wrong key = lower, heavier thud.
  // Sound can be switched on/off with the button in the top bar.
  //
  // Later you can use real recorded sounds instead: replace the body of
  // playSound with  new Audio('sounds/' + (ok ? 'right' : 'wrong') + '.mp3').play();
  // ---------------------------------------------------------------
  let audioCtx = null;
  let noiseBuffer = null;
  function playSound(ok) {
    if (!store.get('sound', true)) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;

      // 1) The "click": a very short burst of noise, filtered so it sounds like plastic.
      if (!noiseBuffer) {
        noiseBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.1), audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      // Random variation (+-10%) so the sound is never exactly the same twice.
      filter.frequency.value = (ok ? 2400 : 800) * (0.9 + Math.random() * 0.2);
      filter.Q.value = 1.1;
      const clickGain = audioCtx.createGain();
      clickGain.gain.setValueAtTime(ok ? 0.45 : 0.5, t);          // volume of the click
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + (ok ? 0.035 : 0.1));
      noise.connect(filter);
      filter.connect(clickGain);
      clickGain.connect(audioCtx.destination);
      noise.start(t);
      noise.stop(t + 0.1);

      // 2) The "thump": a quick low note that drops in pitch, like the key hitting the base.
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime((ok ? 170 : 110) * (0.95 + Math.random() * 0.1), t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.06);
      const thumpGain = audioCtx.createGain();
      thumpGain.gain.setValueAtTime(ok ? 0.25 : 0.35, t);         // volume of the thump
      thumpGain.gain.exponentialRampToValueAtTime(0.001, t + (ok ? 0.06 : 0.14));
      osc.connect(thumpGain);
      thumpGain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) { /* no sound available: ignore */ }
  }

  // ---------------------------------------------------------------
  // 2. Language
  // Order of priority: the language the person chose before,
  // then the browser language, then English.
  // ---------------------------------------------------------------
  function detectLanguage() {
    const saved = store.get('lang', null);
    if (saved && window.CONTENT[saved]) return saved;

    const preferences = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
    for (const pref of preferences) {
      const code = String(pref).slice(0, 2).toLowerCase(); // "it-IT" -> "it"
      if (window.CONTENT[code]) return code;
    }
    return 'en';
  }

  // Makes text safe to put inside HTML.
  function esc(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(text).replace(/[&<>"']/g, (c) => map[c]);
  }

  // ---------------------------------------------------------------
  // 3. On-screen keyboard
  // Each row is a list of [normal, shifted] pairs.
  // CHAR_MAP answers: "to type this character, which key (and Shift?)"
  // ---------------------------------------------------------------
  const letters = (str) => str.split('').map((c) => [c, c.toUpperCase()]);
  const ROWS = [
    [['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+']],
    [...letters('qwertyuiop'), ['[', '{'], [']', '}']],
    [...letters('asdfghjkl'), [';', ':'], ["'", '"']],
    [...letters('zxcvbnm'), [',', '<'], ['.', '>'], ['/', '?']]
  ];

  const CHAR_MAP = {};
  ROWS.forEach((row) => row.forEach(([base, shifted]) => {
    CHAR_MAP[base] = { id: base, shift: false };
    CHAR_MAP[shifted] = { id: base, shift: true };
  }));
  CHAR_MAP[' '] = { id: 'space', shift: false };

  function buildKeyboard(container) {
    const els = {};      // key id -> DOM element
    let lit = [];        // keys currently highlighted as "next"

    function makeKey(id, label, extraClass) {
      const el = document.createElement('div');
      el.className = 'key' + (extraClass ? ' ' + extraClass : '');
      el.textContent = label;
      els[id] = el;
      return el;
    }

    ROWS.forEach((row, r) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'krow';
      if (r === 3) rowEl.appendChild(makeKey('shiftL', 'Shift', 'wide'));
      row.forEach(([base]) => {
        const label = /[a-z]/.test(base) ? base.toUpperCase() : base;
        rowEl.appendChild(makeKey(base, label));
      });
      if (r === 3) rowEl.appendChild(makeKey('shiftR', 'Shift', 'wide'));
      container.appendChild(rowEl);
    });

    const spaceRow = document.createElement('div');
    spaceRow.className = 'krow';
    spaceRow.appendChild(makeKey('space', '', 'space'));
    container.appendChild(spaceRow);

    return {
      // Outline the key (and Shift) that must be pressed next.
      highlight(ch) {
        lit.forEach((el) => el.classList.remove('next'));
        lit = [];
        const info = CHAR_MAP[ch];
        if (!info) return;
        lit.push(els[info.id]);
        if (info.shift) lit.push(els.shiftL, els.shiftR);
        lit.forEach((el) => el.classList.add('next'));
      },
      // Flash the key that was just pressed: green if right, red if wrong.
      flash(ch, ok) {
        const info = CHAR_MAP[ch];
        if (!info) return;
        const el = els[info.id];
        const cls = ok ? 'ok' : 'bad';
        el.classList.add(cls);
        setTimeout(() => el.classList.remove(cls), 150);
      },
      // Heatmap: color every key by how often it was missed.
      // Green = no mistakes yet, red = missed often.
      heat(stats) {
        Object.keys(els).forEach((id) => {
          const el = els[id];
          const s = stats[id];
          el.style.background = '';
          el.style.color = '';
          el.title = '';
          if (!s || s.h < MIN_HEAT_SAMPLES) return;
          el.title = s.m + ' / ' + s.h;
          if (s.m === 0) {
            el.style.background = 'color-mix(in srgb, var(--good) 35%, var(--key))';
          } else {
            const pct = Math.round(25 + Math.min(s.m / s.h / 0.3, 1) * 65);
            el.style.background = 'color-mix(in srgb, var(--bad) ' + pct + '%, var(--key))';
            el.style.color = '#fff';
          }
        });
      }
    };
  }

  // ---------------------------------------------------------------
  // 4. Views. Each one fills <main id="app"> with HTML.
  // ---------------------------------------------------------------

  // --- Page 1: choose a language ---
  function viewHome() {
    const suggested = detectLanguage();
    const ui = window.CONTENT[suggested].ui;
    const codes = Object.keys(window.CONTENT).sort((a, b) =>
      a === suggested ? -1 : b === suggested ? 1 : 0);

    const cards = codes.map((code) => {
      const c = window.CONTENT[code];
      const isSuggested = code === suggested;
      return `
        <a class="card ${isSuggested ? 'suggested' : ''}" href="#/lang/${code}">
          ${isSuggested ? `<span class="badge">${ui.suggested}</span>` : ''}
          <div class="lang-name">${esc(c.nativeName)}</div>
          <div class="muted">${c.levels.length} ${esc(c.ui.levels.toLowerCase())}</div>
        </a>`;
    }).join('');

    app.innerHTML = `
      <h1>${ui.chooseLanguage}</h1>
      <p class="muted">${ui.chooseHint}</p>
      <div class="grid">${cards}</div>`;
  }

  // --- Page 2: the level map ---
  function viewLevels(lang) {
    store.set('lang', lang); // remember the choice
    const C = window.CONTENT[lang];
    const ui = C.ui;
    const progress = getProgress(lang);
    const done = C.levels.filter((l) => progress[l.id]).length;

    const cards = C.levels.map((level, i) => {
      const p = progress[level.id];
      if (!isUnlocked(lang, i)) {
        // Looks locked, but is still a link: experienced typists can jump in.
        return `
          <a class="card locked" href="#/lang/${lang}/${level.id}">
            <div class="level-num">🔒 ${level.id}</div>
            <div class="level-title">${esc(level.title)}</div>
            <div class="muted">${ui.locked}</div>
          </a>`;
      }
      return `
        <a class="card ${p ? 'done' : ''}" href="#/lang/${lang}/${level.id}">
          <div class="level-num">${p ? '✓ ' : ''}${level.id}</div>
          <div class="level-title">${esc(level.title)}</div>
          <div class="muted">${esc(level.focus)}</div>
          ${p ? `<div class="muted">${ui.best}: ${p.wpm} ${ui.wpm}</div>` : ''}
        </a>`;
    }).join('');

    app.innerHTML = `
      <a class="back" href="#/">${ui.back}</a>
      <h1>${esc(C.nativeName)}: ${ui.levels}</h1>
      <p class="muted">${done} / ${C.levels.length}</p>
      <div class="grid">${cards}</div>
      <section class="heatmap">
        <h2>${ui.heatmapTitle}</h2>
        <p class="muted" id="weak"></p>
        <div class="keyboard" id="heat-kb"></div>
        <div class="toolbar">
          <button class="btn ghost" id="reset">${ui.resetProgress}</button>
          <button class="btn ghost" id="reset-heat">${ui.heatmapReset}</button>
        </div>
      </section>`;

    // Heatmap: color the keyboard and list the 5 worst keys.
    const stats = getKeyStats();
    buildKeyboard(document.getElementById('heat-kb')).heat(stats);
    const weak = Object.keys(stats)
      .filter((id) => stats[id].h >= MIN_HEAT_SAMPLES && stats[id].m > 0)
      .sort((a, b) => stats[b].m / stats[b].h - stats[a].m / stats[a].h)
      .slice(0, 5)
      .map((id) => (id === 'space' ? 'space' : id.toUpperCase()) + ' ' + Math.round((stats[id].m / stats[id].h) * 100) + '%');
    document.getElementById('weak').textContent =
      weak.length ? ui.weakKeys + ' ' + weak.join(' · ') : ui.heatmapEmpty;

    document.getElementById('reset-heat').addEventListener('click', () => {
      resetKeyStats();
      viewLevels(lang);
    });
    document.getElementById('reset').addEventListener('click', () => {
      if (confirm(ui.resetConfirm)) {
        resetProgress(lang);
        viewLevels(lang);
      }
    });
  }

  // --- Page 3: the typing screen ---
  // Returns a cleanup function; the router calls it when we leave the page.
  function viewTyping(lang, levelId) {
    const C = window.CONTENT[lang];
    const ui = C.ui;
    const index = C.levels.findIndex((l) => l.id === levelId);
    if (index === -1) {
      location.hash = '#/lang/' + lang;
      return null;
    }
    const level = C.levels[index];
    const best = getProgress(lang)[level.id];

    app.innerHTML = `
      <a class="back" href="#/lang/${lang}">${ui.back}</a>
      <h1>${level.id} · ${esc(level.title)}</h1>
      <div class="muted">${esc(level.focus)}</div>
      <div class="stats">
        <div class="stat"><b id="s-wpm">0</b><span>${ui.wpm}</span></div>
        <div class="stat"><b id="s-acc">100%</b><span>${ui.accuracy}</span></div>
        <div class="stat"><b>${best ? best.wpm : '–'}</b><span>${ui.best}</span></div>
      </div>
      <div class="progress"><div id="bar"></div></div>
      <div class="text-box" id="text"></div>
      <div class="hint" id="hint">${ui.startTyping}</div>
      <div class="keyboard" id="kb"></div>
      <div id="result"></div>`;

    const $ = (id) => document.getElementById(id);
    const chars = Array.from(level.text);          // the characters to type
    const states = chars.map(() => '');            // '' | 'correct' | 'wrong'
    let pos = 0;                                   // index of the next character
    let startTime = 0;                             // set on the first keypress
    let keys = 0, errors = 0;                      // for accuracy
    let finished = false;
    let timer = null;
    const tally = {};                              // per-key counts for the heatmap

    // One <span> per character, so each one can have its own color.
    const spans = chars.map((ch) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      $('text').appendChild(span);
      return span;
    });
    const keyboard = buildKeyboard($('kb'));

    function paint(i) {
      if (i < 0 || i >= chars.length) return;
      spans[i].className = 'ch ' + states[i] + (i === pos && !finished ? ' current' : '');
    }

    function stats() {
      // WPM = (correct characters / 5) / minutes. At least 1 second, to avoid silly numbers.
      const minutes = Math.max((Date.now() - startTime) / 60000, 1 / 60);
      const correct = states.filter((s) => s === 'correct').length;
      return {
        wpm: startTime ? Math.round(correct / 5 / minutes) : 0,
        acc: keys ? Math.round(((keys - errors) / keys) * 100) : 100
      };
    }

    function showStats() {
      const s = stats();
      $('s-wpm').textContent = s.wpm;
      $('s-acc').textContent = s.acc + '%';
      $('bar').style.width = (pos / chars.length) * 100 + '%';
    }

    function finish() {
      finished = true;
      clearInterval(timer);
      paint(pos - 1);
      showStats();
      const s = stats();
      const pass = s.acc >= PASS_ACCURACY;
      addKeyStats(tally);
      if (pass) saveResult(lang, level.id, s.wpm, s.acc);
      const next = C.levels[index + 1];

      $('result').innerHTML = `
        <div class="result ${pass ? 'pass' : 'fail'}">
          <h2>${pass ? ui.passed : ui.failed}</h2>
          <div>${s.wpm} ${ui.wpm} · ${s.acc}% ${ui.accuracy.toLowerCase()}</div>
          ${pass ? '' : `<div class="muted">${ui.needAccuracy.replace('{n}', PASS_ACCURACY)}</div>`}
          <div class="actions">
            <button class="btn ghost" id="retry">${ui.retry}</button>
            ${pass
              ? (next
                  ? `<a class="btn" href="#/lang/${lang}/${next.id}">${ui.next}</a>`
                  : `<a class="btn" href="#/lang/${lang}">${ui.levels}</a>`)
              : ''}
          </div>
        </div>`;
      $('retry').addEventListener('click', route);
    }

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
      if (e.key === 'Escape') { route(); return; }    // restart the level
      if (finished) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (pos > 0) {
          const old = pos;
          pos--;
          states[pos] = '';
          paint(old);
          paint(pos);
          keyboard.highlight(chars[pos]);
          showStats();
        }
        return;
      }

      if (e.key.length !== 1) return; // ignore Shift, Enter, arrows, etc.
      e.preventDefault();             // stops Space from scrolling the page

      if (!startTime) {               // the clock starts at the first key
        startTime = Date.now();
        timer = setInterval(showStats, 250);
        $('hint').textContent = '';
      }

      const ok = e.key === chars[pos];
      const info = CHAR_MAP[chars[pos]];             // which key was needed?
      if (info) {
        tally[info.id] = tally[info.id] || { h: 0, m: 0 };
        tally[info.id].h++;
        if (!ok) tally[info.id].m++;
      }
      keys++;
      if (!ok) errors++;
      states[pos] = ok ? 'correct' : 'wrong';
      keyboard.flash(e.key, ok);
      playSound(ok);

      pos++;
      paint(pos - 1);
      paint(pos);
      keyboard.highlight(chars[pos]);
      showStats();
      if (pos === chars.length) finish();
    }

    document.addEventListener('keydown', onKey);
    paint(0);
    keyboard.highlight(chars[0]);

    return function cleanup() {
      document.removeEventListener('keydown', onKey);
      clearInterval(timer);
    };
  }

  // ---------------------------------------------------------------
  // 5. Router
  // The URL after the # decides the page:
  //   #/                -> home
  //   #/lang/en         -> level map for English
  //   #/lang/en/3       -> typing screen, level 3
  // ---------------------------------------------------------------
  let cleanup = null;

  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

    if (parts[0] === 'lang' && window.CONTENT[parts[1]]) {
      if (parts[2]) {
        cleanup = viewTyping(parts[1], Number(parts[2]));
      } else {
        viewLevels(parts[1]);
      }
      return;
    }
    viewHome();
  }

  window.addEventListener('hashchange', route);

  // ---------------------------------------------------------------
  // 6. Start: restore the theme, then draw the first page
  // ---------------------------------------------------------------
  const themeSelect = document.getElementById('theme');
  let theme = store.get('theme', 'dark');
  if (!Array.from(themeSelect.options).some((o) => o.value === theme)) theme = 'dark';
  document.documentElement.dataset.theme = theme;
  themeSelect.value = theme;
  themeSelect.addEventListener('change', () => {
    document.documentElement.dataset.theme = themeSelect.value;
    store.set('theme', themeSelect.value);
  });

  // Sound on/off button
  const soundBtn = document.getElementById('sound');
  const showSound = () => { soundBtn.textContent = store.get('sound', true) ? '🔊' : '🔇'; };
  soundBtn.addEventListener('click', () => {
    store.set('sound', !store.get('sound', true));
    showSound();
    soundBtn.blur();   // so that Space/Enter keep going to the typing screen
  });
  showSound();

  route();
})();
