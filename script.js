/* ==============================
   AUDIO
============================== */
const SFX = (() => {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function beep(freq, vol, dur, endFreq) {
    if (!enabled) return;
    try {
      const c = ac();
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur + 0.01);
    } catch (_) {}
  }

  return {
    hover()    { beep(880, 0.03, 0.06, 1020); },
    open()     { beep(1050, 0.06, 0.14, 580); },
    shortcut() { beep(660, 0.08, 0.09, 880); },
    toggleOn()  { beep(420, 0.05, 0.09); setTimeout(() => beep(630, 0.05, 0.09), 95); },
    toggleOff() { beep(630, 0.05, 0.09); setTimeout(() => beep(420, 0.05, 0.09), 95); },
    get on() { return enabled; },
    set(v)   { enabled = !!v; }
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

  // Validasi: pastiin shortcut unik semua
  const seen = {};
  ais.forEach(ai => {
    const k = (ai.shortcut || '').toUpperCase();
    if (k) {
      if (seen[k]) {
        console.warn(`[AI Hub] Shortcut '${k}' duplikat di '${ai.name}' dan '${seen[k]}' — shortcut dinonaktifkan untuk '${ai.name}'`);
        ai._shortcutDisabled = true;
      } else {
        seen[k] = ai.name;
      }
    }
  });

  ais.forEach((ai, i) => {
    const a = document.createElement('a');
    a.className = 'ai-row';
    a.href = ai.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.dataset.id = ai.id;
    a.style.setProperty('--row-accent', ai.accent || '#888');
    a.style.animationDelay = `${i * 0.055}s`;

    const kbd = ai.shortcut && !ai._shortcutDisabled
      ? `<span class="row-kbd">${ai.shortcut.toUpperCase()}</span>` : '';

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
        ${kbd}
        ${ai.tag ? `<span class="row-tag">${ai.tag}</span>` : ''}
      </div>
    `;

    // hover sfx
    let lastHover = 0;
    a.addEventListener('mouseenter', () => {
      const now = Date.now();
      if (now - lastHover > 120) { SFX.hover(); lastHover = now; }
    });

    // click sfx
    a.addEventListener('click', () => {
      SFX.open();
      toast(`Membuka ${ai.name}…`);
    });

    list.appendChild(a);
  });

  // Register keyboard shortcuts
  const shortcutMap = {};
  ais.forEach(ai => {
    const k = (ai.shortcut || '').toUpperCase();
    if (k && !ai._shortcutDisabled) shortcutMap[k] = ai;
  });

  document.addEventListener('keydown', e => {
    // Abaikan kalau lagi di input field
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) return;

    const key = e.key.toUpperCase();
    if (!shortcutMap[key]) return;

    e.preventDefault();
    const ai = shortcutMap[key];

    // Flash visual
    const row = document.querySelector(`.ai-row[data-id="${ai.id}"]`);
    if (row) {
      row.classList.add('flash');
      setTimeout(() => row.classList.remove('flash'), 350);
    }

    SFX.shortcut();
    toast(`Membuka ${ai.name}… (${key})`);
    setTimeout(() => window.open(ai.url, '_blank', 'noopener,noreferrer'), 120);
  });
}

/* ==============================
   INIT
============================== */
fetch('config.json')
  .then(r => {
    if (!r.ok) throw new Error('fetch fail');
    return r.json();
  })
  .then(cfg => {
    const app = cfg.app || {};
    document.title = app.title || 'AI Hub';
    const el = document.getElementById('siteTitle');
    if (el) el.textContent = app.title || 'AI Hub';
    document.getElementById('btnSound').parentElement;

    initSoundBtn(app.sound !== false);
    buildList(cfg.ais || []);
  })
  .catch(err => {
    console.error(err);
    document.getElementById('aiList').innerHTML =
      '<p style="color:#999;padding:32px 0;font-size:0.85rem">Gagal load config.json.</p>';
  });
