const defaultAliases = Object.freeze({
  shoes: ["shoe", "shoes", "sneaker", "sneakers", "trainer", "trainers", "footwear", "boots"],
  bags: ["bag", "bags", "backpack", "backpacks", "handbag", "handbags", "wallet", "wallets"],
  apparel: ["apparel", "clothing", "clothes", "hoodie", "hoodies", "jacket", "jackets", "pants", "shirt", "shirts", "tee", "tees"],
  accessories: ["accessory", "accessories", "belt", "belts", "cap", "caps", "hat", "hats", "jewelry", "sunglasses", "watch", "watches"],
  other: ["other", "misc", "miscellaneous"]
});

export const supportedCategories = Object.freeze(Object.keys(defaultAliases));

function normalizeToken(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ");
}

function splitCategoryValue(value) {
  return String(value ?? "")
    .split(/[|;/]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

export function buildAliasIndex(aliases = defaultAliases) {
  const index = new Map();
  for (const [category, values] of Object.entries(aliases)) {
    for (const value of [category, ...(values || [])]) {
      const normalized = normalizeToken(value);
      if (normalized) index.set(normalized, category);
    }
  }
  return index;
}

export function classifyCategory(value, aliases = defaultAliases) {
  const tokens = splitCategoryValue(value);
  if (!tokens.length) {
    return { input: String(value ?? ""), normalized: "", status: "review", reason: "blank_category", matches: [] };
  }
  const index = buildAliasIndex(aliases);
  const matches = [...new Set(tokens.map((token) => index.get(token)).filter(Boolean))];
  const unknown = tokens.filter((token) => !index.has(token));
  if (matches.length > 1) {
    return { input: String(value), normalized: "", status: "review", reason: "multiple_categories", matches, unknown };
  }
  if (!matches.length) {
    return { input: String(value), normalized: "", status: "review", reason: "unknown_category", matches: [], unknown };
  }
  if (unknown.length) {
    return { input: String(value), normalized: matches[0], status: "review", reason: "mixed_known_unknown", matches, unknown };
  }
  return { input: String(value), normalized: matches[0], status: "pass", reason: "recognized_alias", matches, unknown: [] };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = String(text ?? "").replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

export function toCsv(rows) {
  return rows.map((row) => row.map((value) => {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(",")).join("\n");
}

export function auditCategoryCsv(text, { categoryColumn = "category", aliases = defaultAliases } = {}) {
  const parsed = parseCsv(text);
  if (!parsed.length) throw new Error("CSV has no rows");
  const headers = parsed[0].map((value) => normalizeToken(value));
  const categoryIndex = headers.indexOf(normalizeToken(categoryColumn));
  if (categoryIndex < 0) throw new Error(`CSV needs a '${categoryColumn}' column`);
  const auditedRows = [];
  const summary = { total: 0, pass: 0, review: 0, reasons: {}, categories: {} };
  parsed.slice(1).forEach((sourceRow, rowIndex) => {
    const row = [...sourceRow];
    while (row.length < parsed[0].length) row.push("");
    const result = classifyCategory(row[categoryIndex], aliases);
    summary.total += 1;
    summary[result.status] += 1;
    summary.reasons[result.reason] = (summary.reasons[result.reason] || 0) + 1;
    if (result.normalized) summary.categories[result.normalized] = (summary.categories[result.normalized] || 0) + 1;
    auditedRows.push({
      row_number: rowIndex + 2,
      source: Object.fromEntries(parsed[0].map((header, index) => [header, row[index] ?? ""])),
      ...result
    });
  });
  const output = [
    [...parsed[0], "normalized_category", "audit_status", "audit_reason"],
    ...auditedRows.map((result) => [
      ...parsed[result.row_number - 1],
      result.normalized,
      result.status,
      result.reason
    ])
  ];
  return { headers: parsed[0], rows: auditedRows, summary, outputCsv: toCsv(output) };
}

export { defaultAliases };
