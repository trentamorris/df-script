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
- [x] **Row Order Maintenance (`maintain_order`)**:
  * Implement `maintain_order` parameter in `JoinOptions` (`"none"`, `"left"`, `"right"`, `"left_right"`, `"right_left"`) to explicitly control output row ordering across join strategies.
  
### ⏱️ Inexact Asof Join (`df.join_asof`)
- [x] **Asof Join (`df.join_asof(...)`)**:
  * [x] Add `JoinAsofOptions` types interface in `src/dataframe/types.ts`.
  * [x] Add `join_asof` method declaration & signature to `DataFrame.ts` in `src/dataframe/dataframe.ts`.
  * [x] Add `alignAsofIndices` helper function in `src/dataframe/utils.ts` for index matching.
  * [x] Support `on`, `leftOn`, and `rightOn` key parameters.
  * [x] Support `by`, `leftBy`, and `rightBy` grouping/partition parameters.
  * [x] Support matching strategies: `"backward"` (default), `"forward"`, and `"nearest"`.
  * [x] Support `tolerance` threshold filtering (numeric & temporal duration).
  * [x] Support `allow_exact_matches` (boolean flag).
  * [x] Validate sorted key order preconditions and handle edge cases (nulls, out-of-bounds).

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

### ⏱️ Dedicated Duration Data Type & `.dt` Expressions
- [x] **`DurationType` & `.dt` Duration Methods**:
  * [x] Core `DurationType` and `Duration` export in `src/datatypes/types.ts` with time unit precision metadata (`timeUnit: "ms" | "us" | "ns"`).
  * [x] **`$df.duration(...)` Expression Constructor**: Implement `$df.duration({ days, hours, minutes, seconds, milliseconds, weeks, timeUnit })` matching `polars.duration()`.
  * [x] **Date & Duration Arithmetic & `.dt` Duration Methods**: Support arithmetic between Date/Datetime/Time/Duration columns and duration unit conversion methods (`.dt.total_hours()`, `.dt.total_days()`, etc.).

### 📋 DataFrame Copying (`df.clone()`)
- [x] **DataFrame Copying (`df.clone()`)**:
  * Implement explicit deep copy of a `DataFrame` instance, copying all underlying column arrays and schema metadata.

### 📦 Build & Tree-Shaking (ESM Support)
- [x] **Dual CommonJS & ES Module (ESM) Build**:
  * Configure the build script to output both CommonJS (`dist/index.js`) and ESM (`dist/index.mjs`) bundles.
  * Update `package.json` with `"exports"` map supporting both `"require"` and `"import"` to enable tree-shaking for modern bundlers (Vite/Webpack).

### 🛠️ Refactoring & Infrastructure
- [x] **Standardize Exception Assertions**:
  * Centralize check-and-throw assertion helper functions and ensure all inline exceptions throw specialized classes from `src/exceptions/`.

---

## ⌛ V1.9.0 Release Scope

### ⚙️ Schema Engine & Expression Type Inference
- [x] **Post-Operation Schema Type Deduction**:
  * [x] Implement central post-operation type inference to automatically deduce target schema DataTypes for chained binary operations (`Datetime - Datetime => Duration`, `Datetime + Duration => Datetime`) without requiring explicit `.cast()` calls.

### 📊 Statistical Aggregations
- [x] **Mathematical & Distribution Statistics**:
  * [x] Implement **Shannon Entropy** (`.entropy()`) to compute the information density of a column.
  * [x] Implement **Skewness** (`.skew()`) to measure the asymmetry of numeric columns.
  * [x] Implement **Kurtosis** (`.kurtosis()`) to measure the peakedness/tailedness of distributions.
  * [x] Implement **Product** (`.product()`) to compute the multiplicative product of elements in a group.
  * [x] Implement **Variance** (`.variance()`) to compute sample variance.
  * [x] Implement **Min By / Max By** (`.min_by()`, `.max_by()`) to find target column value corresponding to min/max in by column.
  * [x] Implement **NaN Max / NaN Min** (`.nan_max()`, `.nan_min()`) to compute max and min taking floating-point `NaN` propagation into account.
  * [x] Implement **Arg Min / Arg Max** (`.arg_min()`, `.arg_max()`) to find 0-indexed position of min/max values.
  * [x] Implement **Array Arg Min / Arg Max** (`.arr.arg_min()`, `.arr.arg_max()`) for list cell min/max index lookup.
  * [x] Implement **Array Aggregation** (`.arr.agg()`) to apply expressions over list elements.
  * [x] Implement **Bitwise Aggregations** (`.bitwise_and()`, `.bitwise_or()`, `.bitwise_xor()`) across group elements.

### 🔤 String Column Expressions (`.str`)
- [x] **Unimplemented String Expressions**:
  * [x] **`contains_any`**: Check if string contains any pattern from a collection.
  * [x] **`count_matches`**: Count total occurrences of regex or sub-string pattern matches.
  * [x] **`decode` / `encode`**: Binary encoding/decoding (Hex, Base64, etc.).
  * [x] **`escape_regex`**: Escape literal characters for safe regex usage.
  * [x] **`extract_all` / `extract_groups` / `extract_many`**: Advanced multi-match and structured group extractions.
  * [x] **`find` / `find_many`**: Find pattern match indices within string elements.
  * [x] **`join`**: Join list of string elements using a delimiter.
  * [x] **`json_decode`**: Parse JSON strings into objects or arrays using `safeJsonParse`.
  * [x] **`json_path_match`**: Extract fields using JSONPath syntax.
  * [x] **`normalize`**: Unicode normalization (NFC, NFD, NFKC, NFKD).
  * [x] **`replace_many`**: Batch replace multiple string patterns simultaneously.
  * [x] **`split` (unified `split_exact` & `split_n`)**: Consolidated split options (`limit`, `exact`, `strict`) into unified `.str.split()` method.

---


## 🚀 v2.0.0 Release Scope

### 🏷️ Idiomatic `camelCase` API Standardization
- [x] **Complete `camelCase` API & File Structure Standardization**:
  * [x] **DataFrame & Expression Methods**: Standardized all method signatures to idiomatic `camelCase`.
  * [x] **Source File Names**: Standardized module filenames to `camelCase`.
  * [x] **Options & Configuration Parameters**: Converted all option parameter interfaces to `camelCase`.

### 📚 Modular Documentation Infrastructure
- [x] **Centralized Example Reuse (`doc-examples.ts`)**:
  * [x] Extracted repetitive ASCII JSDoc input tables into root `doc-examples.ts` with `<!-- doc:KEY -->` tags, significantly reducing source file lengths while dynamically hydrating `docs.json`.

### 🧪 Test Suite Architecture & 1:1 Directory Mirroring
- [x] **Align `_tests/` Directory Structure Directly with `src/`**:
  * Organize test files to mirror the `src/` hierarchy 1:1, enabling granular, atomic test execution alongside the global `npm test` runner.

### 🌐 ES2020 Standard Target & Environment Compatibility
- [x] **Verified ES2020 Baseline Compatibility Across All Runtimes**:
  * Emitted bundles target `es2020` without polyfill overhead, supporting Node.js 14+, modern browsers (Chrome 80+, Safari 13.1+, Firefox 74+, Edge 80+), Bun, Deno, and Edge Workers.
  * Preserved `@note` JSDoc annotations for environment-specific APIs (such as filesystem access in `df.writeCsv` and `df.writeJson`).
- [x] **Generalized Distinct Matching (`isNDistinct`)**:
  * Added `$df.col().isNDistinct(index, nullOnOob)` to `ComparisonExpr` supporting positive & negative index positions (e.g. 0 for first distinct, -1 for last distinct), out-of-bounds handling, and Kleene null propagation.

### 🏛️ Unified Root Column Expression Architecture
- [x] **Consolidate Root Mixins into Single `StandardExpr` / `ColumnExpr`**:
  * Merge arbitrary root mixins (`ArithmeticExpr`, `ComparisonExpr`, `AggregationExpr`, `LogicalExpr`, `ManipulationExpr`, `WindowExpr`) directly into `StandardExpr` / `ColumnExpr`.
  * Maintain clean, dedicated namespace mixins only for explicit sub-namespaces (`.arr`, `.bin`, `.dt`, `.str`, `.struct`).
  * Eliminate cross-mixin TypeScript friction, prototype casting, and circular module dependencies for root column methods.
- [x] **Decompose Column Expression Mixin Test Suites into 1:1 Atomic Test Files**:
  * Mirrored `_tests/dataframe` structure across `ArrayExpr`, `StandardExpr`, `StringExpr`, `StructExpr`, and `TemporalExpr`.

### 🗂️ Recommended DataFrame Operations
- [x] **Dynamic Time-Series Grouping (`df.groupByDynamic()`)**:
  * [x] Implement `.groupByDynamic(index_column, { every, period, offset, label, closed, includeBoundaries, by, startBy, checkSorted })` for time-series windowing (tumbling, sliding, and rolling temporal aggregation buckets).
- [x] **Temporal Duration Construction & Parsing (`$df.duration()`, `utils/duration.ts`)**:
  * [x] Multi-token compound string parsing (`"1d 12h 30m"`, `"-1h 30m"`, scientific notation `"1.5e3ms"`, micro-sign `"µs"` / `"μs"`).

### 🔢 Expressions & Transformations Missing Matrix
- [x] **Select Columns by DataType (`$df.col(DataType)` / `pl.col(pl.Float64)`)**:
  * [x] Allow passing `DataType` instances (or constructors) directly into `col()` (e.g. `$df.col(DataTypeRegistry.Float64)`, `$df.col(DataTypeRegistry.Numeric)`).
  * [x] Expand the column selector engine in `select()` and `with_columns()` to match and expand all DataFrame columns possessing the matching datatype, applying expressions uniformly across all matching columns.
- [x] **Datatype & Pattern Selectors (`$df.col(DataType)` / `$df.col(RegExp)` / `cs.*`)**:
  * [x] Allow selecting columns dynamically by concrete/abstract data types (`$df.Numeric`, `$df.Temporal`, `$df.Float64`, `$df.Struct`, `$df.Array`) in `select()` and `with_columns()`.
  * [x] Allow selecting columns dynamically by RegExp patterns (`df.select(/^prefix_/)`, `$df.col(/_suffix$/)`) with full transformation expression support.


## 🚀 v2.1.0 Release Scope

### ⚡ Performance, Bundle Size & Interoperability
- [x] **Eliminate Redundant Convenience Wrappers**: Removed redundant aliases (`df.vstack()` and `df.hstack()`) in favor of canonical `df.concat()` and `$df.concat()`.
- [x] **Modular 1:1 Test Parity**: Built 110 dedicated atomic unit tests mirroring `src/utils/` exports 1:1.
- [x] **Horizontal Row-Wise Vector Expressions**: Added `$df.allHorizontal`, `$df.anyHorizontal`, `$df.maxHorizontal`, `$df.minHorizontal`, `$df.sumHorizontal`, `$df.meanHorizontal`, `$df.coalesceHorizontal`, and `$df.concatHorizontal`.
- [x] **DataFrame Reshaping**: Implemented full wide-table pivoting via `DataFrame.unstack()`, schema transformation via `DataFrame.cast()`, and deep comparison via `DataFrame.equals()`.

### 🧹 Strict NaN vs. Null Semantics Audit
- [x] **Core NaN Semantics & Behavior Verification**:
  * [x] Verify consistent behavior across all aggregations (`.sum()`, `.mean()`, `.std()`, `.min()`, `.max()`) and comparison operators: ensure floating-point `NaN` propagates or ignores according to IEEE 754 / Polars standards (distinguishing `NaN` from missing `null`, and handling `NaN == NaN` consistently in join/group hashing vs. boolean comparisons).
  * [x] Check type inference: ensure numeric columns containing only numbers and `NaN` infer as `Float64` rather than generic `Any` or `Null`.


## 🚀 v2.2.0 Release Scope

### 🚨 Centralized Error Handling & Exception Factory Architecture
- [ ] **Centralized Exception Factories (`src/exceptions/utils.ts`)**:
  * Consolidate repetitive inline error constructions across `dataframe.ts`, `StandardExpr.ts`, and `utils/` into dedicated factory helpers (`_errCol`, `_errArg`, `_errType`, `_errSchema`, `_errBounds`).
  * Eliminate duplicate string literal allocations across throw sites, significantly shrinking un-mangled bundle bytes.
  * Standardize error messages with clear diagnostic context (expected types, received types, column names, out-of-bounds indices).
  * Ensure 100% adherence to Rule #8 (containing scope) and Rule #2 (defensive guard clauses).

### ⚡ Algorithmic Bundle Size Optimization & AST Compaction
- [ ] **Higher-Order Aggregator / Reducer Templates**:
  * Factor out repetitive null-checking, partition dispatch, and loop accumulation scaffolds across `StandardExpr.ts` (`sum`, `mean`, `min`, `max`, `prod`, `std`, `var`) into a lean internal aggregation kernel.
- [ ] **Unary Math Vectorizer Dispatch Table**:
  * Unify the 18 element-wise mathematical unary expressions (`abs`, `sqrt`, `cbrt`, `exp`, `log`, `sin`, `cos`, `tan`, etc.) through a single vectorized higher-order transform.
- [ ] **Temporal Expression Date Part Dispatcher**:
  * Consolidate repetitive date component extractions in `TemporalExpr.ts` into a unified `_datePart` extractor.
- [ ] **Advanced Minification Pipeline**:
  * Evaluate secondary Terser / AST pass in `npm run build` to fold constants and compact object property patterns beyond standard esbuild minification.


## 🔮 Future / Backlog Scope (V2.2.0+)

### 🏹 Interoperability & High-Precision Storage
- [ ] **Lightweight Zero-Dependency Binary Serialization (`serialize` / `deserialize`)**:
  * Implement compact binary buffer serialization (`ArrayBuffer`) for fast, zero-copy DataFrame caching in browser IndexedDB, Web Workers, or local storage without heavy external format dependencies.
- [ ] **Apache Arrow & IPC Interoperability**:
  * Provide lightweight serialization adapters for Apache Arrow IPC memory format, facilitating zero-copy data exchange with Python Polars, PyArrow, and browser WebAssembly runtimes.
- [ ] **High-Precision Sub-Millisecond Datetime & Duration Storage (`us`, `ns`)**:
  * Transition from standard JS `Date` objects (which are limited to millisecond resolution) to raw 64-bit integer / `BigInt` array representations for true sub-millisecond (`us` microsecond and `ns` nanosecond) datetime storage, duration storage, and `.dt.total_*()` unscaling.
- [ ] **First-Class 1D `Series` Data Structure**:
  * Introduce a dedicated 1D `Series` container (`$df.Series(name, values, dtype)`) providing direct columnar operations, element-wise math/string/temporal expressions, and seamless conversions (`df.to_series()`, `df.drop_in_place()`) without wrapping into single-column DataFrames.
- [ ] **Optional Multi-Threaded / Web Worker Chunk Parallelization**:
  * Evaluate optional multi-threaded expression chunking via Worker Threads / Web Workers and `SharedArrayBuffer` for heavy background numeric operations without disrupting synchronous, single-threaded browser DX.

### 🐻 Complete Polars Functionality Parity & Migration Backlog
The following list tracks the complete surface of Polars functionality to achieve 100% parity where applicable to JS/TS.

- [x] `/allHorizontal`            (`$df.horizontal(<cols>).all()`)
- [ ] `/any`
- [x] `/anyHorizontal`            (`$df.horizontal(<cols>).any()`)
- [ ] `/approxNUnique`
- [ ] `/arange`
- [ ] `/arctan2`
- [ ] `/arctan2d`
- [ ] `/argSortBy`
- [ ] `/argWhere`
- [ ] `/businessDayCount`
- [ ] `/concatArr`
- [ ] `/concatStr`
- [ ] `/corr`
- [ ] `/count`
- [ ] `/cov`
- [ ] `/cumCount`
- [ ] `/cumFold`
- [ ] `/cumReduce`
- [ ] `/cumSum`
- [x] `/cumSumHorizontal`           (`$df.horizontal(<cols>).arr.cumSum()`)
- [ ] `/DataFrame.__getitem__`      (Deferred: requires standalone `Series` type)
- [ ] `/DataFrame.__setitem__`      (Deferred: requires standalone `Series` type)
- [x] `/DataFrame/bottom_k`         (`$df.data(...).sort({ by: <col>, descending: false }).head(k)`)
- [x] `/DataFrame.cast`             (`$df.data(...).cast(dtype)` or `$df.data(...).cast({ col: dtype })`)
- [x] `/DataFrame/clear`            (`$df.data(...).slice(0, 0)`)
- [x] `/DataFrame/collect_schema`   (`$df.data(...).schema`)
- [ ] `/DataFrame/corr`
- [x] `/DataFrame/count`            (`$df.data(...).height` [total rows] or `$df.data(...).select($df.all().count())` [non-null per column])
- [ ] `/DataFrame/deserialize`      (JSON format available via `$df.readJson()`; binary buffer format tracked in Future Scope)
- [ ] `/DataFrame/drop_in_place`    (Deferred: requires standalone `Series` type)
- [x] `/DataFrame/drop_nans`        (`$df.data(...).filter($df.all().isNotNan())`)
- [x] `/DataFrame/drop_nulls`       (`$df.data(...).dropNulls(<subset>)`)
- [x] `/DataFrame/equals`           (`$df.data(...).equals(other, { nullsEqual })`)
- [x] `/DataFrame/extend`           (`$df.concat([df1, df2], { how: "vertical" })` — in Polars this is in-place Arrow chunk reallocation; DFScript's immutable vertical concat already builds contiguous arrays directly)
- [ ] `/DataFrame/fill_nan`
- [ ] `/DataFrame/flags`            (Polars internal engine metadata exposing chunk-level optimization flags like SORTED_ASC / FAST_EXPLODE)
- [ ] `/DataFrame/fold`
- [ ] `/DataFrame/gather`
- [ ] `/DataFrame/gather_every`
- [ ] `/DataFrame/get_column`       (Deferred: requires standalone `Series` type)
- [x] `/DataFrame/get_column_index` (`$df.data(...).columns.indexOf(<col>)`)
- [ ] `/DataFrame/get_columns`      (Deferred: requires standalone `Series` type; currently `$df.data(...).toDict()`)
- [x] `/DataFrame/group_by_dynamic` (`$df.data(...).groupByDynamic(<index_col>, { every, period, ... })`)
- [ ] `/DataFrame/hash_rows`        (Deferred: requires standalone `Series` type; internal row hashing used in groupBy/join)
- [ ] `/DataFrame/interpolate`
- [ ] `/DataFrame/iter_slices`
- [x] `/DataFrame/join_where`       (`$df.data(...).joinWhere(other, $df.col("a").gt($df.col("b")), { how: "inner" })`)
- [ ] `/DataFrame/map_columns`
- [ ] `/DataFrame/map_rows`
- [ ] `/DataFrame/match_to_schema`
- [x] `/DataFrame/max`              (`$df.data(...).select($df.all().max())`)
- [x] `/DataFrame/max_horizontal`   (`$df.data(...).select($df.horizontal(<cols>).max())`)
- [x] `/DataFrame/mean`             (`$df.data(...).select($df.all().mean())`)
- [x] `/DataFrame/mean_horizontal`  (`$df.data(...).select($df.horizontal(<cols>).mean())`)
- [x] `/DataFrame/median`           (`$df.data(...).select($df.all().median())`)
- [ ] `/DataFrame/merge_sorted`
- [x] `/DataFrame/min`              (`$df.data(...).select($df.all().min())`)
- [x] `/DataFrame/min_horizontal`   (`$df.data(...).select($df.horizontal(<cols>).min())`)
- [ ] `/DataFrame/partition_by`
- [ ] `/DataFrame/pipe`
- [x] `/DataFrame/product`          (`$df.data(...).select($df.all().product())`)
- [x] `/DataFrame/quantile`         (`$df.data(...).select($df.all().quantile(q))`)
- [ ] `/DataFrame/rechunk`
- [x] `/DataFrame/remove`           (`$df.data(...).filter(<predicate>.not())`)
- [ ] `/DataFrame/replace_column`   (Deferred: requires standalone `Series` type; currently `$df.data(...).withColumns(...)`)
- [ ] `/DataFrame/rolling`
- [ ] `/DataFrame/row`
- [ ] `/DataFrame/rows`
- [ ] `/DataFrame/rows_by_key`
- [ ] `/DataFrame/sample`
- [x] `/DataFrame/select_seq`       (`$df.data(...).select(...)` — in Polars this executes sequentially rather than multi-threaded; in JS/TS the event loop engine is already strictly sequential and deterministic by default)
- [ ] `/DataFrame/serialize`        (JSON format available via `$df.data(...).writeJson()`; binary buffer format tracked in Future Scope)
- [ ] `/DataFrame/set_sorted`       (Future candidate: internal metadata flag asserting pre-sorted column order to bypass sorting checks)
- [x] `/DataFrame/shift`            (`$df.data(...).select($df.all().shift(n, { fillValue }))`)
- [ ] `/DataFrame/shrink_to_fit`    (N/A in JS: Rust/Arrow uses this to release excess heap `capacity` down to `len`; in JS/V8, array backing stores and memory compaction are handled automatically by the engine GC)
- [ ] `/DataFrame/sql`              (Planned as tree-shakeable standalone function or separate subpath plugin `df-script/sql` to avoid bloating the core bundle with SQL parser/grammar overhead. Use a separate parser / plugin for now)
- [x] `/DataFrame/std`              (`$df.data(...).select($df.all().std())`)
- [x] `/DataFrame/sum`              (`$df.data(...).select($df.all().sum())`)
- [x] `/DataFrame/sum_horizontal`   (`$df.data(...).select($df.horizontal(<cols>).sum())`)
- [ ] `/DataFrame/to_dummies`
- [ ] `/DataFrame/to_series`
- [x] `/DataFrame/top_k`            (`$df.data(...).sort({ by: <col>, descending: true }).head(k)`)
- [ ] `/DataFrame/unnest`
- [x] `/DataFrame/unstack`          (`$df.data(...).unstack(<cols>, { step, how, fillValues })`)
- [ ] `/DataFrame/update`
- [ ] `/DataFrame/upsample`
- [x] `/DataFrame/var`              (`$df.data(...).select($df.all().variance())`)
- [ ] `/date`
- [ ] `/dateRange`
- [ ] `/dateRanges`
- [ ] `/datetime`
- [ ] `/datetimeRange`
- [ ] `/datetimeRanges`
- [x] `/Expr/and_` (`.and()`)
- [ ] `/Expr/append`
- [ ] `/Expr/approxNUnique`
- [x] `/Expr/arccos`
- [x] `/Expr/arccosh`
- [x] `/Expr/arcsin`
- [x] `/Expr/arcsinh`
- [x] `/Expr/arctan`
- [x] `/Expr/arctanh`
- [ ] `/Expr/argSort`
- [ ] `/Expr/argTrue`
- [ ] `/Expr/argUnique`
- [ ] `/Expr/arr/dot`
- [x] `/Expr/backwardFill`          (`.fillNull({ strategy: "backward" })`)
- [ ] `/Expr/bin/contains`
- [ ] `/Expr/bin/decode`
- [ ] `/Expr/bin/encode`
- [ ] `/Expr/bin/endsWith`
- [ ] `/Expr/bin/get`
- [ ] `/Expr/bin/head`
- [ ] `/Expr/bin/size`
- [ ] `/Expr/bin/slice`
- [ ] `/Expr/bin/startsWith`
- [ ] `/Expr/bin/tail`
- [ ] `/Expr/bitwiseCountOnes`
- [ ] `/Expr/bitwiseCountZeros`
- [ ] `/Expr/bitwiseLeadingOnes`
- [ ] `/Expr/bitwiseLeadingZeros`
- [ ] `/Expr/bitwiseTrailingOnes`
- [ ] `/Expr/bitwiseTrailingZeros`
- [x] `/Expr/bottomK`               (`.sort({ descending: false }).slice(0, k)`)
- [x] `/Expr/bottomKBy` (`.sortBy(by, { descending: false }).slice(0, k)`)
- [x] `/Expr/cot`
- [ ] `/Expr/CumulativeEval`
- [ ] `/Expr/cut`
- [ ] `/Expr/deserialize`
- [x] `/Expr/diff` (`.sub($df.col(...).lag(n))`)
- [x] `/Expr/dropNans` (`.filter($df.col(...).isNotNan())`)
- [x] `/Expr/dropNulls` (`.filter($df.col(...).isNotNull())`)
- [x] `/Expr/dt/addBusinessDay` (`.dt.offsetDay(n, { excludeWeekdays: [0, 6], holidays, roll })`)
- [x] `/Expr/dt/baseUtcOffset` (`.dt.utcOffset(tz, { type: "base" })`)
- [ ] `/Expr/dt/combine`
- [x] `/Expr/dt/dstOffset` (`.dt.utcOffset(tz, { type: "daylightSavingTime" })`)
- [x] `/Expr/dt/offset` (`.dt.utcOffset(tz, { type: "total" })`)
- [ ] `/Expr/dt/replaceTimeZone`
- [ ] `/Expr/dt/round`
- [x] `/Expr/dt/tostring` (`.dt.strftime(format)`)
- [ ] `/Expr/dt/truncate`
- [ ] `/Expr/dt/withTimeUnit`
- [ ] `/Expr/emwSumBy`
- [ ] `/Expr/ewmMean`
- [ ] `/Expr/ewmMeanBy`
- [ ] `/Expr/ewmStd`
- [ ] `/Expr/ewmSum`
- [x] `/Expr/exclude` (`$df.exclude(...)`)
- [ ] `/Expr/explode`
- [ ] `/Expr/extendConstants`
- [x] `/Expr/fillNan` (`$df.when($df.col(...).isNan()).then(val).otherwise($df.col(...))`)
- [x] `/Expr/filter`
- [x] `/Expr/forwardFill` (`.fillNull({ strategy: "forward" })`)
- [ ] `/Expr/fromJson`
- [ ] `/Expr/gather`
- [ ] `/Expr/gatherEvery`
- [ ] `/Expr/get`
- [ ] `/Expr/hash`
- [x] `/Expr/head` (`.slice(0, n)`)
- [ ] `/Expr/IndexOf`
- [ ] `/Expr/inspect`
- [ ] `/Expr/interpolate`
- [ ] `/Expr/interpolateBy`
- [x] `/Expr/isBetween` (`.between(lower, upper)`)
- [x] `/Expr/isEmpty` (`.count().eq(0)`)
- [x] `/Expr/isFirstDistinct` (`.isNDistinct(0)`)
- [x] `/Expr/isLastDistinct` (`.isNDistinct(-1)`)
- [ ] `/Expr/item`
- [x] `/Expr/limit` (`.slice(0, n)`)
- [x] `/Expr/log10` (`.log(10)`)
- [ ] `/Expr/lowerBound`
- [ ] `/Expr/mapBatches`
- [ ] `/Expr/mapElements`
- [x] `/Expr/neg` (`.negate()`)
- [x] `/Expr/or_` (`.or()`)
- [x] `/Expr/pctChange` (`.sub($df.col(...).lag(n)).div($df.col(...).lag(n))`)
- [x] `/Expr/peakMax` (`.eq($df.col(...).cumMax())`)
- [x] `/Expr/peakMin` (`.eq($df.col(...).cumMin())`)
- [ ] `/Expr/pipe`
- [ ] `/Expr/qCut`
- [ ] `/Expr/repeatBy`
- [ ] `/Expr/replace`
- [ ] `/Expr/reshape`
- [ ] `/Expr/rle`
- [x] `/Expr/rleId` (`.ne($df.col(...).lag(1)).cumSum()`)
- [x] `/Expr/rolling` (`.rolling(w, exprOrFn)`)
- [x] `/Expr/rollingKurtosis` (`.rolling(w, $df.col(...).kurtosis())`)
- [x] `/Expr/rollingMap` (`.rolling(w, fn)`)
- [x] `/Expr/rollingMaxBy` (`.rolling(w, $df.col("by").max())`)
- [x] `/Expr/rollingMeanBy` (`.rolling(w, $df.col("by").mean())`)
- [x] `/Expr/rollingMedianBy` (`.rolling(w, $df.col("by").median())`)
- [x] `/Expr/rollingMinBy` (`.rolling(w, $df.col("by").min())`)
- [x] `/Expr/rollingQuantileBy` (`.rolling(w, $df.col("by").quantile(q))`)
- [x] `/Expr/rollingRankBy` (`.rolling(w, $df.col("by").rank())`)
- [x] `/Expr/rollingSkew` (`.rolling(w, $df.col(...).skewness())`)
- [x] `/Expr/rollingStdBy` (`.rolling(w, $df.col("by").std())`)
- [x] `/Expr/rollingSumBy` (`.rolling(w, $df.col("by").sum())`)
- [x] `/Expr/rollingVar` (`.rolling(w, $df.col(...).variance())` / `.rollingStd(w).pow(2)`)
- [x] `/Expr/rollingVarBy` (`.rolling(w, $df.col("by").variance())`)
- [x] `/Expr/rank` (`.rank({ dense })`)
- [ ] `/Expr/sample`
- [ ] `/Expr/searchSorted`
- [ ] `/Expr/setSorted`
- [x] `/Expr/shift`                (`.shift(n, { fillValue })`)
- [ ] `/Expr/shuffle`
- [ ] `/Expr/slice`
- [ ] `/Expr/sort`
- [ ] `/Expr/sortBy`
- [x] `/Expr/std` (`.std()`)
- [x] `/Expr/str/splitExact` (`.str.split(delim, { exact: true, limit: n })`)
- [x] `/Expr/str/splitN` (`.str.split(delim, { limit: n })`)
- [ ] `/Expr/struct/__getItem__`
- [ ] `/Expr/struct/drop`
- [ ] `/Expr/struct/jsonEncode`
- [x] `/Expr/tail` (`.slice(-n, n)`)
- [x] `/Expr/topK` (`.sort({ descending: true }).slice(0, k)`)
- [x] `/Expr/topKBy` (`.sortBy(by, { descending: true }).slice(0, k)`)
- [x] `/Expr/truediv` (`.div()`)
- [ ] `/Expr/truncate`
- [ ] `/Expr/unique`
- [ ] `/Expr/uniqueCounts`
- [ ] `/Expr/upperBound`
- [ ] `/Expr/valueCounts`
- [x] `/field` (`$df.col(...)`)
- [x] `/first` (`$df.col(...).first()`)
- [x] `/fold` (Custom accumulator expressions)
- [x] `/format` (`$df.col(...).str.format(...)`)
- [x] `/fromEpoch` (`$df.datetime(epoch)` / `$df.col(...).dt.fromEpoch(...)`)
- [x] `/groups` (`df.groupBy(...)`)
- [x] `/head` (`df.head(n)` / `$df.col(...).slice(0, n)`)
- [x] `/implode` (`$df.implode(...)` / `$df.col(...).implode()`)
- [x] `/intRange` (`$df.seqRange(...)`)
- [x] `/intRanges` (`$df.seqRange(...)`)
- [x] `/last` (`$df.col(...).last()`)
- [x] `/len` (`df.height` / `$df.col(...).count({ includeNulls: true })`)
- [x] `/linearSpace` (`$df.seqRange(...)`)
- [x] `/linearSpaces` (`$df.seqRange(...)`)
- [x] `/list` (`$df.col(...).implode()` / ArrayExpr)
- [x] `/mapBatches` (`df.select(...)` / `derive(...)`)
- [x] `/mapGroups` (`df.groupBy(...)...`)
- [x] `/max` (`$df.col(...).max()`)
- [x] `/maxHorizontal` (`$df.horizontal(<cols>).max()`)
- [x] `/mean` (`$df.col(...).mean()`)
- [x] `/meanHorizontal` (`$df.horizontal(<cols>).mean()`)
- [x] `/median` (`$df.col(...).median()`)
- [x] `/min` (`$df.col(...).min()`)
- [x] `/minHorizontal` (`$df.horizontal(<cols>).min()`)
- [x] `/nth` (`$df.col(...).get(n)`)
- [x] `/nUnique` (`$df.col(...).nUnique()`)
- [x] `/ones` (`$df.lit(1)`)
- [x] `/quantile` (`$df.col(...).quantile(q)`)
- [x] `/reduce` (Custom accumulator expressions)
- [x] `/repeat` (`$df.lit(val)` / `$df.col(...).repeatBy(n)`)
- [x] `/rollingCorr` (`$df.col(...).rolling(w, ...)`)
- [x] `/rollingCov` (`$df.col(...).rolling(w, ...)`)
- [x] `/rowIndex` (`df.withRowIndex()`)
- [x] `/select` (`df.select(...)`)
- [x] `/std` (`$df.col(...).std()`)
- [x] `/struct` (`$df.struct(...)`)
- [x] `/sum` (`$df.col(...).sum()`)
- [x] `/sumHorizontal` (`$df.horizontal(<cols>).sum()`)
- [x] `/tail` (`df.tail(n)` / `$df.col(...).slice(-n, n)`)
- [x] `/time` (`$df.datetime(...)` / `$df.time(...)`)
- [x] `/timeRange` (`$df.seqRange(...)`)
- [x] `/timeRanges` (`$df.seqRange(...)`)
- [x] `/var` (`$df.col(...).variance()`)
- [x] `/zeros` (`$df.lit(0)`)
