# SmoothSubmit brand

## Value

SmoothSubmit adds an evidence-led App Store submission audit to the coding agent a developer already uses. Its promise is to help discover risks before submission, explain fixes, and verify the requested changes. Reduced resubmission work and waiting are intended benefits; they have not been measured. Never imply guaranteed approval or Apple affiliation.

Japanese lead: 「提出前に、気づく。修正と再確認まで。」

English lead: “Catch risks early. Fix. Then verify.”

## Color

| Role            | Color              | Use                                                                        |
| --------------- | ------------------ | -------------------------------------------------------------------------- |
| Primary         | Cobalt #1246D3     | Cover, links, selection, evidence framing                                  |
| Action          | Lime #C5E869       | The next useful action, such as opening the guide or downloading the Skill |
| Text            | Ink #12223B        | Main text on light surfaces                                                |
| Surface         | Cool paper #F5F7FA | Instructions and technical reference                                       |
| Supporting text | #4C5B70            | Secondary text on light surfaces                                           |
| Rules           | #CCD4DF            | Content separation                                                         |
| Resolved status | #176D67 on #E1F1EC | Explicit resolved label; separate from action lime                         |
| Failed status   | #972134 on #FEE3E6 | Explicit failure label                                                     |

Color always accompanies text for audit status. Lime marks an action, not an approval result. On cobalt, use white primary text and #DEE8FF supporting text.

## Typography

- Latin display and wordmark: Bricolage Grotesque, weight 700.
- Japanese headings: Zen Kaku Gothic New, weight 700.
- Body: Zen Kaku Gothic New, weight 400; supporting emphasis uses 500 or 700.
- Paths and code: system monospace.

Serve the licensed font subsets locally. Preserve locale-specific headline metrics. Font licenses live in site/assets/fonts/; implemented tokens live in site/assets/style.css and site-src/DESIGN.md.

## First-use flow

Every prominent site entry says 「導入手順を見る」 / “View installation guide” and opens the same installation section. The guide presents one sequence: choose the coding agent → download and place the complete Skill folder → copy the agent-specific audit instruction. Source code, release details, and the optional CLI are supplemental links under a disclosure.

The introduction site describes and demonstrates the workflow. It does not inspect repositories, install the Skill, or execute an audit. Basic Skill use does not require installing the CLI. A normal audit proposes changes; actual source edits require an explicit request.

## Authority

Decided and applied on 2026-10-07 after the user delegated brand selection and requested that it be reflected on the site. This document defines the brand direction; the root DESIGN.md remains the product's technical design.
