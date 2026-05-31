import { isArrayOrTypedArray, isClass, isObj, isPlainObj, isTypedArray } from "./guards";
import { isValidDateObj } from "./date";
import { toValidNumber, isValidNumber } from "./number";

export type ArrayItemType =
    | "string"
    | "number"
    | "boolean"
    | "bigint"
    | "object"
    | "plainObject"
    | "date"
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
    if (Array.isArray(val)) return val;
    if (isTypedArray(val)) return Array.from(val as any);
    return [val];
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
        if (v == null) return allowNulls;
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

export function getListStats(arr: unknown): {
    sum: number | null;
    count: number;
    min: any;
    max: any;
} {
    if (!isArrayOrTypedArray(arr)) {
        return { sum: null, count: 0, min: null, max: null };
    }
    const len = (arr as any).length;
    if (len === 0) {
        return { sum: null, count: 0, min: null, max: null };
    }

    let total = 0;
    let count = 0;
    let minVal: any = null;
    let maxVal: any = null;

    for (let i = 0; i < len; i++) {
        const val = (arr as any)[i];
        if (val == null) continue;

        if (minVal == null || val < minVal) minVal = val;
        if (maxVal == null || val > maxVal) maxVal = val;

        const n = toValidNumber(val);
        if (n !== null) {
            total += n;
            count++;
        }
    }

    return {
        sum: count > 0 ? total : null,
        count,
        min: minVal,
        max: maxVal
    };
}

export function getListMedian(arr: unknown): number | null {
    if (!isArrayOfType(arr, "number", { allowNulls: true })) return null;

    const len = (arr as any).length;
    const nums: number[] = [];
    for (let i = 0; i < len; i++) {
        const val = (arr as any)[i];
        if (val != null) {
            nums.push(val);
        }
    }

    if (nums.length === 0) return null;

    nums.sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 !== 0
        ? nums[mid]
        : (nums[mid - 1] + nums[mid]) / 2;
}

export function getListMode(arr: unknown): any[] | null {
    if (!isArrayOrTypedArray(arr)) return null;
    const len = (arr as any).length;

    const counts = new Map<any, number>();
    let maxCount = 0;

    for (let i = 0; i < len; i++) {
        const val = (arr as any)[i];
        if (val == null) continue;
        const c = (counts.get(val) ?? 0) + 1;
        counts.set(val, c);
        if (c > maxCount) maxCount = c;
    }

    if (maxCount === 0) return [];

    const modes: any[] = [];
    for (const [val, c] of counts.entries()) {
        if (c === maxCount) modes.push(val);
    }

    return sortList(modes);
}
