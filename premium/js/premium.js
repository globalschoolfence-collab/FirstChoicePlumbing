/* First Choice Plumbing — Premium experience
   GSAP + ScrollTrigger (scroll choreography), Lenis (smooth scroll),
   Motion (Framer Motion's vanilla engine) for in-view and hover springs,
   Three.js for the interactive 3D pipe scene. */

(() => {
    const root = document.documentElement;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGsap = !!window.gsap;
    const hasST = hasGsap && !!window.ScrollTrigger;
    const Motion = window.Motion;
    if (hasST) gsap.registerPlugin(ScrollTrigger);

    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];

    /* ---------- Theme ---------- */
    let hero3d = null;
    const setTheme = theme => {
        root.dataset.theme = theme;
        try { localStorage.setItem('fcp-theme', theme); } catch (e) {}
        if (hero3d) hero3d.setTheme(theme);
    };
    $$('.theme-toggle').forEach(btn => btn.addEventListener('click', () => {
        setTheme(root.dataset.theme === 'light' ? 'dark' : 'light');
    }));

    /* ---------- Split headlines into words ---------- */
    const wrapWord = node => {
        const outer = document.createElement('span');
        const inner = document.createElement('span');
        outer.className = 'w';
        inner.append(node);
        outer.append(inner);
        return outer;
    };
    $$('.split').forEach(el => {
        const frag = document.createDocumentFragment();
        [...el.childNodes].forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                node.textContent.split(/(\s+)/).forEach(part => {
                    if (!part) return;
                    frag.append(/^\s+$/.test(part) ? document.createTextNode(' ') : wrapWord(document.createTextNode(part)));
                });
            } else {
                frag.append(wrapWord(node.cloneNode(true)));
            }
        });
        el.textContent = '';
        el.append(frag);
    });

    /* ---------- Smooth scroll ---------- */
    let lenis = null;
    if (window.Lenis && hasST && !reduceMotion) {
        lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(t => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
        lenis.stop();
    }

    const menu = $('.mobile-menu');
    const menuBtn = $('.menu-toggle');
    const setMenu = open => {
        menu.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        if (lenis) open ? lenis.stop() : lenis.start();
    };
    menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));

    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
        const target = a.getAttribute('href') === '#top' ? 0 : $(a.getAttribute('href'));
        if (target === null) return;
        e.preventDefault();
        if (menu.classList.contains('is-open')) setMenu(false);
        if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
        else if (target === 0) scrollTo({ top: 0, behavior: 'smooth' });
        else target.scrollIntoView({ behavior: 'smooth' });
    }));

    /* ---------- Page transition to other pages ---------- */
    $$('[data-transition]').forEach(a => a.addEventListener('click', e => {
        if (!hasGsap) return;
        e.preventDefault();
        gsap.set('.page-transition', { transformOrigin: 'bottom' });
        gsap.to('.page-transition', { scaleY: 1, duration: .7, ease: 'power4.inOut', onComplete: () => { location.href = a.href; } });
    }));
    // Coming back via the browser's back button restores the page from cache with the panel still down
    addEventListener('pageshow', e => { if (e.persisted && hasGsap) gsap.set('.page-transition', { scaleY: 0 }); });

    /* ---------- Loader particles ---------- */
    const loaderParticles = (() => {
        const canvas = $('.loader-particles');
        const ctx = canvas.getContext('2d');
        let w, h, raf, pts = [];
        const resize = () => {
            const dpr = Math.min(devicePixelRatio, 2);
            w = canvas.clientWidth; h = canvas.clientHeight;
            canvas.width = w * dpr; canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        for (let i = 0; i < 90; i++) {
            pts.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + .4, v: Math.random() * .6 + .2, a: Math.random() * .6 + .2 });
        }
        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            for (const p of pts) {
                p.y -= p.v;
                if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(228,255,26,${p.a})`;
                ctx.fill();
            }
            raf = requestAnimationFrame(draw);
        };
        addEventListener('resize', resize);
        draw();
        return { stop() { cancelAnimationFrame(raf); removeEventListener('resize', resize); } };
    })();

    /* ---------- 3D hero scene ---------- */
    hero3d = initHero3D($('.hero-canvas'));

    /* ---------- Loader sequence ---------- */
    const pageLoaded = new Promise(res => {
        if (document.readyState === 'complete') res();
        else addEventListener('load', res, { once: true });
        setTimeout(res, 4000); // never hold the page hostage to a slow asset
    });

    const finishLoading = () => {
        loaderParticles.stop();
        $('.loader').remove();
        document.body.classList.remove('is-loading');
        if (lenis) lenis.start();
        if (hasST) ScrollTrigger.refresh();
    };

    if (!hasGsap || reduceMotion) {
        pageLoaded.then(() => { finishLoading(); $('.loader-wipe').remove(); });
    } else {
        const counter = { v: 0 };
        const num = $('.loader-num');
        const tl = gsap.timeline();
        tl.to('.loader-logo path', { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' })
          .to('.loader-name span', { y: 0, duration: 1, ease: 'expo.out' }, .3)
          .to(counter, { v: 100, duration: 2, ease: 'power2.inOut', onUpdate: () => {
              num.textContent = String(Math.round(counter.v)).padStart(3, '0');
          } }, 0)
          .to('.loader-bar i', { scaleX: 1, duration: 2, ease: 'power2.inOut' }, 0);

        Promise.all([tl.then(), pageLoaded]).then(() => {
            gsap.timeline()
                .to('.loader-inner', { y: -40, opacity: 0, duration: .6, ease: 'power3.in' })
                .to('.loader-wipe', { scaleY: 1, duration: .7, ease: 'power4.inOut' }, '-=.2')
                .add(finishLoading)
                .set('.loader-wipe', { transformOrigin: 'top' })
                .to('.loader-wipe', { scaleY: 0, duration: .9, ease: 'power4.inOut' })
                .add(heroIntro, '<')
                .add(() => $('.loader-wipe').remove());
        });
    }

    /* ---------- Hero intro ---------- */
    function heroIntro() {
        if (!hasGsap) return;
        gsap.from('.hero-title .w > span', { yPercent: 115, rotate: 4, duration: 1.3, ease: 'expo.out', stagger: .07 });
        gsap.from('.hero-in', { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .12, delay: .35 });
        gsap.from('.hero-meta .float-card', { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .15, delay: .6 });
        gsap.from('.nav .wrap', { y: -80, opacity: 0, duration: 1.1, ease: 'expo.out', delay: .2 });
        if (hero3d) hero3d.intro();
    }

    if (!hasGsap) return;

    /* ---------- Scroll-triggered reveals ---------- */
    if (hasST && !reduceMotion) {
        $$('.split').filter(el => !el.classList.contains('hero-title')).forEach(el => {
            gsap.from($$('.w > span', el), {
                yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: .06,
                scrollTrigger: { trigger: el, start: 'top 85%' }
            });
        });

        $$('.reveal').forEach(el => gsap.from(el, {
            y: 40, opacity: 0, duration: 1, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%' }
        }));

        gsap.from('.stat', {
            y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1,
            scrollTrigger: { trigger: '.stats', start: 'top 85%' }
        });

        gsap.from('.step', {
            y: 70, opacity: 0, rotateX: -20, transformPerspective: 800, duration: 1.1, ease: 'expo.out', stagger: .12,
            scrollTrigger: { trigger: '.process-grid', start: 'top 85%' }
        });

        // Timeline: the line draws as you scroll, items slide in
        gsap.to('.timeline-line i', {
            scaleY: 1, ease: 'none',
            scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 60%', scrub: true }
        });
        $$('.tl-item').forEach(item => gsap.from(item, {
            x: -40, opacity: 0, duration: .9, ease: 'expo.out',
            scrollTrigger: { trigger: item, start: 'top 80%' }
        }));

        // Parallax depth on the about cutout layers
        gsap.to('.cutout-stage .l-back', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.about-visual', scrub: true } });
        gsap.to('.cutout-stage .l-front', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.about-visual', scrub: true } });

        // Footer wordmark slides across
        gsap.from('.footer-big', { xPercent: 20, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

        // Hide the nav when scrolling down, show it when scrolling up
        const nav = $('.nav');
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: self => nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 300 && !menu.classList.contains('is-open'))
        });

        // Horizontal services track on wide screens; native swipe on small ones
        const mm = gsap.matchMedia();
        mm.add('(min-width: 901px)', () => {
            const track = $('.h-track');
            const distance = () => Math.max(0, track.scrollWidth - innerWidth);
            gsap.to(track, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: '.services', start: 'top top', end: () => '+=' + distance(),
                    pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
                }
            });
        });
    }

    /* ---------- Animated counters ---------- */
    $$('.count').forEach(el => {
        const to = parseFloat(el.dataset.to);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const format = v => decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
        if (!hasST || reduceMotion) { el.textContent = format(to); return; }
        const obj = { v: 0 };
        ScrollTrigger.create({
            trigger: el, start: 'top 90%', once: true,
            onEnter: () => gsap.to(obj, { v: to, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = format(obj.v); } })
        });
    });

    /* ---------- Infinite marquees (speed up with scroll velocity) ---------- */
    $$('.marquee-track').forEach(track => {
        const group = $('.marquee-group', track);
        track.append(group.cloneNode(true));
        const dir = track.classList.contains('reverse') ? 1 : -1;
        const loop = gsap.fromTo(track, { xPercent: dir === -1 ? 0 : -50 }, { xPercent: dir === -1 ? -50 : 0, duration: 28, ease: 'none', repeat: -1 });
        if (reduceMotion) { loop.pause(); return; }
        if (hasST) ScrollTrigger.create({
            onUpdate: self => {
                const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 5);
                gsap.to(loop, { timeScale: boost, duration: .2, overwrite: true, onComplete: () => gsap.to(loop, { timeScale: 1, duration: 1.2 }) });
            }
        });
    });

    /* ---------- Reviews: Motion in-view spring entrance ---------- */
    if (Motion && Motion.inView && Motion.animate && !reduceMotion) {
        const reviews = $$('.review');
        reviews.forEach(r => { r.style.opacity = '0'; });
        Motion.inView('.review-grid', () => {
            Motion.animate(reviews,
                { opacity: [0, 1], transform: ['perspective(1000px) translateY(80px) rotateX(24deg)', 'perspective(1000px) translateY(0px) rotateX(0deg)'] },
                { duration: 1.1, delay: Motion.stagger ? Motion.stagger(.14) : 0, ease: [.22, 1, .36, 1] });
        }, { amount: .25 });
    }

    // Motion hover springs on process steps
    if (Motion && Motion.animate && finePointer) {
        $$('.step').forEach(step => {
            step.addEventListener('mouseenter', () => Motion.animate(step, { borderColor: getComputedStyle(root).getPropertyValue('--accent').trim() }, { duration: .3 }));
            step.addEventListener('mouseleave', () => Motion.animate(step, { borderColor: 'rgba(128,128,128,.2)' }, { duration: .4 }).then(() => { step.style.borderColor = ''; }));
        });
    }

    if (!finePointer || reduceMotion) return;

    /* ---------- Custom cursor ---------- */
    const dotX = gsap.quickTo('.cursor', 'x', { duration: .12, ease: 'power3' });
    const dotY = gsap.quickTo('.cursor', 'y', { duration: .12, ease: 'power3' });
    const ringX = gsap.quickTo('.cursor-ring', 'x', { duration: .5, ease: 'power3' });
    const ringY = gsap.quickTo('.cursor-ring', 'y', { duration: .5, ease: 'power3' });
    const ring = $('.cursor-ring');
    addEventListener('mousemove', () => document.body.classList.add('cursor-on'), { once: true });
    addEventListener('mousemove', e => { dotX(e.clientX); dotY(e.clientY); ringX(e.clientX); ringY(e.clientY); });
    $$('a, button, [data-tilt], [data-cursor], input, select, textarea').forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
    });

    /* ---------- Magnetic buttons ---------- */
    $$('.magnetic').forEach(el => {
        const label = $('.btn-label', el) || el;
        el.addEventListener('mousemove', e => {
            const r = el.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height / 2);
            gsap.to(el, { x: dx * .3, y: dy * .4, duration: .4, ease: 'power3.out' });
            if (label !== el) gsap.to(label, { x: dx * .15, y: dy * .2, duration: .4, ease: 'power3.out' });
        });
        el.addEventListener('mouseleave', () => {
            gsap.to([el, label], { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .35)' });
        });
    });

    /* ---------- 3D tilt cards + image distortion ---------- */
    const distortMap = $('#distort-map');
    $$('[data-tilt]').forEach(card => {
        const max = parseFloat(card.dataset.tilt) || 10;
        const art = $('.svc-art', card) || $('.photo-media img', card);
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            gsap.to(card, { rotateY: (px - .5) * max * 2, rotateX: (.5 - py) * max * 2, transformPerspective: 1000, duration: .5, ease: 'power2.out' });
            card.style.setProperty('--mx', `${px * 100}%`);
            card.style.setProperty('--my', `${py * 100}%`);
        });
        card.addEventListener('mouseleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: .9, ease: 'elastic.out(1, .5)' }));
        if (art && distortMap) {
            card.addEventListener('mouseenter', () => {
                art.style.filter = 'url(#distort)';
                gsap.fromTo(distortMap, { attr: { scale: 0 } }, {
                    attr: { scale: 26 }, duration: .35, ease: 'power2.out', yoyo: true, repeat: 1,
                    onComplete: () => { art.style.filter = ''; }
                });
            });
        }
    });

    /* ---------- Mouse parallax on hero floating cards ---------- */
    const floatCards = $$('.hero-meta .float-card');
    addEventListener('mousemove', e => {
        const nx = e.clientX / innerWidth - .5;
        const ny = e.clientY / innerHeight - .5;
        floatCards.forEach(c => {
            const d = parseFloat(c.dataset.depth) || 1;
            gsap.to(c, { x: nx * 30 * d, y: ny * 30 * d, rotateY: nx * 10, rotateX: -ny * 10, transformPerspective: 800, duration: 1, ease: 'power3.out' });
        });
    });
})();

/* All-services catalog: category filter + "Book this" prefill */
(() => {
    const grid = document.querySelector('.catalog-grid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll('.photo-card')];
    const chips = [...document.querySelectorAll('.chip')];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    chips.forEach(chip => chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.toggle('is-active', c === chip));
        const cat = chip.dataset.filter;
        const shown = cards.filter(card => {
            const match = cat === 'all' || card.dataset.cat === cat;
            card.hidden = !match;
            return match;
        });
        if (window.Motion && Motion.animate && !reduce) {
            Motion.animate(shown, { opacity: [0, 1], transform: ['translateY(24px) scale(.97)', 'translateY(0) scale(1)'] },
                { duration: .6, delay: Motion.stagger ? Motion.stagger(.04) : 0, ease: [.22, 1, .36, 1] });
        }
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    }));

    // "Book this" jumps to the quote form with the service filled in
    grid.addEventListener('click', e => {
        const btn = e.target.closest('.photo-book');
        if (!btn) return;
        const service = btn.closest('.photo-card').querySelector('h3').textContent.trim();
        const select = document.getElementById('q-service');
        const msg = document.getElementById('q-msg');
        if (select) select.value = 'Something else';
        if (msg) msg.value = `I need help with: ${service}. `;
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => document.getElementById('q-name')?.focus({ preventScroll: true }), 900);
    });

    // Staggered entrance when the grid first scrolls into view
    if (window.gsap && window.ScrollTrigger && !reduce) {
        gsap.from(cards, {
            y: 50, opacity: 0, duration: .9, ease: 'expo.out', stagger: .05,
            scrollTrigger: { trigger: grid, start: 'top 85%' }
        });
    }
})();

/* Common questions: smooth open/close for <details>, one open at a time */
(() => {
    const items = [...document.querySelectorAll('.faq-item')];
    if (!items.length) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate = window.gsap && !reduce;

    const close = item => {
        const body = item.querySelector('.faq-a');
        if (!canAnimate) { item.open = false; return; }
        gsap.fromTo(body, { height: body.offsetHeight }, {
            height: 0, duration: .45, ease: 'power3.inOut',
            onComplete: () => { item.open = false; gsap.set(body, { clearProps: 'height' }); if (window.ScrollTrigger) ScrollTrigger.refresh(); }
        });
    };
    const open = item => {
        item.open = true;
        if (!canAnimate) return;
        const body = item.querySelector('.faq-a');
        gsap.fromTo(body, { height: 0 }, {
            height: body.scrollHeight, duration: .55, ease: 'power3.out',
            onComplete: () => { gsap.set(body, { clearProps: 'height' }); if (window.ScrollTrigger) ScrollTrigger.refresh(); }
        });
        gsap.fromTo(body.querySelector('p'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .5, delay: .1, ease: 'power3.out' });
    };

    items.forEach(item => item.querySelector('summary').addEventListener('click', e => {
        e.preventDefault();
        if (item.open) { close(item); return; }
        items.filter(other => other !== item && other.open).forEach(close);
        open(item);
    }));

    if (window.gsap && window.ScrollTrigger && !reduce) {
        gsap.from(items, { y: 30, opacity: 0, duration: .8, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: '.faq-list', start: 'top 85%' } });
    }
})();

/* Quote form: kept outside the pointer guard so it works on touch devices too */
(() => {
    const form = document.getElementById('quoteForm');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const missing = [...form.querySelectorAll('[required]')].filter(f => !f.value.trim());
        if (missing.length) {
            missing[0].focus();
            missing.forEach(f => f.animate(
                [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
                { duration: 300 }
            ));
            return;
        }
        const note = form.querySelector('.form-note');
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.querySelector('.btn-label').textContent = 'Sending…';
        setTimeout(() => {
            btn.querySelector('.btn-label').textContent = 'Request received ✓';
            note.className = 'form-note form-success';
            note.textContent = "Thanks! We'll call you back shortly.";
            form.reset();
        }, 1200);
    });
})();

/* ============================================================
   Three.js hero: interactive plumbing sculpture
   ============================================================ */
function initHero3D(container) {
    if (!window.THREE || !container) return null;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
        return null; // no WebGL: the CSS glow background still looks intentional
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
    camera.position.set(0, 0, 16);

    // Simple studio environment so metal reflects light instead of rendering black
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x2a2a2a, side: THREE.BackSide })));
    const panel = (color, pos, size) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
        m.position.set(...pos); m.lookAt(0, 0, 0); envScene.add(m);
    };
    panel(0xffffff, [0, 12, 4], [14, 6]);
    panel(0xe4ff1a, [-12, 2, 2], [6, 12]);
    panel(0xbfd8ff, [12, -2, 6], [5, 10]);
    scene.environment = pmrem.fromScene(envScene, .04).texture;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, .6));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(5, 7, 8);
    scene.add(key);
    const mouseLight = new THREE.PointLight(0xe4ff1a, 2.2, 18, 2);
    scene.add(mouseLight);

    const mats = {
        yellow: new THREE.MeshStandardMaterial({ color: 0xd8f20f, metalness: .45, roughness: .25 }),
        chrome: new THREE.MeshStandardMaterial({ color: 0xd6d9dc, metalness: 1, roughness: .16 }),
        copper: new THREE.MeshStandardMaterial({ color: 0xc8784a, metalness: .9, roughness: .28 }),
        dark:   new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: .6, roughness: .4 })
    };

    const rig = new THREE.Group();
    scene.add(rig);

    // Orthogonal pipe runs with rounded elbows
    const pipeCurve = (pts, bend = .7) => {
        const path = new THREE.CurvePath();
        let start = pts[0].clone();
        for (let i = 1; i < pts.length - 1; i++) {
            const inDir = pts[i].clone().sub(pts[i - 1]).normalize();
            const outDir = pts[i + 1].clone().sub(pts[i]).normalize();
            const a = pts[i].clone().sub(inDir.multiplyScalar(bend));
            const b = pts[i].clone().add(outDir.multiplyScalar(bend));
            path.add(new THREE.LineCurve3(start, a));
            path.add(new THREE.QuadraticBezierCurve3(a, pts[i].clone(), b));
            start = b;
        }
        path.add(new THREE.LineCurve3(start, pts[pts.length - 1].clone()));
        return path;
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const runs = [
        { mat: mats.yellow, r: .26, pts: [V(-7, -3, 0), V(-1.5, -3, 0), V(-1.5, 1.2, 0), V(2.5, 1.2, 0), V(2.5, 1.2, -3), V(2.5, 6, -3)] },
        { mat: mats.chrome, r: .2,  pts: [V(7, -4.2, -1), V(3.2, -4.2, -1), V(3.2, -1, -1), V(3.2, -1, 2), V(-3.5, -1, 2), V(-3.5, 5, 2)] },
        { mat: mats.copper, r: .17, pts: [V(-6, 4.5, -3), V(-4.5, 4.5, -3), V(-4.5, 2.2, -3), V(0.6, 2.2, -3), V(0.6, -6, -3)] }
    ];

    const curves = [];
    runs.forEach(run => {
        const curve = pipeCurve(run.pts);
        curves.push(curve);
        rig.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 260, run.r, 20, false), run.mat));
        // Couplings along each run
        [.18, .45, .78].forEach(t => {
            const p = curve.getPointAt(t);
            const tan = curve.getTangentAt(t);
            const c = new THREE.Mesh(new THREE.CylinderGeometry(run.r * 1.45, run.r * 1.45, .42, 28), mats.dark);
            c.position.copy(p);
            c.quaternion.setFromUnitVectors(V(0, 1, 0), tan);
            rig.add(c);
        });
    });

    // Valve wheel on the yellow run
    const valve = new THREE.Group();
    valve.add(new THREE.Mesh(new THREE.TorusGeometry(.72, .08, 16, 48), mats.chrome));
    for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 1.44, 10), mats.chrome);
        spoke.rotation.z = i * Math.PI / 4;
        valve.add(spoke);
    }
    valve.add(new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .3, 20).rotateX(Math.PI / 2), mats.yellow));
    valve.position.copy(curves[0].getPointAt(.3)).add(V(0, 0, .6));
    rig.add(valve);

    // Glowing water pulses travelling through the pipes
    const pulseGeo = new THREE.SphereGeometry(1, 20, 20);
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0x8fd3ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
    const pulses = [];
    curves.forEach((curve, i) => {
        for (let k = 0; k < 3; k++) {
            const m = new THREE.Mesh(pulseGeo, pulseMat);
            m.scale.setScalar(runs[i].r * 1.25);
            rig.add(m);
            pulses.push({ m, curve, offset: k / 3, speed: .05 + i * .012 });
        }
    });

    // Floating hex nuts
    const nutGeo = new THREE.CylinderGeometry(.34, .34, .22, 6);
    const nuts = [];
    for (let i = 0; i < 16; i++) {
        const nut = new THREE.Mesh(nutGeo, i % 3 === 0 ? mats.yellow : mats.chrome);
        nut.position.set((Math.random() - .5) * 16, (Math.random() - .5) * 10, (Math.random() - .5) * 8 - 1);
        nut.rotation.set(Math.random() * 6, Math.random() * 6, 0);
        nut.userData = { spin: V((Math.random() - .5) * .8, (Math.random() - .5) * .8, 0), bob: Math.random() * Math.PI * 2, y: nut.position.y };
        rig.add(nut);
        nuts.push(nut);
    }

    // Floating particles
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - .5) * 26;
        positions[i * 3 + 1] = (Math.random() - .5) * 16;
        positions[i * 3 + 2] = (Math.random() - .5) * 14;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xe4ff1a, size: .045, transparent: true, opacity: .75, depthWrite: false });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Layout: sculpture sits right of the headline on wide screens
    let baseX = 0, baseY = 0, baseScale = 1;
    const resize = () => {
        const w = container.clientWidth, h = container.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        if (w > 1024) { baseX = 4.4; baseY = -.3; baseScale = .7; }
        else if (w > 640) { baseX = 2.6; baseY = -1.8; baseScale = .6; }
        else { baseX = .6; baseY = -3.6; baseScale = .46; }
        rig.position.set(baseX, baseY, 0);
        rig.scale.setScalar(baseScale);
    };
    resize();
    addEventListener('resize', resize);

    // Mouse-reactive rotation
    const mouse = { x: 0, y: 0 };
    addEventListener('pointermove', e => {
        mouse.x = e.clientX / innerWidth * 2 - 1;
        mouse.y = -(e.clientY / innerHeight * 2 - 1);
    });

    // Scroll: sculpture drifts up and back as the hero leaves
    const scrollState = { y: 0, z: 0 };
    if (window.gsap && window.ScrollTrigger && !reduceMotion) {
        gsap.to(scrollState, { y: 4, z: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }

    // Only render while the hero is on screen
    let visible = true;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(container);

    const clock = new THREE.Clock();
    const render = () => {
        const t = clock.getElapsedTime();
        rig.rotation.y += ((mouse.x * .45 + Math.sin(t * .2) * .08) - rig.rotation.y) * .05;
        rig.rotation.x += ((-mouse.y * .25) - rig.rotation.x) * .05;
        rig.position.y = baseY + scrollState.y;
        rig.position.z = scrollState.z;
        mouseLight.position.set(mouse.x * 8, mouse.y * 5, 5);

        pulses.forEach(p => p.m.position.copy(p.curve.getPointAt((t * p.speed + p.offset) % 1)));
        nuts.forEach(n => {
            n.rotation.x += n.userData.spin.x * .02;
            n.rotation.y += n.userData.spin.y * .02;
            n.position.y = n.userData.y + Math.sin(t * .8 + n.userData.bob) * .25;
        });
        valve.rotation.z = t * .6;
        particles.rotation.y = t * .02;
        particles.position.y = Math.sin(t * .3) * .3;

        renderer.render(scene, camera);
    };

    let started = false;
    const loop = () => {
        requestAnimationFrame(loop);
        if (visible && !document.hidden) render();
    };

    const api = {
        setTheme(theme) {
            pMat.color.set(theme === 'light' ? 0x3a3a3a : 0xe4ff1a);
            pMat.opacity = theme === 'light' ? .45 : .75;
            mats.dark.color.set(theme === 'light' ? 0x2a2a2a : 0x1c1c1e);
        },
        intro() {
            if (!window.gsap || reduceMotion) return;
            gsap.from(rig.scale, { x: .01, y: .01, z: .01, duration: 2, ease: 'expo.out' });
            gsap.from(rig.rotation, { y: -2.4, duration: 2.4, ease: 'expo.out' });
        }
    };
    api.setTheme(document.documentElement.dataset.theme);

    if (reduceMotion) { render(); }
    else if (!started) { started = true; loop(); }
    return api;
}
