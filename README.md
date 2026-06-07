# 🚀 DFScript

DFScript is a lightweight, high-performance, and **zero-dependency** data analysis library for TypeScript and JavaScript. Heavily inspired by modern dataframe libraries like **Polars** and **Pandas**, DFScript brings a robust, expression-based columnar data processing engine directly to the JavaScript ecosystem.

With optimized columnar storage under the hood, DFScript enables you to build clean, maintainable, and type-safe data pipelines using a declarative expression API.

---

## ✨ Key Features

- 📦 **Zero Dependencies** — Extremely lightweight with zero runtime overhead.
- ⚡ **Columnar Execution** — Operates on efficient columnar arrays, minimizing allocations and speed bottlenecks.
- 🔗 **Expression-Based API** — Compose complex calculations, mappings, and filters using fluent, Polars-like expressions.
- 📂 **Strict Namespaces** — Clear API organization for specific domains:
  - `.str` for advanced string manipulations.
  - `.dt` for microsecond-precision datetimes, timezones, and duration calculations.
  - `.list` for robust array/list column operations.
- 🪟 **Analytical Window Functions** — Windowing (`over()`), cumulative aggregations (`cum_sum()`, `cum_max()`), and rolling metrics (`rolling_mean()`, `rolling_std()`).
- 🛠️ **Relational Operations** — Rich, high-speed joins, pivots, unpivots, vertical/horizontal concatenations, and group-by aggregations.
- 🛡️ **Defensive & Type-Safe** — Native type-coercion, robust null-safety, and strict schema validation.

---

## ⚙️ Compatibility & Design Principles

DFScript is designed with a **low-abstraction, zero-dependency** philosophy to guarantee maximum compatibility, predictability, and runtime performance:

- 📦 **Zero External Dependencies** — Lightweight footprint with zero runtime overhead or supply chain vulnerabilities.
- 🌐 **Universal Compatibility** — Works out-of-the-box in any JavaScript/TypeScript environment, including Node.js, Deno, Bun, web browsers, and cloud/edge workers.
- 🧱 **Built-in Standards** — Prioritizes native, built-in APIs (like standard `Date`, `Intl` formatting, and `TextEncoder`) and standard arrays rather than custom wrappers or heavy runtime abstractions.
- ⚡ **Optimized Execution Paths** — Under the hood, performance-critical code avoids higher-level array iterators and short-lived intermediate allocations in favor of simple, fast `for` and `while` loops with cached lengths, keeping garbage collection overhead to an absolute minimum.
- 🔄 **Easy Transpilation** — Relies strictly on low-level native operations, making it fully compatible with older environments (like ES6 or even ES5) without requiring complex polyfills or modern engine-specific features.

---

## 📦 Installation

Install DFScript using your favorite package manager:

```bash
npm install df-script
```

Or with Yarn/PNPM:

```bash
yarn add df-script
pnpm add df-script
```

---

## 🚀 Quick Start

Here is a quick example showing how to load data, run expressions, perform aggregations, and compute rolling statistics.

```typescript
import { $df } from "df-script";

// 1. Create a DataFrame with structured data and automatic schema inference
const df = $df.data([
  { id: 1, name: "Alice", join_date: "2026-01-15", sales: 1200.50, tags: ["sales", "east"] },
  { id: 2, name: "Bob", join_date: "2026-02-20", sales: 850.00, tags: ["support", "west"] },
  { id: 3, name: "Charlie", join_date: "2026-03-05", sales: 2300.00, tags: ["sales", "north"] },
  { id: 4, name: "David", join_date: "2026-03-12", sales: null, tags: ["marketing"] },
]);

// 2. Select columns, transform strings, format dates, and fill missing values
const processedDf = df.select(
  $df.col("id"),
  $df.col("name").str.upper().alias("NAME_UPPER"),
  $df.col("join_date").str.to_datetime().dt.year().alias("join_year"),
  $df.col("sales").add(500).alias("sales_adjusted"),
  $df.col("tags").list.lengths().alias("tag_count")
);

console.log(processedDf.to_dicts());
/* Output:
[
  { id: 1, NAME_UPPER: 'ALICE', join_year: 2026, sales_adjusted: 1700.5, tag_count: 2 },
  { id: 2, NAME_UPPER: 'BOB', join_year: 2026, sales_adjusted: 1350, tag_count: 2 },
  { id: 3, NAME_UPPER: 'CHARLIE', join_year: 2026, sales_adjusted: 2800, tag_count: 2 },
  { id: 4, NAME_UPPER: 'DAVID', join_year: 2026, sales_adjusted: null, tag_count: 1 }
]
*/
```

---

## 📖 Core Concepts

### The `$df` Entry Point

DFScript uses the `$df` namespace to bootstrap DataFrames, refer to columns, and access general types.

- `$df.data(dataRowsOrCols, schema?)`: Instantiates a new `DataFrame`.
- `$df.col(name)`: Creates a column reference expression.
- `$df.all()`: Selects all columns in the DataFrame.
- `$df.DataType`: Direct access to the `DataTypeRegistry` for schema specification.

### DataFrames vs. Columns

- **`DataFrame`** holds data in a columnar-oriented object: `columns: Record<string, any[]>`.
- **`ColumnExpr`** represents an evaluation sequence over rows. Operations (arithmetic, strings, lists, date-time, comparisons) are chained to build a tree of computations evaluated lazily.

---

## 🛠️ DataFrame API Reference

### 1. Transformations & Projection
- **`select(...exprs)`**: Projects columns. Supports strings, raw column names, `$df.col(...)` expressions, and `$df.all()`.
- **`with_columns(...exprs)`**: Adds or overrides columns. Accepts expressions, strings, or options objects mapping keys to values/expressions.
- **`drop(...names)`**: Drops one or more columns from the DataFrame.
- **`rename(mapping)`**: Renames columns using a `{ oldName: newName }` object.

### 2. Filtering & Row Selection
- **`filter(...predicates)`**: Filters rows where all predicate expressions evaluate to `true` (or non-null truthy values).
- **`unique(columns?)`**: Returns unique rows. If a subset of columns is provided, deduplicates based on those columns.
- **`limit(n, options?)`**: Returns the first `n` rows. Options include `offset` and direction `from: "start" | "end"`.
- **`head(n)`** / **`tail(n)`**: Shortcuts for `limit` from the start or end of the DataFrame.
- **`slice(start, end?)`**: Extract a subset of rows using standard index slicing.
- **`gather(indices, options?)`**: Gathers rows at specified indices. Supports single index, arrays of indices, and negative indexing. Options include `{ null_on_oob?: boolean }` (default: `false` which throws an error on out-of-bounds indices; if `true`, out-of-bounds indices result in `null` values).

### 3. Sorting
- **`sort({ by, descending?, nullsLast?, custom? })`**: Sorts rows. Supports single or multiple columns/expressions, custom descending configurations per column, custom null sorting rules, and custom comparator functions.

### 4. Grouping & Aggregations
- **`groupby(keys)`**: Groups the data by one or more columns, returning a `GroupedData` object.
- **`GroupedData.agg(...exprs)`**: Run aggregations on grouped data (e.g. `$df.col("sales").sum()`).

### 5. Reshaping & Joining
- **`join(other, on, how, suffixes?)`**: Merges two DataFrames on join keys. Supported join types: `"inner" | "left" | "right" | "outer"`.
- **`pivot(index, columns, values)`**: Pivots the table, converting unique values in `columns` into column headers.
- **`unpivot(idVars, valueVars, varName?, valueName?)`**: Melts/unpivots the table, converting wide columns into long format name-value pairs.
- **`concat(items, options?)`**: Concatenates multiple DataFrames. Supported concat strategies: `"vertical" | "horizontal" | "diagonal"`.

---

## 🧮 Expressions API Reference

All column expressions inherit from `ExprBase` and support standard operators.

### ➕ Arithmetic Expressions
Chained mathematical functions execute cleanly with built-in null-safety (Kleene logic).
- `.add(val)`, `.sub(val)`, `.mul(val)`, `.div(val)`, `.floordiv(val)`, `.mod(val)`, `.pow(val)`
- `.abs()`, `.sqrt()`, `.cbrt()`, `.exp()`, `.expm1()`, `.log(base?)`, `.log1p()`
- `.ceil()`, `.floor()`, `.trunc()`, `.round(decimals)`, `.clip(lower, upper)`, `.sign()`, `.negate()`
- `.sin()`, `.cos()`, `.tan()`, `.sinh()`, `.cosh()`, `.tanh()`, `.asin()`, `.acos()`, `.atan()`, `.asinh()`, `.acosh()`, `.atanh()`, `.degrees()`, `.radians()`, `.hypot(val)`

### 🔍 Comparison Expressions
- `.eq(val)`, `.ne(val)` — Strict value equivalence (null values return null).
- `.eq_missing(val)`, `.ne_missing(val)` — Equality checking that treats null/undefined values as equal.
- `.gt(val)`, `.ge(val)`, `.lt(val)`, `.le(val)`
- `.is_null()`, `.is_not_null()`
- `.is_finite()`, `.is_infinite()`, `.is_nan()`, `.is_not_nan()`
- `.is_in(arrayOrExpr)`, `.not_in(arrayOrExpr)`

### ⚡ Aggregations
- `.sum()`, `.avg()` / `.mean()`, `.median()`, `.mode()`, `.std()`, `.min()`, `.max()`
- `.count(options?)` — Option `{ includeNulls: boolean }`.
- `.first()`, `.last()`
- `.any()`, `.all()`, `.any_null()`, `.all_null()`, `.n_unique()`

---

## 📂 Namespaces

To maintain a clean and uncluttered API namespace, specific data transforms are grouped under dedicated accessors.

### 🔤 String Operations (`.str`)
Available on any expression via `.str`:
```typescript
$df.col("name").str.lower()
$df.col("code").str.starts_with("A")
$df.col("description").str.replace(/foo/i, "bar")
```
- **Methods**: `lower()`, `upper()`, `len()`, `len_bytes()`, `len_chars()`, `trim()`, `trim_start()`, `trim_end()`, `starts_with(prefix)`, `ends_with(suffix)`, `contains(pattern)`, `replace(pattern, repl)`, `replace_all(pattern, repl)`, `slice(offset, length?)`, `split(delimiter)`, `explode()`, `reverse()`, `lpad(w, f)`, `rpad(w, f)`, `zfill(w)`, `strip_chars(chars?)`, `strip_chars_start(chars?)`, `strip_chars_end(chars?)`, `strip_prefix(pfx)`, `strip_suffix(sfx)`, `to_titlecase()`, `strptime(format, strict?)`, `to_integer()`, `to_decimal(p, s)`, `to_date()`, `to_datetime()`, `to_time()`.

### 📅 Temporal Operations (`.dt`)
Available on datetime or duration values via `.dt`:
```typescript
$df.col("timestamp").dt.year()
$df.col("timestamp").dt.strftime("%Y-%m-%d %H:%M:%S")
$df.col("duration").dt.total_seconds()
```
- **Datetime Methods**: `year()`, `month()`, `day()`, `hour()`, `minute()`, `second()`, `millisecond()`, `microsecond()`, `nanosecond()`, `weekday()`, `week()`, `quarter()`, `century()`, `millennium()`, `ordinal_day()`, `is_leap_year()`, `month_start()`, `month_end()`, `date()`, `time()`, `datetime()`, `epoch(unit)`, `timestamp(unit)`, `strftime(format, locale?)`.
- **Duration Methods**: `total_days()`, `total_hours()`, `total_minutes()`, `total_seconds()`, `total_milliseconds()`, `total_microseconds()`, `total_nanoseconds()`.

### 📊 List Operations (`.list`)
Available on arrays or lists via `.list`:
```typescript
$df.col("tags").list.contains("vip")
$df.col("matrix").list.get(2)
```
- **Methods**: `lengths()`, `len()`, `get(idx, null_on_oob?)`, `first(null_on_oob?)`, `last(null_on_oob?)`, `gather(indices, null_on_oob?)`, `gather_every(n, offset?)`, `slice(offset, length?)`, `contains(item)`, `count_matches(item)`, `join(separator)`, `sort(descending?)`, `reverse()`, `unique()`, `sum()`, `mean()`, `median()`, `mode()`, `min()`, `max()`.

---

## 🪟 Window & Rolling Expressions

DFScript provides full support for analytic partition window operations using `.over()` and rolling filters.

```typescript
// Calculate partition cumulative sums and row numbers
df.select(
  $df.col("department"),
  $df.col("sales"),
  $df.col("sales").sum().over("department").alias("dept_total_sales"),
  $df.col("sales").cum_sum().over("department").alias("dept_running_sales"),
  $df.all().row_number().over("department").alias("dept_rank")
);
```

### 1. Cumulative Windows
- `.cum_sum(reverse?)`
- `.cum_prod(reverse?)`
- `.cum_min(reverse?)`
- `.cum_max(reverse?)`
- `.cum_count(reverse?)`

### 2. Rolling Metrics (Moving Window)
Apply moving calculations over a fixed window size:
- `.rolling_sum(size)`
- `.rolling_mean(size)`
- `.rolling_median(size)`
- `.rolling_min(size)`
- `.rolling_max(size)`
- `.rolling_std(size)`
- `.rolling_rank(size)`
- `.rolling_quantile(quantile, size)`

### 3. Positional & Rank Windows
- `.lead(offset, defaultVal?)`
- `.lag(offset, defaultVal?)`
- `.rank()`
- `.dense_rank()`
- `.row_number()`

---

## 🛡️ Typing and Schema Registry

You can optionally declare schemas to enforce precise data types and automatic type coercion during construction.

```typescript
import { $df } from "df-script";

const schema = {
  id: $df.DataType.Int32,
  price: $df.DataType.Decimal(10, 2),
  active: $df.DataType.Boolean,
  created_at: $df.DataType.Datetime
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

We welcome contributions! Please make sure to review our [Developer Guidelines](DEVELOPER_GUIDELINES.md) when writing code.

### Running Project Tests
DFScript has a comprehensive suite of unit tests. Run them using:

```bash
npx tsx _tests/run_all_project_tests.ts
```

---

## 📄 License

DFScript is open-source software licensed under the [MIT License](LICENSE).
