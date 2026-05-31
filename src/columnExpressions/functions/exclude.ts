import { ColumnExpr } from "../ColumnExpr";

/**
 * Creates an expression targeting all columns except the specified ones.
 */
export function exclude(columns: string | string[]): ColumnExpr<any> {
    const expr = new ColumnExpr("*");
    expr.excludedCols = Array.isArray(columns) ? columns : [columns];
    return expr;
}
