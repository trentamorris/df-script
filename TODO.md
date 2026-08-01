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
- [x] **Semi-Join & Anti-Join Support**:
  * Add `"semi"` and `"anti"` join options to the `join` method inside `DataFrame.ts`.
  * Ensure they only select columns from the left DataFrame and do not join right-side columns, utilizing the existing hash matching logic.
- [x] **Heterogeneous Key Names (`leftOn` & `rightOn`)**:
  * Allow specifying different join key column names for left vs right DataFrame (`leftOn` and `rightOn` parameters in `JoinOptions`), enabling joins when key column names do not match.
- [x] **Cross Join (`how: "cross"`)**:
  * Implement Cartesian product join between two DataFrames without requiring join key arguments.
- [x] **Join Key Coalescing (`coalesce`)**:
  * Provide option to coalesce nulls across join key columns in outer joins.
- [ ] **Asof Join (`df.join_asof(...)`)**:
  * Implement inexact matching joins on sorted keys (e.g. nearest timestamp matching for time series data).


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
- [x] **Standardize Exception Assertions**:
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

### 🧠 Lazy Execution & Query Optimization (`LazyFrame`)
- [ ] **`df.lazy()` & `LazyFrame` API**:
  * Implement `.lazy()` to transition a `DataFrame` into a `LazyFrame`, building a Directed Acyclic Graph (DAG) query plan instead of executing operations eagerly.
- [ ] **Predicate & Projection Pushdown Optimizations**:
  * **Predicate Pushdown**: Push `filter()` expressions up the DAG (and into `read_csv`/`read_json` readers) so unneeded rows are filtered out before transformations or joins occur.
  * **Projection Pushdown**: Inspect final `select()` columns and prune unused columns early in the DAG to minimize memory allocations.
- [ ] **Query Execution & Inspection (`.collect()`, `.explain()`)**:
  * **`.collect()`**: Execute the optimized logical/physical query plan DAG and return a concrete `DataFrame`.
  * **`.explain({ optimized?: boolean })`**: Format and return a text/tree string representation of the unoptimized or optimized query plan DAG, allowing developers to inspect predicate pushdown, projection pushdown, and join order optimizations.
### ⚡ Performance & Interoperability
- [ ] **Primitive Fast-Path Row Hashing**:
  * Optimize `computeRowHash` and `toCanonicalString` to use numeric hashing algorithms (e.g., FNV-1a or 64-bit integer mixing) when keys consist strictly of primitive types (integers, strings, booleans), bypassing string allocations during large `DataFrame.join()` and `.groupby()` operations.
- [ ] **Apache Arrow & IPC Interoperability**:
  * Provide lightweight serialization adapters for Apache Arrow IPC memory format, facilitating zero-copy data exchange with Python Polars, PyArrow, and browser WebAssembly runtimes.
### 🗂️ Recommended DataFrame Operations
- [ ] **Dynamic Time-Series Grouping (`df.group_by_dynamic()`)**:
  * Implement `.group_by_dynamic(index_column, { every, period, offset, label, closed })` for time-series windowing (e.g. tumbling & sliding temporal aggregation buckets).
- [ ] **Rolling Window Grouping (`df.group_by_rolling()`)**:
  * Implement `.group_by_rolling(index_column, { period, offset, closed })` for continuous rolling window aggregations on sorted time/numeric series.
- [ ] **Random Sampling (`df.sample()`)**:
  * Implement `.sample(nOrFraction, options)` to randomly select $N$ rows or a fractional percentage of rows (with optional seed and replacement), useful for ML train/test splitting and dataset exploration.
- [ ] **DataFrame Partitioning (`df.partition_by()`)**:
  * Implement `.partition_by(columns)` to split a DataFrame into a Map of distinct `DataFrame` chunks grouped by key column combinations.
- [ ] **DataFrame Copying (`df.clone()`)**:
  * Implement explicit deep/shallow cloning of a `DataFrame` instance and its underlying data arrays.
- [ ] **Convenience Inspection Methods (`df.head()`, `df.tail()`)**:
  * Provide `.head(n)` and `.tail(n)` convenience wrappers for quick inspection of top and bottom rows.

### 🔢 Expressions & Transformations Missing Matrix
- [ ] **Lead/Lag & Difference (`col.shift()`, `col.diff()`)**:
  * Implement `.shift(n, fill_value)` for lead/lag calculations and `.diff(n)` for step differences across rows.
- [ ] **Ranking (`col.rank()`)**:
  * Implement `.rank(method, descending)` supporting dense, ordinal, min, max, and average rank methods.
- [ ] **Cumulative Aggregations (`.cum_sum()`, `.cum_prod()`, `.cum_min()`, `.cum_max()`)**:
  * Implement running cumulative totals, products, minimums, and maximums across column expressions.
- [ ] **Datatype & Pattern Selectors (`cs.numeric()`, `cs.string()`, `cs.matches()`)**:
  * Add column selector helpers to allow selecting columns dynamically by data type or regex matching in `select()` and `with_columns()`.







