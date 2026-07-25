import { ColumnExpr } from "../ColumnExpr";
import { ELEMENT_MARKER } from "../constants";

/**
 * Creates an expression referencing the current element(s) of an array during evaluation.
 * Primarily used inside array operations like `filter`, `map`, or `eval`.
 *
 * @template T The type of the element.
 * @returns {ColumnExpr<T>} A column expression referencing the array element.
 * @identifier $df
 * @example
 * >>> const df = $df.data({ a: [[1, 5, 10], [2, 8]] })
 * >>> df
 * shape: (2, 1)
 * ┌────────────┐
 * │ a          │
 * ├────────────┤
 * │ [1, 5, 10] │
 * │ [2, 8]     │
 * └────────────┘
 * >>> df.select($df.col("a").arr.filter($df.element().gt(5)).alias("filtered"))
 * shape: (2, 1)
 * ┌──────────┐
 * │ filtered │
 * ├──────────┤
 * │ [10]     │
 * │ [8]      │
 * └──────────┘
 */
export function element<T = any>(): ColumnExpr<T> {
    return new ColumnExpr(ELEMENT_MARKER);
}
