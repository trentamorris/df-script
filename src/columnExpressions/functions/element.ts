import { ColumnExpr } from "../ColumnExpr";
import { ELEMENT_MARKER } from "../constants";

/**
 * Creates an expression referencing the current element(s) of a list during evaluation.
 */
export function element<T = any>(): ColumnExpr<T> {
    return new ColumnExpr(ELEMENT_MARKER);
}
