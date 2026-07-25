import { ColumnExpr } from "../ColumnExpr";
import type { IntoExpr } from "../../types";

/**
 * Aggregates values of a column into a list within each group.
 *
 * @param {IntoExpr | IntoExpr[]} column The column or expression to implode.
 * @returns {ColumnExpr<any>} A column expression representing the list of values.
 * @example
 * >>> const df = $df.data({ group: ["A", "A", "B"], val: [1, 2, 3] })
 * >>> df
 * shape: (3, 2)
 * ┌───────┬─────┐
 * │ group │ val │
 * ├───────┼─────┤
 * │ A     │ 1   │
 * │ A     │ 2   │
 * │ B     │ 3   │
 * └───────┴─────┘
 * >>> df.group_by("group").agg($df.implode("val").alias("imploded"))
 * shape: (2, 2)
 * ┌───────┬──────────┐
 * │ group │ imploded │
 * ├───────┼──────────┤
 * │ A     │ [1, 2]   │
 * │ B     │ [3]      │
 * └───────┴──────────┘
 */
export function implode(column: IntoExpr | IntoExpr[]): ColumnExpr<any> {
    return ColumnExpr.toColExpr(column).implode();
}
