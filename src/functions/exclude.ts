import { ColumnExpr } from "../columnExpressions/columnExpr";
import { ALL_COLUMNS_MARKER } from "../columnExpressions/constants";
import { toValidArray } from "../utils/array";
import type { ColumnKeyArg } from "../types";

/**
 * Creates an expression targeting all columns except the specified ones.
 *
 * @param {ColumnKeyArg} columns The name or names of columns to exclude.
 * @returns {ColumnExpr<any>} A column expression targeting all columns except the specified ones.
 * @namespace $df
 * @category Function
 * @syntax $df.{symbol}(...)
 * @example
 * // 1. Exclude a single column by name:
 * <!-- doc:base_2x2 -->
 * >>> df.select($df.exclude("a"))
 * shape: (2, 1)
 * +---+
 * | b |
 * +---+
 * | x |
 * | y |
 * +---+
 *
 * @example
 * // 2. Exclude a single column from a multi-column dataset:
 * <!-- doc:base_numbers_3x2 -->
 * >>> df.select($df.exclude("a"))
 * shape: (3, 1)
 * +----+
 * | b  |
 * +----+
 * | 10 |
 * | 20 |
 * | 30 |
 * +----+
 */
export function exclude(columns: ColumnKeyArg): ColumnExpr<any> {
    const expr = new ColumnExpr(ALL_COLUMNS_MARKER);
    expr._excludedCols = toValidArray(columns, { clone: false });
    return expr;
}
