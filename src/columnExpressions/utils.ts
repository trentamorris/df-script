import type { IExpr, ColumnData, ColumnDict } from "../types";
import type { ProxyPropertyResolver } from "./types";
import { isExpr } from "./ExprBase";
import { isArrayOrTypedArray, sortArray, toCanonicalString } from "../utils";
import { isValidDateObj } from "../utils/object";
import { resolveWindowExpr } from "../dataframe/utils";

/**
 * Creates a delegating proxy that intercepts property accesses and delegates them
 * via a custom property resolver when not directly handled.
 */
export function createDelegatingProxy<T extends object>(
    target: T,
    resolve: ProxyPropertyResolver<T>
): T {
    return new Proxy(target, {
        get(t, prop, receiver) {
            if (prop === "constructor") return (t as any).constructor;
            if (typeof prop === "string") {
                const delegated = resolve(prop, t);
                if (delegated !== undefined) return delegated;
            }
            return Reflect.get(t, prop, receiver);
        }
    });
}

/**
 * Normalizes a single unary value (coercing Date instances to getTime if valid)
 * and executes the operation callback.
 */
export function evalUnaryOp(v: any, fn: (a: any) => any): any {
    if (v == null) return null;
    const normV = isValidDateObj(v) ? v.getTime() : v;
    return fn(normV);
}

/**
 * Normalizes binary values (coercing Date instances to getTime if valid)
 * and executes the operation callback.
 */
export function evalBinaryOp(v: any, r: any, fn: (a: any, b: any) => any): any {
    if (v == null || r == null) return null;
    const normV = isValidDateObj(v) ? v.getTime() : v;
    const normR = isValidDateObj(r) ? r.getTime() : r;
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
    const op = (vArray: ColumnData, columns: ColumnDict) => {
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
    (op as any)._binaryMeta = { _left: expr, _right: other };
    return op;
};

export function evaluateExpression(expr: IExpr, columns: ColumnDict, height: number): ColumnData {
    return expr._isWindow
        ? resolveWindowExpr(expr, columns, height)
        : expr.evaluate(columns, height);
}

/**
 * Evaluates a column expression, column string lookup, or returns a scalar literal value.
 */
export function evaluateArg(
    arg: unknown,
    columns: ColumnDict | null | undefined,
    height: number
): any {
    if (isExpr(arg)) {
        return evaluateExpression(arg, columns || {}, height);
    }
    if (typeof arg === "string" && columns != null && (arg in columns)) {
        return columns[arg];
    }
    return arg;
}

/**
 * Determines whether an evaluated argument is an actual DataFrame column array
 * rather than a scalar or literal array/buffer cell value.
 */
export function isEvaluatedColumn(
    arg: unknown,
    evaluatedVal: unknown,
    columns: ColumnDict | null | undefined,
    height: number
): boolean {
    if (!isArrayOrTypedArray(evaluatedVal) || evaluatedVal.length !== height) {
        return false;
    }
    if (isExpr(arg)) {
        return true;
    }
    if (typeof arg === "string" && columns != null && (arg in columns)) {
        return true;
    }
    return false;
}

/**
 * Evaluates multiple arguments against columns and height, returning the evaluated arrays
 * and whether each argument resolved to a full column array.
 */
export function evaluateArgsMatrix(
    args: unknown[],
    columns: ColumnDict | null | undefined,
    height: number
): { evaluatedArrays: any[]; isCol: boolean[] } {
    const len = args.length;
    const evaluatedArrays = new Array(len);
    const isCol = new Array(len);

    for (let j = 0; j < len; j++) {
        const raw = args[j];
        const evaluated = evaluateArg(raw, columns, height);
        evaluatedArrays[j] = evaluated;
        isCol[j] = isEvaluatedColumn(raw, evaluated, columns, height);
    }

    return { evaluatedArrays, isCol };
}

export function buildCanonicalSet(vals: any): Set<string> {
    const set = new Set<string>();
    const arr = isArrayOrTypedArray(vals) ? vals : [vals];
    for (let j = 0; j < arr.length; j++) set.add(toCanonicalString(arr[j]));
    return set;
}

export function computeIsIn(vArray: ArrayLike<any>, columns: any, values: any): any[] {
    const height = vArray.length;
    const isExpr = values && typeof values === "object" && "evaluate" in values;
    const resolved = isExpr ? values.evaluate(columns, height) : null;
    const staticSet = isExpr ? null : buildCanonicalSet(values);
    const result = new Array(height);

    for (let i = 0; i < height; i++) {
        const v = vArray[i];
        if (v == null) {
            result[i] = null;
            continue;
        }
        const set = staticSet ?? buildCanonicalSet(resolved[i]);
        result[i] = set.has(toCanonicalString(v));
    }
    return result;
}

export function compareMissing(vArray: ArrayLike<any>, rResolved: any): boolean[] {
    const height = vArray.length;
    const isRArray = isArrayOrTypedArray(rResolved);
    const result = new Array(height);
    for (let i = 0; i < height; i++) {
        const v = vArray[i];
        const r = isRArray ? rResolved[i] : rResolved;
        if (v == null || r == null) {
            result[i] = v == null && r == null;
        } else {
            result[i] = v === r;
        }
    }
    return result;
}

export function computeRank(
    arr: any[],
    value: any,
    options: { ignoreNulls?: boolean; dense?: boolean } = {}
): number | null {
    if (value == null) return null;

    const cacheKey = options.dense ? "_denseRankCache" : "_rankCache";
    let valueToRank = (arr as any)[cacheKey];

    if (!valueToRank) {
        let targetArr = arr;
        if (options.ignoreNulls) {
            targetArr = [];
            const len = arr.length;
            for (let i = 0; i < len; i++) {
                if (arr[i] != null) targetArr.push(arr[i]);
            }
        }
        if (options.dense) {
            targetArr = Array.from(new Set(targetArr));
        }

        const sorted = sortArray(targetArr);
        valueToRank = new Map();
        const len = sorted.length;
        for (let i = 0; i < len; i++) {
            const v = sorted[i];
            if (!valueToRank.has(v)) {
                valueToRank.set(v, i + 1);
            }
        }
        (arr as any)[cacheKey] = valueToRank;
    }

    return valueToRank.get(value) ?? null;
}