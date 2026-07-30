# DFScript Backlog & TODO

A prioritized roadmap of upcoming features, improvements, and refactorings.

## 🚀 V1.6.0 Release Scope

### 🗂️ DataFrame & Column Transformations
- [x] **`explode` / `implode`**:
  * [x] **`explode`**: Unnest list-like columns into multiple rows, replicating the input rows for each list element (Polars `.explode()` style).
  * [x] **`implode`**: Group columns or values back into a single list element per group (Polars `.implode()` style).

### 📊 List Column Operations (`.list`)
- [x] **`list.eval()` & `.element`**:
  * Implement element-wise operations on lists/arrays using a sub-expression scope.
  * Replicate Polars `.list.eval()` behavior by exposing `.element` inside the eval blocks to represent the inner elements of each list.

### 🧱 Struct Column Operations (`.struct`)
- [x] **`struct` & `.struct.field()`**:
  * [x] Implement struct data type and `$df.struct(...)` constructor to group multiple columns into a single nested object/struct column.
  * [x] Implement `.struct.field(name)` to extract inner fields from a struct column.

### 📂 File Input/Output (I/O)
- [x] **`read_csv` / `write_csv`**:
  * [x] Implement streaming delimiter-separated parser with automatic schema and type inference.
  * [x] Provide stringifying writers supporting multiple CSV dialects.
- [x] **`read_json` / `write_json`**:
  * [x] Parse standard JSON arrays and newline-delimited JSON (NDJSON) records.

---

## 🎯 V1.8.0 Release Scope

### 🤝 Advanced Joins
- [ ] **Semi-Join & Anti-Join Support**:
  * Add `"semi"` and `"anti"` join options to the `join` method inside `DataFrame.ts`.
  * Ensure they only select columns from the left DataFrame and do not join right-side columns, utilizing the existing hash matching logic.

### ⏰ Timezone & Temporal Extensions
- [x] **Timezone-Aware Datetime Columns (`.dt.convert_time_zone()`)**:
  * Extend `DatetimeType` to accept an optional `timeZone` metadata parameter (e.g. `Datetime("Europe/London")`).
  * Integrate timezone awareness into formatting (`strftime`) and temporal operations (`.dt.hour()`, `.dt.day()`, `.dt.utc_offset()`, etc.) by leveraging `Intl.DateTimeFormat`.
  * Implement `.dt.convert_time_zone(tz)` to allow converting timezone-aware columns from one timezone to another.
- [x] **Casting Time Units (`.dt.cast_time_unit()`)**:
  * Implement `.dt.cast_time_unit(unit)` to convert/cast between millisecond (`ms`), microsecond (`us`), and nanosecond (`ns`) datetime storage precisions.
- [x] **Replacing time units (`.dt.with_time_unit()`)**:
  * Implement `.dt.with_time_unit(unit)` to set metadata precision (e.g. `"ms"`, `"us"`, `"ns"`) without changing underlying values.
- [x] **Replacing date/datetime components (`.dt.replace()`)**:
  * Implement `.dt.replace(options)` allowing replacement of year, month, day, hour, timeZone, etc. components.
- [x] **Truncating temporal values (`.dt.truncate()`)**:
  * Implement `.dt.truncate(every)` to floor datetimes to interval boundaries.

---

## ⌛ V1.9.0 Release Scope

### ⏱️ Dedicated Duration Data Type (`.duration`)
- [ ] **Dedicated `DurationType` & `.duration` Namespace**:
  * Separate `Duration` into a dedicated data type and expression namespace matching Polars `polars.datatypes.Duration`.
  * Support duration string parsing (`"1y 2mo 3d"`), unit conversions (`.duration.total_hours()`), and datetime arithmetic (`dt - dt`).
  * Implement `.dt.offset_by(by)` and duration rounding/offsetting when Duration namespace is added.

### 📊 Statistical Aggregations
- [ ] **Mathematical & Distribution Statistics**:
  * Implement **Shannon Entropy** (`.entropy()`) to compute the information density of a column.
  * Implement **Skewness** (`.skew()`) to measure the asymmetry of numeric columns.
  * Implement **Kurtosis** (`.kurtosis()`) to measure the peakedness/tailedness of distributions.

### 🔎 Inspection & Reporting Utilities
- [ ] **DataFrame Summary Statistics (`df.describe()`)**:
  * Generate a summary table displaying row counts, mean, standard deviation, min, percentiles (25%, 50%, 75%), and max metrics for all numeric columns.
- [ ] **Pretty Printing Tabular Layouts (`df.to_markdown()`, `df.to_html()`)**:
  * Implement custom table stringifying writers to output beautiful Markdown or HTML tables for logs, terminal outputs, and reports.

### 📦 Build & Tree-Shaking (ESM Support)
- [x] **Dual CommonJS & ES Module (ESM) Build**:
  * Configure the build script to output both CommonJS (`dist/index.js`) and ESM (`dist/index.mjs`) bundles.
  * Update `package.json` with `"exports"` map supporting both `"require"` and `"import"` to enable tree-shaking for modern bundlers (Vite/Webpack).

### 🛠️ Refactoring & Infrastructure
- [ ] **Standardize Exception Assertions**:
  * Centralize check-and-throw assertion helper functions and ensure all inline exceptions throw specialized classes from `src/exceptions/`.

### 🗂️ DataFrame Operations
- [ ] **DataFrame Find Method (`df.find()`)**:
  * Implement `.find(predicate)` convenience method on `DataFrame` class (similar to `Array.prototype.find()`) to evaluate a predicate expression/filter and return the first matching record/row object (or `undefined` if no match is found).

---

## 🔮 Future / Backlog Scope (V2.0+)

### ⏰ Advanced Temporal Extensions & Storage Infrastructure
- [ ] **`replace_time_zone(timeZone)` Method**:
  * Implement `.dt.replace_time_zone(timeZone: string | null)` to re-interpret local wall-clock values in a new timezone (shifting the underlying UTC instant/epoch time) or unset timezone awareness (`timeZone = null`), distinct from `.convert_time_zone(tz)` which preserves the UTC instant.
- [ ] **High-Precision Sub-Millisecond Datetime Storage (`us`, `ns`)**:
  * Transition from standard JS `Date` objects (which are limited to millisecond resolution) to raw 64-bit integer / `BigInt` array representations for true sub-millisecond (`us` microsecond and `ns` nanosecond) storage and calculations.
- [ ] **Evaluation-Time Timezone Guard Checks**:
  * Add evaluation-time schema verification in DataFrame operations (`with_columns`/`select`) to enforce that `convert_time_zone()` is only called on timezone-aware input columns even when expressions are built stand-alone without explicit `.cast_time_unit()` chains.
- [ ] **Row-Dynamic Timezone Conversions (`convert_time_zone(col("tz"))`)**:
  * Allow `.dt.convert_time_zone()` and timezone extraction methods to accept an expression parameter (`IExpr` / column reference) as the timezone argument, enabling per-row dynamic timezone conversions.
- [ ] **Dedicated Primitive `TimeType` & `DateType` Storage**:
  * Introduce dedicated low-level `TimeType` (nanoseconds/milliseconds since midnight) and 32-bit integer `DateType` (days since epoch) to match Polars native primitive types beyond combined JS `Date` objects.




