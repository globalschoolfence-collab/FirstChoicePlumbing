/* First Choice Plumbing — Main JS */

// Mobile nav toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = navLinks.classList.contains('open') ? 'rotate(45deg) translate(5px,5px)' : '';
        spans[1].style.opacity = navLinks.classList.contains('open') ? '0' : '';
        spans[2].style.transform = navLinks.classList.contains('open') ? 'rotate(-45deg) translate(5px,-5px)' : '';
    });
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
}

// In-page links (e.g. "Get Free Quote" → #contact) scroll smoothly without adding #section to the address bar
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
}));

// Counter animation
function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        let current = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = current + suffix;
            if (current >= target) clearInterval(timer);
        }, 25);
    });
}

const countersSection = document.querySelector('.hero-stats');
if (countersSection) {
    const counterObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            animateCounters();
            counterObserver.disconnect();
        }
    }, { threshold: .5 });
    counterObserver.observe(countersSection);
}

// Scroll reveal
const revealEls = document.querySelectorAll('.service-card, .why-card, .testimonial-card, .process-step, .about-feature, .contact-card');
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('revealed'), i * 60);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: .1 });
revealEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    revealObserver.observe(el);
});

// Contact form: emails each request to the business inbox via the sendQuote Cloud Run function (1stchoicefunctions/)
const QUOTE_ENDPOINT = 'https://us-central1-stchoiceps.cloudfunctions.net/sendplumbingquote';
// Same checks as the sendQuote function: 10-digit US number (area code and exchange don't start with 0/1)
const isValidPhone = d => /^[2-9]\d{2}[2-9]\d{6}$/.test(d) && !/^(\d)\1{9}$/.test(d);
const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v);
// Cloudflare Turnstile CAPTCHA: paste the site key here (and set TURNSTILE_SECRET on the function) to turn it on
const TURNSTILE_SITE_KEY = '';
const form = document.getElementById('contactForm');
if (form) {
    const btn = form.querySelector('.form-submit');
    const btnHTML = btn.innerHTML;
    let captcha = null;
    if (TURNSTILE_SITE_KEY) {
        captcha = Object.assign(document.createElement('div'), { className: 'cf-turnstile' });
        captcha.dataset.sitekey = TURNSTILE_SITE_KEY;
        captcha.style.marginBottom = '1rem';
        btn.before(captcha);
        document.head.append(Object.assign(document.createElement('script'), { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js', async: true }));
    }

    // Phone: digits only, shown as (330) 350-1111; must be a valid 10-digit US number (same rule as the server)
    const phone = form.querySelector('input[type="tel"]');
    if (phone) {
        Object.assign(phone, { inputMode: 'numeric', autocomplete: 'tel-national' });
        phone.addEventListener('input', () => {
            let d = phone.value.replace(/\D/g, '');
            d = d.replace(/^1/, ''); // +1 country code (US area codes never start with 1)
            d = d.slice(0, 10);
            phone.value = d.length > 6 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
                        : d.length > 3 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : d;
            phone.setCustomValidity(!d || isValidPhone(d) ? '' : 'Please enter a valid 10-digit phone number, e.g. (330) 350-1111.');
        });
    }
    // Email is optional, but if given it must look like name@domain.com
    const email = form.querySelector('input[type="email"]');
    if (email) {
        email.addEventListener('input', () => {
            const v = email.value.trim();
            email.setCustomValidity(!v || isValidEmail(v) ? '' : 'Please enter a valid email address, e.g. name@example.com.');
        });
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        btn.textContent = 'Sending...';
        btn.disabled = true;
        const data = Object.fromEntries(new FormData(form));
        data.page = document.title;
        // Give up after 15s so the button never hangs if the email service is down
        const timeout = new AbortController();
        const timer = setTimeout(() => timeout.abort(), 15000);
        try {
            const res = await fetch(QUOTE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(data),
                signal: timeout.signal
            });
            clearTimeout(timer);
            const reply = await res.json().catch(() => ({}));
            if (!res.ok || reply.success !== true) throw new Error(reply.error || `HTTP ${res.status}`);
            btn.textContent = 'Message Sent! We\'ll call you shortly.';
            btn.style.background = '#16a34a';
            form.reset();
        } catch (err) {
            btn.innerHTML = btnHTML;
            btn.disabled = false;
            console.warn('Quote form not delivered:', err.message);
            alert(`Sorry, your request could not be sent (${err.name === 'AbortError' ? 'timed out' : err.message}). Please call us at (330) 350-1111.`);
        } finally {
            if (captcha && window.turnstile) turnstile.reset(captcha); // each token works once
        }
    });
}
