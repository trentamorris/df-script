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

## 🎯 V1.7.0 Release Scope

### 🤝 Advanced Joins
- [ ] **Semi-Join & Anti-Join Support**:
  * Add `"semi"` and `"anti"` join options to the `join` method inside `DataFrame.ts`.
  * Ensure they only select columns from the left DataFrame and do not join right-side columns, utilizing the existing hash matching logic.

### ⏰ Timezone & Temporal Extensions
- [ ] **Timezone-Aware Datetime Columns (`.dt.convert_time_zone()`)**:
  * Extend `DatetimeType` to accept an optional `timeZone` metadata parameter (e.g. `Datetime("Europe/London")`).
  * Integrate timezone awareness into formatting (`strftime`) and temporal operations (`.dt.hour()`, `.dt.day()`, `.dt.utc_offset()`, etc.) by leveraging `Intl.DateTimeFormat`.
  * Implement `.dt.convert_time_zone(tz)` to allow converting timezone-aware columns from one timezone to another.
- [ ] **Casting Time Units (`.dt.cast_time_unit()`)**:
  * Implement `.dt.cast_time_unit(unit)` to convert/cast between millisecond (`ms`), microsecond (`us`), and nanosecond (`ns`) datetime storage precisions.
- [ ] **Offsetting by duration strings (`.dt.offset_by()`)**:
  * Implement `.dt.offset_by(by)` supporting Polars duration strings like `"1y"`, `"2mo"`, `"3d"`, `"1w"`, `"4h"`, etc.
- [ ] **Replacing date/datetime components (`.dt.replace()`)**:
  * Implement `.dt.replace(options)` allowing replacement of year, month, day, hour, etc. components.
- [ ] **Replacing time zones (`.dt.replace_time_zone()`)**:
  * Implement `.dt.replace_time_zone(tz)` to replace timezone metadata without altering underlying timestamp values.
- [ ] **Rounding temporal values (`.dt.round()`)**:
  * Implement `.dt.round(every)` to round datetimes to the nearest interval boundary (e.g. `"1h"`, `"5m"`).
- [ ] **Truncating temporal values (`.dt.truncate()`)**:
  * Implement `.dt.truncate(every)` to truncate datetimes to a specified interval boundary (e.g. `"1d"`, `"1h"`).
- [ ] **Replacing time units (`.dt.with_time_unit()`)**:
  * Implement `.dt.with_time_unit(unit)` to set metadata precision (e.g. `"ms"`, `"us"`, `"ns"`) without changing underlying values.

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
- [ ] **Dual CommonJS & ES Module (ESM) Build**:
  * Configure the build script to output both CommonJS (`dist/index.js`) and ESM (`dist/index.mjs`) bundles.
  * Update `package.json` with `"exports"` map supporting both `"require"` and `"import"` to enable tree-shaking for modern bundlers (Vite/Webpack).

### 🛠️ Refactoring & Infrastructure
- [ ] **Standardize Exception Assertions**:
  * Centralize check-and-throw assertion helper functions and ensure all inline exceptions throw specialized classes from `src/exceptions/`.
- [ ] **Performance Benchmarks**:
  * Create a performance benchmark suite comparing `df-script` to standard JS array manipulations and alternative JS libraries for common operations (groupby, join, pivot).

