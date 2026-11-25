import type { RowRecord } from "../types";
import { ColumnExpr } from "../columnExpressions/columnExpr";
import { ALL_COLUMNS_MARKER } from "../columnExpressions/constants";

/**
 * Creates an expression targeting all columns in the DataFrame.
 *
 * @returns {ColumnExpr<T>} A column expression targeting all columns.
 * @namespace $df
 * @syntax $df.{symbol}(...)
 * @example
 * // 1. Select all columns:
 * <!-- doc:base_2x2 -->
 * df.select($df.all());
 * // shape: (2, 2)
 * // +---+---+
 * // | a | b |
 * // +---+---+
 * // | 1 | x |
 * // | 2 | y |
 * // +---+---+
 *
 * @example
 * // 2. Apply vectorized transformations across all columns simultaneously:
 * <!-- doc:base_numbers_3x2 -->
 * df.select($df.all().mul(10));
 * // shape: (3, 2)
 * // +----+-----+
 * // | a  | b   |
 * // +----+-----+
 * // | 10 | 100 |
 * // | 20 | 200 |
 * // | 30 | 300 |
 * // +----+-----+
 */
export function all<T extends RowRecord = RowRecord>(): ColumnExpr<T> {
    return new ColumnExpr(ALL_COLUMNS_MARKER);
}
