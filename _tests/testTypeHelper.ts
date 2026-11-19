/**
 * Compile-time assertion helpers for type-level tests (*.test-d.ts).
 */

/**
 * Asserts that type `T` is strictly `true`.
 */
export type Expect<T extends true> = T;

/**
 * Asserts that types `X` and `Y` are mutually assignable and identically structured.
 */
export type Equal<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? true : false;
