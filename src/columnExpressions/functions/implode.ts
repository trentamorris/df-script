import { ColumnExpr } from "../ColumnExpr";
import type { IntoExpr } from "../../types";

/**
 * Aggregates values of a column into a list within each group.
 */
export function implode(column: IntoExpr | IntoExpr[]): ColumnExpr<any> {
    return ColumnExpr.toColExpr(column).implode();
}
