# strftime

Interactive `strftime` format builder — a homemade engine, plain-language explanations and C / Python / Ruby compatibility for every directive.

## Features

- Bidirectional builder: a free-text field tokenized live, clickable and reorderable pieces (drag and drop), editable literal text.
- Teaching popover on every piece: description, note, live value, range, per-dialect compatibility, padding (`-`, `_`, `0`), case (`^`, `#`) and minimum-width controls.
- Live preview: real-time clock or custom date, selectable render locale (C/POSIX, browser, fifteen locales), copy the format, the result or a shareable link (`?f=`).
- Palette of the 48 directives by category, filterable by dialect (C / glibc, Python, Ruby), full-text search and command palette (Ctrl K).
- Full reference: live output, explanations, ranges, compatibility badges, flags and width, presets (ISO 8601, RFC 2822, epoch...).
- Pure TypeScript `strftime` engine (`src/lib/strftime.ts`): glibc dialect plus Ruby (`%L`, `%N`, `%v`, `%+`, `%::z`) and Python (`%f`) extensions, wired C locale and locales through `Intl`, verified byte for byte against the `date` command (glibc) across several time zones.
- English / French i18n (next-intl, `/en/` and `/fr/` routes), light / dark theme (next-themes), neo-brutalist design driven solely by the tokens in `globals.css`, arcade loader and custom scrollbar.

## Stack

Next.js 16 (App Router, static export), React 19, strict TypeScript, Tailwind CSS v4, shadcn/ui (new-york, Radix primitives via `radix-ui`), next-intl, next-themes, dnd-kit, cmdk, sonner, lucide-react.

## Scripts

| Script           | Description                                |
| ---------------- | ------------------------------------------ |
| `npm run dev`    | Dev server on `127.0.0.1:5642`             |
| `npm run build`  | Production build (static export to `out/`) |
| `npm run start`  | Serve `out/` on port 5643                  |
| `npm run check`  | `tsc --noEmit` + ESLint + Prettier (check) |
| `npm run format` | Prettier + ESLint (write)                  |

## Structure

```
messages/            i18n messages (en.json, fr.json)
src/app/(en)/        Root layout + page for the default locale, served at /
src/app/(fr)/fr/     Root layout + page for the French locale, served at /fr
src/components/      Feature components (builder, chip, preview, shell, palette...)
src/components/ui/   Generated shadcn/ui components
src/data/            Directive catalog and presets
src/hooks/           useNow (hydration-safe clock)
src/i18n/            next-intl routing and request
src/lib/             strftime engine, metadata, utilities
```

## Notes

- Static export: no middleware, `localePrefix: "as-needed"`. The default locale (en) is served at `/`, French at `/fr/`; each locale is a distinct root layout sharing the `Shell` component. The language selector reloads the page (root layout switch) while keeping `?f=`.
- Keyboard shortcuts: `Ctrl K` (search), `Alt+L` (language), `Alt+T` (theme).
- The directive catalog was checked against `man 3 strftime` (glibc), Python's format codes table and Ruby's `strftime` reference, and the engine is tested byte for byte against the `date` command.
