import { ColumnExpr } from "../columnExpressions/columnExpr";
import { ELEMENT_MARKER } from "../columnExpressions/constants";

/**
 * Creates an expression referencing the current element(s) of an array during evaluation.
 * Primarily used inside array operations like `filter`, `map`, or `eval`.
 *
 * @template T The type of the element.
 * @returns {ColumnExpr<T>} A column expression referencing the array element.
 * @namespace $df
 * @category Function
 * @syntax $df.{symbol}(...)
 * @example
 * // 1. Filter elements within array cells:
 * <!-- doc:base_array_nested_2rows -->
 * >>> df.select($df.col("a").arr.filter($df.element().gt(2)).alias("filtered"))
 * shape: (2, 1)
 * +----------+
 * | filtered |
 * +----------+
 * | [3]      |
 * | [4, 5]   |
 * +----------+
 *
 * @example
 * // 2. Perform element-wise calculation across array cells:
 * <!-- doc:base_array_nested_2rows -->
 * >>> df.select($df.col("a").arr.eval($df.element().mul(10)).alias("scaled"))
 * shape: (2, 1)
 * +--------------+
 * | scaled       |
 * +--------------+
 * | [10, 20, 30] |
 * | [40, 50]     |
 * +--------------+
 */
export function element<T = any>(): ColumnExpr<T> {
    return new ColumnExpr(ELEMENT_MARKER);
}
