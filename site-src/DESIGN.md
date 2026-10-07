---
name: SmoothSubmit website
description: A practical field guide to auditing iOS submission risks.
colors:
  blue: "#1246d3"
  ink: "#12223b"
  paper: "#f5f7fa"
  lime: "#c5e869"
  muted: "#4c5b70"
  line: "#ccd4df"
  white: "white"
  cover-copy: "#dee8ff"
  selected-surface: "#e5ecfd"
  technical-surface: "#e8edf4"
  code-surface: "#e8edf5"
  fail-surface: "#fee3e6"
  fail-text: "#972134"
  proposal-surface: "#e2eafe"
  proposal-text: "#1741a4"
  resolved-surface: "#e1f1ec"
  resolved-text: "#176d67"
  lime-hover: "#d6f494"
typography:
  display-ja:
    fontFamily: "Bricolage, Zen, sans-serif"
    fontSize: "clamp(35px, 4.4vw, 64px)"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  display-en:
    fontFamily: "Bricolage, Zen, sans-serif"
    fontSize: "clamp(40px, 5.7vw, 80px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Bricolage, Zen, sans-serif"
    fontSize: "clamp(30px, 3.3vw, 48px)"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bricolage, Zen, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.025em"
  body:
    fontFamily: 'Zen, -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.8
  supporting:
    fontFamily: 'Zen, -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif'
    fontSize: "14px"
    lineHeight: 1.8
  technical-body:
    fontFamily: 'Zen, -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif'
    fontSize: "13px"
    lineHeight: 1.75
  label:
    fontFamily: 'Zen, -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif'
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.03em"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "13px"
rounded:
  compact: "4px"
  field: "5px"
  action: "6px"
  path: "8px"
  prompt: "10px"
  demo: "12px"
spacing:
  compact: "8px"
  label: "12px"
  row: "16px"
  content: "20px"
  action: "24px"
  block: "28px"
  section-mobile: "65px"
  section-desktop: "110px"
components:
  button-lime:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.action}"
    padding: "13px 24px"
  button-lime-hover:
    backgroundColor: "{colors.lime-hover}"
  copy-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
    rounded: "{rounded.compact}"
    padding: "8px 12px"
  audit-demo:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.demo}"
  stage-selected:
    backgroundColor: "{colors.selected-surface}"
    textColor: "{colors.blue}"
    padding: "14px 10px"
  status-fail:
    backgroundColor: "{colors.fail-surface}"
    textColor: "{colors.fail-text}"
    typography: "{typography.label}"
    rounded: "{rounded.compact}"
    padding: "3px 8px"
  status-proposal:
    backgroundColor: "{colors.proposal-surface}"
    textColor: "{colors.proposal-text}"
    typography: "{typography.label}"
    rounded: "{rounded.compact}"
    padding: "3px 8px"
  status-resolved:
    backgroundColor: "{colors.resolved-surface}"
    textColor: "{colors.resolved-text}"
    typography: "{typography.label}"
    rounded: "{rounded.compact}"
    padding: "3px 8px"
  agent-choice:
    rounded: "{rounded.action}"
    padding: "10px 22px"
  agent-choice-selected:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.action}"
    padding: "10px 22px"
  install-path:
    backgroundColor: "{colors.technical-surface}"
    rounded: "{rounded.path}"
    padding: "18px"
  prompt-box:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.prompt}"
    padding: "24px"
  prompt-copy-button:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    padding: "8px 12px"
---

# Design System: SmoothSubmit website

## Overview

**Creative North Star: "Practical Field Guide"**

This records the website system implemented after the user delegated the SmoothSubmit brand decision. Brand authority is maintained in `../docs/BRAND.md`; this document captures the actual Japanese and English static site. Cobalt covers, lime actions and cool technical pages make an evidence-led developer guide easy to scan at a desk.

Strong display lettering introduces the subject; compact technical text carries findings, evidence and installation instructions. Ruled lists and a real table support comparison. The interactive audit example is explicitly illustrative: the visual system keeps status, evidence and remaining unknowns visible without presenting the page as an audit tool.

**Key Characteristics:**

- Committed cobalt surfaces with lime actions and cool paper content.
- Locally hosted Bricolage Latin display and Zen Japanese headings/body, with independent locale headline metrics.
- Ordered first-use steps and one consistent installation-guide entry.
- Ruled reference material and a single elevated audit example.
- Visible keyboard focus, semantic controls and reduced-motion support.

## Colors

The palette pairs saturated cobalt and lime with cool neutral technical surfaces; the frontmatter preserves the source values.

### Primary

- **Cobalt Blue** (`blue`): cover and closing surfaces, links, selected controls and focus outlines on light backgrounds.
- **Fresh Lime** (`lime`): the next useful action, including the guide entry, Skill download and prompt copy. The cover headline and large Verify lettering are white. The built site also uses lime for selection and focus outlines on cover surfaces; these utility treatments do not represent a finding result.
- The lime-hover token lightens filled action backgrounds on hover.

### Neutral

- **Deep Ink** (`ink`): principal text and the dark prompt container.
- **Cool Paper** (`paper`): page and audit-example surface.
- **Slate Copy** (`muted`): evidence, descriptions and supporting metadata.
- **Cool Rule** (`line`): divisions between controls, rows and FAQ entries.
- **White** (`white`) and **Pale Cover Copy** (`cover-copy`): text on the cobalt sections.
- **Selected Wash** (`selected-surface`): selected/hovered tabs and selected coding-agent choices.
- **Technical Page** (`technical-surface`) and **Code Wash** (`code-surface`): coverage, table headers, installation paths and code examples.
- The fail, proposal and resolved pairs provide local red, blue and teal status treatments. They communicate the example's state alongside written labels.

### Named Rules

**The Action and Result Rule.** Lime marks an action, never a resolved or approval result. Resolved findings use the teal pair with a written label.

**The Paired Status Rule.** A status uses both its explicit text label and its matched background/text pair; color does not carry the finding alone.

## Typography

**Display Font:** locally hosted Bricolage Grotesque (`Bricolage`) and Zen Kaku Gothic New Bold (`Zen`), with sans-serif fallback.

**Body Font:** locally hosted Zen Kaku Gothic New (`Zen`), with platform Latin/Japanese sans-serif fallbacks as recorded in the frontmatter. Actual supplied weights are (400), (500) and (700).

**Label/Mono Font:** body sans-serif for labels; platform monospace for paths, code and finding identifiers.

The display face supplies broad, confident Latin lettering and a bold Japanese counterpart. Zen body copy uses regular weight (400), with medium/bold emphasis and comfortably spaced lines. The source has no single mathematical scale: roles use fluid headlines plus fixed technical sizes.

### Hierarchy

- **Display:** separate locale tokens govern the cover headline. On mobile, Japanese uses `clamp(28px, 7.9vw, 47px)` with line height (1.5); English uses `clamp(36px, 9.2vw, 55px)` with line height (1.08) and maximum width (13ch).
- **Headline:** section headings use the headline token; FAQ and closing headings have context-specific fluid sizes in the stylesheet.
- **Title:** the audit finding title uses the title token; step headings are larger (30px), coverage titles (26px desktop, 24px mobile).
- **Body:** normal prose uses the body token and a general maximum width (72ch). Supporting material uses the supporting and technical-body roles. Hero supporting text has a narrower maximum width (46ch desktop).
- **Label:** status labels, evidence and small metadata are compact. The reused metadata size is (12px).
- The desktop audit-window project caption still uses an isolated (11px) shorthand; mobile overrides it to (12px). This minor residual drift is recorded here for visibility and is not a reusable typography token.
- **Code:** code samples and paths use monospace; mobile reduces ordinary code from (13px) to (12px). The prominent audit instruction uses a larger fluid code size.

### Named Rules

**The Locale Metrics Rule.** Preserve separate Japanese and English headline sizes and line heights; translating copy does not imply identical text geometry.

## Layout

The site uses centered containers and percentage gutters. The header is capped at (1600px) with (5%) horizontal padding; ordinary content is capped at (1440px) with (6%) padding. Cover content is capped at (1320px), and dense full-width section content at (1267px). At viewport widths above (1600px), full-bleed section gutters grow to keep their content aligned with the cover cap.

Wide layouts pair headings with explanations, and captions with the audit example. The workflow uses three columns, coverage uses ruled paired rows, and FAQ uses two columns. Installation is a single ordered sequence of ruled rows with a narrow number column (38px) and a content column capped at (76ch). Ordinary section padding is the desktop section token; the recurring inner rhythm uses compact gaps and larger (24–36px) group spacing rather than identical cards.

At (1050px) and below, column gaps shrink. At (760px) and below, content stacks, ordinary section padding uses the mobile section token, and navigation moves to a second header row. The cover starts with (28px) top padding. Host information moves below the demo, while the installation-guide action remains ahead of it. Source, release and optional CLI information appears in a collapsed supplemental disclosure after installation. The large Audit/Fix/Verify word sculpture is hidden and a smaller changing summary remains. The table keeps a minimum width (360px) inside an overflow wrapper; code paths wrap anywhere.

Setup rows use (32px) vertical padding and (24px) gaps; mobile changes the number column to (28px), padding to (26px) and gap to (12px). Agent choices wrap. Mobile makes the Skill download full width and places path/prompt code before its copy action. The first viewport composition is recorded in `BRIEF.md`.

## Elevation & Depth

Depth is predominantly tonal and ruled. Lists, tables and FAQ entries are flat. The audit example alone is lifted above the cobalt cover; the dark prompt container adds contrast without another shadow. There are no fixed-offset or decorative shadows.

### Shadow Vocabulary

- **Audit Example Lift** (`0 20px 55px rgba(18, 34, 59, 0.22)`): the illustrative audit window on the cover.

### Named Rules

**The Reference Plane Rule.** Keep reference lists and tables flat; preserve the audit example's distinct elevation rather than spreading its shadow to each content block.

## Shapes

Lightly rounded rectangles contain actions and technical content. Buttons use the action radius; compact labels and copy buttons use the compact radius. The audit example has the largest reusable radius, with clipped interior sections. Installation and prompt containers use intermediate radii. Thin (1px) rules organize content; circular numbered steps use a (28px) outlined circle. Arrow and brand marks are inline SVG; the FAQ plus/minus is CSS geometry.

## Components

### Buttons

Filled actions are compact and confident. Lime is shared by the installation-guide entry and the single Skill download. Guide links in the header, cover and closing section say “View installation guide” / 「導入手順を見る」 and lead to `#start`. Filled actions share the frontmatter padding and radius, minimum height (54px), weight (700), size (15px desktop, 14px mobile) and an inline arrow. The mobile download uses size (13px), padding (13px 16px) and full width. Hover changes background over (0.2s) with the shared easing curve. Text links underline on hover with minimum height (44px). Path copy is paper/blue; prompt copy uses lime/ink on the dark prompt container. Each copy button temporarily disables during its attempt and reports success/failure in its own nearby status region.

### Status Labels

Compact written state markers use the three paired status variants. These are informational labels, not filters or actions.

### Audit Example and Stage Controls

A clipped paper window contains a title row, three equally divided semantic tabs, a finding panel and a next-stage control. Active and hovered tabs use the selected wash; selection also has a cobalt bottom rule (3px). Tabs use Bricolage at (17px desktop, 16px mobile), while finding text uses the denser technical hierarchy. Panels preserve space with minimum height (325px desktop, 320px mobile).

The live site changes the panel and summary together; Left/Right and Home/End operate the tablist with roving focus. The next control cycles Audit → Fix → Verify → Audit. Entering panels use a (0.35s) transition from vertical offset (8px), opacity (0.6) and blur (1px) to rest. Reduced-motion preferences disable this animation and background transitions. Anchor navigation uses immediate scrolling by default (`scroll-behavior: auto`).

### Coding-Agent Choices and Installation Containers

The guide has three numbered steps: choose the coding agent; download and place the complete Skill folder; send the agent-specific audit instruction. Step numbers are filled blue circles (32px desktop, 26px mobile). The first step has a visible fieldset legend. Native radios remain keyboard-operable while their visible labels form rounded outlined choices with minimum height (48px). A selected choice uses cobalt with white text; an unselected hover uses the selected wash. Focus is drawn on the visible label with a (3px) blue outline and (4px) offset.

Changing agent updates the host-labelled download action, destination, hint and prompt, then clears both copy-status messages. The download URL is one shared Skill archive; its label identifies the selected host rather than claiming a separate package. Path and prompt containers expose selectable code plus explicit “Copy destination” / “Copy audit prompt” controls. The path container uses (18px) padding and wrapping flex layout; mobile uses (14px). The dark prompt container uses (24px) padding and (17px) code; mobile uses (18px) padding and (14px) code. Prompt text preserves line breaks. These are display containers, not editable inputs.

Release details, source and optional CLI installation remain inside a closed native details disclosure after the three steps. This preserves one primary path while keeping supplemental methods available.

### Navigation

The header pairs the branded SVG/wordmark with section links and Japanese/English route links. Section links underline on hover; the current language has a thicker underline. Mobile preserves language navigation and wraps section navigation to a second row. A skip link becomes visible when focused. The header is in normal document flow.

### Reference Lists, Table and FAQ

Workflow steps and coverage rows use rules and typography rather than generic repeated cards. The validation table is semantic, left aligned and uses tabular numerals. Native details/summary elements implement FAQ disclosure; a CSS plus changes to minus when open. Every summary has minimum height (44px).

Interactive elements use a visible outline (3px with 5px offset) in blue, or lime on cover/closing backgrounds; agent-choice labels use a (4px) offset. Disabled buttons use opacity (0.55). There are no invented input, error-message, modal or loading-state patterns in this system.

## Do's and Don'ts

### Do:

- **Do** reserve lime for actions and use the teal pair with written resolved status.
- **Do** preserve the paired status label and color treatment.
- **Do** use locally hosted Zen for body/Japanese headings and Bricolage for Latin display, preserving locale-specific metrics.
- **Do** retain Japanese/English route navigation and the shared installation-guide destination.
- **Do** use semantic tabs, a visible radio-group legend and native disclosure with visible keyboard focus.
- **Do** keep the three installation steps ordered and copy feedback next to its own control.
- **Do** keep reference material ruled and flat, with technical code selectable and responsive.
- **Do** honor reduced motion and keep illustrative audit labeling visible.

### Don't:

- **Don't** imply that the illustrative site example reads code or performs a real audit.
- **Don't** replace explicit finding labels or unknowns with color-only status.
- **Don't** force Japanese and English headlines to share identical metrics.
- **Don't** inherit the audit example's shadow onto ordinary lists and table rows.
- **Don't** reuse lime as a resolved-state or approval signal.
- **Don't** imply host-labelled download actions point to different Skill archives.
- **Don't** add competing source, release or CLI actions to the cover.
