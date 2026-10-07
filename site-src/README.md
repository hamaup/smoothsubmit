# Introduction site

Live: [Japanese](https://hamaup.github.io/smoothsubmit/) / [English](https://hamaup.github.io/smoothsubmit/en/).

`content.mjs` contains the translated copy. `render.mjs` renders static, independently crawlable routes to `site/index.html` and `site/en/index.html`. Both remain readable without JavaScript. `site/assets/app.js` adds the demo tabs, host placement selector and copy feedback. No external scripts, analytics or hosted font requests are used.

## Edit and preview

```sh
node site-src/render.mjs
npx prettier --write site/index.html site/en/index.html
python3 -m http.server 54369 --directory site
```

Open `http://localhost:54369/` and `/en/`. The generated HTML is committed. `.github/workflows/pages.yml` publishes only `site/` on matching main-branch pushes; internal product/spec/design documents and review captures are not deployed.

To add a language, add its complete content record, extend route and alternate-link generation, and localize the small interactive strings in `app.js`. Do not translate rule IDs, product names or command paths.

## Fonts

Self-hosted WOFF2 subsets are derived from the official Google Fonts sources: [Bricolage Grotesque](https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque) and [Zen Kaku Gothic New](https://github.com/google/fonts/tree/main/ofl/zenkakugothicnew). Their SIL Open Font Licenses are shipped in `site/assets/fonts/`. The subsets include the initial Japanese and English page text; when adding Japanese characters, regenerate the Japanese subset with FontTools or use the full licensed font. Body copy uses platform fonts.

The original font filenames are `BricolageGrotesque[opsz,wdth,wght].ttf` and `ZenKakuGothicNew-Bold.ttf`. FontTools `subset` was used with WOFF2 flavor and layout features retained. No other font modifications were made.

## Scope

The public page describes alpha.2. Keep capability statements aligned with `docs/RELEASE_STATUS.md` and experiment claims aligned with the tagged validation report. The web demo is illustrative and performs no audit or source inspection.

`DESIGN.md` in this directory records the website's visual system. The root `DESIGN.md` remains the product's technical design.
