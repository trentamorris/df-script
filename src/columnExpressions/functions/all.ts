import { ColumnExpr } from "../ColumnExpr";

/**
 * Creates an expression targeting all columns in the DataFrame.
 */
export function all(): ColumnExpr<any> {
    return new ColumnExpr("*");
}
