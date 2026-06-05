import { isArrayOrTypedArray, isClass, isObj, isPlainObj, isTypedArray } from "./guards";
import { isValidDateObj } from "./date";
import { toValidNumber, isValidNumber } from "./number";
import { toCanonicalString } from "./string";
import type { UniqueListStatsOptions } from "../types";

export type ArrayItemType =
    | "string"
    | "number"
    | "boolean"
    | "bigint"
    | "object"
    | "plainObject"
    | "date"
    | "any"
    | "null"
    | "undefined"
    | "nullish"
    | (new (...args: any[]) => any)
    | ((v: unknown) => boolean);
export type ArrayCheckMode = "every" | "some";
export type IsArrayOfTypeOptionsParams = {
    mode?: ArrayCheckMode;
    allowNulls?: boolean;
    allowEmpty?: boolean;
};

export function toValidArray<T>(val: T | T[] | null | undefined): T[] {
    if (val == null) return [];
    if (Array.isArray(val)) return [...val];
    if (isTypedArray(val)) return Array.from(val as any);
    return [val];
}

export function toValidStringArray(val: unknown): string[] {
    const arr = toValidArray(val);
    const len = arr.length;
    const res = new Array(len);
    for (let i = 0; i < len; i++) {
        res[i] = String(arr[i]);
    }
    return res;
}

export function isArrayOfType(
    arr: unknown,
    type: ArrayItemType,
    {
        mode = "every",
        allowNulls = false,
        allowEmpty = true
    }: IsArrayOfTypeOptionsParams = {}
): boolean {
    if (!isArrayOrTypedArray(arr)) return false;
    const len = (arr as any).length;
    if (len === 0) {
        if (!allowEmpty) return false;
        return mode === "every";
    }

    const check = (v: unknown) => {
        if (type === "null") return v === null;
        if (type === "undefined") return v === undefined;
        if (type === "nullish") return v == null;
        if (v == null) return allowNulls;
        if (type === "any") return true;
        if (typeof type === "function") {
            return isClass(type) ? v instanceof type : (type as (v: unknown) => boolean)(v);
        }
        if (type === "date") return isValidDateObj(v);
        if (type === "object") return isObj(v);
        if (type === "plainObject") return isPlainObj(v);
        if (type === "number") return isValidNumber(v);
        return typeof v === type;
    };

    if (mode === "every") {
        for (let i = 0; i < len; i++) {
            if (!check((arr as any)[i])) return false;
        }
        return true;
    } else {
        for (let i = 0; i < len; i++) {
            if (check((arr as any)[i])) return true;
        }
        return false;
    }
}

export function sortList(arr: unknown, descending: boolean = false): any[] {
    if (!isArrayOrTypedArray(arr)) return [];
    const list = Array.from(arr as any);
    list.sort((a, b) => {
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;
        if (a < b) return descending ? 1 : -1;
        if (a > b) return descending ? -1 : 1;
        return 0;
    });
    return list;
}

const DEFAULT_STATS = { sum: null, count: 0, min: null, max: null, mean: null, variance: 0, std: 0, nullCount: 0, len: 0, hasNulls: false, isNumeric: false };

export function getListStats(arr: unknown): {
    sum: number | null;
    count: number;
    min: any;
    max: any;
    mean: number | null;
    variance: number;
    std: number;
    nullCount: number;
    len: number;
    hasNulls: boolean;
    isNumeric: boolean;
} {
    if (!isArrayOrTypedArray(arr)) {
        return { ...DEFAULT_STATS };
    }
    const len = (arr as any).length;
    if (len === 0) {
        return { ...DEFAULT_STATS };
    }

    let minVal: any = null;
    let maxVal: any = null;
    let count = 0;
    let nullCount = 0;
    let total = 0;
    let mean = 0;
    let M2 = 0;

    for (let i = 0; i < len; i++) {
        const val = (arr as any)[i];
        if (val == null) {
            nullCount++;
            continue;
        }

        if (minVal == null || val < minVal) minVal = val;
        if (maxVal == null || val > maxVal) maxVal = val;

        const n = toValidNumber(val);
        if (n !== null) {
            total += n;
            count++;
            const delta = n - mean;
            mean += delta / count;
            const delta2 = n - mean;
            M2 += delta * delta2;
        }
    }

    const variance = count > 1 ? M2 / (count - 1) : 0;

    return {
        sum: count > 0 ? total : null,
        count,
        min: minVal,
        max: maxVal,
        mean: count > 0 ? total / count : null,
        variance,
        std: Math.sqrt(variance),
        nullCount,
        len,
        hasNulls: nullCount > 0,
        isNumeric: count > 0 && count === (len - nullCount)
    };
}

export function getUniqueListStats(
    arr: ArrayLike<any>,
    options: UniqueListStatsOptions = {}
): { values: any[]; count: number } {
    const list = Array.from(arr);
    if (options.strict) {
        const selector = options.keySelector ?? toCanonicalString;
        const seen = new Set();
        const result: any[] = [];
        const len = list.length;
        for (let i = 0; i < len; i++) {
            const val = list[i];
            const key = selector(val);
            if (!seen.has(key)) {
                seen.add(key);
                result.push(val);
            }
        }
        return {
            values: result,
            count: result.length
        };
    }

    const set = new Set(list);
    return {
        values: Array.from(set),
        count: set.size
    };
}

export function stepSliceList<T>(arr: ArrayLike<T>, n: number, offset: number = 0): T[] {
    if (n === 0) {
        throw new Error("Step size n cannot be zero");
    }
    const len = arr.length;
    const start = offset < 0 ? len + offset : offset;

    const res: T[] = [];
    if (n > 0) {
        for (let i = start; i < len && i >= 0; i += n) {
            res.push(arr[i]);
        }
    } else {
        for (let i = start; i >= 0 && i < len; i += n) {
            res.push(arr[i]);
        }
    }
    return res;
}




