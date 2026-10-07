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
