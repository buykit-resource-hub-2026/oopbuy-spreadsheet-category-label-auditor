import assert from "node:assert/strict";
import test from "node:test";
import { auditCategoryCsv, classifyCategory, parseCsv } from "../lib/category-auditor.mjs";

test("normalizes a recognized category alias", () => {
  assert.deepEqual(classifyCategory(" Sneakers "), {
    input: " Sneakers ", normalized: "shoes", status: "pass", reason: "recognized_alias", matches: ["shoes"], unknown: []
  });
});

test("flags blank, unknown and conflicting labels", () => {
  assert.equal(classifyCategory("").reason, "blank_category");
  assert.equal(classifyCategory("collectibles").reason, "unknown_category");
  assert.equal(classifyCategory("sneakers / backpacks").reason, "multiple_categories");
});

test("keeps commas and quotes in CSV fields", () => {
  const rows = parseCsv('title,category\n"Runner, low","Sneakers"\n"A ""quoted"" bag",bags');
  assert.equal(rows[1][0], "Runner, low");
  assert.equal(rows[2][0], 'A "quoted" bag');
});

test("audits rows and produces a deterministic review CSV", () => {
  const result = auditCategoryCsv("title,category\nRunner,sneakers\nTote,handbags\nUnknown,collectibles\nConflict,shoe / wallet\nMissing,");
  assert.deepEqual(result.summary, {
    total: 5,
    pass: 2,
    review: 3,
    reasons: { recognized_alias: 2, unknown_category: 1, multiple_categories: 1, blank_category: 1 },
    categories: { shoes: 1, bags: 1 }
  });
  assert.match(result.outputCsv, /normalized_category,audit_status,audit_reason/);
  assert.match(result.outputCsv, /Conflict,shoe \/ wallet,,review,multiple_categories/);
});

test("requires a category header", () => {
  assert.throws(() => auditCategoryCsv("title,type\nRunner,shoes"), /needs a 'category' column/);
});
