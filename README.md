# Apex Pest Solutions — Website

A premium, production-ready marketing site for **Apex Pest Solutions**, a pest control company serving the Houston Metro area. Built as a fast, fully responsive, accessible single page with **semantic HTML5, modern CSS3, and vanilla JavaScript** — no build step, no framework, zero runtime dependencies.

The differentiator baked into the UX: a **24/7 AI front desk + instant online booking + human handoff**.

## Highlights

- **Pixel-considered hero** with an interactive **Apex AI Assistant** (quick replies, typing indicator, free-text chat, voice input/output, booking + human handoff).
- **Real multi-step booking system** — service → date (custom calendar) → time slot → details (validated) → confirmation with a generated reference number.
- **Conversion-first layout**: sticky navigation, sticky mobile CTA bar, floating AI button, contextual CTAs in every section.
- **Fully responsive** from 320px phones to widescreen, with a deliberate mobile experience (hamburger nav, bottom sheet AI, horizontal pest scroller, one-column cards, 44px+ touch targets, no horizontal overflow).
- **Accessible**: skip link, semantic landmarks, focus-visible styles, focus-trapped modals/sheets, ARIA labels, `prefers-reduced-motion` support.
- **SEO-ready**: descriptive title/meta, Open Graph + Twitter cards, and JSON-LD structured data (`LocalBusiness`/`PestControl`, `Service`, `FAQPage`).
- **Photography with graceful fallback**: real photos (hero, family panel, and an "on the job" gallery) layered over inline-SVG illustrations — if a photo can't load, the on-brand illustration/gradient tile shows instead, so the page never breaks. Every icon and pest glyph is crisp inline SVG.

## File structure

```
.
├── index.html      # Semantic markup, SEO meta, JSON-LD, SVG icon sprite, section content, modal & AI templates
├── styles.css      # Design system (CSS variables), components, responsive rules, motion
├── script.js       # AI assistant, booking flow, form validation, carousel, counters, scroll reveals
├── assets/
│   ├── favicon.svg # Brand mark
│   └── og-image.png# 1200×630 social share image
└── apps-script/    # Google Sheets lead-capture + auto-reply backend (Apps Script)
    ├── Code.gs
    ├── appsscript.json
    └── README.md   # deploy + connect instructions
```

## Design system

All design tokens live as CSS custom properties in `:root` (`styles.css`):

| Token | Value | Use |
| --- | --- | --- |
| `--primary` | `#075B43` | Deep forest green — primary brand |
| `--primary-dark` | `#034635` | Dark sections / hovers |
| `--primary-light` | `#E8F5EF` | Soft green surfaces |
| `--accent` | `#B8F28A` | Lime accent / dark-section CTAs |
| `--text` | `#101918` | Headings & body |
| `--muted` | `#68716F` | Secondary text |
| `--border` | `#E3E8E6` | Hairline borders |

Typography uses **Manrope** (via Google Fonts) with a robust system-font fallback stack and `font-display: swap`.

## Images

The hero, the family/trust panel, and the "on the job" gallery use real photos, each marked with `class="js-photo"` and layered over an inline-SVG (or gradient) fallback. If a photo fails to load, `script.js` adds `.is-failed` to its container and the fallback shows — the page never displays a broken image.

Photos are currently **hotlinked** from a no-key keyword service ([LoremFlickr](https://loremflickr.com)) via `src="https://loremflickr.com/<w>/<h>/<keywords>?lock=<n>"`, with a green brand tint (`.photo-tint`) so varied stock reads on-brand. To use your **own** images (recommended for production):

1. Drop files into `assets/img/` (e.g. `hero.jpg`, `family.jpg`, `work-1.jpg` …).
2. In `index.html`, change each `js-photo` `src` to the local path (e.g. `src="assets/img/hero.jpg"`).

Keep `loading="lazy"` on below-the-fold images and update the `alt` text. Self-hosting removes the external dependency and gives you full control of quality.

## Running locally

No build step. Open `index.html` directly, or serve the folder:

```bash
# Python
python3 -m http.server 8080
# or Node
npx serve .
```

Then visit `http://localhost:8080`. Serving over HTTP (rather than `file://`) is recommended so the browser's Speech Recognition API is available for the AI assistant's voice feature.

## Connecting real backends

The JavaScript is structured so demo behavior can be swapped for live services by editing the `CONFIG` object at the top of `script.js`.

### Forms (contact + booking) → Google Sheets + auto-reply

The included **Google Apps Script backend** captures every submission to a Google Sheet and emails the customer an automatic reply (booking confirmation with reference number, or a contact acknowledgement) plus an internal notification — no server to host. Full setup in **[`apps-script/README.md`](apps-script/README.md)**; then:

```js
CONFIG.forms = {
  endpoint: "https://script.google.com/macros/s/AKfycb…/exec", // your Apps Script /exec URL
  transport: "apps-script",  // preflight-free text/plain POST (required for Apps Script)
  accessKey: null            // optional shared secret; must match SHARED_SECRET in Code.gs
};
```

Prefer a different provider? Point `endpoint` at Web3Forms/Formspree/your CRM and set `transport: "json"` (add your `accessKey` if the provider needs one).

When `endpoint` is `null`, forms run in **demo mode** (validated, with loading/success states, payload logged to the console — no network request). All forms include a hidden honeypot field for basic spam protection, and each payload carries a `formType` (`booking` / `contact`) so the backend can route it.

### AI assistant

```js
CONFIG.ai = {
  endpoint: "https://your-llm-backend/chat" // POST {message, history} -> {reply, chips?, action?}
};
```

When `endpoint` is `null`, the assistant uses a local intent-matching "brain" (`AI` module in `script.js`) that handles booking, pricing estimates by pest type, service areas, hours, safety, guarantees and human handoff. Point it at an LLM/agent endpoint to go live — the response shape (`reply`, optional `chips`, optional `action: "book"`) is documented inline.

Voice input uses the Web Speech `SpeechRecognition` API and voice replies use `SpeechSynthesis`, both feature-detected with graceful fallback to text.

## Browser support

Modern evergreen browsers (Chrome, Edge, Safari, Firefox). Voice features require a browser with the Web Speech API (Chrome/Edge). The layout and all core functionality degrade gracefully where advanced APIs are unavailable.

## Notes

- Contact details, address, license number, review counts and the OG/canonical domain are placeholders — replace with real business data before launch.
- Illustrations are original inline SVG (no stock imagery), so the site ships with no external image dependencies.
