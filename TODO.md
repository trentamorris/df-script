# DFScript Backlog & TODO

A prioritized roadmap of upcoming features, improvements, and refactorings.

## 🚀 Upcoming Features

### 🗂️ DataFrame & Column Transformations
- [ ] **`explode` / `implode`**:
  * **`explode`**: Unnest list-like columns into multiple rows, replicating the input rows for each list element (Polars `.explode()` style).
  * **`implode`**: Group columns or values back into a single list element per group (Polars `.implode()` style).

### 📊 List Column Operations (`.list`)
- [ ] **`list.eval()` & `.elements`**:
  * Implement element-wise operations on lists/arrays using a sub-expression scope.
  * Replicate Polars `.list.eval()` behavior by exposing `.elements` inside the eval blocks to represent the inner elements of each list.

---

## 🛠️ Refactoring & Infrastructure
- [ ] Transition more inline runtime exceptions to inherit from the centralized custom exception classes defined in `src/exceptions`.
