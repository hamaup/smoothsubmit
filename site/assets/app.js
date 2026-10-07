"use strict";
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panels = [...document.querySelectorAll('[role="tabpanel"]')];
const summaries = document.querySelector("#demo-summary");
const next = document.querySelector("#next-stage");
const lang = document.documentElement.lang;
const summaryText =
  lang === "ja"
    ? [
        "まず監査。足りない情報は残す。",
        "根拠を読んで、修正を依頼。",
        "直ったことまで、確かめる。",
      ]
    : [
        "Audit first. Keep the unknowns visible.",
        "Read the evidence. Request the fix.",
        "Verify the fix. Keep the remaining questions.",
      ];
let current = 0;
function selectStage(index, focus = false) {
  current = index;
  tabs.forEach((tab, i) => {
    tab.setAttribute("aria-selected", String(i === index));
    tab.tabIndex = i === index ? 0 : -1;
    panels[i].hidden = i !== index;
    panels[i].classList.toggle("stage-change", i === index);
  });
  summaries.textContent = summaryText[index];
  next.firstChild.textContent =
    index === 2 ? next.dataset.reset : next.dataset.next;
  if (focus) tabs[index].focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectStage(index));
  tab.addEventListener("keydown", (event) => {
    let target;
    if (event.key === "ArrowRight") target = (index + 1) % 3;
    if (event.key === "ArrowLeft") target = (index + 2) % 3;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = 2;
    if (target !== undefined) {
      event.preventDefault();
      selectStage(target, true);
    }
  });
});
next.addEventListener("click", () => selectStage((current + 1) % 3));
const paths = [
  ".agents/skills/smoothsubmit/",
  ".claude/skills/smoothsubmit/",
  ".cursor/skills/smoothsubmit/",
];
const invocations = [
  "$smoothsubmit",
  "/smoothsubmit",
  lang === "ja"
    ? "Agent chatで /smoothsubmit を選択"
    : "Select /smoothsubmit in Agent chat",
];
document.querySelectorAll('input[name="agent"]').forEach((input) =>
  input.addEventListener("change", () => {
    document.querySelector("#skill-path").textContent =
      paths[Number(input.value)];
    document.querySelector("#skill-invoke").textContent =
      invocations[Number(input.value)];
    document.querySelector("#copy-status").textContent = "";
  }),
);
const status = document.querySelector("#copy-status");
document.querySelectorAll("[data-copy]").forEach((button) =>
  button.addEventListener("click", async () => {
    const value = document.getElementById(button.dataset.copy).textContent;
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = status.dataset.copied;
    } catch {
      status.textContent = status.dataset.error;
    } finally {
      button.disabled = false;
    }
  }),
);
