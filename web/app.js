import { auditCategoryCsv, defaultAliases } from "../lib/category-auditor.mjs";

const input = document.querySelector("#csv-input");
const aliasInput = document.querySelector("#alias-input");
const results = document.querySelector("#results");
const summary = document.querySelector("#summary");
const download = document.querySelector("#download");
let outputUrl = "";

function aliasesFromForm() {
  const aliases = {};
  for (const line of aliasInput.value.split(/\r?\n/)) {
    const [category, values = ""] = line.split(":");
    if (!category?.trim()) continue;
    aliases[category.trim().toLowerCase()] = values.split(",").map((value) => value.trim()).filter(Boolean);
  }
  return aliases;
}

function render(result) {
  summary.innerHTML = `
    <div><strong>${result.summary.total}</strong><span>rows</span></div>
    <div><strong>${result.summary.pass}</strong><span>recognized</span></div>
    <div><strong>${result.summary.review}</strong><span>review</span></div>`;
  results.innerHTML = result.rows.map((row) => `
    <tr>
      <td>${row.row_number}</td>
      <td>${escapeHtml(row.input || "(blank)")}</td>
      <td>${escapeHtml(row.normalized || "unresolved")}</td>
      <td><span class="status ${row.status}">${row.status}</span></td>
      <td>${row.reason.replaceAll("_", " ")}</td>
    </tr>`).join("");
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = URL.createObjectURL(new Blob([`${result.outputCsv}\n`], { type: "text/csv" }));
  download.href = outputUrl;
  download.hidden = false;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

document.querySelector("#audit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    render(auditCategoryCsv(input.value, { aliases: aliasesFromForm() }));
    document.querySelector("#error").textContent = "";
  } catch (error) {
    document.querySelector("#error").textContent = error.message;
  }
});

document.querySelector("#load-sample").addEventListener("click", async () => {
  input.value = await fetch("data/sample-categories.csv").then((response) => response.text());
  document.querySelector("#audit-form").requestSubmit();
});

aliasInput.value = Object.entries(defaultAliases).map(([category, aliases]) => `${category}: ${aliases.join(", ")}`).join("\n");
document.querySelector("#load-sample").click();
