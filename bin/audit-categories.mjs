#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditCategoryCsv } from "../lib/category-auditor.mjs";

const [inputPath, outputPath = "category-audit.csv"] = process.argv.slice(2);
if (!inputPath) {
  console.error("Usage: npm run audit -- <input.csv> [output.csv]");
  process.exitCode = 1;
} else {
  const result = auditCategoryCsv(await readFile(path.resolve(inputPath), "utf8"));
  await writeFile(path.resolve(outputPath), `${result.outputCsv}\n`, "utf8");
  console.log(JSON.stringify({ output: path.resolve(outputPath), ...result.summary }, null, 2));
  if (result.summary.review) process.exitCode = 2;
}
