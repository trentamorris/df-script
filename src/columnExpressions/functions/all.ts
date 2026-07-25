import { ColumnExpr } from "../ColumnExpr";
import { ALL_COLUMNS_MARKER } from "../constants";

/**
 * Creates an expression targeting all columns in the DataFrame.
 *
 * @returns {ColumnExpr<any>} A column expression targeting all columns.
 * @identifier $df
 * @example
 * >>> const df = $df.data({ a: [1, 2], b: [3, 4] })
 * >>> df
 * shape: (2, 2)
 * ┌─────┬─────┐
 * │ a   │ b   │
 * ├─────┼─────┤
 * │ 1   │ 3   │
 * │ 2   │ 4   │
 * └─────┴─────┘
 * >>> df.select($df.all())
 * shape: (2, 2)
 * ┌─────┬─────┐
 * │ a   │ b   │
 * ├─────┼─────┤
 * │ 1   │ 3   │
 * │ 2   │ 4   │
 * └─────┴─────┘
 */
export function all(): ColumnExpr<any> {
    return new ColumnExpr(ALL_COLUMNS_MARKER);
}
