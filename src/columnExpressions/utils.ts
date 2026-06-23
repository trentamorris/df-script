import type { IExpr, ColumnData, ColumnDict } from "../types";
import { isArrayOrTypedArray } from "../utils";
import { resolveWindowExpr } from "../dataframe/utils";

export const kleeneUnary = (fn: (v: any) => any) => {
    return (vArray: ColumnData) => {
        const height = vArray.length;
        const result = new Array(height);
        for (let i = 0; i < height; i++) {
            const v = vArray[i];
            result[i] = v == null ? null : fn(v);
        }
        return result;
    };
};

export const kleeneBinary = (expr: IExpr, other: any, fn: (v: any, r: any) => any) => {
    return (vArray: ColumnData, columns: ColumnDict) => {
        const height = vArray.length;
        const rResolved = expr._resolve(other, columns, height);
        const result = new Array(height);
        if (isArrayOrTypedArray(rResolved)) {
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                const r = (rResolved as any)[i];
                result[i] = (v == null || r == null) ? null : fn(v, r);
            }
        } else {
            for (let i = 0; i < height; i++) {
                const v = vArray[i];
                result[i] = (v == null || rResolved == null) ? null : fn(v, rResolved);
            }
        }
        return result;
    };
};

export function evaluateExpression(expr: IExpr, columns: ColumnDict, height: number): ColumnData {
    return expr._isWindow
        ? resolveWindowExpr(expr, columns, height)
        : expr.evaluate(columns, height);
}
