import { ColumnExpr } from "../ColumnExpr";
import { ALL_COLUMNS_MARKER } from "../constants";

/**
 * Creates an expression targeting all columns except the specified ones.
 *
 * @param {string | string[]} columns The name or names of columns to exclude.
 * @returns {ColumnExpr<any>} A column expression targeting all columns except the specified ones.
 * @identifier $df
 * @example
 * >>> const df = $df.data({ id: [101, 102], val: [10, 20] })
 * >>> df
 * shape: (2, 2)
 * ┌─────┬─────┐
 * │ id  │ val │
 * ├─────┼─────┤
 * │ 101 │ 10  │
 * │ 102 │ 20  │
 * └─────┴─────┘
 * >>> df.select($df.exclude("id"))
 * shape: (2, 1)
 * ┌─────┐
 * │ val │
 * ├─────┤
 * │ 10  │
 * │ 20  │
 * └─────┘
 */
export function exclude(columns: string | string[]): ColumnExpr<any> {
    const expr = new ColumnExpr(ALL_COLUMNS_MARKER);
    expr._excludedCols = Array.isArray(columns) ? columns : [columns];
    return expr;
}
