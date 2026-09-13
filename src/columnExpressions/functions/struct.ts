import { ColumnExpr } from "../ColumnExpr";
import { isColExpr } from "../ExprBase";
import { lit } from "./lit";
import type { IntoExpr } from "../../types";
import { STRUCT_MARKER } from "../constants";

/**
 * Packages multiple expressions into a structured object column.
 *
 * @param {IntoExpr[] | Record<string, IntoExpr> | IntoExpr} fields An array of expressions, a record of field names to expressions, or a single expression.
 * @param {...IntoExpr[]} moreFields Additional fields when a single expression is passed as the first parameter.
 * @returns {ColumnExpr<any>} A column expression packaging the specified fields.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_2x2 -->
 * >>> df.select($df.struct({ x: "a", y: "b" }).alias("coord"))
 * shape: (2, 1)
 * ┌──────────────────┐
 * │ coord            │
 * ├──────────────────┤
 * │ { x: 1, y: "x" } │
 * │ { x: 2, y: "y" } │
 * └──────────────────┘
 */
export function struct(
    fields: IntoExpr[] | Record<string, IntoExpr> | IntoExpr,
    ...moreFields: IntoExpr[]
): ColumnExpr<any> {
    let resolvedFields: IntoExpr[] | Record<string, IntoExpr>;

    if (Array.isArray(fields)) {
        resolvedFields = fields;
    } else if (fields && typeof fields === "object" && !isColExpr(fields)) {
        resolvedFields = fields as Record<string, IntoExpr>;
    } else {
        resolvedFields = [fields as IntoExpr, ...moreFields];
    }

    const expr = lit({}).struct.withFields(resolvedFields) as ColumnExpr<any>;
    delete expr._isLiteral;
    delete expr._literalValue;
    (expr as any)._colName = STRUCT_MARKER;
    
    return expr.alias("struct") as ColumnExpr<any>;
}
