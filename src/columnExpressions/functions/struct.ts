import { ColumnExpr } from "../ColumnExpr";
import { lit } from "./lit";
import type { IntoExpr } from "../../types";
import { STRUCT_MARKER } from "../constants";

export function struct(
    fields: IntoExpr[] | Record<string, IntoExpr> | IntoExpr,
    ...moreFields: IntoExpr[]
): ColumnExpr<any> {
    let resolvedFields: IntoExpr[] | Record<string, IntoExpr>;

    if (Array.isArray(fields)) {
        resolvedFields = fields;
    } else if (fields && typeof fields === "object" && !ColumnExpr.isColExpr(fields)) {
        resolvedFields = fields as Record<string, IntoExpr>;
    } else {
        resolvedFields = [fields, ...moreFields];
    }

    const expr = lit({}).struct.with_fields(resolvedFields) as ColumnExpr<any>;
    delete expr._isLiteral;
    delete expr._literalValue;
    (expr as any)._colName = STRUCT_MARKER;
    
    return expr.alias("struct") as ColumnExpr<any>;
}
