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
