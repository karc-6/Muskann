/* ============================================================
   0. CONFIG
   ============================================================ */
const BIRTHDAY_MONTH = 9;   // September
const BIRTHDAY_DAY   = 8;

const WISHES = [
  "That time you made me laugh so hard I couldn't breathe.",
  "You always remember the small stuff. That's rare.",
  "Thank you for being my personal hype committee.",
  "You've got the kind of honesty I actually trust.",
  "Every plan is better when you're in it.",
  "You make ordinary days feel like an event.",
  "I'm genuinely lucky to have you as a friend.",
  "Here's to more chaos, more inside jokes, more us."
];

// positions in an 800x500 canvas — the first 5 trace an "M"
const STAR_POINTS = [
  { x: 110, y: 430 },
  { x: 110, y: 90 },
  { x: 400, y: 380 },
  { x: 690, y: 90 },
  { x: 690, y: 430 },
  { x: 260, y: 200 },
  { x: 540, y: 250 },
  { x: 400, y: 60 }
];
const CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4]];

/* ============================================================
   1. SIGNATURE GATE — she has to sign/trace her name to open
   ============================================================ */
(function signatureGate() {
  const gate = document.getElementById("gate");
  const canvas = document.getElementById("gate-canvas");
  const ctx = canvas.getContext("2d");
  const ghost = document.getElementById("gate-ghost");
  const hint = document.getElementById("gate-hint");
  const clearBtn = document.getElementById("gate-clear");
  const site = document.getElementById("site");
  const body = document.body;

  const MIN_LENGTH = 480;
  const MIN_SPREAD = 0.45;

  let drawing = false;
  let unlocked = false;
  let lastPoint = null;
  let minX = Infinity, maxX = -Infinity, totalLength = 0;
  let hintTimer = null;

  function setupCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = "#e6c17c";
  }

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function scheduleHint() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { if (!unlocked) hint.classList.add("show"); }, 4500);
  }

  function startStroke(e) {
    if (unlocked) return;
    drawing = true;
    const p = pointFromEvent(e);
    lastPoint = p;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    clearTimeout(hintTimer);
    hint.classList.remove("show");
  }

  function moveStroke(e) {
    if (!drawing || unlocked) return;
    const p = pointFromEvent(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    totalLength += Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    lastPoint = p;

    const progress = Math.min(1, totalLength / MIN_LENGTH);
    ghost.style.opacity = (0.15 + progress * 0.35).toFixed(2);
  }

  function endStroke() {
    if (!drawing) return;
    drawing = false;
    checkUnlock();
    scheduleHint();
  }

  function checkUnlock() {
    if (unlocked) return;
    const wrapWidth = canvas.getBoundingClientRect().width;
    const spread = wrapWidth > 0 ? (maxX - minX) / wrapWidth : 0;
    if (totalLength >= MIN_LENGTH && spread >= MIN_SPREAD) openGate();
  }

  function openGate() {
    unlocked = true;
    clearTimeout(hintTimer);
    gate.classList.add("unlocked");
    body.classList.remove("locked");
    site.classList.add("revealed");
    MuskanSound.chimeUnlockGate();
    setTimeout(() => { gate.style.display = "none"; }, 1100);
  }

  function clearCanvas() {
    setupCanvas();
    minX = Infinity;
    maxX = -Infinity;
    totalLength = 0;
    ghost.style.opacity = "0.15";
    scheduleHint();
  }

  canvas.addEventListener("pointerdown", startStroke);
  canvas.addEventListener("pointermove", moveStroke);
  window.addEventListener("pointerup", endStroke);
  clearBtn.addEventListener("click", clearCanvas);
  window.addEventListener("resize", () => { if (!unlocked) setupCanvas(); });

  setupCanvas();
  scheduleHint();
})();

/* ============================================================
   2. AMBIENT SOUND — tiny synthesized chimes, no audio files
   ============================================================ */
const MuskanSound = (function () {
  let ctx = null;
  let muted = true;
  try { muted = localStorage.getItem("muskan-muted") !== "0"; } catch (e) { /* default muted */ }

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, { start = 0, duration = 0.4, type = "sine", peak = 0.05 } = {}) {
    if (muted) return;
    const audio = ensureCtx();
    if (!audio) return;
    const t0 = audio.currentTime + start;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function chimeFound() {
    tone(880, { duration: 0.35, type: "sine", peak: 0.05 });
    tone(1318.5, { start: 0.06, duration: 0.4, type: "sine", peak: 0.035 });
  }
  function chimeUnlock() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(f, { start: i * 0.09, duration: 0.6, type: "sine", peak: 0.04 });
    });
  }
  function chimeUnlockGate() {
    tone(659.25, { duration: 0.5, type: "sine", peak: 0.04 });
    tone(987.77, { start: 0.08, duration: 0.55, type: "sine", peak: 0.03 });
  }
  function chimeNote() {
    tone(720, { duration: 0.18, type: "triangle", peak: 0.045 });
  }
  function chimeWish() {
    tone(1046.5, { duration: 0.3, type: "sine", peak: 0.045 });
    tone(1568, { start: 0.05, duration: 0.35, type: "sine", peak: 0.035 });
  }
  function chimeSecret() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(f, { start: i * 0.08, duration: 0.5, type: "triangle", peak: 0.035 });
    });
  }
  function chimeDenied() {
    tone(220, { duration: 0.22, type: "sine", peak: 0.04 });
  }
  function chimeBloom() {
    tone(659.25, { duration: 0.35, type: "sine", peak: 0.03 });
    tone(987.77, { start: 0.09, duration: 0.4, type: "sine", peak: 0.022 });
  }

  function isMuted() { return muted; }
  function setMuted(value) {
    muted = value;
    try { localStorage.setItem("muskan-muted", muted ? "1" : "0"); } catch (e) { /* ignore */ }
  }
  function toggle() {
    setMuted(!muted);
    if (!muted) ensureCtx();
    return muted;
  }

  return { chimeFound, chimeUnlock, chimeUnlockGate, chimeNote, chimeWish, chimeSecret, chimeDenied, chimeBloom, isMuted, toggle };
})();

(function soundToggleUI() {
  const btn = document.getElementById("sound-toggle");
  if (!btn) return;
  function sync() {
    const muted = MuskanSound.isMuted();
    btn.classList.toggle("muted", muted);
    btn.setAttribute("aria-pressed", String(!muted));
  }
  btn.addEventListener("click", () => { MuskanSound.toggle(); sync(); });
  sync();
})();

/* ============================================================
   3. AMBIENT STARFIELD + SHOOTING STARS
   ============================================================ */
(function ambientSky() {
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  let w, h, stars, shootingStars = [];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.floor((w * h) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.005
    }));
  }

  function spawnShootingStar(originX, originY) {
    const goingRight = originX !== undefined ? true : Math.random() < 0.5;
    shootingStars.push({
      x: originX !== undefined ? originX : (goingRight ? Math.random() * w * 0.3 : w - Math.random() * w * 0.3),
      y: originY !== undefined ? originY : Math.random() * h * 0.35,
      vx: (goingRight ? 1 : -1) * (7 + Math.random() * 5),
      vy: 3.5 + Math.random() * 2.5,
      life: 1
    });
  }

  function maybeSpawnShootingStar() {
    if (reduceMotion) return;
    if (shootingStars.length < 3 && Math.random() < 0.018) spawnShootingStar();
  }

  function drawShootingStar(ss) {
    const tailX = ss.x - ss.vx * 13;
    const tailY = ss.y - ss.vy * 13;
    const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
    grad.addColorStop(0, "rgba(230,193,124,0)");
    grad.addColorStop(0.5, `rgba(230,193,124,${0.45 * ss.life})`);
    grad.addColorStop(1, `rgba(245,241,230,${ss.life})`);

    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(ss.x, ss.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ss.x, ss.y, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${ss.life})`;
    ctx.shadowColor = "rgba(230,193,124,0.95)";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.phase += s.speed;
      const twinkle = 0.4 + Math.sin(s.phase) * 0.35;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,241,230,${Math.max(0, twinkle)})`;
      ctx.fill();
    }

    maybeSpawnShootingStar();
    shootingStars.forEach(ss => {
      drawShootingStar(ss);
      ss.x += ss.vx;
      ss.y += ss.vy;
      if (ss.y > h * 0.55) ss.life -= 0.03;
    });
    shootingStars = shootingStars.filter(ss => ss.life > 0 && ss.x < w + 100 && ss.y < h + 100 && ss.x > -100);

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();

  window.MuskanSky = { spawnAt: (x, y) => spawnShootingStar(x, y) };
})();

/* ============================================================
   4. GALAXY — a more physically-styled spiral, with a glowing core,
   dust lanes tracing the arms, and star density/color/size that vary
   by distance from the center, the way a real galaxy actually reads
   ============================================================ */
(function galaxyOnScroll() {
  const canvas = document.getElementById("galaxy");
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportsBlur = (() => {
    try { return typeof ctx.filter !== "undefined"; } catch (e) { return false; }
  })();

  let w, h, cx, cy, maxRadius;
  let bulgeStars, armStars, dustCanvas, t = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    cx = w * 0.5;
    cy = h * 0.42;
    maxRadius = Math.min(w, h) * 0.55;
    buildGalaxy();
  }

  // warm at the core, cooling outward — loosely how real spiral galaxies
  // actually look (an old, yellow-white stellar bulge; younger, bluer
  // populations further out in the disc and arms)
  function colorForRadiusFraction(frac) {
    const stops = [
      { at: 0.00, c: [243, 218, 160] },  // warm core
      { at: 0.35, c: [230, 193, 124] },  // champagne
      { at: 0.65, c: [245, 241, 230] },  // starlight white
      { at: 1.00, c: [169, 155, 214] }   // cool lavender at the rim
    ];
    let a = stops[0], b = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (frac >= stops[i].at && frac <= stops[i + 1].at) { a = stops[i]; b = stops[i + 1]; break; }
    }
    const span = (b.at - a.at) || 1;
    const local = Math.min(1, Math.max(0, (frac - a.at) / span));
    const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * local);
    const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * local);
    const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * local);
    return `${r},${g},${bl}`;
  }

  function buildGalaxy() {
    const armCount = 4;
    const pointsPerArm = 170;

    // --- dense, warm central bulge ---
    bulgeStars = [];
    const bulgeCount = 220;
    for (let i = 0; i < bulgeCount; i++) {
      const rFrac = Math.pow(Math.random(), 1.8); // clustered toward the very center
      const radius = rFrac * maxRadius * 0.22;
      const angle = Math.random() * Math.PI * 2;
      bulgeStars.push({
        baseAngle: angle,
        radius,
        cx, cy,
        size: (1 - rFrac) * 1.6 + 0.5,
        color: colorForRadiusFraction(rFrac * 0.3),
        twinklePhase: Math.random() * Math.PI * 2,
        squash: 0.55
      });
    }

    // --- spiral arms: density thins and stars cool as radius grows ---
    armStars = [];
    for (let a = 0; a < armCount; a++) {
      const armOffset = (Math.PI * 2 * a) / armCount;
      for (let i = 0; i < pointsPerArm; i++) {
        const frac = i / pointsPerArm;
        const angle = armOffset + frac * Math.PI * 2.3;
        const radius = 0.18 * maxRadius + frac * maxRadius * 0.82;
        const spread = 10 + frac * 34; // arms widen further from the core
        const jitter = (Math.random() - 0.5) * spread;
        const isGiant = Math.random() < 0.035;
        armStars.push({
          baseAngle: angle,
          radius: radius + jitter,
          cx, cy,
          size: isGiant ? 2.4 + Math.random() * 1.3 : (1 - frac) * 1.4 + Math.random() * 1.1 + 0.3,
          glow: isGiant,
          color: colorForRadiusFraction(frac),
          twinklePhase: Math.random() * Math.PI * 2,
          squash: 0.55
        });
      }
    }

    // --- pre-render the soft, slow-changing layers (core glow, nebula
    // clouds, dust lanes) once into an offscreen canvas, so the blur
    // filter cost is paid a single time rather than every frame ---
    dustCanvas = document.createElement("canvas");
    dustCanvas.width = w;
    dustCanvas.height = h;
    const dctx = dustCanvas.getContext("2d");

    // soft glowing bulge/core
    if (supportsBlur) dctx.filter = "blur(22px)";
    const coreGrad = dctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.32);
    coreGrad.addColorStop(0, "rgba(243,218,160,0.5)");
    coreGrad.addColorStop(0.5, "rgba(230,193,124,0.22)");
    coreGrad.addColorStop(1, "rgba(230,193,124,0)");
    dctx.fillStyle = coreGrad;
    dctx.beginPath();
    dctx.arc(cx, cy, maxRadius * 0.32, 0, Math.PI * 2);
    dctx.fill();

    // nebula clouds strung along each arm — alternating warm and cool
    // patches, the way emission and reflection nebulae actually differ
    const nebulaColors = ["230,193,124", "169,155,214", "217,169,163", "245,241,230"];
    for (let a = 0; a < armCount; a++) {
      const armOffset = (Math.PI * 2 * a) / armCount;
      for (let i = 0; i < 7; i++) {
        const frac = 0.22 + (i / 6) * 0.68;
        const angle = armOffset + frac * Math.PI * 2.3;
        const radius = 0.18 * maxRadius + frac * maxRadius * 0.82;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.55;
        const r = maxRadius * (0.05 + Math.random() * 0.06);
        const color = nebulaColors[(a + i) % nebulaColors.length];
        const grad = dctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${color},0.14)`);
        grad.addColorStop(1, `rgba(${color},0)`);
        dctx.fillStyle = grad;
        dctx.beginPath();
        dctx.arc(x, y, r, 0, Math.PI * 2);
        dctx.fill();
      }
    }
    if (supportsBlur) dctx.filter = "none";

    // dust lanes: dark, low-opacity strokes tracing just inside each arm —
    // real spiral galaxies show these as silhouetted bands against the disc
    if (supportsBlur) dctx.filter = "blur(3px)";
    dctx.strokeStyle = "rgba(5,7,15,0.30)";
    dctx.lineWidth = Math.max(2, maxRadius * 0.012);
    dctx.lineCap = "round";
    for (let a = 0; a < armCount; a++) {
      const armOffset = (Math.PI * 2 * a) / armCount;
      dctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const frac = i / 40;
        const angle = armOffset + frac * Math.PI * 2.3 - 0.16;
        const radius = (0.18 * maxRadius + frac * maxRadius * 0.82) * 0.93;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.55;
        if (i === 0) dctx.moveTo(x, y); else dctx.lineTo(x, y);
      }
      dctx.stroke();
    }
    if (supportsBlur) dctx.filter = "none";
  }

  function scrollFraction() {
    const max = document.body.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / max));
  }

  function drawStarSet(stars, opacity, rotationOffset) {
    stars.forEach(p => {
      const angle = p.baseAngle + rotationOffset;
      const x = p.cx + Math.cos(angle) * p.radius;
      const y = p.cy + Math.sin(angle) * p.radius * p.squash;
      const twinkle = reduceMotion ? 1 : 0.55 + Math.sin(t * 0.002 + p.twinklePhase) * 0.45;

      ctx.beginPath();
      ctx.fillStyle = `rgb(${p.color})`;
      ctx.globalAlpha = opacity * twinkle;
      if (p.glow) {
        ctx.shadowColor = `rgb(${p.color})`;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function draw() {
    const frac = scrollFraction();
    ctx.clearRect(0, 0, w, h);

    if (frac > 0.01) {
      const opacity = Math.pow(frac, 1.3);
      const scale = 0.75 + frac * 0.45;
      const rotation = frac * 0.6 + (reduceMotion ? 0 : t * 0.00012);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      ctx.drawImage(dustCanvas, 0, 0);
      drawStarSet(bulgeStars, opacity, rotation * 0.4);
      drawStarSet(armStars, opacity, reduceMotion ? 0 : t * 0.00015);

      ctx.restore();
    }

    t += 16;
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
})();

/* ============================================================
   5. SCROLL PROGRESS BAR + HEADER SCROLL STATE
   ============================================================ */
(function scrollProgress() {
  const fill = document.getElementById("progress-fill");
  const header = document.getElementById("site-header");
  let ticking = false;

  function update() {
    const max = document.body.scrollHeight - window.innerHeight;
    const frac = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    fill.style.width = (frac * 100) + "%";
    if (header) header.classList.toggle("scrolled", window.scrollY > 40);
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  });
  window.addEventListener("resize", update);
  update();
})();

/* ============================================================
   6. NAVIGATION — header/footer links + brand + active tracking
   ============================================================ */
(function siteNav() {
  const jumpTargets = document.querySelectorAll("[data-target]");
  jumpTargets.forEach(el => {
    el.addEventListener("click", () => {
      const target = document.getElementById(el.dataset.target);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });

  const headerLinks = document.querySelectorAll(".header-nav .nav-link");
  const sections = ["hero", "wishes", "moments", "bouquet", "reveal", "secret"]
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || sections.length === 0 || headerLinks.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        headerLinks.forEach(link => {
          link.classList.toggle("active", link.dataset.target === entry.target.id);
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(section => observer.observe(section));
})();

/* ============================================================
   7. BACK TO TOP
   ============================================================ */
(function backToTop() {
  const btn = document.getElementById("to-top");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > window.innerHeight * 0.6);
  });
  btn.addEventListener("click", () => {
    document.getElementById("hero").scrollIntoView({ behavior: "smooth" });
  });
})();

/* ============================================================
   8. SCROLL-REVEAL (fade+rise, and left-to-right slide-in)
   ============================================================ */
(function scrollReveal() {
  const targets = document.querySelectorAll(".reveal, .slide-in, .slide-in-right, .slide-diagonal");
  if (!("IntersectionObserver" in window) || targets.length === 0) {
    targets.forEach(el => el.classList.add("in-view"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

  targets.forEach(el => observer.observe(el));
})();

/* ============================================================
   9. COUNTDOWN
   ============================================================ */
(function countdown() {
  function nextBirthday() {
    const now = new Date();
    const year = now.getFullYear();
    let target = new Date(year, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY, 0, 0, 0);
    if (target <= now) target = new Date(year + 1, BIRTHDAY_MONTH - 1, BIRTHDAY_DAY, 0, 0, 0);
    return target;
  }

  const target = nextBirthday();
  const els = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs")
  };
  const prevValues = { days: null, hours: null, mins: null, secs: null };

  function setNum(key, value) {
    const el = els[key];
    if (prevValues[key] === value) return;
    el.textContent = value;
    el.classList.remove("tick");
    void el.offsetWidth;
    el.classList.add("tick");
    prevValues[key] = value;
  }

  function tick() {
    const diff = target - new Date();
    if (diff <= 0) {
      setNum("days", "00");
      setNum("hours", "00");
      setNum("mins", "00");
      setNum("secs", "00");
      unlockReveal();
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setNum("days", String(d).padStart(2, "0"));
    setNum("hours", String(h).padStart(2, "0"));
    setNum("mins", String(m).padStart(2, "0"));
    setNum("secs", String(s).padStart(2, "0"));
    setTimeout(tick, 250);
  }
  tick();

  document.getElementById("scroll-cue").addEventListener("click", () => {
    document.getElementById("wishes").scrollIntoView({ behavior: "smooth" });
  });
})();

/* ============================================================
   9.5. MAKE A WISH — click the sky to send a shooting star
   ============================================================ */
(function makeAWish() {
  const catcher = document.getElementById("hero-catcher");
  if (!catcher || !window.MuskanSky) return;

  catcher.addEventListener("click", (e) => {
    window.MuskanSky.spawnAt(e.clientX, e.clientY);
    MuskanSound.chimeWish();
  });
})();

/* ============================================================
   10. WISH STARS / CONSTELLATION
   ============================================================ */
const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 0l2.5 7.9L22 8.5l-6.2 5 2.2 8L12 17l-6 4.5 2.2-8L2 8.5l7.5-.6z"/></svg>';

(function wishStars() {
  const field = document.getElementById("star-field");
  const linesSvg = document.getElementById("constellation-lines");
  const card = document.getElementById("wish-card");
  const cardText = document.getElementById("wish-text");
  const closeBtn = document.getElementById("wish-close");
  const countLabel = document.getElementById("found-count");
  const found = new Set();

  const lineEls = CONNECTIONS.map(([a, b]) => {
    const p1 = STAR_POINTS[a], p2 = STAR_POINTS[b];
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", p1.x);
    line.setAttribute("y1", p1.y);
    line.setAttribute("x2", p2.x);
    line.setAttribute("y2", p2.y);
    linesSvg.appendChild(line);
    return { el: line, a, b };
  });

  STAR_POINTS.forEach((pt, i) => {
    const btn = document.createElement("button");
    btn.className = "wish-star";
    btn.style.left = (pt.x / 800 * 100) + "%";
    btn.style.top = (pt.y / 500 * 100) + "%";
    btn.style.animationDelay = (Math.random() * 3) + "s";
    btn.setAttribute("aria-label", "Reveal a star");
    btn.innerHTML = STAR_SVG;

    btn.addEventListener("click", () => {
      if (!found.has(i)) {
        found.add(i);
        btn.classList.add("found");
        countLabel.textContent = found.size;
        lineEls.forEach(l => {
          if (found.has(l.a) && found.has(l.b)) l.el.classList.add("lit");
        });
        MuskanSound.chimeFound();
      }
      cardText.textContent = WISHES[i];
      card.hidden = false;
    });

    field.appendChild(btn);
  });

  closeBtn.addEventListener("click", () => { card.hidden = true; });
})();

/* ============================================================
   11. REVEAL (locked -> unlocked)
   ============================================================ */
function unlockReveal() {
  const locked = document.getElementById("locked-state");
  const unlocked = document.getElementById("unlocked-state");
  if (unlocked.hidden === false) return;
  locked.hidden = true;
  unlocked.hidden = false;
  unlocked.classList.add("in-view");
  const main = unlocked.querySelector(".letter-main");
  const aside = unlocked.querySelector(".letter-aside");
  if (main) main.classList.add("in-view");
  if (aside) aside.classList.add("in-view");
  spawnBurst();
  MuskanSound.chimeUnlock();
}

function spawnBurst(container, opts = {}) {
  const burst = container || document.getElementById("burst");
  if (!burst) return;
  const count = opts.count || 24;
  const colors = opts.colors || ["#e6c17c", "#a99bd6", "#d9a9a3", "#f5f1e6"];
  const minDist = opts.minDist || 60;
  const distRange = opts.distRange || 70;
  const size = opts.size || 5;

  burst.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const angle = (Math.PI * 2 * i) / count;
    const dist = minDist + Math.random() * distRange;
    p.style.position = "absolute";
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.borderRadius = "50%";
    p.style.background = colors[i % colors.length];
    p.style.left = "0";
    p.style.top = "0";
    p.style.opacity = "1";
    p.style.transition = "transform 1s cubic-bezier(.2,.8,.2,1), opacity 1s ease";
    burst.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
      p.style.opacity = "0";
    });
  }
}

document.getElementById("unlock-early").addEventListener("click", unlockReveal);

/* ============================================================
   12. INTERACTIVE FLOURISHES
   ============================================================ */

// cursor trail
(function cursorTrail() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (reduceMotion || isTouch) return;

  const colors = ["#e6c17c", "#a99bd6", "#f5f1e6"];
  let lastSpawn = 0;

  window.addEventListener("pointermove", (e) => {
    const now = performance.now();
    if (now - lastSpawn < 45) return;
    lastSpawn = now;

    const dot = document.createElement("span");
    dot.className = "trail-dot";
    dot.style.left = e.clientX + "px";
    dot.style.top = e.clientY + "px";
    dot.style.background = colors[Math.floor(Math.random() * colors.length)];
    document.body.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
  });
})();

// hero title tilts toward the cursor
(function heroTilt() {
  const title = document.querySelector(".hero-title");
  const hero = document.getElementById("hero");
  if (!title || !hero) return;

  hero.addEventListener("pointermove", (e) => {
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    title.style.transform = `perspective(600px) rotateX(${py * -6}deg) rotateY(${px * 8}deg)`;
  });
  hero.addEventListener("pointerleave", () => {
    title.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg)";
  });
})();

// magnetic buttons
(function magneticButtons() {
  const targets = document.querySelectorAll(".ghost-btn, #note-add");
  const RADIUS = 70;
  const STRENGTH = 0.35;

  targets.forEach(el => {
    el.classList.add("magnetic");
    window.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < RADIUS) {
        el.style.transform = `translate(${dx * STRENGTH}px, ${dy * STRENGTH}px)`;
      } else {
        el.style.transform = "translate(0, 0)";
      }
    });
  });
})();

// gallery frame 3D tilt
(function frameTilt() {
  document.querySelectorAll(".frame-inner").forEach(frame => {
    frame.addEventListener("pointermove", (e) => {
      const rect = frame.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      frame.style.transform = `perspective(700px) rotateX(${py * -10}deg) rotateY(${px * 10}deg) scale(1.03)`;
    });
    frame.addEventListener("pointerleave", () => {
      frame.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)";
    });
  });
})();

/* ============================================================
   13. PHOTO LIGHTBOX
   ============================================================ */
(function photoLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const closeBtn = document.getElementById("lightbox-close");
  if (!lightbox) return;

  function open(src, caption) {
    lightboxImg.src = src;
    lightboxImg.alt = caption || "";
    lightboxCaption.textContent = caption || "";
    lightbox.hidden = false;
  }
  function close() {
    lightbox.hidden = true;
    lightboxImg.src = "";
  }

  document.querySelectorAll(".frame").forEach(frame => {
    const img = frame.querySelector("img");
    const caption = frame.querySelector(".frame-caption");
    if (!img) return;
    img.addEventListener("click", () => {
      if (!img.src || img.style.display === "none") return; // no real photo added yet
      open(img.src, caption ? caption.textContent : "");
    });
  });

  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lightbox.hidden) close(); });
})();

/* ============================================================
   14. A LITTLE BOUQUET — hand-built SVG flowers that bloom on tap
   ============================================================ */
(function interactiveBouquet() {
  const stemsGroup = document.getElementById("bouquet-stems");
  const flowersGroup = document.getElementById("bouquet-flowers");
  const ribbonGroup = document.getElementById("bouquet-wrap-ribbon");
  const countLabel = document.getElementById("bloom-count");
  const resultBox = document.getElementById("bouquet-result");
  const resetBtn = document.getElementById("bouquet-reset");
  if (!stemsGroup || !flowersGroup) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const WRAP_POINT = { x: 210, y: 372 };

  // head position, color, size, and a slight tilt for a natural, gathered
  // (not perfectly symmetrical) arrangement — two blues + a warm white,
  // per the brief: a blue-and-white bouquet
  const FLOWERS = [
    { x: 88,  y: 132, color: "#8fb8e0", scale: 1.0,  rot: -10 },
    { x: 148, y: 78,  color: "#f5f1e6", scale: 0.9,  rot: 5 },
    { x: 210, y: 58,  color: "#5f8fc4", scale: 1.05, rot: 0 },
    { x: 272, y: 80,  color: "#f5f1e6", scale: 0.95, rot: -4 },
    { x: 332, y: 136, color: "#8fb8e0", scale: 1.0,  rot: 10 },
    { x: 128, y: 172, color: "#5f8fc4", scale: 0.85, rot: -14 },
    { x: 296, y: 176, color: "#f5f1e6", scale: 0.85, rot: 13 }
  ];

  function el(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  // --- stems: a gentle curve from the tied wrap point up to each flower ---
  FLOWERS.forEach(f => {
    const baseX = f.x + (f.x - WRAP_POINT.x) * 0.06;
    const baseY = f.y + 16;
    const ctrlX = WRAP_POINT.x + (f.x - WRAP_POINT.x) * 0.5;
    const ctrlY = (WRAP_POINT.y + baseY) / 2 + 18;
    const path = el("path", {
      class: "stem-line",
      d: `M${WRAP_POINT.x},${WRAP_POINT.y} Q${ctrlX},${ctrlY} ${baseX},${baseY}`
    });
    stemsGroup.appendChild(path);
  });

  // a few simple leaves along the two outer stems, for texture
  [
    { x: 130, y: 240, rot: -35 },
    { x: 290, y: 244, rot: 35 },
    { x: 175, y: 300, rot: -15 }
  ].forEach(leaf => {
    const g = el("g", { transform: `translate(${leaf.x},${leaf.y}) rotate(${leaf.rot})` });
    const shape = el("path", {
      class: "leaf-shape",
      d: "M0,0 C10,-4 22,-2 28,0 C22,2 10,4 0,0 Z"
    });
    g.appendChild(shape);
    stemsGroup.appendChild(g);
  });

  // a small ribbon knot tying the stems together
  const ribbon = el("g", { transform: `translate(${WRAP_POINT.x},${WRAP_POINT.y})` });
  ribbon.appendChild(el("path", { class: "ribbon-shape", d: "M0,0 L-22,14 L-14,20 L0,6 Z" }));
  ribbon.appendChild(el("path", { class: "ribbon-shape", d: "M0,0 L22,14 L14,20 L0,6 Z" }));
  ribbon.appendChild(el("circle", { class: "ribbon-knot", cx: 0, cy: 2, r: 5 }));
  ribbonGroup.appendChild(ribbon);

  // --- flowers: bud + bloom, both centered on local (0,0), positioned by the outer slot ---
  const flowerEls = FLOWERS.map((f, i) => {
    const slot = el("g", { transform: `translate(${f.x},${f.y}) rotate(${f.rot}) scale(${f.scale})` });

    const flower = el("g", {
      class: "flower",
      tabindex: "0",
      role: "button",
      "aria-label": "Tap to bloom a flower",
      "data-index": String(i)
    });
    flower.style.setProperty("--sway-delay", (i * 0.35).toFixed(2) + "s");
    flower.style.setProperty("--sway-dur", (5 + Math.random() * 2).toFixed(2) + "s");
    flower.style.setProperty("--sway-amt", (1.4 + Math.random() * 1.4).toFixed(2) + "deg");

    const bud = el("g", { class: "bud-shape" });
    bud.appendChild(el("path", { d: "M0,4 C-5,-2 -4,-14 0,-18 C4,-14 5,-2 0,4 Z", fill: f.color }));
    bud.appendChild(el("path", { d: "M-2,4 C-6,7 -8,10 -7,13", fill: "none", stroke: "var(--sage)", "stroke-width": "1.6", "stroke-linecap": "round" }));

    const bloom = el("g", { class: "bloom-shape" });
    for (let p = 0; p < 6; p++) {
      bloom.appendChild(el("ellipse", {
        cx: 0, cy: -11, rx: 5.2, ry: 10.5,
        fill: f.color,
        opacity: "0.92",
        transform: `rotate(${p * 60})`
      }));
    }
    bloom.appendChild(el("circle", { cx: 0, cy: 0, r: 4, fill: "#f3daa0" }));

    flower.appendChild(bud);
    flower.appendChild(bloom);
    slot.appendChild(flower);
    flowersGroup.appendChild(slot);

    return { flower, color: f.color };
  });

  let bloomedCount = 0;

  function spawnPetals(screenX, screenY, color) {
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const petal = document.createElement("span");
      petal.className = "floating-petal";
      petal.style.left = screenX + (Math.random() * 24 - 12) + "px";
      petal.style.top = screenY + "px";
      petal.style.background = color;
      petal.style.setProperty("--drift-x", (Math.random() * 60 - 30).toFixed(0) + "px");
      petal.style.animationDelay = (Math.random() * 0.2).toFixed(2) + "s";
      document.body.appendChild(petal);
      petal.addEventListener("animationend", () => petal.remove());
    }
  }

  function bloomFlower(item, sourceEl) {
    if (item.flower.classList.contains("bloomed")) return;
    item.flower.classList.add("bloomed");
    bloomedCount++;
    countLabel.textContent = String(bloomedCount);
    MuskanSound.chimeBloom();

    const rect = sourceEl.getBoundingClientRect();
    spawnPetals(rect.left + rect.width / 2, rect.top + rect.height / 2, item.color);

    if (bloomedCount === FLOWERS.length) {
      setTimeout(() => {
        resultBox.hidden = false;
        resultBox.classList.add("in-view");
        resetBtn.hidden = false;
      }, 500);
    }
  }

  flowerEls.forEach((item) => {
    item.flower.addEventListener("click", () => bloomFlower(item, item.flower));
    item.flower.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        bloomFlower(item, item.flower);
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    flowerEls.forEach(item => item.flower.classList.remove("bloomed"));
    bloomedCount = 0;
    countLabel.textContent = "0";
    resultBox.hidden = true;
    resetBtn.hidden = true;
  });
})();

/* ============================================================
   15. LOCKED NOTE — a real password, checked by cryptographic
   hash rather than a plaintext string sitting in the source
   ============================================================ */
(function lockedNote() {
  const panel = document.getElementById("lock-panel");
  const form = document.getElementById("lock-form");
  const input = document.getElementById("lock-input");
  const errorEl = document.getElementById("lock-error");
  const noteEl = document.getElementById("secret-note");
  if (!form || !input || !panel) return;

  // ---------------------------------------------------------------
  // HOW TO SET YOUR OWN PASSWORD (default below is her birthday, "0908"):
  // 1. Open this page's console (F12 → Console) in any browser.
  // 2. Run:
  //      crypto.subtle.digest("SHA-256", new TextEncoder().encode("yourpassword"))
  //        .then(buf => console.log([...new Uint8Array(buf)]
  //          .map(b => b.toString(16).padStart(2, "0")).join("")))
  // 3. Copy the 64-character result and paste it below as SECRET_HASH.
  // The real password is never stored in this file — only its hash — so
  // reading this code doesn't reveal it.
  // ---------------------------------------------------------------
  const SECRET_HASH = "1bcc0d24f8766535308c820c9870d2b3fd38787a1e9ab02e056931535ffda132";

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function shake() {
    panel.classList.remove("shake");
    void panel.offsetWidth; // restart the animation
    panel.classList.add("shake");
  }

  function unlock() {
    errorEl.hidden = true;
    panel.classList.add("unlocking");
    MuskanSound.chimeSecret();
    setTimeout(() => {
      panel.hidden = true;
      noteEl.hidden = false;
      noteEl.classList.add("in-view");
    }, 480);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;

    let hash;
    try {
      hash = await sha256Hex(value);
    } catch (err) {
      // crypto.subtle needs a secure context (https, or localhost/127.0.0.1) —
      // fails gracefully outside of that rather than silently unlocking
      errorEl.textContent = "this browser can't verify the password here — try opening the page over localhost or https";
      errorEl.hidden = false;
      return;
    }

    if (hash === SECRET_HASH) {
      unlock();
    } else {
      MuskanSound.chimeDenied();
      errorEl.hidden = false;
      input.value = "";
      input.focus();
      shake();
    }
  });
})();

/* ============================================================
   16. LEAVE-A-WISH FLOATING NOTES
   ============================================================ */
(function floatingNotes() {
  const input = document.getElementById("note-input");
  const btn = document.getElementById("note-add");

  function addNote() {
    const text = input.value.trim();
    if (!text) return;
    const note = document.createElement("div");
    note.className = "floating-note";
    note.textContent = "✦ " + text;
    note.style.left = Math.random() * 70 + 10 + "vw";
    note.style.bottom = "0";
    document.body.appendChild(note);
    note.addEventListener("animationend", () => note.remove());
    input.value = "";

    try {
      const saved = JSON.parse(localStorage.getItem("muskan-notes") || "[]");
      saved.push(text);
      localStorage.setItem("muskan-notes", JSON.stringify(saved));
      document.dispatchEvent(new CustomEvent("muskan:notes-updated"));
    } catch (e) { /* localStorage unavailable, skip silently */ }

    MuskanSound.chimeNote();
  }

  btn.addEventListener("click", addNote);
  input.addEventListener("keydown", e => { if (e.key === "Enter") addNote(); });
})();

/* ============================================================
   17. STAR COLLECTION — a quiet little archive of what she's added
   ============================================================ */
(function starCollection() {
  const toggleBtn = document.getElementById("stars-toggle");
  const list = document.getElementById("star-list");
  if (!toggleBtn || !list) return;

  function loadNotes() {
    try { return JSON.parse(localStorage.getItem("muskan-notes") || "[]"); }
    catch (e) { return []; }
  }

  function render() {
    const notes = loadNotes();
    list.innerHTML = "";
    if (notes.length === 0) {
      const li = document.createElement("li");
      li.className = "star-list-empty";
      li.textContent = "nothing here yet — add one above";
      list.appendChild(li);
      return;
    }
    notes.slice().reverse().forEach(text => {
      const li = document.createElement("li");
      li.textContent = "✦ " + text;
      list.appendChild(li);
    });
  }

  toggleBtn.addEventListener("click", () => {
    const willShow = list.hidden;
    list.hidden = !willShow;
    toggleBtn.classList.toggle("open", willShow);
    toggleBtn.textContent = willShow ? "hide your stars" : "view your stars ✦";
    if (willShow) render();
  });

  document.addEventListener("muskan:notes-updated", () => {
    if (!list.hidden) render();
  });
})();

/* ============================================================
   18. SAVE LETTER AS A KEEPSAKE IMAGE
   ============================================================ */
(function keepsakeDownload() {
  const btn = document.getElementById("download-letter");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const titleEl = document.querySelector(".letter-title");
    const bodyEl = document.querySelector(".letter-body");
    const signEl = document.querySelector(".letter-sign");
    if (!titleEl || !bodyEl) return;

    const W = 900, H = 1150;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // background
    const bg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, H * 0.6, H);
    bg.addColorStop(0, "#1c2456");
    bg.addColorStop(1, "#0a0e26");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // border
    ctx.strokeStyle = "rgba(230,193,124,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    // constellation seal
    const cx = W / 2, cy = 110, scale = 0.55;
    const pts = [[10, 62], [10, 8], [62, 55], [100, 8], [100, 62]].map(([x, y]) => [
      cx - 55 * scale + x * scale, cy - 35 * scale + y * scale
    ]);
    ctx.strokeStyle = "rgba(230,193,124,0.8)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();
    ctx.fillStyle = "#f3daa0";
    pts.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // title
    ctx.textAlign = "center";
    ctx.fillStyle = "#e6c17c";
    ctx.font = "italic 500 44px Georgia, serif";
    ctx.fillText(titleEl.textContent.trim(), W / 2, 210);

    // body text, wrapped
    ctx.textAlign = "left";
    ctx.fillStyle = "#c7c6d9";
    ctx.font = "300 22px Georgia, serif";
    const paragraphs = Array.from(bodyEl.querySelectorAll("p")).map(p => p.textContent.trim());
    const maxWidth = W - 140;
    let y = 280;
    const lineHeight = 34;

    paragraphs.forEach(paragraph => {
      const words = paragraph.split(/\s+/);
      let line = "";
      words.forEach(word => {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth) {
          ctx.fillText(line, 70, y);
          y += lineHeight;
          line = word;
        } else {
          line = test;
        }
      });
      if (line) { ctx.fillText(line, 70, y); y += lineHeight; }
      y += lineHeight * 0.5;
    });

    // signature
    if (signEl) {
      ctx.fillStyle = "#d9a9a3";
      ctx.font = "italic 300 22px Georgia, serif";
      ctx.fillText(signEl.textContent.trim(), 70, y + 20);
    }

    // footer mark
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(199,198,217,0.5)";
    ctx.font = "300 15px sans-serif";
    ctx.fillText("made with care, one star at a time ✦", W / 2, H - 50);

    const link = document.createElement("a");
    link.download = "for-muskan.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
})();
