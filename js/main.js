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

// Active nav link
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            navItems.forEach(a => a.classList.remove('active'));
            const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
            if (active) active.classList.add('active');
        }
    });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => observer.observe(s));

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
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.revealed').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });
});
// Apply revealed
const style = document.createElement('style');
style.textContent = '.revealed { opacity: 1 !important; transform: none !important; }';
document.head.appendChild(style);

// Contact form
const form = document.getElementById('contactForm');
if (form) {
    form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('.form-submit');
        btn.textContent = 'Sending...';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = 'Message Sent! We\'ll call you shortly.';
            btn.style.background = '#16a34a';
            form.reset();
        }, 1400);
    });
}
