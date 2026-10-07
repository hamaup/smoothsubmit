import { mkdir, writeFile } from "node:fs/promises";
import { content } from "./content.mjs";
const repo = "https://github.com/hamaup/smoothsubmit";
const release = `${repo}/releases/tag/v0.1.0-alpha.2`;
const archive = `${repo}/releases/download/v0.1.0-alpha.2/smoothsubmit-skill-0.1.0-alpha.2.tar.gz`;
const esc = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const lines = (s) => esc(s).replaceAll("\n", "<br>");
const arrow =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const mark =
  '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 15l7 7L27 8M6 24h20"/></svg>';
for (const [lang, t] of Object.entries(content)) {
  const prefix = lang === "en" ? "../" : "./";
  const tabs = t.demo
    .map(
      (d, i) =>
        `<button role="tab" id="stage-${i}" aria-selected="${i === 0}" aria-controls="panel-${i}" tabindex="${i === 0 ? 0 : -1}"><span>${i + 1}</span> ${["Audit", "Fix", "Verify"][i]}</button>`,
    )
    .join("");
  const panels = t.demo
    .map(
      (d, i) =>
        `<section role="tabpanel" id="panel-${i}" aria-labelledby="stage-${i}" tabindex="0" ${i ? "hidden" : ""}><div class="finding-meta"><span class="status status-${i}">${d.state}</span><code>ARG-PRIV-001</code></div><h3>${esc(d.title)}</h3><p>${esc(d.body)}</p><pre><code>${esc(d.code)}</code></pre><p class="evidence">${esc(d.note)}</p><div class="unknown">${esc(t.unknown)}</div></section>`,
    )
    .join("");
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title><meta name="description" content="${esc(t.description)}">
<link rel="canonical" href="https://hamaup.github.io/smoothsubmit/${lang === "en" ? "en/" : ""}">
<link rel="alternate" hreflang="ja" href="https://hamaup.github.io/smoothsubmit/">
<link rel="alternate" hreflang="en" href="https://hamaup.github.io/smoothsubmit/en/">
<link rel="alternate" hreflang="x-default" href="https://hamaup.github.io/smoothsubmit/">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(t.title)}"><meta property="og:description" content="${esc(t.description)}"><meta property="og:url" content="https://hamaup.github.io/smoothsubmit/${lang === "en" ? "en/" : ""}">
<meta name="theme-color" content="#1246d3"><link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${prefix}assets/bricolage.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${prefix}assets/style.css"><script src="${prefix}assets/app.js" defer></script>
</head>
<body data-lang="${lang}">
<a class="skip" href="#main">${t.skip}</a>
<header class="header"><a class="brand" href="${prefix}${lang === "en" ? "en/" : ""}" aria-label="SmoothSubmit">${mark}<span>SmoothSubmit</span></a><nav aria-label="${lang === "ja" ? "ページ内" : "Sections"}">${t.nav
    .slice(0, 3)
    .map((n, i) => `<a href="#${["how", "coverage", "proof"][i]}">${n}</a>`)
    .join(
      "",
    )}</nav><div class="header-actions"><div class="languages" aria-label="${t.langLabel}"><a href="${prefix}" lang="ja" ${lang === "ja" ? 'aria-current="page"' : ""}>日本語</a><a href="${prefix}en/" lang="en" ${lang === "en" ? 'aria-current="page"' : ""}>EN</a></div><a class="header-start" href="#start">${t.nav[3]} ${arrow}</a></div></header>
<main id="main">
<section class="cover" aria-labelledby="headline"><div class="cover-heading"><h1 id="headline">${t.headline.map((x) => `<span>${esc(x)}</span>`).join("")}</h1><div class="cover-intro"><p class="intro">${t.intro}</p><p class="lead">${t.lead}</p><div class="actions"><a class="button button-lime" href="#start">${t.cta}${arrow}</a><a class="text-link light" href="${repo}">${t.source}${arrow}</a></div><p class="agent-note">${t.agents}</p></div></div>
<div class="demo-row"><div class="demo-caption"><span class="loop">Audit<br><span class="loop-indent">Fix</span><br><span class="loop-indent-two">Verify.</span></span><p id="demo-summary">${t.demo[0].summary}</p><p class="sample">${t.sample}</p></div><div class="audit-demo" aria-label="${t.demoLabel}"><div class="demo-top"><span>SmoothSubmit Audit</span><span class="demo-project">SampleApp / Release</span></div><div role="tablist" aria-label="${t.demoLabel}" class="stage-tabs">${tabs}</div><h2 class="sr-only">${t.demoLabel}</h2><div class="demo-panels">${panels}</div><div class="demo-bottom"><button id="next-stage" data-next="${t.next}" data-reset="${t.reset}">${t.next}${arrow}</button><span>ILLUSTRATIVE EXAMPLE</span></div></div></div>
<div class="mobile-links"><a class="text-link light" href="${repo}">${t.source}${arrow}</a><p>${t.agents}</p></div><div class="cover-bottom"><span>${t.alpha}</span><span>v0.1.0-alpha.2</span></div></section>
<section id="how" class="section how"><div class="section-heading"><h2>${lines(t.mechanismTitle)}</h2><p>${t.mechanismIntro}</p></div><div class="steps">${t.steps.map((s, i) => `<article><div class="step-title"><span class="step-number">${i + 1}</span><h3>${s[0]}</h3>${i < 2 ? arrow : ""}</div><h4>${s[1]}</h4><p>${s[2]}</p></article>`).join("")}</div></section>
<section id="coverage" class="section coverage"><div class="section-heading"><h2>${lines(t.scopeTitle)}</h2><p>${t.scopeIntro}</p></div><div class="scope-list">${t.scope.map((s) => `<article><h3>${s[0]}</h3><p>${s[1]}</p></article>`).join("")}</div><aside class="boundary"><h3>${t.boundaryTitle}</h3><p>${t.boundary}</p><a class="text-link" href="${repo}/blob/main/docs/RELEASE_STATUS.md">${t.rules}${arrow}</a></aside></section>
<section id="proof" class="section proof"><div class="section-heading"><h2>${lines(t.proofTitle)}</h2><p>${t.proofIntro}</p></div><div class="proof-table-wrap"><table><caption>${t.proofDate}</caption><thead><tr>${t.tableHeaders.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${[
    ["IceCubes", "Dimillian/IceCubesApp"],
    ["KeePassium", "keepassium/KeePassium"],
    ["NetNewsWire", "Ranchero-Software/NetNewsWire"],
  ]
    .map(
      ([name, path]) =>
        `<tr><th scope="row"><a href="https://github.com/${path}">${name}${arrow}</a></th><td>3</td><td>${t.tableResults}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div><div class="proof-details"><div><h3>${t.defectLabel}</h3><p>${t.defects}</p></div><p>${t.proofFoot}</p></div><a class="text-link" href="${repo}/blob/v0.1.0-alpha.2/docs/USEFULNESS_VALIDATION.md">${t.proofLink}${arrow}</a></section>
<section id="start" class="section start"><div class="section-heading"><h2>${lines(t.startTitle)}</h2><p>${t.startIntro}</p></div><div class="actions"><a class="button button-blue" href="${archive}">${t.download}${arrow}</a><a class="text-link" href="${release}">${t.release}${arrow}</a></div><div class="installation"><div class="install-explanation"><h3>${t.installLabel}</h3><p>${t.archiveSteps}</p><p class="fine-print">${t.existing}</p></div><div class="install-controls"><fieldset><legend class="sr-only">${lang === "ja" ? "開発ツール" : "Coding agent"}</legend>${["Codex", "Claude Code", "Cursor"].map((host, i) => `<label><input type="radio" name="agent" value="${i}" ${i === 0 ? "checked" : ""}><span>${host}</span></label>`).join("")}</fieldset><div class="install-path"><span>${t.destination}</span><code id="skill-path">.agents/skills/smoothsubmit/</code><button class="copy-button" data-copy="skill-path" aria-label="${lang === "ja" ? "配置先をコピー" : "Copy destination"}">${t.copy}</button></div><p class="invocation">${t.invoke}: <code id="skill-invoke">$smoothsubmit</code></p></div></div><div class="prompt-box"><p>${t.promptLabel}</p><div><code id="audit-prompt">${t.prompt}</code><button class="copy-button" data-copy="audit-prompt" aria-label="${lang === "ja" ? "監査指示をコピー" : "Copy audit prompt"}">${t.copy}</button></div></div><p class="fine-print discovery">${t.discover} <a href="${repo}#start-with-the-skill">${t.installDocs}</a></p><p id="copy-status" role="status" class="copy-status" data-copied="${t.copied}" data-error="${t.copyError}"></p><aside class="cli"><h3>${t.cliTitle}</h3><p>${t.cliBody}</p><p class="fine-print">${t.cliRequirements}</p><a class="text-link" href="${repo}#optional-cli">${t.cliLink}${arrow}</a></aside></section>
<section class="section faq"><h2>${t.faqTitle}</h2><div>${t.faq.map(([q, a]) => `<details><summary>${q}<span class="plus" aria-hidden="true"></span></summary><p>${a}</p></details>`).join("")}</div></section>
<section class="closing"><h2>${lines(t.close)}</h2><div class="actions"><a class="button button-lime" href="#start">${t.cta}${arrow}</a><a class="text-link light" href="${repo}/issues">${t.feedback}${arrow}</a></div></section>
</main><footer><a class="brand" href="${repo}">${mark}<span>SmoothSubmit</span></a><p>${t.footer}</p><div><a href="${repo}/blob/main/docs/APPLE_REFERENCES.md">${t.docs}</a><a href="${repo}/blob/main/LICENSE">${t.license}</a><a href="${repo}">GitHub</a></div></footer>
</body></html>`;
  await mkdir(lang === "en" ? "site/en" : "site", { recursive: true });
  await writeFile(
    lang === "en" ? "site/en/index.html" : "site/index.html",
    html,
  );
}
console.log("Rendered ja / en static pages.");
