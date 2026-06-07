import { ColumnExpr } from "../ColumnExpr";
import type { IExpr, Scalar } from "../../types";
import { isArrayOrTypedArray } from "../../utils";
import { COALESCE_MARKER } from "../constants";


export function coalesce(...exprs: (IExpr | Scalar | (IExpr | Scalar)[])[]): ColumnExpr<any> {
    const rawArgs = (exprs.length === 1 && Array.isArray(exprs[0]))
        ? (exprs[0] as (IExpr | Scalar)[])
        : (exprs as (IExpr | Scalar)[]);

    const expr = new ColumnExpr(COALESCE_MARKER);
    expr.ops.push((_, columns) => {
        const height = _.length;
        const evaluateArg = (arg: any): any => {
            if (ColumnExpr.isColExpr(arg)) {
                return arg.evaluate(columns, height);
            }
            if (typeof arg === "string") {
                return columns[arg] || new Array(height).fill(null);
            }
            return arg;
        };

        const exprCount = rawArgs.length;
        const evaluatedArrays = new Array(exprCount);
        for (let j = 0; j < exprCount; j++) {
            evaluatedArrays[j] = evaluateArg(rawArgs[j]);
        }
        const result = new Array(height);

        for (let i = 0; i < height; i++) {
            let foundVal = null;
            for (let j = 0; j < exprCount; j++) {
                const arr = evaluatedArrays[j];
                const val = isArrayOrTypedArray(arr) ? arr[i] : arr;
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
