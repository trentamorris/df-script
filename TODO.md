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
- [ ] **`read_csv` / `write_csv`**:
  * Implement streaming delimiter-separated parser with automatic schema and type inference.
  * Provide stringifying writers supporting multiple CSV dialects.
- [ ] **`read_json` / `write_json`**:
  * Parse standard JSON arrays and newline-delimited JSON (NDJSON) records.

---

## 🛠️ Refactoring & Infrastructure
- [ ] Transition more inline runtime exceptions to inherit from the centralized custom exception classes defined in `src/exceptions`.
