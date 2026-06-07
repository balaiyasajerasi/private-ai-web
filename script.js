// ===== AUDIO ENGINE =====
const Audio = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function play(type, ...args) {
    if (!enabled) return;
    try { sounds[type](...args); } catch(e) {}
  }

  const sounds = {
    hover() {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(880, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(1100, c.currentTime + 0.06);
      g.gain.setValueAtTime(0.04, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
      o.start(); o.stop(c.currentTime + 0.08);
    },
    click() {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(1200, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.12);
      g.gain.setValueAtTime(0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14);
      o.start(); o.stop(c.currentTime + 0.14);
    },
    toggle(on) {
      const c = getCtx();
      const freqs = on ? [440, 660] : [660, 440];
      freqs.forEach((f, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sine';
        o.frequency.value = f;
        const t = c.currentTime + i * 0.08;
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.start(t); o.stop(t + 0.1);
      });
    }
  };

  return { play, get enabled() { return enabled; }, setEnabled(v) { enabled = v; } };
})();

// ===== TOAST =====
function showToast(msg, duration = 2000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

// ===== SOUND BTN =====
function initSoundBtn(soundEnabled) {
  const btn = document.getElementById('soundBtn');
  const icon = document.getElementById('soundIcon');

  const iconOn = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`;
  const iconOff = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;

  function updateIcon() {
    icon.innerHTML = Audio.enabled ? iconOn : iconOff;
    btn.title = Audio.enabled ? 'Sound On' : 'Sound Off';
    btn.style.color = Audio.enabled ? '' : 'rgba(240,240,240,0.3)';
  }

  Audio.setEnabled(soundEnabled);
  updateIcon();

  btn.addEventListener('click', () => {
    Audio.setEnabled(!Audio.enabled);
    Audio.play('toggle', Audio.enabled);
    updateIcon();
    showToast(Audio.enabled ? '🔊 Sound on' : '🔇 Sound off');
  });
}

// ===== RENDER CARDS =====
function renderCards(ais) {
  const grid = document.getElementById('aiGrid');
  grid.innerHTML = '';

  ais.forEach((ai, i) => {
    const a = document.createElement('a');
    a.className = 'ai-card';
    a.href = ai.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.setProperty('--card-accent', ai.accent || '#fff');
    a.style.animationDelay = `${i * 0.07}s`;

    a.innerHTML = `
      <div class="card-top">
        <div class="card-img-wrap">
          <img src="${ai.image}" alt="${ai.name}" loading="lazy" onerror="this.style.display='none'"/>
        </div>
        <div class="card-info">
          <div class="card-name">${ai.name}</div>
          <div class="card-maker">${ai.maker}</div>
        </div>
      </div>
      <div class="card-desc">${ai.description}</div>
      <div class="card-footer">
        <span class="card-link-label">Buka AI</span>
        <span class="card-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
          </svg>
        </span>
      </div>
      <div class="accent-bar"></div>
    `;

    // hover sound (throttled)
    let lastHover = 0;
    a.addEventListener('mouseenter', () => {
      const now = Date.now();
      if (now - lastHover > 120) { Audio.play('hover'); lastHover = now; }
    });

    a.addEventListener('click', (e) => {
      Audio.play('click');
      showToast(`Membuka ${ai.name}…`);
    });

    grid.appendChild(a);
  });
}

// ===== INIT =====
fetch('config.json')
  .then(r => r.json())
  .then(cfg => {
    const app = cfg.app || {};
    const ais = cfg.ais || [];

    // meta
    document.title = app.title || "AI Hub";
    document.getElementById('appTitle').textContent = app.title || 'AI Hub';
    document.getElementById('heroTitle').innerHTML =
      `${app.owner || 'My'}'s<br/><em>AI Hub</em>`;
    document.getElementById('heroSub').textContent = app.subtitle || 'Portal pribadi ke semua AI';
    document.getElementById('ownerTag').textContent = `— ${app.owner || 'Andra'}`;
    document.getElementById('year').textContent = new Date().getFullYear();

    initSoundBtn(app.sound !== false);
    renderCards(ais);
  })
  .catch(err => {
    console.error('Gagal load config.json:', err);
    document.getElementById('aiGrid').innerHTML =
      '<p style="color:rgba(255,255,255,0.3);padding:40px;grid-column:1/-1">Gagal memuat config.json.</p>';
  });
