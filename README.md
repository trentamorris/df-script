# 🚀 df-script: High-Performance TypeScript DataFrame Library

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/trentamorris/df-script)
[![npm version](https://img.shields.io/npm/v/df-script?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/df-script)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/df-script?style=for-the-badge&color=blue)](https://bundlephobia.com/package/df-script)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success?style=for-the-badge)](#)
[![TypeScript & JavaScript](https://img.shields.io/badge/Supports-TS%20%7C%20TSX%20%7C%20JS%20%7C%20JSX-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Universal Runtimes](https://img.shields.io/badge/Runtimes-Node%20%7C%20Bun%20%7C%20Deno%20%7C%20Browser-brightgreen?style=for-the-badge)](#)
[![License](https://img.shields.io/npm/l/df-script?style=for-the-badge&color=informational)](LICENSE)
[![Donate](https://img.shields.io/badge/Donate-Support-green?style=for-the-badge)](DONATIONS.md)
**df-script** is a blazing-fast, **zero-dependency**, expression-based DataFrame and data manipulation library for **TypeScript** and **JavaScript**. Heavily inspired by modern columnar engines like **Polars** and **Pandas**, `df-script` brings declarative, high-performance columnar analytical queries and ETL workflows directly to JavaScript environments (Node.js, Browser, Bun, Deno, and Edge Workers).

With cache-optimized columnar storage and flat memory layout under the hood, `df-script` eliminates garbage collection thrashing caused by intermediate array allocations in chained `.map()`, `.filter()`, and `.reduce()` calls.

---

### 📌 Platform & Scope

| Attribute | Specification |
| :--- | :--- |
| **Target Platform** | **Universal JavaScript & TypeScript** (Node.js 16+, Modern Browsers, Bun, Deno, Cloudflare Workers, Vercel Edge, AWS Lambda) |
| **Operational Scope** | **In-memory columnar DataFrame & vectorized expression engine** with automatic type inference, joins, grouping, windowing, and zero intermediate allocations |
| **I/O & Formats** | High-throughput RFC-compliant **CSV parsing & streaming**, **JSON / JSONLines**, and row/column records |
| **Runtime Footprint** | **Pure TypeScript/JavaScript** (0 external dependencies, 0 native C++/Rust bindings, 0 WebAssembly overhead) |
| **Bundle Size** | **~44 KB gzipped** (~127 KB minified) for the complete engine; **~21 KB gzipped** for standalone utils |
| **Distribution** | Dual **ESM** (`dist/index.mjs`) & **CommonJS** (`dist/index.js`) with comprehensive `.d.ts` declaration maps |

---

## 🌐 Universal Language & Environment Support

`df-script` is built with **zero native dependencies** and ships with dual **ESM** (`dist/index.mjs`) and **CommonJS** (`dist/index.js`) modules alongside comprehensive `.d.ts` type declarations. It runs natively everywhere JavaScript or TypeScript runs:

- 📄 **Languages & File Formats**: Full first-class support in **TypeScript (`.ts`, `.tsx`)**, **JavaScript (`.js`, `.jsx`)**, and module formats (`.mjs`, `.cjs`).
- ⚛️ **UI Frameworks & Bundlers**: React (JSX/TSX), Next.js, Vue, Nuxt, Svelte, SolidJS, Astro, Vite, Webpack, and esbuild.
- ⚙️ **Runtimes & Target Standard**: Standard **ES2020+** compatible. Fully tested on **Node.js** (14+), **Bun**, **Deno**, modern **Web Browsers** (Chrome 80+, Safari 13.1+, Firefox 74+, Edge 80+), Cloudflare Workers, Fastly Compute, and AWS Lambda.
- 🌐 **Browser / Client-Side Compatibility**: 100% in-memory analytical transformations, joins, grouping, and expressions run natively in all browser runtimes. File writing methods (`df.writeCsv()`, `df.writeJson()`) automatically fallback to returning strings or writing to custom stream objects when running in browser environments.
- 📦 **Package Managers**: Works seamlessly with `npm`, `pnpm`, `bun`, and `yarn`.

---

## 💡 Why df-script? (Polars & Pandas for TypeScript)

In modern web apps and Node.js backend services, data transformation code often degrades into nested chains of `.map()`, `.filter()`, and `.sort()` on arrays of objects. Each step in the chain allocates new intermediate arrays, slows down garbage collection, and creates maintenance overhead.

`df-script` provides:
- ⚡ **Columnar Execution**: Column-oriented arrays with cached loop lengths for fast computation and minimal memory allocation.
- 🔗 **Fluent Expressions**: Declarative, composable queries using `$df.col(...)` expressions with automatic post-operation schema deduction.
- 📂 **Strict Domain Namespaces**: Clean, dedicated namespaces (`.str`, `.dt`, `.arr`, `.struct`) to prevent method clutter and ensure discoverable APIs.
- 🛡️ **Zero External Dependencies**: Lightweight runtime footprint with zero supply-chain risk.
- 🧠 **TypeScript First**: Full IDE autocomplete and compile-time type safety for column selections and schemas.

---

## 🗺️ Table of Contents

- [📌 Platform & Scope](#-platform--scope)
- [✨ Key Features](#-key-features)
- [🌐 Universal Language & Environment Support](#-universal-language--environment-support)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [📖 Core Concepts](#-core-concepts)
- [🛠️ DataFrame API Reference](#️-dataframe-api-reference)
- [🧮 Column Expressions API Reference](#-column-expressions-api-reference)
- [📂 Namespaces API Reference](#-namespaces-api-reference)
- [🛡️ Typing and Schema Registry](#️-typing-and-schema-registry)
- [🧑‍💻 Contributing & Development](#-contributing--development)
- [📄 License](#-license)

---

## ✨ Key Features

- 📦 **Zero Dependencies** — 0 external runtime dependencies; completely standalone.
- ⚡ **Columnar Execution** — Fast columnar processing that eliminates intermediate array allocations.
- 🔗 **Expression-Based API** — Compose complex transformations, aggregations, and conditions using fluent `$df` expressions.
- 📂 **Strict Namespaces**:
  - `.str` — Unicode string manipulations, regex extractions, and JSON path lookups.
  - `.dt` — Timezone conversions, business days, microsecond-precision datetimes, and durations.
  - `.arr` — Array/list column operations and element-wise `.arr.eval()` mapping.
  - `.struct` — Nested object handling and `.struct.unnest()` column flattening.
- 🪟 **Analytical Window Functions** — Partitioned windowing (`.over()`), cumulative aggregations (`cumSum()`, `cumMax()`), and rolling moving statistics (`rollingMean()`, `rollingStd()`).
- 🛠️ **Relational Operations** — Inner/left/right/outer/cross joins, `joinAsof` time-series matching, pivots, unpivots, and multi-axis concatenations.
- 🛡️ **Defensive & Type-Safe** — Automatic type coercion, Kleene three-valued logic for null safety, and strict schema validation.

---

## 📦 Installation

Install `df-script` using your package manager:

```bash
npm install df-script
```

Or with Yarn, PNPM, or Bun:

```bash
yarn add df-script
pnpm add df-script
bun add df-script
```

Import and configure in TypeScript or JavaScript:

```typescript
// ES Module / TypeScript
import { $df, DataFrame, ColumnExpr, DataType } from "df-script";
```

```javascript
// CommonJS / Node.js
const { $df, DataFrame, ColumnExpr, DataType } = require("df-script");
```

---

## 🚀 Quick Start

```typescript
import { $df } from "df-script";

// 1. Create a DataFrame with structured data and automatic schema inference
const df = $df.data([
  { id: 1, name: "Alice", joinDate: "2026-01-15", sales: 1200.50, tags: ["sales", "east"] },
  { id: 2, name: "Bob", joinDate: "2026-02-20", sales: 850.00, tags: ["support", "west"] },
  { id: 3, name: "Charlie", joinDate: "2026-03-05", sales: 2300.00, tags: ["sales", "north"] },
  { id: 4, name: "David", joinDate: "2026-03-12", sales: null, tags: ["marketing"] },
]);

// 2. Select columns, transform strings, format dates, and compute expressions
const processedDf = df.select(
  $df.col("id"),
  $df.col("name").str.upper().alias("NAME_UPPER"),
  $df.col("joinDate").str.toDatetime().dt.year().alias("joinYear"),
  $df.col("sales").add(500).alias("salesAdjusted"),
  $df.col("tags").arr.lengths().alias("tagCount")
);

console.log(processedDf.toDicts());
/* Output:
[
  { id: 1, NAME_UPPER: 'ALICE', joinYear: 2026, salesAdjusted: 1700.5, tagCount: 2 },
  { id: 2, NAME_UPPER: 'BOB', joinYear: 2026, salesAdjusted: 1350, tagCount: 2 },
  { id: 3, NAME_UPPER: 'CHARLIE', joinYear: 2026, salesAdjusted: 2800, tagCount: 2 },
  { id: 4, NAME_UPPER: 'DAVID', joinYear: 2026, salesAdjusted: null, tagCount: 1 }
]
*/
```

---

## 📖 Core Concepts

### The `$df` Entry Point

`df-script` uses the `$df` namespace to instantiate DataFrames, reference columns, construct expressions, and specify data types.

- `$df.data(dataRowsOrCols, schema?)`: Instantiates a new `DataFrame`.
- `$df.readJson(content, options?)`: Reads JSON/NDJSON content into a new `DataFrame`.
- `$df.readCsv(content, options?)`: Reads CSV content into a new `DataFrame` with automatic schema inference.
- `$df.col(selector)`: Creates a column reference expression by column name (`"a"`), multiple names (`["a", "b"]`), RegExp pattern (`/^user_/`), or DataType selector (`$df.Float64`, `$df.Numeric`).
- `$df.all()`: Selects all columns in the DataFrame.
- `$df.exclude(columns)`: Matches all columns except the specified ones.
- `$df.coalesce(...exprs)`: Returns the first non-null value among columns or expressions.
- `$df.lit(val)`: Explicitly wraps a raw value into a literal expression.
- `$df.duration(optionsOrString)`: Constructs a `Duration` expression from component options (`{ days: 1, hours: 12 }`) or compound duration strings (`"1d 12h 30m"`).
- `$df.struct(fields)`: Constructs a nested struct object expression from named expressions or sibling columns.
- `$df.when(predicate).then(value)...otherwise(value)`: Constructs a conditional `CASE WHEN` expression chain.
- `$df.implode(column)`: Aggregates a column's rows or grouped values into a list.
- `$df.seqRange(value, options?)`: Generates a sequence range of values.
- `$df.element()`: References the current array element within an `.arr.eval(...)` expression.
- `$df.Float64`, `$df.Int32`, `$df.Utf8`, etc.: Direct access to data types and constructors for schema definitions and type-based column selection.

---

## 🛠️ DataFrame API Reference

All methods and getters on `DataFrame` in alphabetical order:

| Method / Property | Description |
| :--- | :--- |
| **`cast(schema, options?)`** | Casts DataFrame columns to target data types using a schema mapping. |
| **`clone()`** | Deep-copies the DataFrame, duplicating all underlying columnar memory buffers and schema. |
| **`columns`** | Getter returning an array of all column names in the DataFrame. |
| **`concat(items, options?)`** | Concatenates multiple DataFrames along `"vertical"`, `"horizontal"`, or `"diagonal"` axes. |
| **`drop(...names)`** | Drops one or more specified columns from the DataFrame. |
| **`dropNulls(subset?)`** | Drops rows containing null or undefined values across all or specified columns. |
| **`dtypes`** | Getter returning a dictionary of column names to their registered `DataType` instances. |
| **`equals(other, options?)`** | Deep equality comparison with tolerance support for float columns. |
| **`explode(columns)`** | Unnests list-like columns into multiple rows, replicating other columns per list element. |
| **`fillNull(ruleOrOptions)`** | Fills null values with strategies (`"forward"`, `"backward"`, `"mean"`, `"min"`, `"max"`, or literal values). |
| **`filter(...predicates)`** | Filters rows where all predicate expressions evaluate to `true`. |
| **`groupBy(keys)`** | Groups data by one or more columns, returning a `GroupedData` object for aggregations. |
| **`groupByDynamic(indexCol, options)`** | Dynamic time-series/numeric window grouping over tumbling, sliding, or rolling temporal intervals. |
| **`head(n?)`** | Returns the first `n` rows of the DataFrame (defaults to 5). |
| **`height`** | Getter returning the total number of rows in the DataFrame. |
| **`insertColumn(index, name, values)`** | Inserts a new column at a specific zero-based index. |
| **`item(row?, col?)`** | Returns an individual scalar cell value at the specified row and column coordinate. |
| **`iterColumns()`** | Generator iterating over `{ name, values }` pairs for each column. |
| **`iterRows()`** | Generator iterating over row record objects `{ [column]: value }`. |
| **`join(other, onOrOptions, how?, suffixes?)`** | Relational joins (`"inner"`, `"left"`, `"right"`, `"outer"`, `"semi"`, `"anti"`, `"cross"`). |
| **`joinAsof(other, options)`** | Inexact time-series / nearest-neighbor joins on sorted key columns. |
| **`joinWhere(other, predicate, options?)`** | Arbitrary non-equi joins evaluated over candidate cartesian pairs. |
| **`limit(n, options?)`** | Returns a subset of rows with optional `offset` and direction (`"start"` or `"end"`). |
| **`pivot(index, columns, values)`** | Reshapes tabular data from long to wide format based on unique column keys. |
| **`rename(mapping)`** | Renames columns using a `{ oldName: newName }` dictionary. |
| **`reverse()`** | Reverses the row ordering of the DataFrame. |
| **`schema`** | Getter returning the current column-to-`DataType` schema specification. |
| **`select(...exprs)`** | Projects and evaluates column expressions, selectors, regex patterns, or struct unnesting. |
| **`shape`** | Getter returning the `[height, width]` dimensions tuple. |
| **`slice(start, end?)`** | Slices a continuous range of rows by start and end indices. |
| **`sort(options)`** | Multi-column sorting with `descending`, `nullsLast`, and custom comparator functions. |
| **`tail(n?)`** | Returns the last `n` rows of the DataFrame (defaults to 5). |
| **`toArray()`** | Serializes the DataFrame into a two-dimensional row array (`any[][]`). |
| **`toDict()`** | Serializes the DataFrame into a column-oriented dictionary `{ [col]: any[] }`. |
| **`toDicts()`** | Serializes the DataFrame into an array of row objects `RowRecord[]`. |
| **`transpose(options?)`** | Swaps rows and columns into a transposed DataFrame. |
| **`unique(columns?)`** | Returns distinct rows, optionally deduplicating based on a subset of columns. |
| **`unpivot(idVars, valueVars, varName?, valName?)`** | Melts wide columns into long format name-value pairs. |
| **`unstack(step, options?)`** | Unstacks multi-level grouped columns. |
| **`width`** | Getter returning the total number of columns in the DataFrame. |
| **`withColumns(...exprs)`** | Adds or updates columns in-place using expression evaluations. |
| **`withRowIndex(name?, offset?)`** | Inserts a zero-based or offset row index column into the DataFrame. |
| **`writeCsv(file?, options?)`** | Serializes the DataFrame into RFC-4180 CSV string or writes to disk/stream. |
| **`writeJson(file?, options?)`** | Serializes the DataFrame into JSON or NDJSON string or writes to disk/stream. |

---

## 🧮 Column Expressions API Reference

All column expressions inherit from `ColumnExpr` / `ExprBase` and support fluent chaining.

### 1. Core & Math Expressions (Alphabetical)

| Method | Description |
| :--- | :--- |
| **`abs`** | Computes element-wise absolute value. |
| **`add`** | Element-wise addition with value or expression. |
| **`all`** | Returns true if all elements evaluate to true (Kleene logic). |
| **`allNull`** | Returns true if all elements in the expression are null or undefined. |
| **`and`** | Logical AND with Kleene three-valued null logic. |
| **`any`** | Returns true if at least one element evaluates to true. |
| **`anyNull`** | Returns true if any element is null or undefined. |
| **`arccos`** | Element-wise inverse cosine in radians. |
| **`arccosh`** | Element-wise inverse hyperbolic cosine. |
| **`arcsin`** | Element-wise inverse sine in radians. |
| **`arcsinh`** | Element-wise inverse hyperbolic sine. |
| **`arctan`** | Element-wise inverse tangent in radians. |
| **`arctan2`** | Element-wise four-quadrant inverse tangent with second argument. |
| **`arctanh`** | Element-wise inverse hyperbolic tangent. |
| **`argMax`** | Returns the index of the first maximum value. |
| **`argMin`** | Returns the index of the first minimum value. |
| **`avg`** | Alias for mean(); computes the arithmetic mean. |
| **`between`** | Evaluates if elements are within an inclusive or exclusive numeric/date range. |
| **`bitwiseAnd`** | Bitwise AND (&) operation on integers. |
| **`bitwiseOr`** | Bitwise OR (|) operation on integers. |
| **`bitwiseXor`** | Bitwise XOR (^) operation on integers. |
| **`cbrt`** | Computes element-wise cube root. |
| **`ceil`** | Rounds numbers upward to the nearest integer. |
| **`clip`** | Clamps values between a lower and upper boundary. |
| **`copysign`** | Copies the sign of the magnitude argument to the target numbers. |
| **`corr`** | Computes Pearson correlation coefficient with another column or expression. |
| **`cos`** | Element-wise cosine in radians. |
| **`cosh`** | Element-wise hyperbolic cosine. |
| **`cot`** | Element-wise cotangent in radians. |
| **`count`** | Counts non-null elements (or all elements with { includeNulls: true }). |
| **`cov`** | Computes covariance with another column or expression. |
| **`cumCount`** | Cumulative count of elements along the column. |
| **`cumMax`** | Cumulative maximum value along the column. |
| **`cumMin`** | Cumulative minimum value along the column. |
| **`cumProd`** | Cumulative product of values along the column. |
| **`cumSum`** | Cumulative running sum along the column. |
| **`degrees`** | Converts angles from radians to degrees. |
| **`denseRank`** | Computes dense rank window order without rank gaps. |
| **`div`** | Element-wise division. |
| **`dot`** | Computes dot product vector multiplication with another expression. |
| **`entropy`** | Computes Shannon entropy (supports optional base and normalization). |
| **`eq`** | Strict equality (==) with Kleene null propagation. |
| **`eqMissing`** | Null-safe equality treating null and undefined as equivalent. |
| **`exp`** | Computes natural exponential (e^x). |
| **`expm1`** | Computes e^x - 1 with high precision for values near zero. |
| **`fillNull`** | Fills null values with scalar values or forward/backward fill strategies. |
| **`filter`** | Filters expression elements by a boolean predicate mask. |
| **`first`** | Returns the first element of the expression or group. |
| **`floor`** | Rounds numbers downward to the nearest integer. |
| **`floordiv`** | Integer/floor division. |
| **`ge`** | Greater than or equal to (>=) comparison. |
| **`gt`** | Greater than (>) comparison. |
| **`hasNulls`** | Returns true if column contains at least one null or undefined value. |
| **`hypot`** | Computes hypotenuse sqrt(a^2 + b^2). |
| **`implode`** | Aggregates elements into a single list/array column. |
| **`isClose`** | Evaluates if numeric values are approximately equal within tolerances. |
| **`isDuplicated`** | Returns boolean mask where true marks duplicated values. |
| **`isFinite`** | Checks if number is finite (neither NaN, Infinity, nor -Infinity). |
| **`isIn`** | Checks if value is present in a set or array of values. |
| **`isInfinite`** | Checks if number is Infinity or -Infinity. |
| **`isNDistinct`** | Matches the N-th distinct value in order (supports negative index). |
| **`isNan`** | Checks if numeric value is NaN. |
| **`isNotNan`** | Checks if numeric value is not NaN. |
| **`isNotNull`** | Checks if value is neither null nor undefined. |
| **`isNull`** | Checks if value is null or undefined. |
| **`isUnique`** | Returns boolean mask where true marks unique (non-duplicated) values. |
| **`kurtosis`** | Computes fourth standardized moment (peakedness/kurtosis). |
| **`lag`** | Shifts values backward by offset within partition window. |
| **`last`** | Returns the last element of the expression or group. |
| **`le`** | Less than or equal to (<=) comparison. |
| **`lead`** | Shifts values forward by offset within partition window. |
| **`log`** | Computes logarithm with optional base (defaults to natural log). |
| **`log1p`** | Computes natural log of (1 + x) for values near zero. |
| **`lt`** | Less than (<) comparison. |
| **`max`** | Returns the maximum non-null value. |
| **`maxBy`** | Returns the value of this expression where another expression achieves maximum. |
| **`mean`** | Computes the arithmetic average of non-null numbers. |
| **`median`** | Computes the 50th percentile median value. |
| **`min`** | Returns the minimum non-null value. |
| **`minBy`** | Returns the value of this expression where another expression achieves minimum. |
| **`mod`** | Modulo division remainder. |
| **`mode`** | Computes the most frequently occurring value(s). |
| **`mul`** | Element-wise multiplication. |
| **`nUnique`** | Returns the count of distinct non-null values. |
| **`nanMax`** | Returns maximum treating NaN values according to IEEE 754 rules. |
| **`nanMin`** | Returns minimum treating NaN values according to IEEE 754 rules. |
| **`ne`** | Strict inequality (!=) with Kleene null propagation. |
| **`neMissing`** | Null-safe inequality. |
| **`negate`** | Negates numeric values (-x). |
| **`not`** | Logical NOT operator. |
| **`notIn`** | Checks if value is not present in a set or array. |
| **`nullCount`** | Returns the total count of null and undefined values. |
| **`or`** | Logical OR with Kleene three-valued null logic. |
| **`over`** | Evaluates the expression over an analytical partition window (grouping keys). |
| **`pow`** | Computes exponentiation (x^y). |
| **`product`** | Computes product of all non-null values. |
| **`quantile`** | Computes quantile value at probability p (0 <= p <= 1). |
| **`radians`** | Converts angles from degrees to radians. |
| **`rand`** | Generates uniform pseudo-random values between 0 and 1. |
| **`rank`** | Computes competition rank order (1, 2, 2, 4). |
| **`reverse`** | Reverses the element order of the column. |
| **`rolling`** | Evaluates custom function or expression over a sliding window. |
| **`rollingMax`** | Computes rolling maximum over a sliding window. |
| **`rollingMean`** | Computes rolling moving average over a sliding window. |
| **`rollingMedian`** | Computes rolling median over a sliding window. |
| **`rollingMin`** | Computes rolling minimum over a sliding window. |
| **`rollingQuantile`** | Computes rolling quantile over a sliding window. |
| **`rollingRank`** | Computes rolling rank over a sliding window. |
| **`rollingStd`** | Computes rolling standard deviation over a sliding window. |
| **`rollingSum`** | Computes rolling sum over a sliding window. |
| **`round`** | Rounds numbers to specified decimal places. |
| **`roundSigFigs`** | Rounds numbers to a specified number of significant figures. |
| **`rowNumber`** | Computes sequential 1-based row index within partition window. |
| **`shift`** | Shifts column values by a signed offset (filling empty cells with null). |
| **`sign`** | Extracts sign of number (-1, 0, 1). |
| **`sin`** | Element-wise sine in radians. |
| **`sinh`** | Element-wise hyperbolic sine. |
| **`skew`** | Computes third standardized moment (skewness asymmetry). |
| **`spearmanCorr`** | Computes Spearman rank correlation coefficient. |
| **`sqrt`** | Computes square root. |
| **`std`** | Computes sample standard deviation. |
| **`sub`** | Element-wise subtraction. |
| **`sum`** | Computes sum of all non-null numeric values. |
| **`tan`** | Element-wise tangent in radians. |
| **`tanh`** | Element-wise hyperbolic tangent. |
| **`trunc`** | Truncates fractional parts toward zero. |
| **`variance`** | Computes sample variance. |
| **`wAvg`** | Computes weighted average using weight expression. |
| **`xor`** | Logical exclusive OR (XOR). |

---

## 📂 Namespaces API Reference

Specific domain transforms are grouped under dedicated, clean namespaces with full IDE autocomplete:

### 🔤 String Namespace (`.str`)

| Method | Description |
| :--- | :--- |
| **`.str.concat`** | Concatenates strings across columns or literal arguments. |
| **`.str.contains`** | Checks if string contains substring or matches RegExp pattern. |
| **`.str.containsAny`** | Checks if string contains any substring from a list. |
| **`.str.countMatches`** | Counts non-overlapping occurrences of pattern or substring. |
| **`.str.decode`** | Decodes binary bytes/strings using specified encoding (hex, base64, etc.). |
| **`.str.decodeUriComponent`** | Decodes URI-encoded characters. |
| **`.str.encode`** | Encodes strings to binary formats (hex, base64, utf8). |
| **`.str.encodeUriComponent`** | Encodes string components for safe URI transmission. |
| **`.str.endsWith`** | Checks if string ends with specified suffix. |
| **`.str.escapeRegex`** | Escapes regex metacharacters in string for literal matching. |
| **`.str.explode`** | Splits string by delimiter and explodes into multiple rows. |
| **`.str.extract`** | Extracts first matching regex capture group (supports group index or name). |
| **`.str.extractAll`** | Extracts all regex match occurrences as an array of strings. |
| **`.str.extractGroups`** | Extracts all named and numbered capture groups as a struct record. |
| **`.str.extractMany`** | Extracts matches from multiple regex patterns with leftmost tie-breaking. |
| **`.str.find`** | Finds zero-based character index of first match (or null if not found). |
| **`.str.findMany`** | Finds character indices of multiple patterns simultaneously. |
| **`.str.head`** | Extracts the first n characters of the string. |
| **`.str.join`** | Joins string values across rows or groups using a delimiter. |
| **`.str.jsonDecode`** | Parses JSON string into typed struct/object or list column. |
| **`.str.jsonPathMatch`** | Extracts values matching a JSONPath query expression. |
| **`.str.len`** | Returns string character count. |
| **`.str.lenBytes`** | Returns UTF-8 encoded byte count of the string. |
| **`.str.lenChars`** | Returns Unicode code point count (surrogate-pair aware). |
| **`.str.lower`** | Converts ASCII/Unicode characters to lowercase. |
| **`.str.lpad`** | Pads string on the left up to specified width. |
| **`.str.normalize`** | Applies Unicode normalization form (NFC, NFD, NFKC, NFKD). |
| **`.str.padEnd`** | Alias for rpad(); pads string on the right. |
| **`.str.padStart`** | Alias for lpad(); pads string on the left. |
| **`.str.replace`** | Replaces first pattern match with replacement string or function. |
| **`.str.replaceAll`** | Replaces all pattern matches across the string. |
| **`.str.replaceMany`** | Replaces multiple patterns in a single pass with conflict resolution. |
| **`.str.reverse`** | Reverses characters in the string. |
| **`.str.rpad`** | Pads string on the right up to specified width. |
| **`.str.slice`** | Extracts a substring slice by offset and length. |
| **`.str.split`** | Splits string by delimiter into a list/array of substrings. |
| **`.str.startsWith`** | Checks if string starts with specified prefix. |
| **`.str.stripChars`** | Strips specified leading and trailing characters (defaults to whitespace). |
| **`.str.stripCharsEnd`** | Strips specified trailing characters from the end of the string. |
| **`.str.stripCharsStart`** | Strips specified leading characters from the start of the string. |
| **`.str.stripPrefix`** | Removes prefix from start of string if present. |
| **`.str.stripSuffix`** | Removes suffix from end of string if present. |
| **`.str.strptime`** | Parses string to Datetime or Date using format specifiers. |
| **`.str.tail`** | Extracts the last n characters of the string. |
| **`.str.toCamelCase`** | Converts string to camelCase. |
| **`.str.toDate`** | Parses ISO 8601 date string to Date. |
| **`.str.toDatetime`** | Parses ISO 8601 datetime string to Datetime. |
| **`.str.toDecimal`** | Parses numeric string to fixed-point Decimal(precision, scale). |
| **`.str.toInteger`** | Parses numeric string to integer (Int8..Int64, UInt8..UInt64). |
| **`.str.toKebabCase`** | Converts string to kebab-case. |
| **`.str.toLowerCase`** | Alias for lower(). |
| **`.str.toPascalCase`** | Converts string to PascalCase. |
| **`.str.toSnakeCase`** | Converts string to snake_case. |
| **`.str.toTime`** | Parses time string (HH:MM:SS) to Time. |
| **`.str.toTitleCase`** | Converts string to Title Case. |
| **`.str.toUpperCase`** | Alias for upper(). |
| **`.str.upper`** | Converts ASCII/Unicode characters to uppercase. |
| **`.str.zfill`** | Pads string on the left with zeros up to specified width. |

### 📅 Temporal Namespace (`.dt`)

| Method | Description |
| :--- | :--- |
| **`.dt.castTimeUnit`** | Casts duration/timestamp to target time unit precision. |
| **`.dt.century`** | Extracts 1-based Gregorian century. |
| **`.dt.convertTimeZone`** | Converts datetime to target IANA timezone. |
| **`.dt.date`** | Extracts Date component (zeroing time component). |
| **`.dt.day`** | Extracts 1-based day of month (1-31). |
| **`.dt.daysInMonth`** | Returns number of days in the current month (28-31). |
| **`.dt.epoch`** | Returns elapsed units since Unix Epoch (1970-01-01T00:00:00Z). |
| **`.dt.hour`** | Extracts hour of day (0-23). |
| **`.dt.isBusinessDay`** | Returns true if date falls on Monday through Friday. |
| **`.dt.isLeapYear`** | Returns true if calendar year is a leap year. |
| **`.dt.isoWeek`** | Extracts ISO 8601 week number (1-53). |
| **`.dt.isoYear`** | Extracts ISO 8601 week-numbering year. |
| **`.dt.microsecond`** | Extracts microsecond component (0-999). |
| **`.dt.millennium`** | Extracts 1-based Gregorian millennium. |
| **`.dt.millisecond`** | Extracts millisecond component (0-999). |
| **`.dt.minute`** | Extracts minute of hour (0-59). |
| **`.dt.month`** | Extracts 1-based month of year (1-12). |
| **`.dt.monthEnd`** | Snaps date to the final calendar day of the current month. |
| **`.dt.monthStart`** | Snaps date to the first calendar day of the current month. |
| **`.dt.nanosecond`** | Extracts nanosecond component (0-999). |
| **`.dt.offsetDay`** | Adds or subtracts signed integer calendar days. |
| **`.dt.ordinalDay`** | Extracts 1-based day of year (1-366). |
| **`.dt.quarter`** | Extracts calendar quarter (1-4). |
| **`.dt.replace`** | Replaces specific datetime components (year, month, day, etc.). |
| **`.dt.second`** | Extracts second of minute (0-59). |
| **`.dt.strftime`** | Formats datetime as a string using strftime-style format specifiers. |
| **`.dt.time`** | Extracts Time component (microseconds since midnight). |
| **`.dt.timestamp`** | Returns Unix timestamp in specified time unit. |
| **`.dt.totalDays`** | Computes total fractional duration in days. |
| **`.dt.totalHours`** | Computes total fractional duration in hours. |
| **`.dt.totalMicroseconds`** | Computes total duration in integer/fractional microseconds. |
| **`.dt.totalMilliseconds`** | Computes total fractional duration in milliseconds. |
| **`.dt.totalMinutes`** | Computes total fractional duration in minutes. |
| **`.dt.totalNanoseconds`** | Computes total duration in integer/fractional nanoseconds. |
| **`.dt.totalSeconds`** | Computes total fractional duration in seconds. |
| **`.dt.utcOffset`** | Returns timezone UTC offset in minutes or milliseconds. |
| **`.dt.week`** | Extracts calendar week number. |
| **`.dt.weekday`** | Extracts day of week (1 = Monday, 7 = Sunday). |
| **`.dt.year`** | Extracts calendar year. |

### 📊 Array/List Namespace (`.arr`)

| Method | Description |
| :--- | :--- |
| **`.arr.agg`** | Aggregates elements of each list row using an aggregation expression. |
| **`.arr.all`** | Returns true if all elements in the list row are truthy (Kleene logic). |
| **`.arr.any`** | Returns true if at least one element in the list row is truthy. |
| **`.arr.argMax`** | Returns the index of the first maximum element in each list row. |
| **`.arr.argMin`** | Returns the index of the first minimum element in each list row. |
| **`.arr.contains`** | Checks if list row contains the specified literal item. |
| **`.arr.containsAll`** | Checks if list row contains all items in the candidate set. |
| **`.arr.containsAny`** | Checks if list row contains any item in the candidate set. |
| **`.arr.countMatches`** | Counts occurrences of the target item in each list row. |
| **`.arr.eval`** | Evaluates an expression element-wise over each list item using $df.element(). |
| **`.arr.explode`** | Explodes/unnests list rows into individual scalar rows. |
| **`.arr.filter`** | Filters list row elements using an element-wise predicate expression. |
| **`.arr.first`** | Extracts the first element of each list row (supports nullOnOob). |
| **`.arr.gather`** | Gathers elements at specified indices (supports negative indexing). |
| **`.arr.gatherEvery`** | Gathers elements at periodic interval steps with optional offset. |
| **`.arr.get`** | Extracts element at zero-based index (supports negative indexing). |
| **`.arr.join`** | Joins array elements into a string separated by delimiter. |
| **`.arr.last`** | Extracts the last element of each list row (supports nullOnOob). |
| **`.arr.len`** | Returns the element count of each list row. |
| **`.arr.lengths`** | Alias for len(); returns length of each list row. |
| **`.arr.max`** | Computes maximum element in each list row. |
| **`.arr.mean`** | Computes arithmetic mean of numeric elements in each list row. |
| **`.arr.median`** | Computes median value of numeric elements in each list row. |
| **`.arr.min`** | Computes minimum element in each list row. |
| **`.arr.mode`** | Computes most frequent element(s) in each list row. |
| **`.arr.nUnique`** | Returns count of distinct elements in each list row. |
| **`.arr.reverse`** | Reverses element ordering in each list row. |
| **`.arr.shift`** | Shifts list elements by offset, filling vacated slots with null. |
| **`.arr.slice`** | Slices a sub-array from offset with optional length. |
| **`.arr.sort`** | Sorts elements of each list row with optional descending flag. |
| **`.arr.splice`** | Deletes and/or inserts elements at an index in each list row. |
| **`.arr.std`** | Computes sample standard deviation of elements in each list row. |
| **`.arr.sum`** | Computes sum of numeric elements in each list row. |
| **`.arr.toStruct`** | Converts array elements into a struct object with indexed/custom field names. |
| **`.arr.unique`** | Deduplicates elements within each list row. |
| **`.arr.variance`** | Computes sample variance of elements in each list row. |

### 🗃️ Struct/Object Namespace (`.struct`)

| Method | Description |
| :--- | :--- |
| **`.struct.field`** | Extracts a specific nested field from the struct column. |
| **`.struct.renameFields`** | Renames nested struct fields using a dictionary mapping. |
| **`.struct.unnest`** | Unnests/flattens all struct fields into individual top-level columns in select(). |
| **`.struct.withFields`** | Adds or overrides fields within the struct column. |

---

## 🛡️ Typing and Schema Registry

```typescript
import { $df } from "df-script";

const schema = {
  id: $df.DataType.Int32,
  price: $df.DataType.Decimal(10, 2),
  active: $df.DataType.Boolean,
  createdAt: $df.DataType.Datetime
};

const df = $df.data(rawData, schema);
```

### Supported Data Types
- **Integers**: `Int8`, `Int16`, `Int32`, `Int64`, `UInt8`, `UInt16`, `UInt32`, `UInt64`
- **Floats & Decimals**: `Float32`, `Float64`, `Decimal(precision?, scale?)`
- **General**: `Boolean`, `Utf8` (Strings), `Binary`, `Null`, `Object`
- **Temporal**: `Date`, `Datetime`, `Time`, `Duration`
- **Nested Structures**: `List` (Arrays), `Struct` (Objects)

---

## 🧑‍💻 Contributing & Development

```bash
# Run test suite
npm test

# Build production bundles
npm run build
```

---

## 📄 License

`df-script` is open-source software licensed under the [MIT License](LICENSE).
