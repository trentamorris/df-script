import { ColumnExpr } from "../columnExpressions/ColumnExpr";
import { ELEMENT_MARKER } from "../columnExpressions/constants";

/**
 * Creates an expression referencing the current element(s) of an array during evaluation.
 * Primarily used inside array operations like `filter`, `map`, or `eval`.
 *
 * @template T The type of the element.
 * @returns {ColumnExpr<T>} A column expression referencing the array element.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_array_nested_2rows -->
 * >>> df.select($df.col("a").arr.filter($df.element().gt(2)).alias("filtered"))
 * shape: (2, 1)
 * ┌──────────┐
 * │ filtered │
 * ├──────────┤
 * │ [3]      │
 * │ [4, 5]   │
 * └──────────┘
 */
export function element<T = any>(): ColumnExpr<T> {
    return new ColumnExpr(ELEMENT_MARKER);
}
