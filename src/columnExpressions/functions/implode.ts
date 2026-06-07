import { ColumnExpr } from "../ColumnExpr";
import type { IntoExpr } from "../../types";

export function implode(column: IntoExpr | IntoExpr[]): ColumnExpr<any> {
    return ColumnExpr.toColExpr(column).implode();
}
