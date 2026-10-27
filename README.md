# df-script: High-Performance TypeScript DataFrame Library

[![Documentation](https://img.shields.io/badge/Documentation-df--script.js.org-6366f1?style=for-the-badge&logo=googledocs&logoColor=white)](https://df-script.js.org)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/trentamorris/df-script)
[![npm version](https://img.shields.io/npm/v/df-script?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/df-script)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/df-script?style=for-the-badge&color=blue)](https://bundlephobia.com/package/df-script)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success?style=for-the-badge)](#)
[![TypeScript & JavaScript](https://img.shields.io/badge/Supports-TS%20%7C%20TSX%20%7C%20JS%20%7C%20JSX-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Universal Runtimes](https://img.shields.io/badge/Runtimes-Node%20%7C%20Bun%20%7C%20Deno%20%7C%20Browser-brightgreen?style=for-the-badge)](#)
[![License](https://img.shields.io/npm/l/df-script?style=for-the-badge&color=informational)](LICENSE)
[![Donate](https://img.shields.io/badge/Donate-Support-green?style=for-the-badge)](DONATIONS.md)

**Official Documentation & Interactive Notebook:** [https://df-script.js.org](https://df-script.js.org)


---


## Introduction

**df-script** is a blazing-fast, **zero-dependency**, expression-based DataFrame and data manipulation library for **TypeScript** and **JavaScript**.

Heavily inspired by modern columnar engines like **Polars** and **Pandas**, `df-script` brings declarative, high-performance data transformations directly to modern JavaScript and TypeScript environments. Easily execute complex multi-column groupings, relational joins, windowed rolling statistics, string parsing, temporal conversions, and nested structs with a fluent, expressive API and zero external dependencies.


---


## Installation

```bash
npm install df-script
```

Or with Yarn, PNPM, or Bun:

```bash
yarn add df-script
pnpm add df-script
bun add df-script
```

Import in TypeScript or JavaScript:

```typescript
// ES Module / TypeScript
import { $df, DataFrame, ColumnExpr, DataType } from "df-script";
```

```javascript
// CommonJS / Node.js
const { $df, DataFrame, ColumnExpr, DataType } = require("df-script");
```


---


## Compatibility

- **Supported Languages & Standards**:
  - **Pure TypeScript/JavaScript** (0 dependencies, 0 native C++/Rust bindings, 0 WebAssembly).
  - TypeScript (`.ts`, `.tsx`) with complete compile-time type safety.
  - JavaScript (`.js`, `.jsx`) for Node.js and browser runtimes.
  - Dual ESM (`dist/index.mjs`) & CommonJS (`dist/index.js`) distribution.
  - Standards-compliant ES2020+.
- **Target Platforms & Runtimes**:
  - Node.js (14+), Bun, Deno, etc.
  - Modern browsers (Chrome, Safari, Firefox, Edge, ...).
  - Edge runtimes (Cloudflare Workers, Fastly Compute, AWS Lambda, ...) and Web Workers.
- **UI Frameworks & Bundlers**:
  - React, Next.js, Vue, Nuxt, Svelte, SolidJS, Astro, etc.
  - Vite, Webpack, Rollup, esbuild, etc.


---


## Quick Start

### 1. Basic DataFrame & Expression Pipeline
```typescript
import { $df } from "df-script";

// Create a DataFrame with structured data and automatic schema inference
const df = $df.data([
  { id: 1, name: "Alice", joinDate: "2026-01-15", sales: 1200.50, tags: ["sales", "east"] },
  { id: 2, name: "Bob", joinDate: "2026-02-20", sales: 850.00, tags: ["support", "west"] },
  { id: 3, name: "Charlie", joinDate: "2026-03-05", sales: 2300.00, tags: ["sales", "north"] },
  { id: 4, name: "David", joinDate: "2026-03-12", sales: null, tags: ["marketing"] },
]);
/*
df:
┌────┬─────────┬────────────┬─────────┬───────────────────┐
│ id │ name    │ joinDate   │ sales   │ tags              │
├────┼─────────┼────────────┼─────────┼───────────────────┤
│ 1  │ Alice   │ 2026-01-15 │ 1200.50 │ ["sales", "east"] │
│ 2  │ Bob     │ 2026-02-20 │ 850.00  │ ["support","west"]│
│ 3  │ Charlie │ 2026-03-05 │ 2300.00 │ ["sales", "north"]│
│ 4  │ David   │ 2026-03-12 │ null    │ ["marketing"]     │
└────┴─────────┴────────────┴─────────┴───────────────────┘
*/

// Select columns, transform strings, format dates, and compute expressions
const processedDf = df.select(
  $df.col("id"),
  $df.col("name").str.upper().alias("NAME_UPPER"),
  $df.col("joinDate").str.toDatetime().dt.year().alias("joinYear"),
  $df.col("sales").add(500).alias("salesAdjusted"),
  $df.col("tags").arr.lengths().alias("tagCount")
);

console.log(processedDf.toDicts());
/*
Output:
┌────┬────────────┬──────────┬───────────────┬──────────┐
│ id │ NAME_UPPER │ joinYear │ salesAdjusted │ tagCount │
├────┼────────────┼──────────┼───────────────┼──────────┤
│ 1  │ ALICE      │ 2026     │ 1700.5        │ 2        │
│ 2  │ BOB        │ 2026     │ 1350          │ 2        │
│ 3  │ CHARLIE    │ 2026     │ 2800          │ 2        │
│ 4  │ DAVID      │ 2026     │ null          │ 1        │
└────┴────────────┴──────────┴───────────────┴──────────┘
*/
```

### 2. GroupBy & Multi-Metric Aggregations
```typescript
const transactions = $df.data([
  { region: "East", category: "Hardware", revenue: 450, quantity: 3, timestamp: "2026-02-01" },
  { region: "East", category: "Hardware", revenue: 550, quantity: 5, timestamp: "2026-02-10" },
  { region: "West", category: "Software", revenue: 1200, quantity: 1, timestamp: "2026-01-20" },
]);
/*
transactions:
┌────────┬──────────┬─────────┬──────────┬────────────┐
│ region │ category │ revenue │ quantity │ timestamp  │
├────────┼──────────┼─────────┼──────────┼────────────┤
│ East   │ Hardware │ 450     │ 3        │ 2026-02-01 │
│ East   │ Hardware │ 550     │ 5        │ 2026-02-10 │
│ West   │ Software │ 1200    │ 1        │ 2026-01-20 │
└────────┴──────────┴─────────┴──────────┴────────────┘
*/

const salesSummary = transactions
  .groupBy(["region", "category"])
  .agg([
    $df.col("revenue").sum().alias("total_revenue"),
    $df.col("revenue").mean().round(2).alias("avg_revenue"),
    $df.col("quantity").sum().alias("units_sold"),
    $df.col("timestamp").str.toDatetime().dt.year().alias("year")
  ])
  .sort("total_revenue", { descending: true });

console.log(salesSummary.toDicts());
/*
Output:
┌────────┬──────────┬───────────────┬─────────────┬────────────┬──────┐
│ region │ category │ total_revenue │ avg_revenue │ units_sold │ year │
├────────┼──────────┼───────────────┼─────────────┼────────────┼──────┤
│ West   │ Software │ 1200          │ 1200        │ 1          │ 2026 │
│ East   │ Hardware │ 1000          │ 500         │ 8          │ 2026 │
└────────┴──────────┴───────────────┴─────────────┴────────────┴──────┘
*/
```

### 3. Relational Joins & Conditional Columns
```typescript
const orders = $df.data([
  { orderId: 101, customerId: 1, amount: 250 },
  { orderId: 102, customerId: 2, amount: 1400 },
]);
/*
orders:
┌─────────┬────────────┬────────┐
│ orderId │ customerId │ amount │
├─────────┼────────────┼────────┤
│ 101     │ 1          │ 250    │
│ 102     │ 2          │ 1400   │
└─────────┴────────────┴────────┘
*/

const customers = $df.data([
  { id: 1, firstName: "Alice", lastName: "Smith" },
  { id: 2, firstName: "Bob", lastName: "Jones" },
]);
/*
customers:
┌────┬───────────┬──────────┐
│ id │ firstName │ lastName │
├────┼───────────┼──────────┤
│ 1  │ Alice     │ Smith    │
│ 2  │ Bob       │ Jones    │
└────┴───────────┴──────────┘
*/

// Join tables with complete null safety and compute new columns
const enrichedOrders = orders.join(customers, {
  leftOn: "customerId",
  rightOn: "id",
  how: "left"
}).withColumns([
  $df.col("firstName").str.concat(" ").str.concat($df.col("lastName")).alias("fullName"),
  $df.when($df.col("amount").gt(1000)).then("VIP").otherwise("Standard").alias("tier")
]);

console.log(enrichedOrders.toDicts());
/*
Output:
┌─────────┬────────────┬────────┬────┬───────────┬──────────┬─────────────┬──────────┐
│ orderId │ customerId │ amount │ id │ firstName │ lastName │ fullName    │ tier     │
├─────────┼────────────┼────────┼────┼───────────┼──────────┼─────────────┼──────────┤
│ 101     │ 1          │ 250    │ 1  │ Alice     │ Smith    │ Alice Smith │ Standard │
│ 102     │ 2          │ 1400   │ 2  │ Bob       │ Jones    │ Bob Jones   │ VIP      │
└─────────┴────────────┴────────┴────┴───────────┴──────────┴─────────────┴──────────┘
*/
```

### 4. Rolling Moving Windows & Cumulative Calculations
```typescript
const sensorData = $df.data([
  { timestamp: "2026-03-01T00:00:00Z", temperature: 20.1, powerUsage: 12 },
  { timestamp: "2026-03-01T01:00:00Z", temperature: 20.9, powerUsage: 14 },
  { timestamp: "2026-03-01T02:00:00Z", temperature: 21.5, powerUsage: 13 },
]);
/*
sensorData:
┌──────────────────────┬─────────────┬────────────┐
│ timestamp            │ temperature │ powerUsage │
├──────────────────────┼─────────────┼────────────┤
│ 2026-03-01T00:00:00Z │ 20.1        │ 12         │
│ 2026-03-01T01:00:00Z │ 20.9        │ 14         │
│ 2026-03-01T02:00:00Z │ 21.5        │ 13         │
└──────────────────────┴─────────────┴────────────┘
*/

// Compute moving averages and cumulative metrics without manual loop state
const telemetryWithTrends = sensorData
  .sort("timestamp")
  .withColumns([
    $df.col("temperature").rollingMean(2).alias("temp_rolling_avg"),
    $df.col("powerUsage").cumSum().alias("cumulative_kwh"),
    $df.col("temperature").diff().alias("temp_delta")
  ]);

console.log(telemetryWithTrends.toDicts());
/*
Output:
┌──────────────────────┬─────────────┬────────────┬──────────────────┬────────────────┬────────────┐
│ timestamp            │ temperature │ powerUsage │ temp_rolling_avg │ cumulative_kwh │ temp_delta │
├──────────────────────┼─────────────┼────────────┼──────────────────┼────────────────┼────────────┤
│ 2026-03-01T00:00:00Z │ 20.1        │ 12         │ 20.1             │ 12             │ null       │
│ 2026-03-01T01:00:00Z │ 20.9        │ 14         │ 20.5             │ 26             │ 0.8        │
│ 2026-03-01T02:00:00Z │ 21.5        │ 13         │ 21.2             │ 39             │ 0.6        │
└──────────────────────┴─────────────┴────────────┴──────────────────┴────────────────┴────────────┘
*/
```


---


## Why df-script?

For most web applications, performing complex data transformations requires maintaining a dedicated backend service. Suddenly, an otherwise straightforward application introduces deployment pipelines, network latency, serialization bottlenecks, asynchronous state management, and ongoing cloud hosting bills, all just to run operations modern client CPUs can perform in milliseconds.

To avoid this, many developers implement hand-written functions or native chains of `.map()`, `.filter()`, and `.reduce()` to transform data directly in the browser. These chained operations repeatedly traverse the dataset and flood memory with intermediate objects, degrading performance and freezing the UI. Worse, what starts as a simple utility quickly devolves into hundreds of lines of fragile boilerplate once real-world edge cases surface:

- **Composite Keys**: Hashing multi-column keys without collisions, distinguishing string `"null"` from literal `null` and `undefined`, maintaining deterministic order, and handling sparse indices.
- **Relational Joins**: Reliable outer joins without silent truncation, resolving column name collisions with automatic suffixing, and aligning time-series with as-of nearest matches.
- **Windowing & Rolling Metrics**: Managing sliding window boundaries, min-sample thresholds, cumulative accumulators, and lead/lag offsets without unbounded memory growth.
- **Numeric Integrity**: Eliminating silent precision loss from floating-point drift, `NaN` contagion, `-0` vs `+0`, integer overflows, and `BigInt` cross-type operations.
- **Date & String Edge Cases**: Handling timezone offsets across client environments, ISO/RFC parsing variations, regex escaping, and Unicode surrogate pairs.

**`df-script` changes this equation entirely.** It introduces a zero-dependency, column-oriented DataFrame engine constructed specifically to enable complex chained data transformations directly in the browser with zero network latency and no server maintenance. By avoiding high-level array iterators like `.map()` and `.reduce()` in favor of contiguous columnar loops, `df-script` drastically cuts intermediate object allocations to reduce garbage collection pressure. Every function is backed by a dedicated 1:1 test suite covering hundreds of extreme edge cases, so you never have to hand-roll fragile data logic again.


---


## Data Types

`df-script` features a strongly-typed schema registry accessible via the `$df` namespace for casting, schema validation, and columnar memory allocations.

### 1. Concrete Data Types

| Data Type | Description |
| :--- | :--- |
| **`$df.Int8`** | 8-bit signed integer (-128 to 127). |
| **`$df.Int16`** | 16-bit signed integer (-32,768 to 32,767). |
| **`$df.Int32`** | 32-bit signed integer (-2,147,483,648 to 2,147,483,647). |
| **`$df.Int64`** | 64-bit signed integer supported via native `BigInt`. |
| **`$df.UInt8`** | 8-bit unsigned integer (0 to 255). |
| **`$df.UInt16`** | 16-bit unsigned integer (0 to 65,535). |
| **`$df.UInt32`** | 32-bit unsigned integer (0 to 4,294,967,295). |
| **`$df.UInt64`** | 64-bit unsigned integer supported via native `BigInt`. |
| **`$df.Float32`** | 32-bit single-precision floating-point number. |
| **`$df.Float64`** | 64-bit double-precision floating-point number (standard JS number). |
| **`$df.Decimal(p?, s?)`** | Fixed-point exact decimal with configurable precision and scale. |
| **`$df.Boolean`** | Boolean logic (`true`, `false`, with Kleene `null` support). |
| **`$df.Utf8`** | UTF-8 encoded text string (surrogate-pair and Unicode aware). |
| **`$df.Binary`** | Raw binary byte data (`Uint8Array` / `ArrayBuffer`). |
| **`$df.Date`** | Calendar date representation without time component (YYYY-MM-DD). |
| **`$df.Datetime`** | Temporal timestamp representation with timezone and microsecond precision. |
| **`$df.Time`** | Time-of-day representation (microseconds since midnight). |
| **`$df.Duration`** | Signed temporal duration with unit conversions (days to nanoseconds). |
| **`$df.Array`** | Homogeneous list/array of nested elements. |
| **`$df.Struct`** | Key-value record struct with named sub-fields. |
| **`$df.Object`** | Arbitrary JavaScript object container. |
| **`$df.Null`** | Explicit null type indicator. |

### 2. Type Selectors

Type selectors match entire families of data types when filtering columns via `$df.col(...)`:

| Selector | Matches |
| :--- | :--- |
| **`$df.Numeric`** | All integer and floating-point types (`Int8`..`Int64`, `UInt8`..`UInt64`, `Float32`, `Float64`, `Decimal`). |
| **`$df.Integer`** | All signed and unsigned integer types (`Int8`..`Int64`, `UInt8`..`UInt64`). |
| **`$df.SignedInteger`** | All signed integer types (`Int8`, `Int16`, `Int32`, `Int64`). |
| **`$df.UnsignedInteger`** | All unsigned integer types (`UInt8`, `UInt16`, `UInt32`, `UInt64`). |
| **`$df.Float`** | Single and double precision floating-point types (`Float32`, `Float64`). |
| **`$df.Temporal`** | All date, time, timestamp, and duration types (`Date`, `Datetime`, `Time`, `Duration`). |
| **`$df.Nested`** | All nested structural types (`Array`, `Struct`). |


---


## Functions

The `$df` entry point provides top-level functions to create DataFrames, construct expressions, and parse tabular inputs:

| Function | Description |
| :--- | :--- |
| **`$df.all`** | Selects all columns. |
| **`$df.coalesce`** | Returns the first non-null value among expressions. |
| **`$df.col`** | Creates a column reference expression. |
| **`$df.concat`** | Concatenates multiple DataFrames. |
| **`$df.data`** | Creates a new DataFrame from rows, columns, or matrices. |
| **`$df.duration`** | Creates a duration expression. |
| **`$df.element`** | References the current array element in `.arr.eval()`. |
| **`$df.exclude`** | Selects all columns except the specified ones. |
| **`$df.horizontal`** | Combines columns or expressions horizontally per row. |
| **`$df.implode`** | Collects values into a list column. |
| **`$df.lit`** | Wraps a raw scalar value into a literal expression. |
| **`$df.readCsv`** | Reads CSV data into a DataFrame. |
| **`$df.readJson`** | Reads JSON or NDJSON data into a DataFrame. |
| **`$df.seqRange`** | Generates a range sequence. |
| **`$df.struct`** | Constructs a struct expression. |
| **`$df.when`** | Starts a conditional `when / then / otherwise` expression. |


---


## DataFrame Operations

All operations and getters on `DataFrame` in alphabetical order:

| Method / Property | Description |
| :--- | :--- |
| **`.cast`** | Casts columns to specified data types. |
| **`.clone`** | Creates a deep copy of the DataFrame. |
| **`.columns`** | Array of column names. |
| **`.concat`** | Concatenates multiple DataFrames. |
| **`.drop`** | Drops specified columns. |
| **`.dropNulls`** | Drops rows containing null or undefined values. |
| **`.dtypes`** | Dictionary of column data types. |
| **`.equals`** | Checks deep equality between two DataFrames. |
| **`.explode`** | Unnests list columns into multiple rows. |
| **`.fill`** | Fills targeted values across columns. |
| **`.fillNan`** | Fills `NaN` values across numeric columns. |
| **`.fillNull`** | Fills null values with scalar values or strategies. |
| **`.filter`** | Filters rows matching predicate expressions. |
| **`.groupBy`** | Groups rows for aggregations. |
| **`.groupByDynamic`** | Groups rows over dynamic time-series or numeric windows. |
| **`.head`** | Returns the first `n` rows (defaults to 5). |
| **`.height`** | Total row count. |
| **`.insertColumn`** | Inserts a new column at a given index. |
| **`.item`** | Returns a scalar cell value at a row and column. |
| **`.iterColumns`** | Iterates over `{ name, values }` pairs for each column. |
| **`.iterRows`** | Iterates over row objects. |
| **`.join`** | Joins with another DataFrame. |
| **`.joinAsof`** | Performs an as-of join on sorted key columns. |
| **`.joinWhere`** | Performs a join based on arbitrary predicate conditions. |
| **`.limit`** | Returns a subset of rows with optional offset. |
| **`.partitionBy`** | Splits DataFrame into sub-DataFrames by group keys. |
| **`.pivot`** | Reshapes data from long to wide format. |
| **`.rename`** | Renames columns using a name mapping. |
| **`.reverse`** | Reverses row order. |
| **`.schema`** | Column-to-DataType schema mapping. |
| **`.select`** | Projects and evaluates column expressions. |
| **`.shape`** | Tuple of `[height, width]` dimensions. |
| **`.slice`** | Slices a range of rows. |
| **`.sort`** | Sorts rows by one or more columns or expressions. |
| **`.tail`** | Returns the last `n` rows (defaults to 5). |
| **`.toArray`** | Converts DataFrame to a 2D array of rows. |
| **`.toDict`** | Converts DataFrame to a column-oriented object. |
| **`.toDicts`** | Converts DataFrame to an array of row objects. |
| **`.transpose`** | Transposes rows and columns. |
| **`.unique`** | Returns distinct rows. |
| **`.unpivot`** | Reshapes data from wide to long format. |
| **`.unstack`** | Unstacks multi-level grouped columns. |
| **`.width`** | Total column count. |
| **`.withColumns`** | Adds or updates columns using expressions. |
| **`.withRowIndex`** | Inserts a row index column. |
| **`.writeCsv`** | Serializes or writes DataFrame to CSV. |
| **`.writeJson`** | Serializes or writes DataFrame to JSON / NDJSON. |


---


## Column Expressions

All column expressions inherit from `ColumnExpr` / `ExprBase` and support fluent chaining.

### Standard Expressions

| Method | Description |
| :--- | :--- |
| **`.abs`** | Computes absolute value. |
| **`.add`** | Addition with value or expression. |
| **`.all`** | Returns true if all elements evaluate to true. |
| **`.allNull`** | Returns true if all elements are null or undefined. |
| **`.and`** | Logical AND. |
| **`.any`** | Returns true if at least one element evaluates to true. |
| **`.anyNull`** | Returns true if any element is null or undefined. |
| **`.arccos`** | Inverse cosine in radians. |
| **`.arccosh`** | Inverse hyperbolic cosine. |
| **`.arcsin`** | Inverse sine in radians. |
| **`.arcsinh`** | Inverse hyperbolic sine. |
| **`.arctan`** | Inverse tangent in radians. |
| **`.arctan2`** | Four-quadrant inverse tangent. |
| **`.arctanh`** | Inverse hyperbolic tangent. |
| **`.argMax`** | Index of the first maximum value. |
| **`.argMin`** | Index of the first minimum value. |
| **`.avg`** | Computes arithmetic mean (alias for `.mean`). |
| **`.between`** | Checks if values fall within a range. |
| **`.bitwiseAnd`** | Bitwise AND (`&`). |
| **`.bitwiseOr`** | Bitwise OR (`\|`). |
| **`.bitwiseXor`** | Bitwise XOR (`^`). |
| **`.cbrt`** | Computes cube root. |
| **`.ceil`** | Rounds upward to nearest integer. |
| **`.clip`** | Clamps values between lower and upper bounds. |
| **`.copysign`** | Copies the sign of another value or expression. |
| **`.corr`** | Pearson correlation coefficient. |
| **`.cos`** | Cosine in radians. |
| **`.cosh`** | Hyperbolic cosine. |
| **`.cot`** | Cotangent in radians. |
| **`.count`** | Counts non-null elements. |
| **`.cov`** | Covariance with another column or expression. |
| **`.cumCount`** | Cumulative count of elements. |
| **`.cumMax`** | Cumulative maximum value. |
| **`.cumMin`** | Cumulative minimum value. |
| **`.cumProd`** | Cumulative product. |
| **`.cumSum`** | Cumulative running sum. |
| **`.degrees`** | Converts radians to degrees. |
| **`.denseRank`** | Computes dense rank without gaps. |
| **`.div`** | Division. |
| **`.dot`** | Computes dot product. |
| **`.entropy`** | Computes Shannon entropy. |
| **`.eq`** | Equality comparison (`==`). |
| **`.eqMissing`** | Null-safe equality comparison. |
| **`.ewmKurt`** | Exponentially weighted moving kurtosis. |
| **`.ewmMean`** | Exponentially weighted moving mean. |
| **`.ewmSkew`** | Exponentially weighted moving skewness. |
| **`.ewmStd`** | Exponentially weighted moving standard deviation. |
| **`.ewmSum`** | Exponentially weighted moving sum. |
| **`.ewmVar`** | Exponentially weighted moving variance. |
| **`.exp`** | Exponential (`e^x`). |
| **`.expm1`** | Computes `e^x - 1`. |
| **`.fill`** | Fills targeted values with values or strategies. |
| **`.fillNan`** | Fills `NaN` values. |
| **`.fillNull`** | Fills null values with scalar values or strategies. |
| **`.filter`** | Filters elements by boolean predicate. |
| **`.first`** | Returns first element. |
| **`.floor`** | Rounds downward to nearest integer. |
| **`.floordiv`** | Integer / floor division. |
| **`.ge`** | Greater than or equal (`>=`). |
| **`.gt`** | Greater than (`>`). |
| **`.hasNulls`** | Checks if column contains any null values. |
| **`.hypot`** | Computes hypotenuse `sqrt(a^2 + b^2)`. |
| **`.implode`** | Collects elements into a single list column. |
| **`.isClose`** | Checks approximate numeric equality. |
| **`.isDuplicated`** | Boolean mask of duplicated values. |
| **`.isFinite`** | Checks if numbers are finite. |
| **`.isIn`** | Checks if values exist in a set or array. |
| **`.isInfinite`** | Checks if numbers are infinite. |
| **`.isNDistinct`** | Matches the N-th distinct value. |
| **`.isNan`** | Checks if values are `NaN`. |
| **`.isNotNan`** | Checks if values are not `NaN`. |
| **`.isNotNull`** | Checks if values are neither null nor undefined. |
| **`.isNull`** | Checks if values are null or undefined. |
| **`.isUnique`** | Boolean mask of unique values. |
| **`.kurtosis`** | Computes kurtosis. |
| **`.lag`** | Shifts values backward by offset. |
| **`.last`** | Returns last element. |
| **`.le`** | Less than or equal (`<=`). |
| **`.lead`** | Shifts values forward by offset. |
| **`.log`** | Computes logarithm. |
| **`.log1p`** | Computes `ln(1 + x)`. |
| **`.lt`** | Less than (`<`). |
| **`.max`** | Maximum value. |
| **`.maxBy`** | Value where another expression is maximized. |
| **`.mean`** | Arithmetic mean. |
| **`.median`** | 50th percentile median. |
| **`.min`** | Minimum value. |
| **`.minBy`** | Value where another expression is minimized. |
| **`.mod`** | Modulo remainder. |
| **`.mode`** | Most frequently occurring value(s). |
| **`.mul`** | Multiplication. |
| **`.nUnique`** | Count of distinct non-null values. |
| **`.nanMax`** | Maximum treating `NaN` by IEEE 754 rules. |
| **`.nanMin`** | Minimum treating `NaN` by IEEE 754 rules. |
| **`.ne`** | Inequality comparison (`!=`). |
| **`.neMissing`** | Null-safe inequality comparison. |
| **`.negate`** | Negates values (`-x`). |
| **`.not`** | Logical NOT. |
| **`.notIn`** | Checks if values are not in a set or array. |
| **`.nullCount`** | Total count of null and undefined values. |
| **`.or`** | Logical OR. |
| **`.over`** | Evaluates expression over a partition window. |
| **`.pow`** | Exponentiation (`x^y`). |
| **`.product`** | Product of all non-null values. |
| **`.quantile`** | Quantile value at probability `p`. |
| **`.radians`** | Converts degrees to radians. |
| **`.rand`** | Generates uniform random numbers between 0 and 1. |
| **`.rank`** | Computes rank order. |
| **`.reverse`** | Reverses element order. |
| **`.rolling`** | Evaluates expression over a sliding window. |
| **`.rollingMax`** | Rolling maximum over a sliding window. |
| **`.rollingMean`** | Rolling mean over a sliding window. |
| **`.rollingMedian`** | Rolling median over a sliding window. |
| **`.rollingMin`** | Rolling minimum over a sliding window. |
| **`.rollingQuantile`** | Rolling quantile over a sliding window. |
| **`.rollingRank`** | Rolling rank over a sliding window. |
| **`.rollingStd`** | Rolling standard deviation over a sliding window. |
| **`.rollingSum`** | Rolling sum over a sliding window. |
| **`.round`** | Rounds numbers to decimal places. |
| **`.roundSigFigs`** | Rounds numbers to significant figures. |
| **`.rowNumber`** | Sequential 1-based row number within partition. |
| **`.shift`** | Shifts values by offset. |
| **`.sign`** | Sign of numbers (-1, 0, 1). |
| **`.sin`** | Sine in radians. |
| **`.sinh`** | Hyperbolic sine. |
| **`.skew`** | Computes skewness. |
| **`.spearmanCorr`** | Spearman rank correlation. |
| **`.sqrt`** | Computes square root. |
| **`.std`** | Sample standard deviation. |
| **`.sub`** | Subtraction. |
| **`.sum`** | Sum of non-null values. |
| **`.tan`** | Tangent in radians. |
| **`.tanh`** | Hyperbolic tangent. |
| **`.trunc`** | Truncates decimal digits toward zero. |
| **`.variance`** | Sample variance. |
| **`.wAvg`** | Weighted average. |
| **`.xor`** | Logical XOR. |

### String Namespace (`.str`)

| Method | Description |
| :--- | :--- |
| **`.str.concat`** | Concatenates strings. |
| **`.str.contains`** | Checks if string contains substring or pattern. |
| **`.str.containsAny`** | Checks if string contains any candidate substring. |
| **`.str.countMatches`** | Counts pattern occurrences. |
| **`.str.decode`** | Decodes binary data using specified encoding. |
| **`.str.decodeUriComponent`** | Decodes URI-encoded characters. |
| **`.str.encode`** | Encodes string to binary format. |
| **`.str.encodeUriComponent`** | Encodes string for safe URI transmission. |
| **`.str.endsWith`** | Checks if string ends with suffix. |
| **`.str.escapeRegex`** | Escapes regex special characters. |
| **`.str.explode`** | Splits string and explodes into rows. |
| **`.str.extract`** | Extracts first regex match or capture group. |
| **`.str.extractAll`** | Extracts all regex matches as an array. |
| **`.str.extractGroups`** | Extracts named or numbered capture groups into a struct. |
| **`.str.extractMany`** | Extracts matches from multiple patterns. |
| **`.str.find`** | Finds index of first match. |
| **`.str.findMany`** | Finds indices of multiple patterns. |
| **`.str.head`** | Returns first `n` characters. |
| **`.str.join`** | Joins string values with a delimiter. |
| **`.str.jsonDecode`** | Parses JSON string into a struct or list. |
| **`.str.jsonPathMatch`** | Extracts values matching a JSONPath query. |
| **`.str.len`** | String character length. |
| **`.str.lenBytes`** | Byte length in UTF-8. |
| **`.str.lenChars`** | Unicode code point count. |
| **`.str.lower`** | Converts string to lowercase. |
| **`.str.lpad`** | Pads string on the left. |
| **`.str.normalize`** | Applies Unicode normalization (NFC, NFD, NFKC, NFKD). |
| **`.str.padEnd`** | Pads string on the right (alias for `.rpad`). |
| **`.str.padStart`** | Pads string on the left (alias for `.lpad`). |
| **`.str.replace`** | Replaces first pattern match. |
| **`.str.replaceAll`** | Replaces all pattern matches. |
| **`.str.replaceMany`** | Replaces multiple patterns. |
| **`.str.reverse`** | Reverses string characters. |
| **`.str.rpad`** | Pads string on the right. |
| **`.str.slice`** | Slices substring by offset and length. |
| **`.str.split`** | Splits string into an array of substrings. |
| **`.str.startsWith`** | Checks if string starts with prefix. |
| **`.str.stripChars`** | Strips leading and trailing characters. |
| **`.str.stripCharsEnd`** | Strips trailing characters. |
| **`.str.stripCharsStart`** | Strips leading characters. |
| **`.str.stripPrefix`** | Removes prefix if present. |
| **`.str.stripSuffix`** | Removes suffix if present. |
| **`.str.strptime`** | Parses string to date or datetime with format specifiers. |
| **`.str.tail`** | Returns last `n` characters. |
| **`.str.toCamelCase`** | Converts string to camelCase. |
| **`.str.toDate`** | Parses ISO 8601 string to Date. |
| **`.str.toDatetime`** | Parses ISO 8601 string to Datetime. |
| **`.str.toDecimal`** | Parses numeric string to Decimal. |
| **`.str.toInteger`** | Parses numeric string to integer. |
| **`.str.toKebabCase`** | Converts string to kebab-case. |
| **`.str.toLowerCase`** | Converts string to lowercase (alias for `.lower`). |
| **`.str.toPascalCase`** | Converts string to PascalCase. |
| **`.str.toSnakeCase`** | Converts string to snake_case. |
| **`.str.toTime`** | Parses time string to Time. |
| **`.str.toTitleCase`** | Converts string to Title Case. |
| **`.str.toUpperCase`** | Converts string to uppercase (alias for `.upper`). |
| **`.str.upper`** | Converts string to uppercase. |
| **`.str.zfill`** | Pads string on the left with zeros. |

### Temporal Namespace (`.dt`)

| Method | Description |
| :--- | :--- |
| **`.dt.castTimeUnit`** | Casts duration or timestamp precision. |
| **`.dt.century`** | Extracts century. |
| **`.dt.convertTimeZone`** | Converts datetime to target timezone. |
| **`.dt.date`** | Extracts Date component. |
| **`.dt.day`** | Extracts day of month (1-31). |
| **`.dt.daysInMonth`** | Returns number of days in the month (28-31). |
| **`.dt.epoch`** | Returns elapsed units since Unix Epoch. |
| **`.dt.hour`** | Extracts hour of day (0-23). |
| **`.dt.isBusinessDay`** | Checks if date falls on a weekday. |
| **`.dt.isLeapYear`** | Checks if year is a leap year. |
| **`.dt.isoYear`** | Extracts ISO week-numbering year. |
| **`.dt.microsecond`** | Extracts microsecond (0-999). |
| **`.dt.millennium`** | Extracts millennium. |
| **`.dt.millisecond`** | Extracts millisecond (0-999). |
| **`.dt.minute`** | Extracts minute of hour (0-59). |
| **`.dt.month`** | Extracts month of year (1-12). |
| **`.dt.monthEnd`** | Snaps date to the last day of the month. |
| **`.dt.monthStart`** | Snaps date to the first day of the month. |
| **`.dt.nanosecond`** | Extracts nanosecond (0-999). |
| **`.dt.offsetDay`** | Adds or subtracts calendar days. |
| **`.dt.ordinalDay`** | Extracts day of year (1-366). |
| **`.dt.quarter`** | Extracts calendar quarter (1-4). |
| **`.dt.replace`** | Replaces specific datetime components. |
| **`.dt.second`** | Extracts second of minute (0-59). |
| **`.dt.strftime`** | Formats datetime with format specifiers. |
| **`.dt.time`** | Extracts Time component. |
| **`.dt.timestamp`** | Returns Unix timestamp. |
| **`.dt.totalDays`** | Computes duration in days. |
| **`.dt.totalHours`** | Computes duration in hours. |
| **`.dt.totalMicroseconds`** | Computes duration in microseconds. |
| **`.dt.totalMilliseconds`** | Computes duration in milliseconds. |
| **`.dt.totalMinutes`** | Computes duration in minutes. |
| **`.dt.totalNanoseconds`** | Computes duration in nanoseconds. |
| **`.dt.totalSeconds`** | Computes duration in seconds. |
| **`.dt.utcOffset`** | Returns UTC offset. |
| **`.dt.week`** | Extracts calendar week number. |
| **`.dt.weekday`** | Extracts day of week (1 = Monday, 7 = Sunday). |
| **`.dt.year`** | Extracts calendar year. |

### Array Namespace (`.arr`)

| Method | Description |
| :--- | :--- |
| **`.arr.agg`** | Aggregates list elements using an expression. |
| **`.arr.all`** | Returns true if all list elements are truthy. |
| **`.arr.any`** | Returns true if any list element is truthy. |
| **`.arr.argMax`** | Index of maximum element in list. |
| **`.arr.argMin`** | Index of minimum element in list. |
| **`.arr.contains`** | Checks if list contains item. |
| **`.arr.containsAll`** | Checks if list contains all candidate items. |
| **`.arr.containsAny`** | Checks if list contains any candidate item. |
| **`.arr.countMatches`** | Counts item occurrences in list. |
| **`.arr.eval`** | Evaluates expression element-wise over list. |
| **`.arr.explode`** | Unnests list into individual rows. |
| **`.arr.filter`** | Filters list elements by predicate expression. |
| **`.arr.first`** | Extracts first element of list. |
| **`.arr.gather`** | Gathers elements at specified indices. |
| **`.arr.gatherEvery`** | Gathers elements at periodic interval steps. |
| **`.arr.get`** | Extracts element at index. |
| **`.arr.join`** | Joins list elements into a string. |
| **`.arr.last`** | Extracts last element of list. |
| **`.arr.len`** | Returns list element count. |
| **`.arr.lengths`** | Returns list length (alias for `.len`). |
| **`.arr.max`** | Maximum element in list. |
| **`.arr.mean`** | Arithmetic mean of numeric list elements. |
| **`.arr.median`** | Median of numeric list elements. |
| **`.arr.min`** | Minimum element in list. |
| **`.arr.mode`** | Most frequent element(s) in list. |
| **`.arr.nUnique`** | Count of distinct list elements. |
| **`.arr.reverse`** | Reverses list element order. |
| **`.arr.shift`** | Shifts list elements by offset. |
| **`.arr.slice`** | Slices sub-array by offset and length. |
| **`.arr.sort`** | Sorts list elements. |
| **`.arr.splice`** | Deletes and/or inserts elements in list. |
| **`.arr.std`** | Sample standard deviation of list elements. |
| **`.arr.sum`** | Sum of numeric list elements. |
| **`.arr.toStruct`** | Converts list elements into a struct object. |
| **`.arr.unique`** | Deduplicates list elements. |
| **`.arr.variance`** | Sample variance of list elements. |

### Struct Namespace (`.struct`)

| Method | Description |
| :--- | :--- |
| **`.struct.field`** | Extracts a nested field from the struct. |
| **`.struct.renameFields`** | Renames nested struct fields. |
| **`.struct.unnest`** | Unnests struct fields into top-level columns. |
| **`.struct.withFields`** | Adds or updates struct fields. |


---


## License

`df-script` is open-source software licensed under the [MIT License](LICENSE).
