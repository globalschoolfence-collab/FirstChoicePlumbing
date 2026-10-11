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

## Notes

- The street address shown on the site ("123 Plumber Way…") is a placeholder.

## Quote form email (Cloud Run)

All three quote forms (`index.html`, `contact.html`, `premium/index.html`) POST JSON to the `sendplumbingquote` Cloud Run function (code in `1stchoicefunctions/`, Google Cloud project `stchoiceps`), which emails the request to `info@1stchoiceplumbingservice.com` over Gmail SMTP. It only accepts requests from `ALLOWED_ORIGIN`, validates phone/email/service, rate-limits by IP, caps emails per hour, and ignores submissions that fill the hidden `website` honeypot field. Its URL is `QUOTE_ENDPOINT` in `js/main.js` and the `fetch(...)` call in `premium/js/premium.js`.

Function settings (environment variables): `ALLOWED_ORIGIN`, `MAIL_TO`, `SMTP_USER` (the sending Gmail address) and `SMTP_PASS` (a Gmail [App Password](https://myaccount.google.com/apppasswords)).

To deploy a change, zip the function and upload it in Cloud Shell (⋮ → Upload):

```bash
# on your machine, from the repo root
(cd 1stchoicefunctions && zip -qX ../1stchoicefunctions.zip index.js package.json package-lock.json)

# in Cloud Shell
rm -rf ~/1stchoicefunctions && mkdir ~/1stchoicefunctions && unzip -o ~/1stchoicefunctions.zip -d ~/1stchoicefunctions
gcloud config set project stchoiceps
gcloud functions deploy sendplumbingquote --gen2 --region=us-central1 --source=$HOME/1stchoicefunctions
```

Existing settings carry over between deploys. Add `--update-env-vars=NAME=value` to change one.

Run locally: `cd 1stchoicefunctions && npm install && ALLOWED_ORIGIN=http://localhost:8080 SMTP_USER=... SMTP_PASS=... npm start`

### Spam protection (Cloudflare Turnstile, off by default)

1. Create a free Turnstile widget at https://dash.cloudflare.com → Turnstile, adding the site's domain.
2. Paste the **site key** into `TURNSTILE_SITE_KEY` in `js/main.js` and `premium/js/premium.js`.
3. Set the **secret key** on the function: `gcloud functions deploy sendplumbingquote --gen2 --region=us-central1 --source=$HOME/1stchoicefunctions --update-env-vars=TURNSTILE_SECRET=YOUR_SECRET`

## Domain

The site is served at `https://1stchoiceplumbingservice.com/` (GitHub Pages custom domain, set by the `CNAME` file). That URL is written into the canonical / social-preview tags of every page, `robots.txt`, `sitemap.xml` and `404.html`; if the domain ever changes, search-and-replace it there and in the function's `ALLOWED_ORIGIN`.

DNS at the domain registrar:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | globalschoolfence-collab.github.io |

Then in GitHub → repo Settings → Pages: custom domain `1stchoiceplumbingservice.com`, and tick **Enforce HTTPS** once the certificate is issued.
