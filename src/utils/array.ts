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

export interface SortArrayOptions {
    descending?: boolean;
    nullsLast?: boolean;
}

export function sortArray(
    arr: unknown,
    { descending = false, nullsLast = true }: SortArrayOptions = {}
): any[] {
    if (!isArrayOrTypedArray(arr)) return [];

    const list = arr as any;
    const len = list.length;
    if (len === 0) return [];

    if (isTypedArray(arr)) {
        const copy = list.slice().sort();
        if (descending) copy.reverse();
        return Array.from(copy);
    }
    const valid: any[] = [];
    const nulls: any[] = [];

    let isAllNumbers = true;
    let isAllStrings = true;
    let checkTypes = true;

    for (let i = 0; i < len; i++) {
        const item = list[i];
        if (item == null) {
            nulls.push(item);
        } else {
            valid.push(item);
            if (checkTypes) {
                const t = typeof item;
                if (t !== "number") isAllNumbers = false;
                if (t !== "string") isAllStrings = false;
                if (!isAllNumbers && !isAllStrings) {
                    checkTypes = false;
                }
            }
        }
    }

    const validLen = valid.length;

    if (validLen > 1) {
        if (isAllNumbers) {
            valid.sort(descending ? (a, b) => b - a : (a, b) => a - b);
        } else if (isAllStrings) {
            valid.sort(descending ? (a, b) => b.localeCompare(a) : (a, b) => a.localeCompare(b));
        } else {
            valid.sort(descending ? (a, b) => (a < b ? 1 : a > b ? -1 : 0) : (a, b) => (a < b ? -1 : a > b ? 1 : 0));
        }
    }

    if (nulls.length === 0) {
        return valid;
    }

    return nullsLast ? valid.concat(nulls) : nulls.concat(valid);
}

const DEFAULT_STATS = { sum: null, count: 0, min: null, max: null, mean: null, variance: 0, std: 0, nullCount: 0, len: 0, hasNulls: false, isNumeric: false };

export function getArrayStats(arr: unknown): {
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
    let sumCompensation = 0;
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
            // Neumaier sum
            const t = total + n;
            if (Math.abs(total) >= Math.abs(n)) {
                sumCompensation += (total - t) + n;
            } else {
                sumCompensation += (n - t) + total;
            }
            total = t;

            count++;
            const delta = n - mean;
            mean += delta / count;
            const delta2 = n - mean;
            M2 += delta * delta2;
        }
    }

    const variance = count > 1 ? M2 / (count - 1) : 0;

    return {
        sum: count > 0 ? total + sumCompensation : null,
        count,
        min: minVal,
        max: maxVal,
        mean: count > 0 ? (total + sumCompensation) / count : null,
        variance,
        std: Math.sqrt(variance),
        nullCount,
        len,
        hasNulls: nullCount > 0,
        isNumeric: count > 0 && count === (len - nullCount)
    };
}

/**
 * Options configuration for the `getUniqueArrayStats` utility.
 */
export interface UniqueArrayStatsOptions {
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

export function getUniqueArrayStats(
    arr: ArrayLike<any>,
    {
        strict = false,
        keySelector
    }: UniqueArrayStatsOptions = {}
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
        }
        for (let i = 0; i < len; i++) {
            const val = list[i];
            const key = selector(val);
            const entry = seen.get(key)!;
            frequencies.set(val, entry.count);
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
 * Options configuration for the `stepSliceArray` utility.
 */
export interface StepSliceArrayOptions {
    /**
     * The step size to slice the array by. Cannot be zero.
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
     * Caps the maximum number of items gathered in the sliced result array.
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

export function stepSliceArray<T>(
    arr: ArrayLike<T>,
    {
        step = 1,
        offsetStart = 0,
        offsetEnd,
        maxItemsGathered,
        null_on_oob = true
    }: StepSliceArrayOptions = {}
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
            throw new Error(`Start offset ${offsetStart} is out of bounds for array of length ${len}`);
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
 * Options configuration for the `joinArray` utility.
 */
export interface JoinArrayOptions {
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
     * Maximum number of array elements to join.
     * If specified, elements beyond this limit are omitted and `truncationMarker` is appended.
     */
    limit?: number;

    /**
     * Custom placeholder string appended to the joined string when limit truncation occurs.
     * Only applied if `limit` is specified and the array length exceeds it.
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
export function joinArray(
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
    }: JoinArrayOptions = {}
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

export interface FillSeqBaseOptions {
    /**
     * Type coercion helper applied to each generated value before writing.
     * 
     * @param v The newly generated candidate value.
     * @returns The coerced value to write to the array.
     */
    coerce?: (v: any) => any;

    /**
     * Conditional predicate determining if a value should be replaced at a given index.
     * 
     * @param v The original/current value at the target index.
     * @param index The absolute index of the current element.
     * @param array The entire target array.
     * @returns True if the candidate value should overwrite the original value, false otherwise.
     */
    condition?: (v: any, index: number, array: any[]) => boolean;

    /**
     * If true, iterates and populates in reverse (from startIndex down to endIndex).
     * @default false
     */
    reverse?: boolean;

    /**
     * The index at which array iteration and writing begins.
     * @default reverse ? length - 1 : 0
     */
    startIndex?: number;

    /**
     * The exclusive boundary index at which iteration and writing stops.
     * @default reverse ? -1 : length
     */
    endIndex?: number;
}

export interface CumulativeStepContext {
    /** The accumulated value returned by the step function from the previous stepped index. */
    prev: any;
    /** The relative iteration counter of the stepping process (starts at 1). */
    index: number;
    /** The original value at the current index in the target array. */
    originalValue: any;
    /** The absolute index of the current element in the parent array. */
    absoluteIndex: number;
    /** The entire target array being populated/modified. */
    targetArray: any;
}

export interface IndependentStepContext {
    /** The relative iteration counter of the generation process (starts at 0). */
    index: number;
    /** The static starting value passed to the sequence generator. */
    initialValue: any;
    /** The original value at the current index in the target array. */
    originalValue: any;
    /** The absolute index of the current element in the parent array. */
    absoluteIndex: number;
    /** The entire target array being populated/modified. */
    targetArray: any;
}

export type FillSeqOptions = FillSeqBaseOptions & (
    | {
        mode: "constant";
        step?: never;
    }
    | {
        mode?: "cumulative";
        step?: number | ((context: CumulativeStepContext) => any);
    }
    | {
        mode: "independent";
        step?: number | ((context: IndependentStepContext) => any);
    }
);

export function fillSequence(
    targetArray: any,
    initialValue: any,
    options: FillSeqOptions = {}
): void {
    const len = targetArray.length;
    const {
        mode = "cumulative",
        step = 1,
        coerce = (v: any) => v,
        condition,
        reverse = false,
        startIndex = reverse ? len - 1 : 0,
        endIndex = reverse ? -1 : len
    } = options as any;

    const increment = reverse ? -1 : 1;
    const start = startIndex;
    const end = endIndex;

    const writeVal = (idx: number, val: any) => {
        if (!condition || condition(targetArray[idx], idx, targetArray)) {
            targetArray[idx] = coerce(val);
        }
    };

    if (mode === "constant") {
        const finalVal = coerce(initialValue);
        for (let i = start; reverse ? i > end : i < end; i += increment) {
            writeVal(i, finalVal);
        }
    } else if (mode === "independent") {
        if (typeof step === "function") {
            let relativeIdx = 0;
            for (let i = start; reverse ? i > end : i < end; i += increment) {
                writeVal(
                    i,
                    step({
                        index: relativeIdx,
                        initialValue,
                        originalValue: targetArray[i],
                        absoluteIndex: i,
                        targetArray
                    })
                );
                relativeIdx++;
            }
        } else {
            for (let i = start; reverse ? i > end : i < end; i += increment) {
                writeVal(i, initialValue + i * step);
            }
        }
    } else {
        // cumulative mode
        let current = initialValue;
        let isFirst = true;
        let relativeIdx = 0;
        for (let i = start; reverse ? i > end : i < end; i += increment) {
            if (isFirst) {
                writeVal(i, current);
                isFirst = false;
            } else {
                if (typeof step === "function") {
                    current = step({
                        prev: current,
                        index: relativeIdx,
                        originalValue: targetArray[i],
                        absoluteIndex: i,
                        targetArray
                    });
                } else {
                    current = current + step;
                }
                writeVal(i, current);
            }
            relativeIdx++;
        }
    }
}

function getSortedValidNumbers(values: ArrayLike<any>): Float64Array | null {
    const len = values.length;
    let validCount = 0;
    const nums = new Float64Array(len);
    for (let i = 0; i < len; i++) {
        const val = values[i];
        // Only include actual numbers that aren't NaN (but preserve Infinity for bounds)
        if (typeof val === "number" && !Number.isNaN(val)) {
            nums[validCount++] = val;
        }
    }
    if (validCount === 0) return null;
    const validNums = nums.subarray(0, validCount);
    validNums.sort();
    return validNums;
}

/**
 * Computes the median of a numeric array, filtering out non-numeric and NaN values.
 * Returns null if no valid numbers remain.
 */
export function computeMedian(values: ArrayLike<any>): number | null {
    const validNums = getSortedValidNumbers(values);
    if (!validNums) return null;
    const len = validNums.length;
    const mid = Math.floor(len / 2);
    return len % 2 !== 0 ? validNums[mid] : (validNums[mid - 1] + validNums[mid]) / 2;
}

/**
 * Computes the quantile of a numeric array using linear interpolation, filtering out non-numeric and NaN values.
 * q must be in [0, 1]. Returns null if no valid numbers remain or q is out of bounds.
 */
export function computeQuantile(values: ArrayLike<any>, q: number): number | null {
    if (q < 0 || q > 1) return null;
    const validNums = getSortedValidNumbers(values);
    if (!validNums) return null;
    const len = validNums.length;
    const idx = q * (len - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    if (low === high) return validNums[low];
    return validNums[low] + (idx - low) * (validNums[high] - validNums[low]);
}

/**
 * Computes the mode(s) of an array, filtering out null/undefined values.
 * Returns an array of the most frequent values, sorted, or null if empty/no mode.
 */
export function computeMode(values: ArrayLike<any>): any[] | null {
    if (!isArrayOrTypedArray(values) || values.length === 0) return null;

    const counts = new Map<any, number>();
    const len = values.length;
    let max = 0;
    let modes: any[] = [];

    for (let i = 0; i < len; i++) {
        const val = values[i];
        if (val == null) continue;
        const c = (counts.get(val) ?? 0) + 1;
        counts.set(val, c);

        if (c > max) {
            max = c;
            modes = [val];
        } else if (c === max) {
            modes.push(val);
        }
    }

    if (modes.length === 0) return null;
    return sortArray(modes);
}
