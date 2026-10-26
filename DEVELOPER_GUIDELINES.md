# Developer Guidelines

This document outlines core engineering principles and standards for writing clean, robust, and maintainability-focused code across the project.

## 1. Use Built-in Standards
- Prioritize native, built-in APIs (such as JS `Intl` formatting, `TextEncoder`, and standard library utilities) rather than creating custom implementations or hardcoding logic.

## 2. Defensive Programming & Flat Logic
- **Null & Boundary Guards**: Validate inputs early using defensive guard clauses (e.g., check for null, undefined, or invalid ranges first) and return early.
- **Limited Nesting**: Keep conditional logic as flat as possible. Use simple, direct conditional expressions and guard clauses to minimize nested blocks.

## 3. Don't Repeat Yourself (DRY) & Atomic Design
- **Single Responsibility**: Break complex operations into small, atomic functions that focus on executing a single, clearly stated task.
- **Logic Reusability**: Centralize shared calculations and formatting utilities to prevent code duplication.

## 4. Keep Abstractions Lean
- Do not create unnecessary wrappers, classes, or boilerplate layers unless they offer substantial architectural value or are required by API design. Keep code simple and direct.

## 5. Strict Namespace Separation & Clean API Design
- **Dedicated Namespaces**: Keep APIs separated under clean namespaces (e.g., `.str` for string transformations, `.dt` for datetime manipulations).
- **No Legacy Clutter**: Avoid maintaining backwards-compatibility aliases that clutter the core class signatures. If a namespace is established, enforce it strictly.

## 6. Option Objects for Named Arguments
- **Prefer Option Objects**: When functions require multiple optional parameters or configuration flags, avoid passing them as sequential positional arguments.
- **Signature Pattern**: Use a pattern of one or two required positional arguments followed by an options object, i.e., `(requiredArg, options = { ... })`. This provides named-argument clarity, flexible default values, and prevents breaking API changes when adding new options.

## 7. Performance, Loop Optimization & Low-Abstraction Core
- **Avoid High-Level Iterators**: Prefer simple `for` (with cached length) and `while` loops over built-in higher-level array iterators like `forEach`, `map`, `filter`, and `reduce` in performance-critical paths (e.g., element-wise evaluations, aggregations).
- **Minimize Object Allocation**: Avoid creating short-lived objects, intermediate arrays, or array spreads within loops. Use in-place updates, pre-allocated result arrays, or proxies where possible to reduce garbage collection overhead.
- **Minimal Abstractions**: Keep execution paths direct. Avoid building layers of indirect callbacks, wrappers, or custom helper abstractions where a direct iterative implementation does the job.

## 8. Containing Scope Principle (Variables, Functions & Types)
- **Narrowest Local Scope**: Declare all variables, helper functions, and types in the narrowest containing scope possible. If a variable or type is only used within a single function or file, declare it locally inside that function or file.
- **Enclosing Containing Scope**: If a type, utility, or variable is shared across multiple files or modules, place it in the outermost file or directory that encompasses all its usages (e.g. in the module's own types file if used only within that module, or up to the root-level `types.ts` if shared across sibling modules like DataFrame and ColumnExpressions). This prevents global clutter and enforces a clean, modular hierarchy.
- **Dedicated Types & Utils Files**: Place all type definitions in a dedicated `types.ts` file, and all helper/formatting utilities in a `utils.ts` file (or `utils/` directory) within the relevant containing scope. This keeps the core business logic files clean and strictly focused on a single responsibility.

## 9. Naming Conventions & Member Ordering
- **camelCase Everywhere**: All variables, functions, method names, and named argument properties must follow `camelCase`.
- **SCREAMING_SNAKE_CASE for Constants**: Constants must be uppercase with underscores separating words (e.g. `MS_PER_SECOND`, `TEXT_ENCODER`, `COALESCE_MARKER`).
- **Internal / Private Functions & Methods**: All internal helper functions and private class members must be prefixed with an underscore (e.g. `_deriveDate`, `_matchPattern`, `_buildSet`).
- **Class Member Organization**:
  1. Internal / private helper methods (prefixed with `_`) appear first at the top of the class in **alphabetical order**.
  2. Standard public class methods / getters follow in **alphabetical order**.

## 10. JSDoc Notes & Compatibility Annotations
- **Tag Placement**: Place `@note` tags directly below the main summary description and before `@param` / `@returns` tags in JSDoc blocks.
- **Clean Label Formatting**: Use clean uppercase labels (e.g. `@note [Environment]: ...`, `@note [Timezone Compatibility]: ...`, `@note [Runtime Fallback]: ...`) rather than ad-hoc markdown symbols.
- **Environment Boundaries**: Document functions that interface with host-specific runtime capabilities (e.g. Node.js `fs` access or native `Intl` resolution) so consumers and documentation generators have clear visibility into execution boundaries.

## 11. Testing Standards & 1:1 Hierarchy Mirroring
- **1:1 File Hierarchy Mirroring**: Test files in `_tests/` must mirror the exact directory and file structure of `src/` (e.g., `src/functions/concat.ts` ➔ `_tests/functions/concat.test.ts`, `src/utils/number.ts` ➔ `_tests/utils/number.test.ts`).
- **Atomic Method Tests for Core Classes**: For large core classes like `DataFrame`, each public method or getter must have its own dedicated test file under `_tests/dataframe/<methodName>.test.ts` (e.g., `df.width` ➔ `_tests/dataframe/width.test.ts`, `df.select()` ➔ `_tests/dataframe/select.test.ts`). Avoid catch-all or miscellaneous test files.
- **Test Runner Registration**: Every new test file must be imported in `_tests/run_all_project_tests.ts` and the relevant subdirectory runner (e.g. `_tests/dataframe/run_all.ts`).
- **Dual Verification Requirement**: After any code changes, verify that both the local test suite and distribution bundle verification pass with zero errors (`npm test` and `npm run test:dist`).
- **Standalone Execution & Node Guards**: Always declare `declare const process: any;` at the top of test files when referencing Node `process` to ensure standalone execution compatibility.

## 12. Zero Dependencies, Runtime Portability & Numeric Integrity
- **Zero Runtime Dependencies**: The core library must remain strictly 0 dependencies with 0 native C++/Rust bindings or WebAssembly binaries. All algorithms must be pure, standards-compliant TypeScript/JavaScript.
- **Universal Runtime Support**: Code must execute seamlessly across Node.js (14+), Bun, Deno, modern web browsers, Web Workers, and Edge environments (Cloudflare Workers, Fastly Compute).

