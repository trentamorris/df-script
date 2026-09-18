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
- [ ] **Dedicated Parallel Build Script (`scripts/build.mjs`)**:
  * Extract the long inline CLI build command from `package.json` into a dedicated ES-module script using `esbuild.build()` directly.
  * Run all 6 bundle targets (`dist/index.js`, `dist/index.mjs`, `dist/utils.js`, `dist/utils.mjs`, `dist/expressions.js`, `dist/expressions.mjs`) in parallel with `Promise.all`.
  * Run TypeScript declaration emit (`tsc --emitDeclarationOnly`) concurrently to drastically cut build times.
  * Clean up `package.json` scripts to maintain cross-platform shell compatibility and readability.
### 🛠️ Unified Missing & NaN Filling Architecture
- [x] **Unified `fillNull`, `fillNan` & Generic `fill` Powered by `fillSequence`**:
  * [x] Extend `FillNullOptions` & `FillOptions` with target selection (`"null" | "nan" | "all"`).
  * [x] Reused existing `fillSequence` utility to power forward, backward, constant, and independent stepping strategies across `fillNull` and `fillNan`.
  * [x] Add `.fill(target, options)` and `.fillNan(valueOrOptions)` on both `ColumnExpr` (`StandardExpr`) and `DataFrame`.
  * [x] Add dedicated unit test suites: `_tests/columnExpressions/mixins/StandardExpr/fill.test.ts`, `fillNan.test.ts`, `_tests/dataframe/fill.test.ts`, and `fillNan.test.ts`.

### 🏎️ Automated Performance & Throughput Benchmarking Suite
- [ ] **Method-Co-located Benchmarks (`<method>.bench.ts`)**:
  * Adopt the lean suffix pattern placing `<method>.bench.ts` directly alongside `<method>.test.ts` in `_tests/` (e.g. `_tests/dataframe/filter.bench.ts` next to `filter.test.ts`).
  * Avoid deep subfolder bloat (no `filter/robustness.test.ts` vs `filter/performance.test.ts` folder explosion) while maintaining strict 1:1 visibility.
  * Separate execution pipelines: `npm test` runs instant unit correctness suites, while `npm run bench` runs throughput / latency micro-benchmarks with synthetic 100k–1M row datasets.
  * Track throughput (rows/sec), latency per operation, and memory allocation overhead (`heapUsed`) on hot paths (`filter`, `groupBy`, `join`, `select`, `partitionBy`).


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

- [ ] `/align_frames`
- [ ] `/all`
- [x] `/all_horizontal`            (`$df.horizontal(<cols>).all()`)
- [ ] `/any`
- [x] `/any_horizontal`            (`$df.horizontal(<cols>).any()`)
- [ ] `/approx_n_unique`
- [ ] `/arange`
- [ ] `/arctan2`
- [ ] `/arctan2d`
- [ ] `/arg_sort_by`
- [ ] `/arg_where`
- [ ] `/business_day_count`
- [x] `/coalesce`                    (`$df.coalesce(...)`)
- [ ] `/collect_all`
- [ ] `/collect_all_async`
- [ ] `/concat`
- [ ] `/concat_arr`
- [ ] `/concat_list`
- [ ] `/concat_str`
- [ ] `/corr`
- [ ] `/count`
- [ ] `/cov`
- [ ] `/cum_count`
- [ ] `/cum_fold`
- [ ] `/cum_reduce`
- [ ] `/cum_sum`
- [x] `/cum_sum_horizontal`           (`$df.horizontal(<cols>).arr.cumSum()`)
- [ ] `/DataFrame/__array__`
- [ ] `/DataFrame/__arrow_c_stream__`
- [ ] `/DataFrame/__dataframe__`
- [ ] `/DataFrame/__getitem__`      (Deferred: requires standalone `Series` type)
- [ ] `/DataFrame/__setitem__`      (Deferred: requires standalone `Series` type)
- [ ] `/DataFrame/approx_n_unique`
- [x] `/DataFrame/bottom_k`         (`$df.data(...).sort({ by: <col>, descending: false }).head(k)`)
- [x] `/DataFrame/cast`             (`$df.data(...).cast(dtype)` or `$df.data(...).cast({ col: dtype })`)
- [x] `/DataFrame/clear`            (`$df.data(...).slice(0, 0)`)
- [x] `/DataFrame/clone`            (`$df.data(...).clone()`)
- [x] `/DataFrame/collect_schema`   (`$df.data(...).schema`)
- [x] `/DataFrame/columns`          (`$df.data(...).columns`)
- [ ] `/DataFrame/corr`
- [x] `/DataFrame/count`            (`$df.data(...).height` [total rows] or `$df.data(...).select($df.all().count())` [non-null per column])
- [ ] `/DataFrame/describe`
- [ ] `/DataFrame/deserialize`      (JSON format available via `$df.readJson()`; binary buffer format tracked in Future Scope)
- [x] `/DataFrame/drop`             (`$df.data(...).drop(cols)`)
- [ ] `/DataFrame/drop_in_place`    (Deferred: requires standalone `Series` type)
- [x] `/DataFrame/drop_nans`        (`$df.data(...).filter($df.all().isNotNan())`)
- [x] `/DataFrame/drop_nulls`       (`$df.data(...).dropNulls(<subset>)`)
- [x] `/DataFrame/dtypes`           (`$df.data(...).dtypes`)
- [x] `/DataFrame/equals`           (`$df.data(...).equals(other, { nullsEqual })`)
- [ ] `/DataFrame/estimated_size`
- [x] `/DataFrame/explode`          (`$df.data(...).explode(cols, options?)`)
- [x] `/DataFrame/fill`              (`$df.data(...).fill(target, options?)`)
- [x] `/DataFrame/fill_nan`          (`$df.data(...).fillNan(options?)`)
- [x] `/DataFrame/fill_null`         (`$df.data(...).fillNull(options?)`)
- [x] `/DataFrame/filter`           (`$df.data(...).filter(predicate)`)
- [ ] `/DataFrame/flags`            (Polars internal engine metadata exposing chunk-level optimization flags like SORTED_ASC / FAST_EXPLODE)
- [ ] `/DataFrame/fold`
- [ ] `/DataFrame/gather`
- [ ] `/DataFrame/gather_every`
- [ ] `/DataFrame/get_column`            (Deferred: requires standalone `Series` type)
- [x] `/DataFrame/get_column_index`      (`$df.data(...).columns.indexOf(<col>)`)
- [x] `/DataFrame/get_columns`           (`$df.data(...).columns.map(c => $df.data(...)._columns[c])` / `.toDict()`)
- [ ] `/DataFrame/glimpse`
- [x] `/DataFrame/group_by`              (`$df.data(...).groupBy(keys)`)
- [ ] `/DataFrame/group_by/__iter__`
- [x] `/DataFrame/group_by/agg`          (`$df.data(...).groupBy(keys).agg(...)`)
- [x] `/DataFrame/group_by/all`          (`$df.data(...).groupBy(keys).all()`   / `.agg($df.all().all())`)
- [x] `/DataFrame/group_by/count`        (`$df.data(...).groupBy(keys).count()` / `.agg($df.all().count())` / `.agg($df.len().alias("count"))`)
- [x] `/DataFrame/group_by/first`        (`$df.data(...).groupBy(keys).first()` / `.agg($df.all().first())`)
- [ ] `/DataFrame/group_by/having`       
- [x] `/DataFrame/group_by/head`         (`$df.data(...).groupBy(keys).head(n)`)
- [x] `/DataFrame/group_by/last`         (`$df.data(...).groupBy(keys).last()`  / `.agg($df.all().last())`)
- [x] `/DataFrame/group_by/len`          (`$df.data(...).groupBy(keys).len()`   / `.agg($df.len())`)
- [ ] `/DataFrame/group_by/map_groups`   
- [x] `/DataFrame/group_by/max`          (`$df.data(...).groupBy(keys).max()`   / `.agg($df.all().max())`)
- [x] `/DataFrame/group_by/mean`         (`$df.data(...).groupBy(keys).mean()`  / `.agg($df.all().mean())`)
- [x] `/DataFrame/group_by/median`       (`$df.data(...).groupBy(keys).median()`/ `.agg($df.all().median())`)
- [x] `/DataFrame/group_by/min`          (`$df.data(...).groupBy(keys).min()` / `.agg($df.all().min())`)
- [x] `/DataFrame/group_by/n_unique`     (`$df.data(...).groupBy(keys).nUnique()` / `.agg($df.all().nUnique())`)
- [x] `/DataFrame/group_by/quantile`     (`$df.data(...).groupBy(keys).quantile(q)` / `.agg($df.all().quantile(q))`)
- [x] `/DataFrame/group_by/sum`          (`$df.data(...).groupBy(keys).sum()` / `.agg($df.all().sum())`)
- [x] `/DataFrame/group_by/tail`         (`$df.data(...).groupBy(keys).tail(n)`)
- [x] `/DataFrame/group_by_dynamic`      (`$df.data(...).groupByDynamic(<index_col>, { every, period, ... })`)
- [ ] `/DataFrame/hash_rows`             (Deferred: requires standalone `Series` type; internal row hashing used in groupBy/join)
- [x] `/DataFrame/head`                  (`$df.data(...).head(n)`)
- [x] `/DataFrame/height`                (`$df.data(...).height`)
- [x] `/DataFrame/hstack`                (`$df.concat([df1, df2], { how: "horizontal" })`)
- [x] `/DataFrame/insert_column`         (`$df.data(...).insertColumn(index, name, expr)`)
- [ ] `/DataFrame/interpolate`
- [ ] `/DataFrame/is_duplicated`
- [x] `/DataFrame/is_empty`              (`$df.data(...).height === 0`)
- [ ] `/DataFrame/is_sorted`
- [ ] `/DataFrame/is_unique`
- [x] `/DataFrame/item`                  (`$df.data(...).item(row?, col?)`)
- [x] `/DataFrame/iter_columns`          (`$df.data(...).iterColumns()`)
- [x] `/DataFrame/iter_rows`             (`$df.data(...).iterRows()`)
- [ ] `/DataFrame/iter_slices`
- [x] `/DataFrame/join`                  (`$df.data(...).join(other, { on, how, ... })`)
- [x] `/DataFrame/join_asof`             (`$df.data(...).joinAsof(other, { on, by, strategy, ... })`)
- [x] `/DataFrame/join_where`            (`$df.data(...).joinWhere(other, $df.col("a").gt($df.col("b")), { how: "inner" })`)
- [ ] `/DataFrame/lazy`
- [x] `/DataFrame/limit`                 (`$df.data(...).limit(n)`)
- [ ] `/DataFrame/map_columns`
- [ ] `/DataFrame/map_rows`
- [ ] `/DataFrame/match_to_schema`
- [x] `/DataFrame/max`                   (`$df.data(...).select($df.all().max())`)
- [x] `/DataFrame/max_horizontal`        (`$df.data(...).select($df.horizontal(<cols>).max())`)
- [x] `/DataFrame/mean`                  (`$df.data(...).select($df.all().mean())`)
- [x] `/DataFrame/mean_horizontal`       (`$df.data(...).select($df.horizontal(<cols>).mean())`)
- [x] `/DataFrame/median`                (`$df.data(...).select($df.all().median())`)
- [x] `/DataFrame/melt`                  (`$df.data(...).unpivot(options)`)
- [ ] `/DataFrame/merge_sorted`
- [x] `/DataFrame/min`                   (`$df.data(...).select($df.all().min())`)
- [x] `/DataFrame/min_horizontal`        (`$df.data(...).select($df.horizontal(<cols>).min())`)
- [ ] `/DataFrame/n_chunks`
- [x] `/DataFrame/n_unique`              (`$df.data(...).select($df.all().nUnique())`)
- [x] `/DataFrame/null_count`            (`$df.data(...).select($df.all().nullCount())`)
- [x] `/DataFrame/partition_by`          (`$df.data(...).partitionBy(keys, { asDict? })`)
- [ ] `/DataFrame/pipe`
- [x] `/DataFrame/pivot`                 (`$df.data(...).pivot(options)`)
- [x] `/DataFrame/product`               (`$df.data(...).select($df.all().product())`)
- [x] `/DataFrame/quantile`              (`$df.data(...).select($df.all().quantile(q))`)
- [ ] `/DataFrame/rechunk`
- [x] `/DataFrame/remove`                (`$df.data(...).filter(<predicate>.not())`)
- [x] `/DataFrame/rename`                (`$df.data(...).rename(mapping)`)
- [ ] `/DataFrame/replace_column`        (Deferred: requires standalone `Series` type; currently `$df.data(...).withColumns(...)`)
- [x] `/DataFrame/reverse`               (`$df.data(...).reverse()`)
- [ ] `/DataFrame/rolling`
- [x] `/DataFrame/row`                   (`$df.data(...).row(index)`)
- [x] `/DataFrame/rows`                  (`$df.data(...).rows()`)
- [ ] `/DataFrame/rows_by_key`
- [ ] `/DataFrame/sample`
- [x] `/DataFrame/schema`                (`$df.data(...).schema`)
- [x] `/DataFrame/select`                (`$df.data(...).select(...)`)
- [x] `/DataFrame/select_seq`            ( `$df.data(...).select(...)` — in Polars this executes sequentially rather than multi-threaded; in JS/TS the event loop engine is already strictly sequential and deterministic by default)
- [ ] `/DataFrame/serialize`             (JSON format available via `$df.data(...).writeJson()`; binary buffer format tracked in Future Scope)
- [ ] `/DataFrame/set_sorted`            (Future candidate: internal metadata flag asserting pre-sorted column order to bypass sorting checks)
- [x] `/DataFrame/shape`                 (`$df.data(...).shape`)
- [x] `/DataFrame/shift`                 (`$df.data(...).select($df.all().shift(n, { fillValue }))`)
- [ ] `/DataFrame/show`
- [ ] `/DataFrame/shrink_to_fit`         (N/A in JS: Rust/Arrow uses this to release excess heap `capacity` down to `len`; in JS/V8, array backing stores and memory compaction are handled automatically by the engine GC)
- [x] `/DataFrame/slice`                 (`$df.data(...).slice(offset, length?)`)
- [x] `/DataFrame/sort`                  (`$df.data(...).sort(options)`)
- [ ] `/DataFrame/sql`                   (Planned as tree-shakeable standalone function or separate subpath plugin `df-script/sql` to avoid bloating the core bundle with SQL parser/grammar overhead. Use a separate parser / plugin for now)
- [x] `/DataFrame/std`                   (`$df.data(...).select($df.all().std())`)
- [x] `/DataFrame/sum`                   (`$df.data(...).select($df.all().sum())`)
- [x] `/DataFrame/sum_horizontal`        (`$df.data(...).select($df.horizontal(<cols>).sum())`)
- [x] `/DataFrame/tail`                  (`$df.data(...).tail(n)`)
- [ ] `/DataFrame/to_arrow`
- [x] `/DataFrame/to_dict`               (`$df.data(...).toDict()`)
- [x] `/DataFrame/to_dicts`              (`$df.data(...).toDicts()`)
- [ ] `/DataFrame/to_dummies`
- [ ] `/DataFrame/to_init_repr`
- [ ] `/DataFrame/to_jax`
- [ ] `/DataFrame/to_numpy`
- [ ] `/DataFrame/to_pandas`
- [ ] `/DataFrame/to_series`             (Deferred: requires standalone `Series` type)
- [ ] `/DataFrame/to_struct`
- [ ] `/DataFrame/to_torch`
- [x] `/DataFrame/top_k`                 (`$df.data(...).sort({ by: <col>, descending: true }).head(k)`)
- [x] `/DataFrame/transpose`             (`$df.data(...).transpose(options?)`)
- [x] `/DataFrame/unique`                (`$df.data(...).unique(subset?, options?)`)
- [ ] `/DataFrame/unnest`
- [x] `/DataFrame/unpivot`               (`$df.data(...).unpivot(options)`)
- [x] `/DataFrame/unstack`               (`$df.data(...).unstack(<cols>, { step, how, fillValues })`)
- [ ] `/DataFrame/update`
- [ ] `/DataFrame/upsample`
- [x] `/DataFrame/var`                   (`$df.data(...).select($df.all().variance())`)
- [x] `/DataFrame/vstack`                (`$df.concat([df1, df2], { how: "vertical" })`)
- [x] `/DataFrame/width`                 (`$df.data(...).width`)
- [x] `/DataFrame/with_columns`          (`$df.data(...).withColumns(...)`)
- [x] `/DataFrame/with_columns_seq`      (`$df.data(...).withColumns(...)` — deterministic & sequential by default in JS)
- [x] `/DataFrame/with_row_count`        (`$df.data(...).withRowIndex(name?, offset?)` — alias for `with_row_index`)
- [x] `/DataFrame/with_row_index`        (`$df.data(...).withRowIndex(name?, offset?)`)
- [ ] `/DataFrame/write_avro`
- [ ] `/DataFrame/write_clipboard`
- [x] `/DataFrame/write_csv`             (`$df.data(...).writeCsv(path, options?)`)
- [ ] `/DataFrame/write_database`
- [ ] `/DataFrame/write_delta`
- [ ] `/DataFrame/write_excel`
- [ ] `/DataFrame/write_iceberg`
- [ ] `/DataFrame/write_ipc`
- [ ] `/DataFrame/write_ipc_stream`
- [x] `/DataFrame/write_json`            (`$df.data(...).writeJson(path, options?)`)
- [ ] `/DataFrame/write_ndjson`
- [ ] `/DataFrame/write_parquet`
- [ ] `/DataType/to_dtype_expr`
- [ ] `/DataTypeExpr/arr/inner_dtype`
- [ ] `/DataTypeExpr/arr/shape`
- [ ] `/DataTypeExpr/arr/width`
- [ ] `/DataTypeExpr/list/inner_dtype`
- [ ] `/DataTypeExpr/struct/field_dtype`
- [ ] `/DataTypeExpr/struct/field_names`
- [ ] `/date`
- [ ] `/date_range`
- [ ] `/date_ranges`
- [ ] `/datetime`
- [ ] `/datetime_range`
- [ ] `/datetime_ranges`
- [ ] `/defer`
- [ ] `/disable_string_cache`
- [ ] `/dtype_of`
- [ ] `/duration`
- [ ] `/element`
- [ ] `/enable_string_cache`
- [ ] `/escape_regex`
- [ ] `/exclude`
- [ ] `/explain_all`
- [x] `/Expr/abs`                   (`.abs()`)
- [x] `/Expr/add`                   (`.add()`)
- [ ] `/Expr/agg_groups`
- [x] `/Expr/alias`                 (`.alias(name)`)
- [x] `/Expr/all`                   (`.all()`)
- [x] `/Expr/and_`                  (`.and()`)
- [x] `/Expr/any`                   (`.any()`)
- [ ] `/Expr/append`
- [ ] `/Expr/approx_n_unique`
- [x] `/Expr/arccos`                (`.arccos()`)
- [x] `/Expr/arccosh`               (`.arccosh()`)
- [x] `/Expr/arcsin`                (`.arcsin()`)
- [x] `/Expr/arcsinh`               (`.arcsinh()`)
- [x] `/Expr/arctan`                (`.arctan()`)
- [x] `/Expr/arctanh`               (`.arctanh()`)
- [x] `/Expr/arg_max`               (`.argMax()`)
- [x] `/Expr/arg_min`               (`.argMin()`)
- [ ] `/Expr/arg_sort`
- [ ] `/Expr/arg_true`
- [ ] `/Expr/arg_unique`
- [x] `/Expr/arr/agg`           (`.arr.agg(expr)`)
- [x] `/Expr/arr/all`           (`.arr.all()`)
- [x] `/Expr/arr/any`           (`.arr.any()`)
- [x] `/Expr/arr/arg_max`       (`.arr.argMax()`)
- [x] `/Expr/arr/arg_min`       (`.arr.argMin()`)
- [x] `/Expr/arr/contains`      (`.arr.contains(item)`)
- [x] `/Expr/arr/count_matches` (`.arr.countMatches(item, options?)`)
- [ ] `/Expr/arr/dot`
- [x] `/Expr/arr/eval`          (`.arr.eval(expr)`)
- [x] `/Expr/arr/explode`       (`.arr.explode(options?)`)
- [x] `/Expr/arr/first`         (`.arr.first(nullOnOob?)`)
- [x] `/Expr/arr/get`           (`.arr.get(index, nullOnOob?)`)
- [x] `/Expr/arr/join`          (`.arr.join(separator?, options?)`)
- [x] `/Expr/arr/last`          (`.arr.last(nullOnOob?)`)
- [x] `/Expr/arr/len`           (`.arr.len()` / `.arr.lengths()`)
- [x] `/Expr/arr/max`           (`.arr.max()`)
- [x] `/Expr/arr/mean`          (`.arr.mean()`)
- [x] `/Expr/arr/median`        (`.arr.median()`)
- [x] `/Expr/arr/min`           (`.arr.min()`)
- [x] `/Expr/arr/n_unique`      (`.arr.nUnique(options?)`)
- [x] `/Expr/arr/reverse`       (`.arr.reverse()`)
- [x] `/Expr/arr/shift`         (`.arr.shift(n?, options?)`)
- [x] `/Expr/arr/sort`          (`.arr.sort(options?)`)
- [x] `/Expr/arr/std`           (`.arr.std()`)
- [x] `/Expr/arr/sum`           (`.arr.sum()`)
- [ ] `/Expr/arr/to_list`
- [x] `/Expr/arr/to_struct`     (`.arr.toStruct(options?)`)
- [x] `/Expr/arr/unique`        (`.arr.unique(options?)`)
- [x] `/Expr/arr/var`           (`.arr.variance()`)
- [x] `/Expr/backward_fill`     (`.fillNull({ strategy: "backward" })`)
- [ ] `/Expr/bin/contains`
- [ ] `/Expr/bin/decode`
- [ ] `/Expr/bin/encode`
- [ ] `/Expr/bin/ends_with`
- [ ] `/Expr/bin/get`
- [ ] `/Expr/bin/head`
- [ ] `/Expr/bin/reinterpret`
- [ ] `/Expr/bin/size`
- [ ] `/Expr/bin/slice`
- [ ] `/Expr/bin/starts_with`
- [ ] `/Expr/bin/tail`
- [x] `/Expr/bitwise_and`           (`.bitwiseAnd()`)
- [ ] `/Expr/bitwise_count_ones`
- [ ] `/Expr/bitwise_count_zeros`
- [ ] `/Expr/bitwise_leading_ones`
- [ ] `/Expr/bitwise_leading_zeros`
- [x] `/Expr/bitwise_or`            (`.bitwiseOr()`)
- [ ] `/Expr/bitwise_trailing_ones`
- [ ] `/Expr/bitwise_trailing_zeros`
- [x] `/Expr/bitwise_xor`           (`.bitwiseXor()`)
- [x] `/Expr/bottom_k`               (`.sort({ descending: false }).slice(0, k)`)
- [x] `/Expr/bottom_k_by`            (`.sortBy(by, { descending: false }).slice(0, k)`)
- [x] `/Expr/cast`                  (`.cast(dataType, options?)`)
- [ ] `/Expr/cat/ends_with`
- [ ] `/Expr/cat/get_categories`
- [ ] `/Expr/cat/len_bytes`
- [ ] `/Expr/cat/len_chars`
- [ ] `/Expr/cat/physical`
- [ ] `/Expr/cat/starts_with`
- [ ] `/Expr/cat/to`
- [x] `/Expr/cbrt`                  (`.cbrt()`)
- [x] `/Expr/ceil`                  (`.ceil()`)
- [x] `/Expr/clip`                  (`.clip(lower?, upper?)`)
- [x] `/Expr/cos`                   (`.cos()`)
- [x] `/Expr/cosh`                  (`.cosh()`)
- [x] `/Expr/cot`                   (`.cot()`)
- [x] `/Expr/count`                 (`.count()`)
- [x] `/Expr/cum_count`             (`.cumCount()`)
- [x] `/Expr/cum_max`               (`.cumMax()`)
- [x] `/Expr/cum_min`               (`.cumMin()`)
- [x] `/Expr/cum_prod`              (`.cumProd()`)
- [x] `/Expr/cum_sum`               (`.cumSum()`)
- [ ] `/Expr/cumulative_eval`
- [ ] `/Expr/cut`
- [x] `/Expr/degrees`               (`.degrees()`)
- [ ] `/Expr/deserialize`
- [x] `/Expr/diff`                 (`.sub($df.col(...).lag(n))`)
- [x] `/Expr/dot`                  (`.dot(other)`)
- [x] `/Expr/drop_nans`            (`.filter($df.col(...).isNotNan())`)
- [x] `/Expr/drop_nulls`           (`.filter($df.col(...).isNotNull())`)
- [x] `/Expr/dt/add_business_days` (`.dt.offsetDay(n, { excludeWeekdays: [0, 6], holidays, roll })`)
- [x] `/Expr/dt/base_utc_offset`   (`.dt.utcOffset(tz, { type: "base" })`)
- [x] `/Expr/dt/cast_time_unit`    (`.dt.castTimeUnit(unit)`)
- [x] `/Expr/dt/century`           (`.dt.century(timeZone?)`)
- [ ] `/Expr/dt/combine`
- [x] `/Expr/dt/convert_time_zone` (`.dt.convertTimeZone(timeZone)`)
- [x] `/Expr/dt/date`              (`.dt.date()`)
- [x] `/Expr/dt/datetime`          (`.dt.strftime("%Y-%m-%d %H:%M:%S")`)
- [x] `/Expr/dt/day`               (`.dt.day(timeZone?)`)
- [x] `/Expr/dt/days_in_month`     (`.dt.daysInMonth(timeZone?)`)
- [x] `/Expr/dt/dst_offset`        (`.dt.utcOffset(tz, { type: "daylightSavingTime" })`)
- [x] `/Expr/dt/epoch`             (`.dt.epoch(unit?)`)
- [x] `/Expr/dt/hour`              (`.dt.hour(timeZone?)`)
- [x] `/Expr/dt/is_business_day`   (`.dt.isBusinessDay(options?)`)
- [x] `/Expr/dt/is_leap_year`      (`.dt.isLeapYear(timeZone?)`)
- [x] `/Expr/dt/iso_year`          (`.dt.isoYear(timeZone?)`)
- [x] `/Expr/dt/microsecond`       (`.dt.microsecond(timeZone?)`)
- [x] `/Expr/dt/millennium`        (`.dt.millennium(timeZone?)`)
- [x] `/Expr/dt/millisecond`       (`.dt.millisecond(timeZone?)`)
- [x] `/Expr/dt/minute`            (`.dt.minute(timeZone?)`)
- [x] `/Expr/dt/month`             (`.dt.month(timeZone?)`)
- [x] `/Expr/dt/month_end`         (`.dt.monthEnd()`)
- [x] `/Expr/dt/month_start`       (`.dt.monthStart()`)
- [x] `/Expr/dt/nanosecond`        (`.dt.nanosecond(timeZone?)`)
- [x] `/Expr/dt/offset`            (`.dt.utcOffset(tz, { type: "total" })`)
- [ ] `/Expr/dt/offset_by`
- [x] `/Expr/dt/ordinal_day`       (`.dt.ordinalDay(timeZone?)`)
- [x] `/Expr/dt/quarter`           (`.dt.quarter(timeZone?)`)
- [x] `/Expr/dt/replace`           (`.dt.replace(options)`)
- [x] `/Expr/dt/replace_time_zone` (`.dt.replace({ timeZone })`)
- [ ] `/Expr/dt/round`
- [x] `/Expr/dt/second`            (`.dt.second()`)
- [x] `/Expr/dt/strftime`          (`.dt.strftime(format)`)
- [x] `/Expr/dt/time`              (`.dt.time()`)
- [x] `/Expr/dt/timestamp`         (`.dt.timestamp(unit?)`)
- [x] `/Expr/dt/to_string`         (`.dt.strftime(format)`)
- [x] `/Expr/dt/total_days`        (`.dt.totalDays()`)
- [x] `/Expr/dt/total_hours`       (`.dt.totalHours()`)
- [x] `/Expr/dt/total_microseconds`(`.dt.totalMicroseconds()`)
- [x] `/Expr/dt/total_milliseconds`(`.dt.totalMilliseconds()`)
- [x] `/Expr/dt/total_minutes`     (`.dt.totalMinutes()`)
- [x] `/Expr/dt/total_nanoseconds` (`.dt.totalNanoseconds()`)
- [x] `/Expr/dt/total_seconds`     (`.dt.totalSeconds()`)
- [ ] `/Expr/dt/truncate`
- [x] `/Expr/dt/week`              (`.dt.week(timeZone?)`)
- [x] `/Expr/dt/weekday`           (`.dt.weekday(timeZone?)`)
- [x] `/Expr/dt/with_time_unit`    (`.dt.castTimeUnit(unit)`)
- [x] `/Expr/dt/year`              (`.dt.year(timeZone?)`)
- [x] `/Expr/entropy`              (`.entropy()`)
- [x] `/Expr/eq`                   (`.eq(other)`)
- [x] `/Expr/eq_missing`           (`.eqMissing(other)`)
- [x] `/Expr/ewm_kurt`             (`.ewmKurt(options)`)
- [x] `/Expr/ewm_mean`             (`.ewmMean(options)`)
- [x] `/Expr/ewm_mean_by`          (`.ewmMean({ by, halfLife, ... })`)
- [x] `/Expr/ewm_skew`             (`.ewmSkew(options)`)
- [x] `/Expr/ewm_std`              (`.ewmStd(options)`)
- [x] `/Expr/ewm_sum`              (`.ewmSum(options)`)
- [x] `/Expr/ewm_sum_by`           (`.ewmSum({ by, halfLife, ... })`)
- [x] `/Expr/ewm_var`              (`.ewmVar(options)`)
- [x] `/Expr/exclude`              (`$df.exclude(...)`)
- [x] `/Expr/exp`                  (`.exp()`)
- [ ] `/Expr/explode`
- [ ] `/Expr/ext/storage`
- [ ] `/Expr/ext/to`
- [ ] `/Expr/extend_constant`
- [x] `/Expr/fill_nan`              (`.fillNan(optionsOrValue)`)
- [x] `/Expr/fill_null`             (`.fillNull(optionsOrValue)`)
- [x] `/Expr/filter`               (`.filter(predicate)`)
- [x] `/Expr/first`                (`.first()`)
- [ ] `/Expr/flatten`
- [x] `/Expr/floor`                (`.floor()`)
- [x] `/Expr/floordiv`             (`.floordiv(other)`)
- [x] `/Expr/forward_fill`         (`.fillNull({ strategy: "forward" })`)
- [ ] `/Expr/from_json`
- [ ] `/Expr/gather`
- [ ] `/Expr/gather_every`
- [x] `/Expr/ge`                   (`.ge(other)`)
- [ ] `/Expr/get`
- [x] `/Expr/gt`                   (`.gt(other)`)
- [x] `/Expr/has_nulls`            (`.hasNulls()`)
- [ ] `/Expr/hash`
- [x] `/Expr/head`                 (`.slice(0, n)`)
- [ ] `/Expr/hist`
- [x] `/Expr/implode`              (`.implode()`)
- [ ] `/Expr/index_of`
- [ ] `/Expr/inspect`
- [ ] `/Expr/interpolate`
- [ ] `/Expr/interpolate_by`
- [x] `/Expr/is_between`              (`.between(lower, upper, closed?)`)
- [x] `/Expr/is_close`                (`.isClose(other, options?)`)
- [x] `/Expr/is_duplicated`           (`.isDuplicated()`)
- [ ] `/Expr/is_empty`
- [x] `/Expr/is_finite`               (`.isFinite()`)
- [x] `/Expr/is_first_distinct`       (`.isNDistinct(0)`)
- [x] `/Expr/is_in`                   (`.isIn(values)`)
- [x] `/Expr/is_infinite`             (`.isInfinite()`)
- [x] `/Expr/is_last_distinct`        (`.isNDistinct(-1)`)
- [x] `/Expr/is_nan`                  (`.isNan()`)
- [x] `/Expr/is_not_nan`              (`.isNotNan()`)
- [x] `/Expr/is_not_null`             (`.isNotNull()`)
- [x] `/Expr/is_null`                 (`.isNull()`)
- [x] `/Expr/is_unique`               (`.isUnique()`)
- [ ] `/Expr/item`
- [x] `/Expr/kurtosis`                (`.kurtosis()`)
- [x] `/Expr/last`                    (`.last()`)
- [x] `/Expr/le`                      (`.le(other)`)
- [x] `/Expr/len`                     (`.count()`)
- [x] `/Expr/lt`                      (`.lt(other)`)
- [x] `/Expr/limit`                   (`.slice(0, n)`)
- [x] `/Expr/list/__getitem__`        (`.arr.get(index)`)
- [x] `/Expr/list/agg`                (`.arr.agg(expr)`)
- [x] `/Expr/list/all`                (`.arr.all()`)
- [x] `/Expr/list/any`                (`.arr.any()`)
- [x] `/Expr/list/arg_max`            (`.arr.argMax()`)
- [x] `/Expr/list/arg_min`            (`.arr.argMin()`)
- [ ] `/Expr/list/concat`
- [x] `/Expr/list/contains`           (`.arr.contains(item)`)
- [x] `/Expr/list/count_matches`      (`.arr.countMatches(item, options?)`)
- [ ] `/Expr/list/diff`
- [x] `/Expr/list/drop_nulls`         (`.arr.eval($df.element().filter($df.element().isNotNull()))`)
- [x] `/Expr/list/eval`               (`.arr.eval(expr)`)
- [x] `/Expr/list/explode`            (`.arr.explode(options?)`)
- [x] `/Expr/list/filter`             (`.arr.filter(expr)`)
- [x] `/Expr/list/first`              (`.arr.first(nullOnOob?)`)
- [x] `/Expr/list/gather`             (`.arr.gather(indices, nullOnOob?)`)
- [x] `/Expr/list/gather_every`       (`.arr.gatherEvery(options?)`)
- [x] `/Expr/list/get`                (`.arr.get(index, nullOnOob?)`)
- [x] `/Expr/list/head`               (`.arr.slice(0, n)`)
- [ ] `/Expr/list/item`
- [x] `/Expr/list/join`               (`.arr.join(separator?, options?)`)
- [x] `/Expr/list/last`               (`.arr.last(nullOnOob?)`)
- [x] `/Expr/list/len`                (`.arr.len()` / `.arr.lengths()`)
- [x] `/Expr/list/max`                (`.arr.max()`)
- [x] `/Expr/list/mean`               (`.arr.mean()`)
- [x] `/Expr/list/median`             (`.arr.median()`)
- [x] `/Expr/list/min`                (`.arr.min()`)
- [x] `/Expr/list/n_unique`           (`.arr.nUnique(options?)`)
- [x] `/Expr/list/reverse`            (`.arr.reverse()`)
- [ ] `/Expr/list/sample`
- [ ] `/Expr/list/set_difference`
- [ ] `/Expr/list/set_intersection`
- [ ] `/Expr/list/set_symmetric_difference`
- [ ] `/Expr/list/set_union`
- [x] `/Expr/list/shift`              (`.arr.shift(n?, options?)`)
- [x] `/Expr/list/slice`              (`.arr.slice(start?, end?)`)
- [x] `/Expr/list/sort`               (`.arr.sort(options?)`)
- [x] `/Expr/list/std`                (`.arr.std()`)
- [x] `/Expr/list/sum`                (`.arr.sum()`)
- [x] `/Expr/list/tail`               (`.arr.slice(-n)`)
- [ ] `/Expr/list/to_array`
- [x] `/Expr/list/to_struct`          (`.arr.toStruct(options?)`)
- [x] `/Expr/list/unique`             (`.arr.unique(options?)`)
- [x] `/Expr/list/var`                (`.arr.variance()`)
- [x] `/Expr/log`                     (`.log(base?)`)
- [x] `/Expr/log10`                   (`.log(10)`)
- [x] `/Expr/log1p`                   (`.log1p()`)
- [ ] `/Expr/lower_bound`
- [ ] `/Expr/map_batches`
- [ ] `/Expr/map_elements`
- [x] `/Expr/max`                     (`.max()`)
- [x] `/Expr/max_by`                  (`.maxBy(by)`)
- [x] `/Expr/mean`                    (`.mean()`)
- [x] `/Expr/median`                  (`.median()`)
- [ ] `/Expr/meta/as_expression`
- [ ] `/Expr/meta/eq`
- [ ] `/Expr/meta/has_multiple_outputs`
- [ ] `/Expr/meta/is_column`
- [ ] `/Expr/meta/is_column_selection`
- [ ] `/Expr/meta/is_literal`
- [ ] `/Expr/meta/is_regex_projection`
- [ ] `/Expr/meta/ne`
- [ ] `/Expr/meta/output_name`
- [ ] `/Expr/meta/pop`
- [ ] `/Expr/meta/root_names`
- [ ] `/Expr/meta/serialize`
- [ ] `/Expr/meta/show_graph`
- [ ] `/Expr/meta/tree_format`
- [ ] `/Expr/meta/undo_aliases`
- [ ] `/Expr/meta/write_json`
- [x] `/Expr/min`                  (`.min()`)
- [x] `/Expr/min_by`               (`.minBy(by)`)
- [x] `/Expr/mod`                  (`.mod(other)`)
- [x] `/Expr/mode`                 (`.mode()`)
- [x] `/Expr/mul`                  (`.mul(other)`)
- [x] `/Expr/n_unique`             (`.nUnique()`)
- [ ] `/Expr/name/keep`
- [ ] `/Expr/name/map`
- [ ] `/Expr/name/map_fields`
- [ ] `/Expr/name/prefix`
- [ ] `/Expr/name/prefix_fields`
- [ ] `/Expr/name/replace`
- [ ] `/Expr/name/suffix`
- [ ] `/Expr/name/suffix_fields`
- [ ] `/Expr/name/to_lowercase`
- [ ] `/Expr/name/to_uppercase`
- [x] `/Expr/nan_max`              (`.nanMax()`)
- [x] `/Expr/nan_min`              (`.nanMin()`)
- [x] `/Expr/ne`                   (`.ne(other)`)
- [x] `/Expr/ne_missing`           (`.neMissing(other)`)
- [x] `/Expr/neg`                  (`.negate()`)
- [x] `/Expr/not_`                 (`.not()`)
- [x] `/Expr/null_count`           (`.nullCount()`)
- [x] `/Expr/or_`                  (`.or()`)
- [x] `/Expr/over`                 (`.over(partitionBy)`)
- [x] `/Expr/pct_change`           (`.sub($df.col(...).lag(n)).div($df.col(...).lag(n))`)
- [x] `/Expr/peak_max`             (`.eq($df.col(...).cumMax())`)
- [x] `/Expr/peak_min`             (`.eq($df.col(...).cumMin())`)
- [ ] `/Expr/pipe`
- [x] `/Expr/pow`                  (`.pow(exponent)`)
- [x] `/Expr/product`              (`.product()`)
- [ ] `/Expr/qcut`
- [x] `/Expr/quantile`             (`.quantile(q, options?)`)
- [x] `/Expr/radians`              (`.radians()`)
- [x] `/Expr/rank`                 (`.rank(options?)`)
- [ ] `/Expr/rechunk`
- [ ] `/Expr/reinterpret`
- [ ] `/Expr/repeat_by`
- [ ] `/Expr/replace`
- [ ] `/Expr/replace_strict`
- [ ] `/Expr/reshape`
- [x] `/Expr/reverse`              (`.reverse()`)
- [ ] `/Expr/rle`
- [x] `/Expr/rle_id`              (`.ne($df.col(...).lag(1)).cumSum()`)
- [x] `/Expr/rolling`             (`.rolling(w, exprOrFn)`)
- [ ] `/Expr/rolling_kurtosis`
- [ ] `/Expr/rolling_map`
- [x] `/Expr/rolling_max`         (`.rollingMax(w, options?)`)
- [ ] `/Expr/rolling_max_by`
- [x] `/Expr/rolling_mean`        (`.rollingMean(w, options?)`)
- [ ] `/Expr/rolling_mean_by`
- [x] `/Expr/rolling_median`      (`.rollingMedian(w, options?)`)
- [ ] `/Expr/rolling_median_by`
- [x] `/Expr/rolling_min`         (`.rollingMin(w, options?)`)
- [ ] `/Expr/rolling_min_by`
- [x] `/Expr/rolling_quantile`    (`.rollingQuantile(w, q, options?)`)
- [ ] `/Expr/rolling_quantile_by`
- [x] `/Expr/rolling_rank`        (`.rollingRank(w, options?)`)
- [ ] `/Expr/rolling_rank_by`
- [ ] `/Expr/rolling_skew`
- [x] `/Expr/rolling_std`         (`.rollingStd(w, options?)`)
- [ ] `/Expr/rolling_std_by`
- [x] `/Expr/rolling_sum`         (`.rollingSum(w, options?)`)
- [ ] `/Expr/rolling_sum_by`
- [ ] `/Expr/rolling_var`
- [ ] `/Expr/rolling_var_by`
- [x] `/Expr/round`               (`.round(decimals?)`)
- [x] `/Expr/round_sig_figs`      (`.roundSigFigs(digits)`)
- [ ] `/Expr/sample`
- [ ] `/Expr/search_sorted`
- [ ] `/Expr/set_sorted`
- [x] `/Expr/shift`                (`.shift(n, { fillValue })`)
- [ ] `/Expr/shrink_dtype`
- [ ] `/Expr/shuffle`
- [x] `/Expr/sign`                (`.sign()`)
- [x] `/Expr/sin`                 (`.sin()`)
- [x] `/Expr/sinh`                (`.sinh()`)
- [x] `/Expr/skew`                (`.skew()`)
- [x] `/Expr/slice`               (`.slice(offset, length?)`)
- [x] `/Expr/sort`                (`.sort(options?)`)
- [x] `/Expr/sort_by`             (`.sortBy(by, options?)`)
- [x] `/Expr/sqrt`                (`.sqrt()`)
- [x] `/Expr/std`                 (`.std()`)
- [x] `/Expr/sub`                 (`.sub(other)`)
- [x] `/Expr/sum`                 (`.sum()`)
- [x] `/Expr/str/concat`          (`.str.concat(other)`)
- [x] `/Expr/str/contains`        (`.str.contains(pattern)`)
- [x] `/Expr/str/contains_any`    (`.str.containsAny(patterns)`)
- [x] `/Expr/str/count_matches`   (`.str.countMatches(pattern)`)
- [x] `/Expr/str/decode`          (`.str.decode(encoding?)`)
- [x] `/Expr/str/encode`          (`.str.encode(encoding?)`)
- [x] `/Expr/str/ends_with`       (`.str.endsWith(suffix)`)
- [x] `/Expr/str/escape_regex`    (`.str.escapeRegex()`)
- [x] `/Expr/str/explode`         (`.str.explode()`)
- [x] `/Expr/str/extract`         (`.str.extract(pattern, groupIndex?)`)
- [x] `/Expr/str/extract_all`     (`.str.extractAll(pattern)`)
- [x] `/Expr/str/extract_groups`  (`.str.extractGroups(pattern)`)
- [x] `/Expr/str/extract_many`    (`.str.extractMany(patterns)`)
- [x] `/Expr/str/find`            (`.str.find(pattern)`)
- [x] `/Expr/str/find_many`       (`.str.findMany(patterns)`)
- [x] `/Expr/str/head`            (`.str.head(n)`)
- [x] `/Expr/str/join`            (`.str.join(separator?)`)
- [x] `/Expr/str/json_decode`     (`.str.jsonDecode()`)
- [x] `/Expr/str/json_path_match` (`.str.jsonPathMatch(jsonPath)`)
- [x] `/Expr/str/len_bytes`       (`.str.lenBytes()`)
- [x] `/Expr/str/len_chars`       (`.str.lenChars()` / `.str.len()`)
- [x] `/Expr/str/normalize`       (`.str.normalize(form?)`)
- [x] `/Expr/str/pad_end`         (`.str.padEnd(width, fill?)` / `.str.rpad()`)
- [x] `/Expr/str/pad_start`       (`.str.padStart(width, fill?)` / `.str.lpad()`)
- [x] `/Expr/str/replace`         (`.str.replace(pattern, value)`)
- [x] `/Expr/str/replace_all`     (`.str.replaceAll(pattern, value)`)
- [x] `/Expr/str/replace_many`    (`.str.replaceMany(patterns, replacements)`)
- [x] `/Expr/str/reverse`         (`.str.reverse()`)
- [x] `/Expr/str/slice`           (`.str.slice(start, length?)`)
- [x] `/Expr/str/split`           (`.str.split(delim, options?)`)
- [x] `/Expr/str/split_exact` (`.str.split(delim, { exact: true, limit: n })`)
- [x] `/Expr/str/splitn`      (`.str.split(delim, { limit: n })`)
- [x] `/Expr/str/starts_with`     (`.str.startsWith(prefix)`)
- [x] `/Expr/str/strip_chars`     (`.str.stripChars(characters?)` / `.str.trim()`)
- [x] `/Expr/str/strip_chars_end` (`.str.stripCharsEnd(characters?)` / `.str.trimEnd()`)
- [x] `/Expr/str/strip_chars_start` (`.str.stripCharsStart(characters?)` / `.str.trimStart()`)
- [x] `/Expr/str/strip_prefix`    (`.str.stripPrefix(prefix)`)
- [x] `/Expr/str/strip_suffix`    (`.str.stripSuffix(suffix)`)
- [x] `/Expr/str/strptime`        (`.str.strptime(dtype, options?)`)
- [x] `/Expr/str/tail`            (`.str.tail(n)`)
- [x] `/Expr/str/to_date`         (`.str.toDate(options?)`)
- [x] `/Expr/str/to_datetime`     (`.str.toDatetime(options?)`)
- [x] `/Expr/str/to_decimal`      (`.str.toDecimal(options?)`)
- [x] `/Expr/str/to_integer`      (`.str.toInteger(options?)`)
- [x] `/Expr/str/to_lowercase`    (`.str.toLowerCase()` / `.str.lower()`)
- [x] `/Expr/str/to_time`         (`.str.toTime(options?)`)
- [x] `/Expr/str/to_titlecase`    (`.str.toTitleCase()`)
- [x] `/Expr/str/to_uppercase`    (`.str.toUpperCase()` / `.str.upper()`)
- [x] `/Expr/str/zfill`           (`.str.zfill(width)`)
- [x] `/Expr/struct/__getitem__`  (`.struct[fieldName]` / `.struct.field(name)`)
- [ ] `/Expr/struct/drop`
- [x] `/Expr/struct/field`        (`.struct.field(name)`)
- [ ] `/Expr/struct/json_encode`
- [x] `/Expr/struct/rename_fields` (`.struct.renameFields(mapping)`)
- [x] `/Expr/struct/unnest`       (`.struct.unnest()`)
- [x] `/Expr/struct/with_fields`  (`.struct.withFields(fields)`)
- [x] `/Expr/tail`                (`.slice(-n, n)`)
- [x] `/Expr/tan`                  (`.tan()`)
- [x] `/Expr/tanh`                 (`.tanh()`)
- [ ] `/Expr/to_physical`
- [x] `/Expr/top_k`               (`.sort({ descending: true }).slice(0, k)`)
- [x] `/Expr/top_k_by`            (`.sortBy(by, { descending: true }).slice(0, k)`)
- [x] `/Expr/truediv`             (`.div()`)
- [x] `/Expr/truncate`            (`.trunc()`)
- [ ] `/Expr/unique`
- [ ] `/Expr/unique_counts`
- [ ] `/Expr/upper_bound`
- [ ] `/Expr/value_counts`
- [x] `/Expr/var`                  (`.variance()`)
- [ ] `/Expr/where`
- [x] `/Expr/xor`                  (`.xor(other)`)
- [x] `/field`                 (`$df.col(...)`)
- [x] `/first`                 (`$df.col(...).first()`)
- [x] `/fold`                  (Custom accumulator expressions)
- [ ] `/format`                (`$df.col(...).str.format(...)`)
- [ ] `/from_arrow`
- [ ] `/from_dataframe`
- [ ] `/from_dict`
- [ ] `/from_dicts`
- [x] `/from_epoch`            (`$df.datetime(epoch)` / `$df.col(...).dt.fromEpoch(...)`)
- [ ] `/from_numpy`
- [ ] `/from_pandas`
- [ ] `/from_records`
- [ ] `/from_repr`
- [ ] `/get_extension_type`
- [x] `/groups`                (`df.groupBy(...)`)
- [x] `/head`                  (`df.head(n)` / `$df.col(...).slice(0, n)`)
- [x] `/implode`               (`$df.implode(...)` / `$df.col(...).implode()`)
- [x] `/int_range`             (`$df.seqRange(...)`)
- [x] `/int_ranges`            (`$df.seqRange(...)`)
- [ ] `/json_normalize`
- [x] `/last`                  (`$df.col(...).last()`)
- [x] `/len`                   (`df.height` / `$df.col(...).count({ includeNulls: true })`)
- [x] `/linear_space`          (`$df.seqRange(...)`)
- [x] `/linear_spaces`         (`$df.seqRange(...)`)
- [x] `/list`                  (`$df.col(...).implode()` / ArrayExpr)
- [ ] `/lit`
- [x] `/map_batches`           (`df.select(...)` / `derive(...)`)
- [x] `/map_groups`            (`df.groupBy(...)...`)
- [x] `/max`                   (`$df.col(...).max()`)
- [x] `/max_horizontal`        (`$df.horizontal(<cols>).max()`)
- [x] `/mean`                  (`$df.col(...).mean()`)
- [x] `/mean_horizontal`       (`$df.horizontal(<cols>).mean()`)
- [x] `/median`                (`$df.col(...).median()`)
- [ ] `/merge_sorted`
- [x] `/min`                   (`$df.col(...).min()`)
- [x] `/min_horizontal`        (`$df.horizontal(<cols>).min()`)
- [x] `/n_unique`              (`$df.col(...).nUnique()`)
- [x] `/nth`                   (`$df.col(...).get(n)`)
- [x] `/ones`                  (`$df.lit(1)`)
- [ ] `/partition_by`
- [x] `/quantile`              (`$df.col(...).quantile(q)`)
- [ ] `/read_avro`
- [ ] `/read_clipboard`
- [ ] `/read_csv`
- [ ] `/read_csv_batched`
- [ ] `/read_database`
- [ ] `/read_database_uri`
- [ ] `/read_delta`
- [ ] `/read_excel`
- [ ] `/read_ipc`
- [ ] `/read_ipc_schema`
- [ ] `/read_ipc_stream`
- [ ] `/read_json`
- [ ] `/read_lines`
- [ ] `/read_ndjson`
- [ ] `/read_ods`
- [ ] `/read_parquet`
- [ ] `/read_parquet_metadata`
- [ ] `/read_parquet_schema`
- [x] `/reduce`                (Custom accumulator expressions)
- [ ] `/register_extension_type`
- [x] `/repeat`                (`$df.lit(val)` / `$df.col(...).repeatBy(n)`)
- [x] `/rolling_corr`          (`$df.col(...).rolling(w, ...)`)
- [x] `/rolling_cov`           (`$df.col(...).rolling(w, ...)`)
- [x] `/row_index`             (`df.withRowIndex()`)
- [ ] `/scan_arrow_c_stream`
- [ ] `/scan_csv`
- [ ] `/scan_delta`
- [ ] `/scan_iceberg`
- [ ] `/scan_ipc`
- [ ] `/scan_lines`
- [ ] `/scan_ndjson`
- [ ] `/scan_parquet`
- [ ] `/scan_pyarrow_dataset`
- [ ] `/ScanCastOptions`
- [ ] `/self_dtype`
- [x] `/select`                (`df.select(...)`)
- [ ] `/set_random_seed`
- [ ] `/sql`
- [ ] `/sql_expr`
- [x] `/std`                   (`$df.col(...).std()`)
- [ ] `/StringCache`
- [x] `/struct`                (`$df.struct(...)`)
- [x] `/sum`                   (`$df.col(...).sum()`)
- [x] `/sum_horizontal`        (`$df.horizontal(<cols>).sum()`)
- [x] `/tail`                  (`df.tail(n)` / `$df.col(...).slice(-n, n)`)
- [x] `/time`                  (`$df.datetime(...)` / `$df.time(...)`)
- [x] `/time_range`            (`$df.seqRange(...)`)
- [x] `/time_ranges`           (`$df.seqRange(...)`)
- [ ] `/union`
- [ ] `/unregister_extension_type`
- [ ] `/using_string_cache`
- [x] `/var`                   (`$df.col(...).variance()`)
- [ ] `/when`
- [x] `/zeros`                 (`$df.lit(0)`)
