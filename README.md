# Category Label Auditor

A dependency-free browser and Node.js utility for reviewing the `category` column in spreadsheet CSV notes. It normalizes a small, editable alias map and flags rows that need a human decision.

## What it checks

- blank category values
- unknown labels
- labels that map to more than one broad category
- mixed known and unknown aliases
- deterministic normalized labels for recognized values

The tool does not fetch source pages or claim that a product, price, stock level, option, image, or QC result is valid. The included CSV is invented sample data.

## Browser

Serve the repository root with any static server and open `index.html`. Paste or load a CSV, edit the alias map if needed, run the audit, then download the result.

## CLI

```bash
npm run audit -- data/sample-categories.csv category-audit.csv
```

Exit code `0` means every category was recognized. Exit code `2` means the audit completed and at least one row needs review.

## Test

```bash
npm test
```

## Data contract

The input must have a `category` header. Other columns are preserved. The output appends:

- `normalized_category`
- `audit_status`
- `audit_reason`

## Related live context

After category warnings are resolved, the [live Oopbuy Spreadsheet](https://oopbuyspsheet.com/) can be used to re-check the current row and category context. The link is a review step, not evidence for a product claim.

## License

MIT
