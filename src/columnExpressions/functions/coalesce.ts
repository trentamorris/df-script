import { ColumnExpr } from "../ColumnExpr";
import { lit } from "./lit";
import type { IExpr, Scalar } from "../../types";


export function coalesce(...exprs: (IExpr | Scalar | (IExpr | Scalar)[])[]): ColumnExpr<any> {
    const rawArgs = (exprs.length === 1 && Array.isArray(exprs[0]))
        ? (exprs[0] as (IExpr | Scalar)[])
        : (exprs as (IExpr | Scalar)[]);

    const expr = new ColumnExpr("*coalesce*");
    expr.ops.push((_, columns) => {
        const height = _.length;
        const resolvedExprs = rawArgs.map((arg) => {
            if (typeof arg === "string") {
                return new ColumnExpr(arg);
            }
            if (arg && typeof arg === "object" && "evaluate" in arg) {
                return arg;
            }
            return lit(arg);
        });

        const evaluatedArrays = resolvedExprs.map((e) => e.evaluate(columns, height));
        const result = new Array(height);
        const exprCount = evaluatedArrays.length;

        for (let i = 0; i < height; i++) {
            let foundVal = null;
            for (let j = 0; j < exprCount; j++) {
                const val = evaluatedArrays[j][i];
                if (val != null) {
                    foundVal = val;
                    break;
                }
            }
            result[i] = foundVal;
        }
        return result;
    });

    return expr;
}
