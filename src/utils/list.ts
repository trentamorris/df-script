import { isArrayOrTypedArray, isClass, isObj, isPlainObj, isTypedArray } from "./guards";
import { isValidDateObj } from "./date";
import { toValidNumber, isValidNumber } from "./number";
import { toCanonicalString } from "./string";

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

    const list = arr as any;
    let check: (v: unknown) => boolean;

    if (typeof type === "function") {
        const isC = isClass(type);
        check = isC
            ? (v) => v instanceof type
            : (type as (v: unknown) => boolean);
    } else {
        switch (type) {
            case "null":
                check = (v) => v === null;
                break;
            case "undefined":
                check = (v) => v === undefined;
                break;
            case "nullish":
                check = (v) => v == null;
                break;
            case "any":
                check = () => true;
                break;
            case "date":
                check = isValidDateObj;
                break;
            case "object":
                check = isObj;
                break;
            case "plainObject":
                check = isPlainObj;
                break;
            case "number":
                check = isValidNumber;
                break;
            default:
                check = (v) => typeof v === type;
                break;
        }
    }

    if (allowNulls) {
        const baseCheck = check;
        check = (v) => v == null || baseCheck(v);
    }

    if (mode === "every") {
        for (let i = 0; i < len; i++) {
            if (!check(list[i])) return false;
        }
        return true;
    } else {
        for (let i = 0; i < len; i++) {
            if (check(list[i])) return true;
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

/**
 * Options configuration for the `getUniqueListStats` utility.
 */
export interface UniqueListStatsOptions {
    /**
     * If true, uses strict serialization comparison (via keySelector or toCanonicalString)
     * to group complex nested types (like Arrays, Sets, Maps, and Dates) by value instead of reference.
     * @default false
     */
    strict?: boolean;

    /**
     * Custom function to extract a unique comparison key from each element.
     * If strict is true and no selector is provided, falls back to `toCanonicalString`.
     */
    keySelector?: (val: any) => any;
}

export function getUniqueListStats(
    arr: ArrayLike<any>,
    {
        strict = false,
        keySelector
    }: UniqueListStatsOptions = {}
): { values: any[]; count: number; frequencies: Map<any, number> } {
    const list = Array.from(arr);
    const frequencies = new Map<any, number>();

    if (strict) {
        const selector = keySelector ?? toCanonicalString;
        const seen = new Map<string, { val: any; count: number }>();
        const len = list.length;
        for (let i = 0; i < len; i++) {
            const val = list[i];
            const key = selector(val);
            const entry = seen.get(key);
            if (entry === undefined) {
                seen.set(key, { val, count: 1 });
            } else {
                entry.count++;
            }
        }

        const values: any[] = [];
        for (const entry of seen.values()) {
            values.push(entry.val);
            frequencies.set(entry.val, entry.count);
        }

        return {
            values,
            count: values.length,
            frequencies
        };
    }

    const len = list.length;
    for (let i = 0; i < len; i++) {
        const val = list[i];
        frequencies.set(val, (frequencies.get(val) ?? 0) + 1);
    }

    return {
        values: Array.from(frequencies.keys()),
        count: frequencies.size,
        frequencies
    };
}

/**
 * Options configuration for the `stepSliceList` utility.
 */
export interface StepSliceListOptions {
    /**
     * The step size to slice the list by. Cannot be zero.
     * Positive values slice forward (left-to-right), negative values slice backward (right-to-left).
     * @default 1
     */
    step?: number;

    /**
     * The index to start slicing from (inclusive).
     * Supports negative values to start relative to the end of the array.
     * @default 0
     */
    offsetStart?: number;

    /**
     * The index to end slicing at (exclusive).
     * Supports negative values to end relative to the end of the array.
     * Defaults to the end of the array (if step > 0) or -1 (if step < 0).
     */
    offsetEnd?: number;

    /**
     * Caps the maximum number of items gathered in the sliced result list.
     * If specified, the slicing process stops once this limit is reached.
     */
    maxItemsGathered?: number;

    /**
     * If true, returns null when the starting offset is out of bounds.
     * If false, throws an error when the starting offset is out of bounds.
     * @default true
     */
    null_on_oob?: boolean;
}

export function stepSliceList<T>(
    arr: ArrayLike<T>,
    {
        step = 1,
        offsetStart = 0,
        offsetEnd,
        maxItemsGathered,
        null_on_oob = true
    }: StepSliceListOptions = {}
): T[] | null {
    if (arr == null) {
        return null;
    }
    if (maxItemsGathered !== undefined && maxItemsGathered <= 0) {
        return [];
    }
    if (step === 0) {
        throw new Error("Step size step cannot be zero");
    }

    const len = arr.length;
    const isOob = len === 0
        ? (offsetStart !== 0)
        : (offsetStart >= len || offsetStart < -len);

    if (isOob) {
        if (!null_on_oob) {
            throw new Error(`Start offset ${offsetStart} is out of bounds for list of length ${len}`);
        }
        return null;
    }

    const start = offsetStart < 0 ? len + offsetStart : offsetStart;
    const end = offsetEnd !== undefined
        ? (offsetEnd < 0 ? len + offsetEnd : offsetEnd)
        : (step > 0 ? len : -1);

    const res: T[] = [];
    if (step > 0) {
        for (let i = start; i < end && i < len; i += step) {
            if (i >= 0) {
                res.push(arr[i]);
                if (maxItemsGathered !== undefined && res.length >= maxItemsGathered) {
                    break;
                }
            }
        }
    } else {
        for (let i = start; i > end && i >= 0; i += step) {
            if (i < len) {
                res.push(arr[i]);
                if (maxItemsGathered !== undefined && res.length >= maxItemsGathered) {
                    break;
                }
            }
        }
    }
    return res;
}

/**
 * Options configuration for the `joinList` utility.
 */
export interface JoinListOptions {
    /**
     * If true, nullish elements (null and undefined) are completely ignored during joining.
     * If false (default), nullish elements are serialized as empty strings or custom `nullValue`.
     * @default false
     */
    ignoreNulls?: boolean;

    /**
     * Custom string representation for nullish values.
     * Only applied if `ignoreNulls` is false.
     * @default ""
     */
    nullValue?: string;

    /**
     * Optional prefix string prepended to the final joined result.
     * @default ""
     */
    prefix?: string;

    /**
     * Optional suffix string appended to the final joined result.
     * @default ""
     */
    suffix?: string;

    /**
     * Maximum number of list elements to join.
     * If specified, elements beyond this limit are omitted and `truncationMarker` is appended.
     */
    limit?: number;

    /**
     * Custom placeholder string appended to the joined string when limit truncation occurs.
     * Only applied if `limit` is specified and the list length exceeds it.
     * @default "..."
     */
    truncationMarker?: string;

    /**
     * Callback function used to format each individual non-null element to a custom string representation.
     */
    valueFormatter?: (val: any, index: number) => string;
}

/**
 * Joins the elements of an array-like structure into a string using a separator.
 * Excludes nullish checks and formats nested arrays cleanly.
 */
export function joinList(
    arr: ArrayLike<any>,
    separator: string = ",",
    {
        ignoreNulls = false,
        nullValue = "",
        prefix = "",
        suffix = "",
        limit,
        truncationMarker = "...",
        valueFormatter
    }: JoinListOptions = {}
): string {
    const len = arr.length;
    const strList: string[] = [];
    const maxLimit = limit !== undefined ? Math.max(0, limit) : len;
    
    let truncated = false;
    for (let i = 0; i < len; i++) {
        if (strList.length >= maxLimit) {
            truncated = true;
            break;
        }
        const x = arr[i];
        if (x != null) {
            strList.push(valueFormatter ? valueFormatter(x, i) : String(x));
        } else if (!ignoreNulls) {
            strList.push(nullValue);
        }
    }

    return prefix + strList.join(separator) + (truncated ? truncationMarker : "") + suffix;
}
