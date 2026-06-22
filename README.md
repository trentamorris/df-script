# 🚀 DFScript

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/trentamorris/df-script)
[![Donate](https://img.shields.io/badge/Donate-Support-green?style=for-the-badge)](DONATIONS.md)

DFScript is a lightweight, high-performance, and **zero-dependency** data analysis library for TypeScript and JavaScript. Heavily inspired by modern dataframe libraries like **Polars** and **Pandas**, DFScript brings a robust, expression-based columnar data processing engine directly to the JavaScript ecosystem.

With optimized columnar storage under the hood, DFScript enables you to build clean, maintainable, and type-safe data pipelines using a declarative expression API.

## 💡 Why DFScript?

Like many developers, I spent years working on frontend codebases filled with deeply nested, unoptimized data processing loops. We've all seen them: chained `.map()`, `.filter()`, `.sort()`, and `.forEach()` loops processing arrays of objects. Each step in the chain allocates new intermediate arrays, triggers garbage collection thrashing, and operates on row-based layouts that slow down browser main threads.

When you need to perform complex analytical transformations on the client-side—handling missing values, formatting timezone-aware datetimes, parsing decimals, or computing rolling averages—relying on standard JavaScript array methods quickly becomes a performance and maintenance nightmare. There had to be a better, cleaner, and faster way to express these pipelines. I realized that if nobody else had built a lightweight, zero-dependency columnar expression engine for the JavaScript ecosystem yet, why not roll up my sleeves and build it myself?

DFScript was born from that frustration. It brings Polars-like columnar execution, strict domain namespaces (`.str`, `.dt`, `.arr`, `.struct`), and lazy/declarative expression compilation to JavaScript. Under the hood, it avoids intermediate array allocations and uses highly optimized loops with cached lengths, so your frontend code stays clean, type-safe, and incredibly fast.

---

## 🗺️ Table of Contents

- [✨ Key Features](#-key-features)
- [⚙️ Compatibility & Design Principles](#-compatibility--design-principles)
- [🤝 Contributing & Collective Wisdom](#-contributing--collective-wisdom)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [📖 Core Concepts](#-core-concepts)
- [🛠️ DataFrame API Reference](#-dataframe-api-reference)
- [📂 File / Data I/O](#-file--data-io)
- [🧮 Expressions API Reference](#-expressions-api-reference)
- [📂 Namespaces](#-namespaces)
- [🪟 Window & Rolling Expressions](#-window--rolling-expressions)
- [🛡️ Typing and Schema Registry](#-typing-and-schema-registry)
- [🧑‍💻 Contributing & Development](#-contributing--development)
- [📄 License](#-license)

---

## ✨ Key Features

- 📦 **Zero Dependencies** — Extremely lightweight with zero runtime overhead.
- ⚡ **Columnar Execution** — Operates on efficient columnar arrays, minimizing allocations and speed bottlenecks.
- 🔗 **Expression-Based API** — Compose complex calculations, mappings, and filters using fluent, Polars-like expressions.
- 📂 **Strict Namespaces** — Clear API organization for specific domains:
  - `.str` for advanced string manipulations.
  - `.dt` for microsecond-precision datetimes, timezones, and duration calculations.
  - `.arr` for robust array/list column operations.
  - `.struct` for nested object and struct manipulation.
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

## 🤝 Contributing & Collective Wisdom

We don’t pretend to have encountered every localized date format, database quirk, or environment-specific edge case. DFScript is built on the belief that software correctness is a collective endeavor. 

If you run into an unsupported edge case or unexpected behavior in any of our functions, we want to hear about it. Help us harden this engine by opening a GitHub Issue or submitting a PR—every report makes the library more robust for everyone.

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
  $df.col("tags").arr.lengths().alias("tag_count")
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

DFScript uses the `$df` namespace to bootstrap DataFrames, refer to columns, build expressions, and access data types.

- `$df.data(dataRowsOrCols, schema?)`: Instantiates a new `DataFrame`.
- `$df.read_json(content, options?)`: Reads JSON/NDJSON content into a new `DataFrame`.
- `$df.read_csv(content, options?)`: Reads CSV content into a new `DataFrame`.
- `$df.col(name)`: Creates a column reference expression.
- `$df.all()`: Selects all columns in the DataFrame.
- `$df.exclude(columns)`: Creates an expression matching all columns except the specified ones.
- `$df.coalesce(...exprs)`: Returns the first non-null value among columns or literal expressions.
- `$df.lit(val)`: Explicitly wraps a raw value into a literal expression.
- `$df.when(predicate).then(value)...otherwise(value)`: Constructs a conditional expression (when-then-otherwise chain).
- `$df.implode(column)`: Aggregates a column's rows (or grouped values) into a list.
- `$df.seq_range(value, options?)`: Generates a sequence range of values.
- `$df.element()`: References the current array element within an `.arr.eval(...)` expression.
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

## 📂 File / Data I/O

DFScript provides helpers to serialize and parse data formats like JSON and CSV.

### Reading Data
- **`$df.read_json(content, options?)`**: Reads a JSON array or Newline Delimited JSON (NDJSON) string and loads it into a new DataFrame.
  ```typescript
  import { $df } from "df-script";

  // Read standard JSON array
  const df = $df.read_json('[{"id": 1, "name": "Alice"}]');

  // Read Newline Delimited JSON (NDJSON)
  const dfNdjson = $df.read_json('{"id": 1}\n{"id": 2}', { format: "ndjson" });
  ```
- **`$df.read_csv(content, options?)`**: Reads a CSV string and loads it into a new DataFrame, with automatic data type inference.
  ```typescript
  import { $df } from "df-script";

  const csvContent = "id,name,active\n1,Alice,true\n2,Bob,false";
  const df = $df.read_csv(csvContent, {
    separator: ",",
    hasHeader: true,
    inferSchema: true
  });
  ```

### Writing Data
- **`df.write_json(file?, options?)`**: Serializes a DataFrame into a JSON or NDJSON string. If a file path or writable stream/object (with a `.write` method) is provided, writes/streams the content as a side-effect. Always returns the serialized string.
  ```typescript
  // Write to a file and get the string
  const jsonStr = df.write_json("output.json");
  ```
- **`df.write_csv(file?, options?)`**: Serializes a DataFrame into a CSV string. Supports options for headers, custom separators, quote styles, float precision, and BOM. If a file path or writable stream/object (with a `.write` method) is provided, writes/streams the content as a side-effect. Always returns the serialized string.
  ```typescript
  // Serialize to a CSV string
  const csvStr = df.write_csv();

  // Write to a file with custom separator
  df.write_csv("output.csv", { separator: ";" });
  ```

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

### 🔀 Control Flow & Conditionals
Construct dynamic `CASE WHEN` branches using the `$df.when` API:
```typescript
import { $df } from "df-script";

df.select(
  $df.col("sales"),
  $df.when($df.col("sales").gt(2000)).then("High Performance")
     .when($df.col("sales").gt(1000)).then("Standard Performance")
     .otherwise("Low Performance")
     .alias("sales_category")
);
```
- `$df.when(predicate).then(value)`: Starts a conditional evaluation.
- `.when(predicate).then(value)`: Chains additional conditions.
- `.otherwise(value)`: Specifies the fallback value when no conditions match (returns a complete `ColumnExpr`).

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

### 📊 Array/List Operations (`.arr`)
Available on any array or list column expression via `.arr`:
```typescript
$df.col("tags").arr.contains("vip")
$df.col("matrix").arr.get(2)

// Element-wise manipulation inside arrays:
$df.col("numbers").arr.eval(element().mul(2)).alias("numbers_doubled")
$df.col("tags").arr.eval(element().str.to_uppercase()).alias("upper_tags")
```
- **Methods**: `lengths()`, `len()`, `get(idx, null_on_oob?)`, `first(null_on_oob?)`, `last(null_on_oob?)`, `gather(indices, null_on_oob?)`, `gather_every(n, offset?)`, `slice(offset, length?)`, `contains(item)`, `count_matches(item)`, `join(separator)`, `sort(descending?)`, `reverse()`, `unique()`, `sum()`, `mean()`, `median()`, `mode()`, `min()`, `max()`, `eval(expr)`.

### 🗃️ Struct/Object Operations (`.struct`)
Available on any struct or nested object column expression via `.struct`. You can access fields dynamically via properties or explicit methods:
```typescript
// Sibling fields access via Proxy
$df.col("address").struct.city.alias("city")

// Or using the explicit field method
$df.col("address").struct.field("city")
```
- **Methods**:
  - `field(name)`: Accesses a field within the struct.
  - `rename_fields(mapping)`: Renames fields in the struct based on a `{ oldKey: newKey }` mapping.
  - `with_fields(fields)`: Adds or overrides fields in the struct. Accepts an array of aliased expressions or an object.
  - `unnest()`: Expands the fields of the struct into individual top-level columns in a select projection.
    ```typescript
    // Flattens the address struct into "city", "state", etc. at the top-level
    df.select($df.col("address").struct.unnest())
    ```

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

### 🧠 TypeScript Type Inference & IDE Safety

When you pass a schema to `$df.data()`, DFScript's types automatically infer the target types of the fields, turning dynamic dataframes into compile-safe records. Your IDE will auto-complete column names and validate that operations match the underlying types.

```typescript
import { $df } from "df-script";

const schema = {
  name: $df.DataType.Utf8,
  age: $df.DataType.Int32,
  is_active: $df.DataType.Boolean
};

// Inferred DataFrame type is DataFrame<{ name: string; age: number; is_active: boolean }>
const df = $df.data(rawData, schema);

// Full IDE autocomplete, type validation, and compiler safety!
const activeUsers = df.filter($df.col("is_active").eq(true));
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
