# DFScript Backlog & TODO

A prioritized roadmap of upcoming features, improvements, and refactorings.

## 🚀 Upcoming Features

### 🗂️ DataFrame & Column Transformations
- [x] **`explode` / `implode`**:
  * [x] **`explode`**: Unnest list-like columns into multiple rows, replicating the input rows for each list element (Polars `.explode()` style).
  * [x] **`implode`**: Group columns or values back into a single list element per group (Polars `.implode()` style).

### 📊 List Column Operations (`.list`)
- [x] **`list.eval()` & `.element`**:
  * Implement element-wise operations on lists/arrays using a sub-expression scope.
  * Replicate Polars `.list.eval()` behavior by exposing `.element` inside the eval blocks to represent the inner elements of each list.

### 🧱 Struct Column Operations (`.struct`)
- [ ] **`struct` & `.struct.field()`**:
  * Implement struct data type and `$df.struct(...)` constructor to group multiple columns into a single nested object/struct column.
  * Implement `.struct.field(name)` to extract inner fields from a struct column.

### 📂 File Input/Output (I/O)
- [x] **`read_csv` / `write_csv`**:
  * [x] Implement streaming delimiter-separated parser with automatic schema and type inference.
  * [x] Provide stringifying writers supporting multiple CSV dialects.
- [x] **`read_json` / `write_json`**:
  * [x] Parse standard JSON arrays and newline-delimited JSON (NDJSON) records.

---

## 🎯 V1.6.0 Release Scope

### 📦 Build & Tree-Shaking (ESM Support)
- [ ] **Dual CommonJS & ES Module (ESM) Build**:
  * Configure the build script to output both CommonJS (`dist/index.js`) and ESM (`dist/index.mjs`) bundles.
  * Update `package.json` with `"exports"` map supporting both `"require"` and `"import"` to enable tree-shaking for modern bundlers (Vite/Webpack).

### 🛠️ Refactoring & Infrastructure
- [ ] **Standardize Exception Assertions**:
  * Centralize check-and-throw assertion helper functions and ensure all inline exceptions throw specialized classes from `src/exceptions/`.
- [ ] **Performance Benchmarks**:
  * Create a performance benchmark suite comparing `df-script` to standard JS array manipulations and alternative JS libraries for common operations (groupby, join, pivot).

