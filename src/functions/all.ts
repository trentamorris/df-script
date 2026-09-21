import { ColumnExpr } from "../columnExpressions/ColumnExpr";
import { ALL_COLUMNS_MARKER } from "../columnExpressions/constants";

/**
 * Creates an expression targeting all columns in the DataFrame.
 *
 * @returns {ColumnExpr<any>} A column expression targeting all columns.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_2x2 -->
 * >>> df.select($df.all())
 * shape: (2, 2)
 * ┌───┬───┐
 * │ a │ b │
 * ├───┼───┤
 * │ 1 │ x │
 * │ 2 │ y │
 * └───┴───┘
 */
export function all(): ColumnExpr<any> {
    return new ColumnExpr(ALL_COLUMNS_MARKER);
}
