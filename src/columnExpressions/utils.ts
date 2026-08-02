import type { IExpr, ColumnData, ColumnDict } from "../types";
import { isArrayOrTypedArray } from "../utils";
import { isValidDateObj } from "../utils/object";
import { resolveWindowExpr } from "../dataframe/utils";

/**
 * Normalizes a single unary value (coercing Date instances to getTime if valid)
 * and executes the operation callback.
 */
export function evalUnaryOp(v: any, fn: (a: any) => any): any {
    if (v == null) return null;
    const normV = (typeof v === "object" && isValidDateObj(v)) ? v.getTime() : v;
    return fn(normV);
}

/**
 * Normalizes binary values (coercing Date instances to getTime if valid)
 * and executes the operation callback.
 */
export function evalBinaryOp(v: any, r: any, fn: (a: any, b: any) => any): any {
    if (v == null || r == null) return null;
    const normV = (typeof v === "object" && isValidDateObj(v)) ? v.getTime() : v;
    const normR = (typeof r === "object" && isValidDateObj(r)) ? r.getTime() : r;
    return fn(normV, normR);
}

export const kleeneUnary = (fn: (v: any) => any) => {
    return (vArray: ColumnData) => {
        const height = vArray.length;
        const result = new Array(height);
        for (let i = 0; i < height; i++) {
            result[i] = evalUnaryOp(vArray[i], fn);
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
                result[i] = evalBinaryOp(vArray[i], rResolved[i], fn);
            }
        } else {
            for (let i = 0; i < height; i++) {
                result[i] = evalBinaryOp(vArray[i], rResolved, fn);
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
