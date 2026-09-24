/**
 * Attendance System - Dynamic Visual Theming Engine
 * Supports 5 Curated Themes with 5 Distinct Official Animations
 * Zero Impact on Core Attendance Logic
 */

(function (window, document) {
  'use strict';

  const THEMES = {
    aurora: {
      id: 'aurora',
      name: 'Midnight Aurora',
      nameBN: 'মিডনাইট অরোরা (নীল)',
      bg: '#0f172a',
      mesh: 'radial-gradient(at 0% 0%, rgba(30, 64, 175, 0.5) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(88, 28, 135, 0.45) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(30, 58, 138, 0.45) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(76, 29, 149, 0.4) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(15, 23, 42, 0.3) 0px, transparent 50%)',
      accent: '#3b82f6',
      accentDark: '#1d4ed8',
      glow: 'rgba(59, 130, 246, 0.35)',
      cardBg: 'rgba(15, 23, 42, 0.5)',
      cardBorder: 'rgba(255, 255, 255, 0.1)',
      clockShadow: '0 0 25px rgba(59, 130, 246, 0.55)',
      btnGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      btnHover: '#2563eb',
      focusRing: 'rgba(59, 130, 246, 0.25)',
      animType: 'constellation'
    },
    emerald: {
      id: 'emerald',
      name: 'Cyber Emerald',
      nameBN: 'সাইবার এমারেল্ড (সবুজ)',
      bg: '#051914',
      mesh: 'radial-gradient(at 0% 0%, rgba(6, 78, 59, 0.55) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(13, 148, 136, 0.45) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(4, 47, 46, 0.5) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(5, 150, 105, 0.35) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(5, 25, 20, 0.3) 0px, transparent 50%)',
      accent: '#10b981',
      accentDark: '#047857',
      glow: 'rgba(16, 185, 129, 0.35)',
      cardBg: 'rgba(5, 25, 20, 0.55)',
      cardBorder: 'rgba(52, 211, 153, 0.15)',
      clockShadow: '0 0 25px rgba(16, 185, 129, 0.55)',
      btnGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      btnHover: '#059669',
      focusRing: 'rgba(16, 185, 129, 0.25)',
      animType: 'fireflies'
    },
    ember: {
      id: 'ember',
      name: 'Royal Ember',
      nameBN: 'রয়েল এম্বার (সানসেট)',
      bg: '#180a14',
      mesh: 'radial-gradient(at 0% 0%, rgba(159, 18, 57, 0.5) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(194, 65, 12, 0.4) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(136, 19, 55, 0.45) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(120, 53, 15, 0.35) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(24, 10, 20, 0.3) 0px, transparent 50%)',
      accent: '#f43f5e',
      accentDark: '#be123c',
      glow: 'rgba(244, 63, 94, 0.35)',
      cardBg: 'rgba(24, 10, 20, 0.55)',
      cardBorder: 'rgba(251, 113, 133, 0.15)',
      clockShadow: '0 0 25px rgba(244, 63, 94, 0.55)',
      btnGradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
      btnHover: '#e11d48',
      focusRing: 'rgba(244, 63, 94, 0.25)',
      animType: 'embers'
    },
    cosmic: {
      id: 'cosmic',
      name: 'Cosmic Nebula',
      nameBN: 'কসমিক নেবুলা (পার্পল)',
      bg: '#09071a',
      mesh: 'radial-gradient(at 0% 0%, rgba(109, 40, 217, 0.5) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(192, 38, 211, 0.45) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(76, 29, 149, 0.45) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(147, 51, 234, 0.35) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(9, 7, 26, 0.3) 0px, transparent 50%)',
      accent: '#a855f7',
      accentDark: '#7e22ce',
      glow: 'rgba(168, 85, 247, 0.35)',
      cardBg: 'rgba(14, 10, 32, 0.55)',
      cardBorder: 'rgba(192, 132, 252, 0.15)',
      clockShadow: '0 0 25px rgba(168, 85, 247, 0.55)',
      btnGradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
      btnHover: '#9333ea',
      focusRing: 'rgba(168, 85, 247, 0.25)',
      animType: 'stardust'
    },
    frost: {
      id: 'frost',
      name: 'Nordic Frost',
      nameBN: 'নর্ডিক ফ্রস্ট (সায়ান)',
      bg: '#0b1320',
      mesh: 'radial-gradient(at 0% 0%, rgba(14, 116, 144, 0.5) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(71, 85, 105, 0.45) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(21, 94, 117, 0.45) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(30, 41, 59, 0.4) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(11, 19, 32, 0.3) 0px, transparent 50%)',
      accent: '#06b6d4',
      accentDark: '#0e7490',
      glow: 'rgba(6, 182, 212, 0.35)',
      cardBg: 'rgba(11, 19, 32, 0.55)',
      cardBorder: 'rgba(103, 232, 249, 0.15)',
      clockShadow: '0 0 25px rgba(6, 182, 212, 0.55)',
      btnGradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
      btnHover: '#0891b2',
      focusRing: 'rgba(6, 182, 212, 0.25)',
      animType: 'crystals'
    }
  };

  // Rotation table for Daily Auto-Rotate
  // 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday
  const DAILY_THEMES = ['aurora', 'emerald', 'ember', 'cosmic', 'frost', 'aurora', 'frost'];
  const THEME_KEYS = ['aurora', 'emerald', 'ember', 'cosmic', 'frost'];

  let activeThemeKey = 'aurora';
  let activeAnimInstance = null;

  /**
   * Determine the actual theme based on setting mode
   */
  function resolveThemeKey(mode) {
    if (!mode || mode === 'daily') {
      const day = new Date().getDay();
      return DAILY_THEMES[day] || 'aurora';
    }
    if (mode === 'random') {
      let cached = sessionStorage.getItem('sessionRandomTheme');
      if (!cached || !THEMES[cached]) {
        const rand = THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
        sessionStorage.setItem('sessionRandomTheme', rand);
        cached = rand;
      }
      return cached;
    }
    if (THEMES[mode]) {
      return mode;
    }
    return 'aurora';
  }

  /**
   * Apply CSS Variables to :root
   */
  function applyCssVariables(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.id);
    root.style.setProperty('--theme-bg', theme.bg);
    root.style.setProperty('--theme-mesh', theme.mesh);
    root.style.setProperty('--theme-accent', theme.accent);
    root.style.setProperty('--theme-accent-dark', theme.accentDark);
    root.style.setProperty('--theme-glow', theme.glow);
    root.style.setProperty('--theme-card-bg', theme.cardBg);
    root.style.setProperty('--theme-card-border', theme.cardBorder);
    root.style.setProperty('--theme-clock-shadow', theme.clockShadow);
    root.style.setProperty('--theme-btn-gradient', theme.btnGradient);
    root.style.setProperty('--theme-btn-hover', theme.btnHover);
    root.style.setProperty('--theme-focus-ring', theme.focusRing);
  }

  // =========================================================================
  // 5 DISTINCT OFFICIAL CANVAS ANIMATIONS
  // =========================================================================

  function startCanvasAnimation(theme) {
    const canvas = document.getElementById('particles') || document.getElementById('particleCanvas');
    if (!canvas) return;

    if (activeAnimInstance && activeAnimInstance.stop) {
      activeAnimInstance.stop();
      activeAnimInstance = null;
    }

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let reqId = null;
    let isRunning = true;

    function handleResize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    const animType = theme.animType;
    let items = [];

    // --- 1. Constellation Mesh (Aurora) ---
    if (animType === 'constellation') {
      const count = Math.min(35, Math.floor(width / 35));
      for (let i = 0; i < count; i++) {
        items.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          size: Math.random() * 1.8 + 1,
          alpha: Math.random() * 0.4 + 0.3
        });
      }

      function drawConstellation() {
        if (!isRunning) return;
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < items.length; i++) {
          const p = items[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(147, 197, 253, ${p.alpha})`;
          ctx.fill();

          for (let j = i + 1; j < items.length; j++) {
            const p2 = items[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 110) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(96, 165, 250, ${0.14 * (1 - dist / 110)})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
        reqId = requestAnimationFrame(drawConstellation);
      }
      drawConstellation();
    }

    // --- 2. Bioluminescent Fireflies (Emerald) ---
    else if (animType === 'fireflies') {
      const count = Math.min(28, Math.floor(width / 40));
      for (let i = 0; i < count; i++) {
        items.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35 - 0.15, // slight upward float
          baseRadius: Math.random() * 2.5 + 1.5,
          pulseSpeed: Math.random() * 0.02 + 0.015,
          pulseOffset: Math.random() * Math.PI * 2
        });
      }

      function drawFireflies() {
        if (!isRunning) return;
        ctx.clearRect(0, 0, width, height);

        const now = Date.now() * 0.002;
        for (let i = 0; i < items.length; i++) {
          const p = items[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;

          const alpha = 0.35 + 0.3 * Math.sin(now + p.pulseOffset);
          const r = p.baseRadius * (0.85 + 0.25 * Math.sin(now + p.pulseOffset));

          // Soft glow gradient
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.8);
          grad.addColorStop(0, `rgba(52, 211, 153, ${alpha})`);
          grad.addColorStop(0.5, `rgba(16, 185, 129, ${alpha * 0.4})`);
          grad.addColorStop(1, 'rgba(16, 185, 129, 0)');

          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(209, 250, 229, ${alpha + 0.2})`;
          ctx.fill();
        }
        reqId = requestAnimationFrame(drawFireflies);
      }
      drawFireflies();
    }

    // --- 3. Rising Warm Embers (Royal Ember) ---
    else if (animType === 'embers') {
      const count = Math.min(30, Math.floor(width / 38));
      for (let i = 0; i < count; i++) {
        items.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speedY: Math.random() * 0.6 + 0.25,
          swaySpeed: Math.random() * 0.015 + 0.01,
          swayDist: Math.random() * 1.5 + 0.5,
          initialX: 0,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.6 + 0.2
        });
        items[i].initialX = items[i].x;
      }

      function drawEmbers() {
        if (!isRunning) return;
        ctx.clearRect(0, 0, width, height);

        const now = Date.now() * 0.0015;
        for (let i = 0; i < items.length; i++) {
          const p = items[i];
          p.y -= p.speedY;
          p.x = p.initialX + Math.sin(now + i) * 18 * p.swayDist;

          if (p.y < -10) {
            p.y = height + 10;
            p.x = p.initialX = Math.random() * width;
          }

          const heightRatio = p.y / height; // brighter near bottom, softly fades near top
          const a = p.alpha * Math.min(1, heightRatio * 1.2);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? `rgba(251, 113, 133, ${a})` : `rgba(251, 146, 60, ${a})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(244, 63, 94, 0.6)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        reqId = requestAnimationFrame(drawEmbers);
      }
      drawEmbers();
    }

    // --- 4. Twinkling Stardust (Cosmic Nebula) ---
    else if (animType === 'stardust') {
      const count = Math.min(42, Math.floor(width / 30));
      for (let i = 0; i < count; i++) {
        items.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          size: Math.random() * 1.7 + 0.8,
          twinkleSpeed: Math.random() * 0.03 + 0.015,
          offset: Math.random() * Math.PI * 2
        });
      }

      function drawStardust() {
        if (!isRunning) return;
        ctx.clearRect(0, 0, width, height);

        const now = Date.now() * 0.002;
        for (let i = 0; i < items.length; i++) {
          const p = items[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          const alpha = 0.25 + 0.45 * Math.sin(now * p.twinkleSpeed * 10 + p.offset);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = i % 3 === 0 ? `rgba(216, 180, 254, ${alpha})` : `rgba(244, 114, 182, ${alpha * 0.8})`;
          ctx.fill();

          // Subtle 4-point twinkle for larger stars
          if (p.size > 1.6 && alpha > 0.4) {
            ctx.strokeStyle = `rgba(233, 213, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x - p.size * 2, p.y);
            ctx.lineTo(p.x + p.size * 2, p.y);
            ctx.moveTo(p.x, p.y - p.size * 2);
            ctx.lineTo(p.x, p.y + p.size * 2);
            ctx.stroke();
          }
        }
        reqId = requestAnimationFrame(drawStardust);
      }
      drawStardust();
    }

    // --- 5. Geometric Frost Crystals (Nordic Frost) ---
    else if (animType === 'crystals') {
      const count = Math.min(24, Math.floor(width / 45));
      for (let i = 0; i < count; i++) {
        items.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speedY: Math.random() * 0.35 + 0.15,
          speedX: Math.random() * 0.2 - 0.1,
          rot: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.008,
          radius: Math.random() * 3 + 2,
          isDiamond: i % 2 === 0,
          alpha: Math.random() * 0.3 + 0.15
        });
      }

      function drawCrystals() {
        if (!isRunning) return;
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < items.length; i++) {
          const p = items[i];
          p.y += p.speedY;
          p.x += p.speedX;
          p.rot += p.rotSpeed;

          if (p.y > height + 15) {
            p.y = -15;
            p.x = Math.random() * width;
          }
          if (p.x < -15) p.x = width + 15;
          if (p.x > width + 15) p.x = -15;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);

          if (p.isDiamond) {
            ctx.beginPath();
            ctx.moveTo(0, -p.radius * 1.3);
            ctx.lineTo(p.radius, 0);
            ctx.lineTo(0, p.radius * 1.3);
            ctx.lineTo(-p.radius, 0);
            ctx.closePath();
            ctx.strokeStyle = `rgba(103, 232, 249, ${p.alpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha * 0.7})`;
            ctx.fill();
          }
          ctx.restore();
        }
        reqId = requestAnimationFrame(drawCrystals);
      }
      drawCrystals();
    }

    // Handle tab visibility to save mobile battery
    function handleVisibility() {
      if (document.hidden) {
        isRunning = false;
        if (reqId) cancelAnimationFrame(reqId);
      } else {
        if (!isRunning) {
          isRunning = true;
          if (animType === 'constellation') drawConstellation();
          else if (animType === 'fireflies') drawFireflies();
          else if (animType === 'embers') drawEmbers();
          else if (animType === 'stardust') drawStardust();
          else if (animType === 'crystals') drawCrystals();
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    activeAnimInstance = {
      stop: function () {
        isRunning = false;
        if (reqId) cancelAnimationFrame(reqId);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }

  /**
   * Set and apply a specific theme by key
   */
  function applyTheme(key) {
    const theme = THEMES[key] || THEMES.aurora;
    activeThemeKey = theme.id;
    applyCssVariables(theme);

    // Initialize animation once DOM is ready or immediately
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => startCanvasAnimation(theme));
    } else {
      startCanvasAnimation(theme);
    }
  }

  /**
   * Initialize theme engine from storage or default
   */
  function init() {
    const savedMode = localStorage.getItem('appThemeMode') || 'daily';
    const resolvedKey = resolveThemeKey(savedMode);
    applyTheme(resolvedKey);
  }

  // Pre-apply immediately to prevent FOUT/flicker
  init();

  // Expose Global API
  window.ThemeEngine = {
    THEMES: THEMES,
    THEME_KEYS: THEME_KEYS,
    getActiveKey: () => activeThemeKey,
    getActiveTheme: () => THEMES[activeThemeKey],
    resolveThemeKey: resolveThemeKey,
    applyTheme: applyTheme,
    syncMode: function (mode) {
      if (!mode) return;
      localStorage.setItem('appThemeMode', mode);
      const resolved = resolveThemeKey(mode);
      applyTheme(resolved);
    }
  };
})(window, document);
