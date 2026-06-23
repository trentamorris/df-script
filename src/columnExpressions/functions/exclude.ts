import { ColumnExpr } from "../ColumnExpr";
import { ALL_COLUMNS_MARKER } from "../constants";

/**
 * Creates an expression targeting all columns except the specified ones.
 */
export function exclude(columns: string | string[]): ColumnExpr<any> {
    const expr = new ColumnExpr(ALL_COLUMNS_MARKER);
    expr._excludedCols = Array.isArray(columns) ? columns : [columns];
    return expr;
}
