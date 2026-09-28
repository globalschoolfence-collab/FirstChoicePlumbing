# First Choice Plumbing

Static website for First Choice Plumbing. No build step: plain HTML, CSS and JavaScript.

## Structure

- `index.html`, `about.html`, `services.html`, `gallery.html`, `contact.html` — the classic multi-page site (`css/styles.css`, `js/main.js`)
- `premium/` — the animated single-page site: loader, 3D hero (Three.js), GSAP scroll animations, Lenis smooth scroll, Motion hover effects, services catalog, FAQ, dark/light mode
- `images/` — owner photos; `premium/images/services/` — service photos (credits listed in the premium site footer)

## Run locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/ (classic site) or http://localhost:8080/premium/ (premium site).

## Notes

- The quote forms show a success message but do not send data yet; connect them to a backend or a form service before going live.
- Phone numbers, address and email are placeholders.
