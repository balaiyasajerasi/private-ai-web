/* ==============================
   AUDIO ENGINE
============================== */
const SFX = (() => {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function tone(freq, vol, dur, toFreq) {
    if (!enabled) return;
    try {
      const c = ac();
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur + 0.01);
    } catch (_) {}
  }

  return {
    hover()     { tone(900,  0.028, 0.065, 1060); },
    open()      { tone(1080, 0.06,  0.13,  560); },
    shortcut()  { tone(680,  0.07,  0.09,  920); },
    toggleOn()  { tone(430, 0.05, 0.09); setTimeout(() => tone(650, 0.05, 0.09), 90); },
    toggleOff() { tone(650, 0.05, 0.09); setTimeout(() => tone(430, 0.05, 0.09), 90); },
    get on()    { return enabled; },
    set(v)      { enabled = !!v; }
  };
})();

/* ==============================
   TOAST
============================== */
let _tt;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('show'), 2000);
}

/* ==============================
   SOUND BUTTON
============================== */
function initSoundBtn(defaultOn) {
  SFX.set(defaultOn);
  const btn = document.getElementById('btnSound');

  function sync() {
    btn.textContent = SFX.on ? '♪' : '♩';
    btn.classList.toggle('muted', !SFX.on);
    btn.title = SFX.on ? 'Sound on' : 'Sound off';
  }
  sync();

  btn.addEventListener('click', () => {
    SFX.set(!SFX.on);
    SFX.on ? SFX.toggleOn() : SFX.toggleOff();
    sync();
    toast(SFX.on ? '🔊 Sound on' : '🔇 Sound off');
  });
}

/* ==============================
   BUILD LIST
============================== */
function buildList(ais) {
  const list = document.getElementById('aiList');
  list.innerHTML = '';

  // Cek duplikat shortcut
  const seen = {};
  ais.forEach(ai => {
    const k = (ai.shortcut || '').toUpperCase();
    if (!k) return;
    if (seen[k]) {
      console.warn(`[AI Hub] Shortcut '${k}' duplikat: '${ai.name}' vs '${seen[k]}' — dinonaktifkan untuk '${ai.name}'`);
      ai._noShortcut = true;
    } else {
      seen[k] = ai.name;
    }
  });

  ais.forEach((ai, i) => {
    const a = document.createElement('a');
    a.className = 'ai-row';
    a.href = ai.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.dataset.id = ai.id;
    a.style.setProperty('--row-accent', ai.accent || '#888888');
    a.style.animationDelay = `${i * 0.06}s`;

    const kbdHtml = (ai.shortcut && !ai._noShortcut)
      ? `<span class="row-kbd">${ai.shortcut.toUpperCase()}</span>` : '';
    const tagHtml = ai.tag
      ? `<span class="row-tag">${ai.tag}</span>` : '';

    a.innerHTML = `
      <div class="row-icon">
        <img src="${ai.image}" alt="${ai.name}" loading="lazy"
             onerror="this.style.visibility='hidden'" />
      </div>
      <div class="row-body">
        <div class="row-name-line">
          <span class="row-name">${ai.name}</span>
          <span class="row-maker">${ai.maker}</span>
        </div>
        <div class="row-desc">${ai.description || ''}</div>
      </div>
      <div class="row-right">
        ${kbdHtml}
        ${tagHtml}
      </div>
    `;

    // Hover SFX (throttled)
    let lastHov = 0;
    a.addEventListener('mouseenter', () => {
      const now = Date.now();
      if (now - lastHov > 130) { SFX.hover(); lastHov = now; }
    });

    // Click SFX
    a.addEventListener('click', () => {
      SFX.open();
      toast(`Membuka ${ai.name}…`);
    });

    list.appendChild(a);
  });

  // Keyboard shortcuts
  const map = {};
  ais.forEach(ai => {
    const k = (ai.shortcut || '').toUpperCase();
    if (k && !ai._noShortcut) map[k] = ai;
  });

  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const key = e.key.toUpperCase();
    if (!map[key]) return;
    e.preventDefault();

    const ai = map[key];
    const row = document.querySelector(`.ai-row[data-id="${ai.id}"]`);
    if (row) {
      row.classList.add('flash');
      setTimeout(() => row.classList.remove('flash'), 380);
    }

    SFX.shortcut();
    toast(`Membuka ${ai.name}… [${key}]`);
    setTimeout(() => window.open(ai.url, '_blank', 'noopener,noreferrer'), 130);
  });
}

/* ==============================
   INIT
============================== */
fetch('config.json')
  .then(r => { if (!r.ok) throw new Error(); return r.json(); })
  .then(cfg => {
    const app = cfg.app || {};
    document.title = app.title || 'AI Hub';
    const titleEl = document.getElementById('siteTitle');
    if (titleEl) titleEl.textContent = app.title || 'AI Hub';

    initSoundBtn(app.sound !== false);
    buildList(cfg.ais || []);
  })
  .catch(() => {
    document.getElementById('aiList').innerHTML =
      '<p style="color:#aeaeb2;padding:32px 0;font-size:0.9rem">Gagal load config.json.</p>';
  });
