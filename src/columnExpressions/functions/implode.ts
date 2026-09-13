import { ColumnExpr } from "../ColumnExpr";
import { toColExpr } from "../ExprBase";
import type { IntoExpr } from "../../types";

/**
 * Aggregates values of a column into a list within each group.
 *
 * @param {IntoExpr | IntoExpr[]} column The column or expression to implode.
 * @returns {ColumnExpr<any>} A column expression representing the list of values.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_grouped_3x2 -->
 * >>> df.groupBy("group").agg($df.implode("val").alias("imploded"))
 * shape: (2, 2)
 * ┌───────┬──────────┐
 * │ group │ imploded │
 * ├───────┼──────────┤
 * │ A     │ [10, 20] │
 * │ B     │ [30]     │
 * └───────┴──────────┘
 */
export function implode(column: IntoExpr | IntoExpr[]): ColumnExpr<any> {
    return (toColExpr(column, ColumnExpr) as ColumnExpr<any>).implode();
}
