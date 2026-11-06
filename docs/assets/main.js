/* Motion layer for the portfolio. All content is already in the HTML, so this
   script only adds motion. If GSAP fails to load, the page stays readable. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  startClock();
  heroField();
  spotlights();

  const loader = $('.loader');
  if (!window.gsap || !window.ScrollTrigger) { loader?.remove(); return; }
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { duration: 1.4 }) : (target === 0 ? scrollTo({ top: 0 }) : target.scrollIntoView());
  }));

  /* ---------- text splitting ---------- */
  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    }
    return $$('.ch', el);
  }
  // Wraps every word in a span, keeping inline markup such as <strong> intact.
  function splitWords(el) {
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.ELEMENT_NODE) { splitWords(node); continue; }
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
      node.replaceWith(frag);
    }
    return $$('.w', el);
  }

  const heroChars = splitChars($('.hero__title .split'));

  /* ---------- intro ---------- */
  const intro = gsap.timeline({ paused: true });
  intro
    .from(heroChars, { yPercent: 115, rotate: 6, duration: 1.2, ease: 'expo.out', stagger: 0.045 })
    .from(['.hero__status', '.hero__lede', '.hero__meta > div', '.hero__scroll', '.nav'], {
      y: 24, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
    }, '-=0.8');

  if (reduce || !loader) {
    loader?.remove();
    intro.progress(1);
  } else {
    const count = { v: 0 };
    const out = $('[data-count]');
    gsap.timeline({ onComplete: () => loader.remove() })
      .to(count, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { out.textContent = String(Math.round(count.v)).padStart(3, '0'); } })
      .to('.loader__bar i', { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to('.loader__inner', { yPercent: -40, autoAlpha: 0, duration: 0.6, ease: 'power3.in' })
      .to(loader, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=0.2')
      .add(() => intro.play(), '-=0.55');
  }

  /* ---------- hero rotator ---------- */
  const track = $('.rotator__track');
  if (track && !reduce) {
    const rot = track.parentElement;
    const items = [...track.children];
    const n = items.length - 1; // last item repeats the first, for a seamless loop
    const widthOf = (i) => () => items[i].getBoundingClientRect().width;
    gsap.set(rot, { width: widthOf(0) });
    const tl = gsap.timeline({ repeat: -1, delay: 2.8 });
    for (let i = 1; i <= n; i++) {
      tl.to(track, { yPercent: (-100 / (n + 1)) * i, duration: 0.7, ease: 'expo.inOut' }, `+=1.4`)
        .to(rot, { width: widthOf(i), duration: 0.7, ease: 'expo.inOut' }, '<');
    }
    tl.set(track, { yPercent: 0 });
  }

  /* hero parallax out */
  gsap.to('.hero__inner', { yPercent: -18, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- scroll progress ---------- */
  gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  /* ---------- marquee, sped up by scroll velocity ---------- */
  const rows = $$('.marquee__row').map((row) => {
    const t = $('.marquee__track', row);
    row.appendChild(t.cloneNode(true));
    const dir = Number(row.dataset.dir);
    const tracks = $$('.marquee__track', row);
    return gsap.fromTo(tracks, { xPercent: dir > 0 ? 0 : -100 }, { xPercent: dir > 0 ? -100 : 0, duration: 28, ease: 'none', repeat: -1 });
  });
  if (!reduce) {
    let boost = 1;
    ScrollTrigger.create({
      onUpdate: (self) => {
        boost = 1 + Math.min(Math.abs(self.getVelocity()) / 220, 7);
        gsap.to(rows, { timeScale: boost * Math.sign(self.direction || 1), duration: 0.2, overwrite: true });
        gsap.to(rows, { timeScale: Math.sign(self.direction || 1), duration: 1.2, delay: 0.2, ease: 'power2.out' });
      },
    });
  } else {
    rows.forEach((r) => r.pause());
  }

  /* ---------- section headings ---------- */
  $$('.section .eyebrow, .work__head .eyebrow').forEach((el) => {
    gsap.from(el, { x: -20, autoAlpha: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  $$('.display').forEach((el) => {
    gsap.from(el, { yPercent: 30, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  /* ---------- about: words light up as you read ---------- */
  const words = splitWords($('.reveal-words'));
  // Key phrases start brighter than the rest so they read even before the reveal reaches them.
  gsap.fromTo(words, { opacity: (i, w) => (w.closest('.hl') ? 0.55 : 0.14) }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: '.about__text', start: 'top 78%', end: 'bottom 50%', scrub: true },
  });
  $$('.stat [data-to]').forEach((el) => {
    const to = Number(el.dataset.to);
    const suffix = el.dataset.suffix || '';
    const o = { v: 0 };
    const fmt = (v) => Math.round(v).toLocaleString('en-US') + suffix;
    if (reduce) { el.textContent = fmt(to); return; }
    gsap.to(o, {
      v: to, duration: 2, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); },
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });
  gsap.from('.stat', { y: 40, autoAlpha: 0, stagger: 0.1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

  /* ---------- work: horizontal pinned gallery on desktop ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    const pin = $('.work__pin');
    const tr = $('.work__track');
    const dist = () => tr.scrollWidth - innerWidth;
    const tween = gsap.to(tr, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    $$('.panel', tr).forEach((p) => {
      gsap.from($('.panel__vis', p), {
        scale: 0.86, autoAlpha: 0.3, ease: 'none',
        scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left 95%', end: 'left 40%', scrub: true },
      });
    });
  });
  mm.add('(max-width: 900px)', () => {
    $$('.panel').forEach((p) => gsap.from(p, { y: 60, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 88%' } }));
  });

  /* each visual loops only while on screen */
  const visuals = [orbitVis(), agentVis(), ratioVis(), videoVis()];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = visuals.find((x) => x && x.el === en.target);
      if (!v) return;
      en.isIntersecting ? v.tl.play() : v.tl.pause();
    });
  }, { threshold: 0.15 });
  visuals.forEach((v) => v && io.observe(v.el));

  function orbitVis() {
    const svg = $('.vis-orbit svg');
    if (!svg) return null;
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    const mods = ['Accounting', 'Inventory', 'HRM', 'POS', 'F&B', 'Sales', 'Mfg', 'LMS', 'AI agent', 'Tenancy'];
    const g = mk('g', {}, svg);
    svg.insertBefore(g, $('.core', svg).previousElementSibling); // keep core on top
    const spokes = $('.spokes', svg), nodes = $('.nodes', svg), pulses = $('.pulses', svg);
    g.append(spokes, pulses, nodes);
    const pts = mods.map((name, i) => {
      const r = i % 2 ? 150 : 112;
      const a = (i / mods.length) * Math.PI * 2 - Math.PI / 2;
      const x = 200 + Math.cos(a) * r, y = 200 + Math.sin(a) * r;
      mk('line', { x1: 200, y1: 200, x2: x, y2: y }, spokes);
      const node = mk('g', { class: 'node' }, nodes);
      const w = name.length * 7 + 18;
      mk('rect', { x: x - w / 2, y: y - 12, width: w, height: 24, rx: 12 }, node);
      const t = mk('text', { x, y: y + 1 }, node);
      t.textContent = name;
      return { x, y, node };
    });
    const tl = gsap.timeline({ paused: true });
    tl.to(g, { rotation: 360, svgOrigin: '200 200', duration: 60, ease: 'none', repeat: -1 }, 0);
    pts.forEach((p) => tl.to(p.node, { rotation: -360, svgOrigin: `${p.x} ${p.y}`, duration: 60, ease: 'none', repeat: -1 }, 0));
    pts.forEach((p, i) => {
      const c = mk('circle', { cx: 200, cy: 200, r: 3, opacity: 0 }, pulses);
      const outbound = i % 3 !== 0;
      const from = outbound ? { cx: 200, cy: 200 } : { cx: p.x, cy: p.y };
      const to = outbound ? { cx: p.x, cy: p.y } : { cx: 200, cy: 200 };
      tl.fromTo(c, { attr: from, opacity: 0 }, { attr: to, opacity: 1, duration: 1.4, ease: 'power1.inOut', repeat: -1, repeatDelay: 1.6 + (i % 4) * 0.5, yoyo: false }, i * 0.37);
    });
    tl.to('.vis-orbit .core', { scale: 1.08, svgOrigin: '200 200', duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }, 0);
    return { el: $('.vis-orbit'), tl };
  }

  function agentVis() {
    const el = $('.vis-agent');
    if (!el) return null;
    const typed = $('.typed', el);
    const full = typed.dataset.text;
    const steps = $$('.step', el);
    const pill = $('.pill', el);
    const o = { n: 0 };
    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.2 });
    tl.set(steps, { autoAlpha: 0, y: 8 })
      .set(o, { n: 0 })
      .call(() => { typed.textContent = ''; })
      .to(o, { n: full.length, duration: full.length * 0.035, ease: 'none', onUpdate: () => { typed.textContent = full.slice(0, Math.round(o.n)); } }, '+=0.4');
    steps.forEach((s, i) => {
      tl.to(s, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' }, i === 0 ? '+=0.4' : '+=0.55');
      if (s.classList.contains('approve')) {
        tl.to(pill, { scale: 1.12, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' }, '+=0.2');
        tl.to(pill, { backgroundColor: '#5dff9a', duration: 0.2 });
      }
    });
    tl.to({}, { duration: 2.4 }).to(steps, { autoAlpha: 0, duration: 0.4 }).set(pill, { clearProps: 'backgroundColor,scale' });
    if (reduce) { typed.textContent = full; gsap.set(steps, { autoAlpha: 1, y: 0 }); return null; }
    return { el, tl };
  }

  function ratioVis() {
    const el = $('.vis-ratio');
    if (!el) return null;
    const frame = $('.ratio__frame', el), label = $('.ratio__label', el);
    const k = () => Math.min(1, (el.clientWidth - 40) / 440);
    const sizes = [['9:16', 200, 356], ['16:9', 430, 242], ['4:5', 288, 360], ['1:1', 320, 320]];
    const tl = gsap.timeline({ paused: true, repeat: -1 });
    sizes.forEach((_, i) => {
      const next = sizes[(i + 1) % sizes.length];
      tl.to({}, { duration: 1.6 })
        .to(label, { autoAlpha: 0, duration: 0.2 })
        .to(frame, { width: () => next[1] * k(), height: () => next[2] * k(), duration: 0.9, ease: 'expo.inOut' }, '<')
        .fromTo('.ad__blob', { scale: 1 }, { scale: 1.25, duration: 0.45, yoyo: true, repeat: 1, ease: 'sine.inOut' }, '<')
        .call(() => { label.textContent = next[0]; })
        .to(label, { autoAlpha: 1, duration: 0.25 });
    });
    gsap.set(frame, { width: 200 * k(), height: 356 * k() });
    return { el, tl };
  }

  function videoVis() {
    const el = $('.vis-video');
    if (!el) return null;
    const wave = $('.wave', el);
    for (let i = 0; i < 70; i++) {
      const b = document.createElement('i');
      const env = Math.sin((i / 70) * Math.PI * 3) * 0.5 + 0.5;
      b.style.height = `${18 + Math.round((Math.random() * 0.6 + 0.4) * env * 82)}%`;
      wave.appendChild(b);
    }
    const words = $$('.vid__cap b', el);
    const head = $('.playhead', el);
    const tracks = $('.vid__tracks', el);
    const o = { p: 0 };
    const tl = gsap.timeline({ paused: true, repeat: -1 });
    tl.fromTo(o, { p: 0 }, {
      p: 1, duration: 5, ease: 'none',
      onUpdate: () => {
        const start = 66, end = tracks.clientWidth - 12;
        gsap.set(head, { x: (end - start) * o.p });
        const lit = Math.floor(o.p * (words.length + 1));
        words.forEach((w, i) => w.classList.toggle('on', i < lit));
      },
    }).to({}, { duration: 0.6 });
    return { el, tl };
  }

  /* ---------- experience ---------- */
  gsap.to('.timeline__line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });
  $$('.job').forEach((job) => {
    gsap.from(job.children, { y: 40, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: job, start: 'top 82%' } });
  });

  /* ---------- process pipeline ---------- */
  const live = $('.wire--live');
  const steps = $$('.pipeline__steps li');
  if (live) {
    const len = live.getTotalLength();
    gsap.set(live, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(live, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: {
        trigger: '.pipeline', start: 'top 75%', end: 'bottom 55%', scrub: 0.6,
        onUpdate: (self) => steps.forEach((s, i) => s.classList.toggle('lit', self.progress >= i / (steps.length - 1) - 0.02)),
      },
    });
    mm.add('(max-width: 860px)', () => { steps.forEach((s) => s.classList.add('lit')); });
  }
  gsap.from(steps, { y: 30, autoAlpha: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.pipeline__steps', start: 'top 85%' } });

  /* ---------- stack ---------- */
  gsap.from('.card', { y: 50, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.stack__grid', start: 'top 85%' } });

  /* ---------- contact ---------- */
  const cChars = $$('.contact__title .split').flatMap(splitChars);
  gsap.from(cChars, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.025, scrollTrigger: { trigger: '.contact__title', start: 'top 80%' } });
  gsap.from('.contact__actions > *, .contact__links li', { y: 24, autoAlpha: 0, stagger: 0.07, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.contact__actions', start: 'top 92%' } });

  /* ---------- cursor + magnetic buttons ---------- */
  if (finePointer && !reduce) {
    const cur = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring'), label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.08 }), dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    addEventListener('pointermove', (e) => { cur.classList.add('is-on'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      const hov = e.target.closest('a, button, .card');
      cur.classList.toggle('is-label', !!lab);
      cur.classList.toggle('is-hover', !lab && !!hov);
      label.textContent = lab ? lab.dataset.cursor : '';
    });
    $$('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, .4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.45);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  /* =================== helpers that do not need GSAP =================== */

  function startClock() {
    const el = $('[data-clock]');
    if (!el) return;
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    const tick = () => { el.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 15000);
  }

  function spotlights() {
    $$('.spot, .panel').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  /* Flow field: particles follow a slowly drifting vector field and swerve around the cursor. */
  function heroField() {
    const canvas = $('.hero__field');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let W = 0, H = 0, parts = [], t = 0, running = false, raf = 0;
    const mouse = { x: -9999, y: -9999 };

    const spawn = (p = {}) => {
      p.x = Math.random() * W; p.y = Math.random() * H;
      p.life = 80 + Math.random() * 220; p.age = 0;
      p.hot = Math.random() < 0.1;
      return p;
    };
    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(900, Math.round((W * H) / 2600));
      parts = Array.from({ length: n }, () => spawn());
      ctx.fillStyle = '#08090b'; ctx.fillRect(0, 0, W, H);
    }
    const field = (x, y) =>
      (Math.sin(x * 0.0019 + t * 0.12) + Math.cos(y * 0.0024 - t * 0.09) + Math.sin((x + y) * 0.0011 + t * 0.05)) * 1.35;

    function step() {
      t += 0.016;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(8, 9, 11, 0.075)';
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (const p of parts) {
        const a = field(p.x, p.y);
        let vx = Math.cos(a) * 1.25, vy = Math.sin(a) * 1.25;
        const mx = p.x - mouse.x, my = p.y - mouse.y, d2 = mx * mx + my * my;
        let near = 0;
        if (d2 < 32000) { const d = Math.sqrt(d2) || 1; near = 1 - d / 179; vx += (mx / d) * near * 3.2; vy += (my / d) * near * 3.2; }
        const nx = p.x + vx, ny = p.y + vy;
        const fade = Math.min(1, p.age / 30, (p.life - p.age) / 30);
        ctx.strokeStyle = p.hot || near > 0.15
          ? `rgba(255, ${110 + Math.round(near * 80)}, 60, ${0.75 * fade})`
          : `rgba(236, 231, 223, ${0.3 * fade})`;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.age++;
        if (p.age > p.life || nx < -5 || ny < -5 || nx > W + 5 || ny > H + 5) spawn(p);
      }
    }
    function loop() { step(); raf = requestAnimationFrame(loop); }
    const start = () => { if (!running && !reduce) { running = true; loop(); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    if (reduce) { for (let i = 0; i < 140; i++) step(); return; }
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    canvas.parentElement.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
    canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop())).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }
})();
