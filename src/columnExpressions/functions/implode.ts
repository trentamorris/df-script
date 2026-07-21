import { ColumnExpr } from "../ColumnExpr";
import type { IntoExpr } from "../../types";

/**
 * Aggregates values of a column into a list within each group.
 * @since v1.5.0
 */
export function implode(column: IntoExpr | IntoExpr[]): ColumnExpr<any> {
    return ColumnExpr.toColExpr(column).implode();
}
