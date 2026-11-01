import { ColumnExpr } from "../columnExpressions/columnExpr";
import type { ColumnSelector } from "../types";

/**
 * Creates a column expression referencing one or more columns by name, regular expression, or data type.
 *
 * @template T The row record or value type of the column expression.
 * @param {ColumnSelector<T>} name Column name, array of names, RegExp pattern, or DataType selector.
 * @returns {ColumnExpr<T>} A column expression targeting the selected column(s).
 * @namespace $df
 * @category Function
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_2x2 -->
 * >>> df.select($df.col("a"))
 * shape: (2, 1)
 * +---+
 * | a |
 * +---+
 * | 1 |
 * | 2 |
 * +---+
 */
export function col<T = any>(name: ColumnSelector<T>): ColumnExpr<T> {
    return new ColumnExpr<T>(name);
}

