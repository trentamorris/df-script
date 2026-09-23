import { ColumnExpr } from "../columnExpressions/ColumnExpr";
import { ALL_COLUMNS_MARKER } from "../columnExpressions/constants";
import { toValidArray } from "../utils/array";

/**
 * Creates an expression targeting all columns except the specified ones.
 *
 * @param {string | string[]} columns The name or names of columns to exclude.
 * @returns {ColumnExpr<any>} A column expression targeting all columns except the specified ones.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_2x2 -->
 * >>> df.select($df.exclude("a"))
 * shape: (2, 1)
 * ┌───┐
 * │ b │
 * ├───┤
 * │ x │
 * │ y │
 * └───┘
 */
export function exclude(columns: string | string[]): ColumnExpr<any> {
    const expr = new ColumnExpr(ALL_COLUMNS_MARKER);
    expr._excludedCols = toValidArray(columns, { clone: false });
    return expr;
}
