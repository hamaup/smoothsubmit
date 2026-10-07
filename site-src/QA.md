# Introduction page verification

Checked on 2026-10-07 with the Codex in-app browser.

## Rendered pages

Japanese and English, each at 1440×900 and 390×900, were inspected as full-page and first-viewport captures. Self-hosted fonts loaded; no global horizontal overflow or missing section anchors. A single correction batch compacted the mobile cover, followed by one confirmation capture round. The separate Impeccable reviewer scored the mobile first-viewport fix resolved.

At 390×900, the Japanese demo explanatory body was visible from y734–779; English from y810–856. Both first viewports show the product purpose, Skill action, illustrative-example label, three stages and meaningful finding text.

## Functional checks

- Audit → Fix click reveals the proposed change.
- ArrowRight selects Verify; unknown conditions remain visible.
- Home restores the Audit tab and keyboard focus.
- Claude Code selection displays `.claude/skills/smoothsubmit/`.
- Cursor selection displays `.cursor/skills/smoothsubmit/` and its invocation.
- Copy audit prompt announces success.
- Native FAQ expands.
- English → Japanese navigation opens the correct static route and title.
- No browser console warnings or errors during these interactions.

The downloaded alpha.2 Skill archive was inspected and contains `smoothsubmit/SKILL.md`, `references/` and `assets/`, matching the page's installation instructions.

## Limits

This verifies the introduction page, not App Store approval or live agent-host discovery. The 57 automated tests and 9 injected-defect results shown on the page refer to the documented alpha.2 product validation, not new website tests. No real user repository is sent to the website or audited by the demo.

## Public deployment

[GitHub Pages deployment](https://github.com/hamaup/smoothsubmit/actions/runs/37574264823) succeeded. Both public language routes, CSS, JavaScript, two fonts, favicon and sitemap returned HTTP 200 and matched their local file hashes. The repository homepage points to the live site.

## Brand and installation update — 2026-10-07

The user delegated brand decisions and reported confusion between the start, Skill, and GitHub source actions. The update uses cobalt for the product, lime for next actions, Bricolage Grotesque for Latin display lettering, and locally served Zen Kaku Gothic New 400/500/700 for body and Japanese display. Resolved status uses a separate teal pair.

All three prominent entry links now share one localized label and #start destination. The installation guide orders tool choice, download/placement, then audit instructions. Source code, releases, and optional CLI information sit in a closed supplemental disclosure.

Japanese and English full pages, first viewports and installation views were inspected at 1440×900 and 390×900. No global horizontal overflow; fonts loaded. Initial installation captures were taken during smooth scrolling and discarded, then recaptured after anchors were made instant. Actual host selection, native radio arrow navigation, localized download labels, placement paths, prompt copying, and destination copying were verified. Copied values matched the displayed strings for all three hosts in both locales. One initial immediate clipboard read was stale; a focused recheck confirmed the exact Japanese Claude Code prompt. The supplemental disclosure, main guide link, and demo keyboard navigation worked. Browser logs showed no warnings or errors.

Contrast ratios: white/cobalt 7.39:1; supporting cover copy/cobalt 6.01:1; ink/lime 11.48:1; muted/paper 6.44:1; resolved text/surface 5.26:1; failed text/surface 6.71:1. The final detector emitted only warnings for the existing offset ink shadow and full-bleed sections; rendered section gutters and offset soft elevation were supplied to the independent reviewer as corroborating evidence. No second detector was run.

The independent Impeccable finish review found no material UI fix and requested that the visual documentation match the new brand. The documenter refreshed site-src/DESIGN.md and its token/component sidecar; the reviewer scored that persistence fix resolved with disposition `ship`.

The browser tests verify the guide and its controls, not live installation/discovery in each coding agent. Product validation claims remain the bounded alpha.2 results above.
