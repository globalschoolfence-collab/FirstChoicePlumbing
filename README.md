# First Choice Plumbing & Excavating Co

Static website for First Choice Plumbing & Excavating Co. No build step: plain HTML, CSS and JavaScript.

## Structure

- `index.html`, `about.html`, `services.html`, `gallery.html`, `contact.html` — the classic multi-page site (`css/styles.css`, `js/main.js`)
- `premium/` — the animated single-page site: loader, 3D hero (Three.js), GSAP scroll animations, Lenis smooth scroll, Motion hover effects, services catalog, FAQ
- `images/` — owner photos; `premium/images/services/` — service photos

## Run locally

```bash
npx serve -l 8080 .
```

Then open http://localhost:8080/ (classic site) or http://localhost:8080/premium/ (premium site). Pages use clean URLs (`/about`, not `about.html`), which GitHub Pages and `serve` both support; `python3 -m http.server` does not.

## Quote forms

The quote forms on the classic and premium sites send their data to a small serverless function (`1stchoicefunctions/`), which emails each request to the business inbox. Deployment and account details are kept outside this repository.
