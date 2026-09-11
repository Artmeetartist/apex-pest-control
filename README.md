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
- **Self-contained visuals**: every icon, pest glyph and illustration is inline SVG — crisp at any resolution, instant load, no external image requests.

## File structure

```
.
├── index.html      # Semantic markup, SEO meta, JSON-LD, SVG icon sprite, section content, modal & AI templates
├── styles.css      # Design system (CSS variables), components, responsive rules, motion
├── script.js       # AI assistant, booking flow, form validation, carousel, counters, scroll reveals
└── assets/
    ├── favicon.svg # Brand mark
    └── og-image.png# 1200×630 social share image
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

### Forms (contact + booking)

```js
CONFIG.forms = {
  endpoint: "https://api.web3forms.com/submit", // Web3Forms / Formspree / your CRM
  accessKey: "your-access-key"                  // optional
};
```

When `endpoint` is `null`, forms run in **demo mode** (validated, with loading/success states, payload logged to the console — no network request). When set, submissions are `POST`ed as JSON. All forms include a hidden honeypot field for basic spam protection.

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
