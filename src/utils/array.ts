/** @internalfile */
import { isClass, isObj, isPlainObj, isValidDateObj, isRegExp, typedArrayTagGetter } from "./object";
import { toValidNumber, isValidNumber, isValidInt, toValidInt, toValidBigInt, isValidBigInt, clamp, SAFE_BIGINT_RANGE } from "./number";
import { toValidDate } from "./date";
import { toCanonicalString, toCleanRegExp } from "./string";
import type { AnyTypedArray, ColumnData, SkewOptions, KurtosisOptions, CentralMomentsOptions, CentralMomentsResult, EntropyOptions, SortArrayOptions, ToValidArrayOptions } from "../types";

import { ComputeError, InvalidArgumentError } from "../exceptions";

/** Array Guards **/
export function isTypedArray(v: unknown): v is AnyTypedArray {
    if (!ArrayBuffer.isView(v)) return false;
    if (typedArrayTagGetter) return typedArrayTagGetter.call(v) !== undefined;
    const tag = Object.prototype.toString.call(v);
    return tag !== "[object DataView]" && tag.endsWith("Array]");
}

export function isArrayOrTypedArray(v: unknown): v is any[] | AnyTypedArray {
    return Array.isArray(v) || isTypedArray(v);
}

export function toValidArray<T>(
    val: T | readonly T[] | null | undefined,
    options: ToValidArrayOptions = {}
): T[] {
    const { clone = true, wrapNull = false } = options;
    if (val == null) return wrapNull ? ([val] as T[]) : [];
    if (Array.isArray(val)) return clone ? [...val] : (val as T[]);
    if (isTypedArray(val)) return Array.from(val as any);
    return [val as T];
}

export function getArrayElement(arr: any[] | AnyTypedArray, index: number, nullOnOob: boolean): any {
    const len = arr.length;
    const isOob = index < -len || index >= len;
    if (isOob && !nullOnOob) {
        throw new ComputeError(`Index ${index} is out of bounds for array of length ${len}`);
    }
    return isOob ? null : (arr.at(index) ?? null);
}

export type ArrayItemType =
    | "string"
    | "number"
    | "int"
    | "boolean"
    | "bigint"
    | "object"
    | "plainObject"
    | "date"
    | "regexp"
    | "array"
    | "any"
    | "null"
    | "undefined"
    | "nullish"
    | (new (...args: any[]) => any)
    | ((v: unknown) => any);

export type ArrayCheckMode = "every" | "some";
export type IsArrayOfTypeOptionsParams = {
    mode?: ArrayCheckMode;
    allowNulls?: boolean;
    allowEmpty?: boolean;
};

/**
 * Shared Type Validator & Coercer Factory
 */
function _getTypeValidators(type: ArrayItemType): {
    check: (v: unknown) => boolean;
    coerce: (v: unknown) => any;
} {
    if (typeof type === "function") {
        const isC = isClass(type);
        return {
            check: isC ? (v) => v instanceof type : (v) => Boolean((type as any)(v)),
            coerce: (v) => {
                if (isC) return v instanceof (type as any) ? v : null;
                const res = (type as any)(v);
                return typeof res === "boolean" ? (res ? v : null) : res;
            },
        };
    }

    switch (type) {
        case "string":
            return { check: (v) => typeof v === "string", coerce: (v) => String(v) };
        case "number":
            return { check: isValidNumber, coerce: (v) => toValidNumber(v) ?? NaN };
        case "int":
            return { check: isValidInt, coerce: (v) => toValidInt(v) };
        case "boolean":
            return { check: (v) => typeof v === "boolean", coerce: Boolean };
        case "bigint":
            return { check: isValidBigInt, coerce: (v) => toValidBigInt(v) };
        case "date":
            return { check: isValidDateObj, coerce: (v) => toValidDate(v) };
        case "regexp":
            return {
                check: isRegExp,
                coerce: (v) => isRegExp(v) ? v : (typeof v === "string" ? toCleanRegExp("", v)?.reg ?? null : null)
            };
        case "array":
            return { check: isArrayOrTypedArray, coerce: (v) => isArrayOrTypedArray(v) ? toValidArray(v, { clone: false }) : null };
        case "object":
            return { check: isObj, coerce: (v) => (isObj(v) ? v : null) };
        case "plainObject":
            return { check: isPlainObj, coerce: (v) => (isPlainObj(v) ? v : null) };
        case "null":
            return { check: (v) => v === null, coerce: () => null };
        case "undefined":
            return { check: (v) => v === undefined, coerce: () => undefined };
        case "nullish":
            return { check: (v) => v == null, coerce: () => null };
        case "any":
        default:
            return { check: () => true, coerce: (v) => v };
    }
}

/**
 * Checks if an array matches a specific item type contract.
 */
export function isArrayOfType(
    arr: unknown,
    type: ArrayItemType,
    {
        mode = "every",
        allowNulls = false,
        allowEmpty = true,
    }: IsArrayOfTypeOptionsParams = {}
): boolean {
    if (!isArrayOrTypedArray(arr)) return false;
    const list = arr as ArrayLike<unknown>;
    const len = list.length;

    if (len === 0) return allowEmpty ? mode === "every" : false;

    const { check } = _getTypeValidators(type);

    if (mode === "every") {
        for (let i = 0; i < len; i++) {
            const item = list[i];
            if (allowNulls && item == null) continue;
            if (!check(item)) return false;
        }
        return true;
    }

    for (let i = 0; i < len; i++) {
        const item = list[i];
        if ((allowNulls && item == null) || check(item)) return true;
    }
    return false;
}

/**
 * Coerces array items to a target type contract in a single optimized pass.
 */
export function toArrayOfType<T = any>(
    val: unknown,
    type: ArrayItemType = "any",
    {
        mode = "every",
        allowNulls = false,
        allowEmpty = true,
    }: IsArrayOfTypeOptionsParams = {}
): T[] {
    const arr = toValidArray(val);
    const len = arr.length;

    if (len === 0) {
        if (!allowEmpty) throw new ComputeError("Expected non-empty array");
        return [];
    }

    const { check, coerce } = _getTypeValidators(type);

    const res: T[] = new Array(len);
    let matchCount = 0;

    for (let i = 0; i < len; i++) {
        const item = arr[i];

        if (allowNulls && item == null) {
            res[matchCount++] = item as any;
            continue;
        }

        const coerced = coerce(item);

        if (check(coerced)) {
            res[matchCount++] = coerced as T;
        } else if (mode === "every") {
            throw new ComputeError(`Failed to convert array item at index ${i} ('${item}') to target type '${type}'`);
        }
    }

    if (mode === "some") {
        if (matchCount === 0) throw new ComputeError(`No items in array could be converted to target type '${type}'`);
        if (matchCount < len) res.length = matchCount;
    }

    return res;
}

export function compareScalarValues(
    a: any,
    b: any,
    { descending = false, nullsLast = true, customComp }: SortArrayOptions = {}
): number {
    const isDesc = Boolean(Array.isArray(descending) ? descending[0] : descending);
    const dir = isDesc ? -1 : 1;

    if (typeof customComp === "function") return customComp(a, b) * dir;
    if (Object.is(a, b)) return 0;
    if (a == null && b == null) return 0;
    if (a == null || b == null) return (a == null ? 1 : -1) * (nullsLast ? 1 : -1);

    const isDateA = isValidDateObj(a);
    const isDateB = isValidDateObj(b);
    if (isDateA !== isDateB) return isDateA ? -1 : 1;
    if (isDateA && isDateB) return (a.getTime() < b.getTime() ? -1 : (a.getTime() > b.getTime() ? 1 : 0)) * dir;

    const typeA = typeof a;
    const typeB = typeof b;
    const isNumA = typeA === "number" || typeA === "bigint";
    const isNumB = typeB === "number" || typeB === "bigint";

    const isNaNA = Number.isNaN(a);
    const isNaNB = Number.isNaN(b);
    if (isNaNA && isNaNB) return 0;
    if (isNaNA || isNaNB) return (isNaNA ? 1 : -1) * (nullsLast ? 1 : -1);

    if (isNumA && isNumB) return (a < b ? -1 : (a > b ? 1 : 0)) * dir;
    if (typeA !== typeB) return typeA < typeB ? -1 : 1;
    if (typeA === "string") return a.localeCompare(b) * dir;

    return (a < b ? -1 : (a > b ? 1 : 0)) * dir;
}

export function sortArray(
    arr: unknown,
    { descending = false, nullsLast = true, customComp }: SortArrayOptions = {}
): any[] {
    if (!isArrayOrTypedArray(arr)) return [];

    const list = arr as any;
    const len = list.length;
    if (len <= 1) return isTypedArray(arr) ? Array.from(list) : (len === 0 ? [] : [list[0]]);

    const isDesc = Boolean(Array.isArray(descending) ? descending[0] : descending);

    const isFloat = arr instanceof Float32Array || arr instanceof Float64Array;
    if (isTypedArray(arr) && !customComp && nullsLast && (!isFloat || !isDesc)) {
        const copy = list.slice().sort();
        if (isDesc) copy.reverse();
        return Array.from(copy);
    }

    const res = new Array(len);
    for (let i = 0; i < len; i++) {
        res[i] = list[i];
    }
    return res.sort((a, b) => compareScalarValues(a, b, { descending, nullsLast, customComp }));
}

const DEFAULT_STATS = { sum: null, product: null, count: 0, min: null, max: null, nanMin: null, nanMax: null, minIdx: null, maxIdx: null, mean: null, variance: 0, std: 0, nullCount: 0, nanCount: 0, len: 0, hasNulls: false, isNumeric: false };

export function getArrayStats(arr: unknown): {
    sum: number | null;
    product: number | null;
    count: number;
    min: any;
    max: any;
    nanMin: any;
    nanMax: any;
    minIdx: number | null;
    maxIdx: number | null;
    mean: number | null;
    variance: number;
    std: number;
    nullCount: number;
    nanCount: number;
    len: number;
    hasNulls: boolean;
    isNumeric: boolean;
} {
    if (!isArrayOrTypedArray(arr)) {
        return DEFAULT_STATS;
    }
    const len = (arr as any).length;
    if (len === 0) {
        return DEFAULT_STATS;
    }

    let minVal: any = null;
    let maxVal: any = null;
    let minIdx: number | null = null;
    let maxIdx: number | null = null;
    let count = 0;
    let nullCount = 0;
    let nanCount = 0;
    let total = 0;
    let sumCompensation = 0;
    let product = 1;
    let mean = 0;
    let M2 = 0;

    for (let i = 0; i < len; i++) {
        const val = (arr as any)[i];
        if (val == null) {
            nullCount++;
            continue;
        }
        if (typeof val === "number" && Number.isNaN(val)) {
            nanCount++;
            nullCount++;
            continue;
        }

        if (minVal == null || val < minVal) {
            minVal = val;
            minIdx = i;
        }
        if (maxVal == null || val > maxVal) {
            maxVal = val;
            maxIdx = i;
        }

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
            product *= n;

            count++;
            const delta = n - mean;
            mean += delta / count;
            const delta2 = n - mean;
            M2 += delta * delta2;
        }
    }

    const variance = count > 1 ? M2 / (count - 1) : 0;
    const hasNaN = nanCount > 0;

    return {
        sum: count > 0 ? total + sumCompensation : null,
        product: count > 0 ? product : null,
        count,
        min: minVal,
        max: maxVal,
        nanMin: hasNaN ? NaN : minVal,
        nanMax: hasNaN ? NaN : maxVal,
        minIdx,
        maxIdx,
        mean: count > 0 ? (total + sumCompensation) / count : null,
        variance,
        std: Math.sqrt(variance),
        nullCount,
        nanCount,
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
    nullOnOob?: boolean;
}

export function stepSliceArray<T>(
    arr: ArrayLike<T>,
    {
        step = 1,
        offsetStart = 0,
        offsetEnd,
        maxItemsGathered,
        nullOnOob = true
    }: StepSliceArrayOptions = {}
): T[] | null {
    if (arr == null) {
        return null;
    }
    if (maxItemsGathered !== undefined && maxItemsGathered <= 0) {
        return [];
    }
    if (step === 0) {
        throw new InvalidArgumentError("Step size step cannot be zero");
    }

    const len = arr.length;
    const isOob = len === 0
        ? (offsetStart !== 0)
        : (offsetStart >= len || offsetStart < -len);

    if (isOob) {
        if (!nullOnOob) {
            throw new ComputeError(`Start offset ${offsetStart} is out of bounds for array of length ${len}`);
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
    const maxLimit = clamp(limit ?? len, { min: 0 });

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

function _getSortedValidNumbers(values: ArrayLike<any>): Float64Array | null {
    const len = values.length;
    let validCount = 0;
    const nums = new Float64Array(len);
    for (let i = 0; i < len; i++) {
        const val = values[i];
        const n = toValidNumber(val, { allowNonFiniteNumbers: true });
        if (n !== null && isValidNumber(n, { allowNonFiniteNumbers: true, allowNaN: false })) {
            nums[validCount++] = n;
        }
    }
    if (validCount === 0) return null;
    const validNums = nums.subarray(0, validCount);
    validNums.sort();
    return validNums;
}

/**
 * Computes the quantile of a numeric array using linear interpolation, filtering out non-numeric and NaN values.
 * q must be in [0, 1]. Returns null if no valid numbers remain or q is out of bounds.
 */
export function computeQuantile(values: ArrayLike<any>, q: number): number | null {
    if (q < 0 || q > 1) return null;
    const validNums = _getSortedValidNumbers(values);
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
        if (val == null || (typeof val === "number" && !isValidNumber(val, { allowNonFiniteNumbers: true, allowNaN: false }))) continue;
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

export function shiftArray(arr: any[] | AnyTypedArray, n: number, fillValue: any = null): any[] {
    const len = arr.length;
    if (len === 0) return [];

    const shiftCount = Math.trunc(n);
    if (isNaN(shiftCount) || shiftCount === 0) {
        return toValidArray(arr);
    }

    const absN = Math.abs(shiftCount);
    if (absN >= len) return new Array(len).fill(fillValue);

    const result = new Array(len).fill(fillValue);
    const start = Math.max(0, shiftCount);
    const end = Math.min(len, len + shiftCount);

    for (let i = start; i < end; i++) {
        result[i] = arr[i - shiftCount] ?? fillValue;
    }

    return result;
}

/**
 * Unzips and validates a ColumnData pair array into contiguous Float64Array buffers.
 * @internal
 */
function _unzipValidNumericPairs(pairs: ColumnData<[any, any]>): { xArr: Float64Array; yArr: Float64Array; count: number } {
    const len = pairs.length;
    const xArr = new Float64Array(len);
    const yArr = new Float64Array(len);
    let count = 0;

    for (let i = 0; i < len; i++) {
        const pair = pairs[i];
        if (!pair) continue;

        const x = toValidNumber(pair[0]);
        const y = toValidNumber(pair[1]);
        if (x === null || y === null) continue;

        xArr[count] = x;
        yArr[count] = y;
        count++;
    }

    return { xArr, yArr, count };
}

/**
 * Computes 2-variable Welford stats (covariance, variances, and correlation) on flat numeric buffers.
 * @internal
 */
function _computeWelfordMatrix(
    xArr: ArrayLike<number>,
    yArr: ArrayLike<number>,
    count: number
): { covariance: number | null; correlation: number | null } | null {
    if (count < 2) return null;

    let meanX = 0, meanY = 0;
    let M2_X = 0, M2_Y = 0;
    let C_XY = 0;

    for (let i = 0; i < count; i++) {
        const x = xArr[i];
        const y = yArr[i];

        const deltaX = x - meanX;
        meanX += deltaX / (i + 1);
        const deltaX2 = x - meanX;

        const deltaY = y - meanY;
        meanY += deltaY / (i + 1);
        const deltaY2 = y - meanY;

        C_XY += deltaX * deltaY2;
        M2_X += deltaX * deltaX2;
        M2_Y += deltaY * deltaY2;
    }

    const covariance = C_XY / (count - 1);

    if (M2_X === 0 || M2_Y === 0) {
        return { covariance, correlation: null };
    }

    const denominator = Math.sqrt(M2_X * M2_Y);
    if (denominator === 0 || Number.isNaN(denominator)) {
        return { covariance, correlation: null };
    }

    const correlation = clamp(C_XY / denominator, { min: -1, max: 1 });
    return { covariance, correlation };
}

/**
 * Robust, single-pass computation using Welford's algorithm to calculate
 * covariance, variances, and correlation simultaneously with high numerical stability.
 */
export function computeStatisticalMatrix(
    pairs: ColumnData<[any, any]>
): { covariance: number | null; correlation: number | null } | null {
    const { xArr, yArr, count } = _unzipValidNumericPairs(pairs);
    if (count < 2) return { covariance: null, correlation: null };

    return _computeWelfordMatrix(xArr, yArr, count) ?? { covariance: null, correlation: null };
}

/**
 * Computes the fractional ranks of a numeric array.
 */
function _computeRanks(arr: Float64Array): Float64Array {
    const len = arr.length;
    const indices = new Int32Array(len);
    for (let i = 0; i < len; i++) {
        indices[i] = i;
    }

    indices.sort((a, b) => arr[a] - arr[b]);
    const ranks = new Float64Array(len);
    let i = 0;
    while (i < len) {
        let j = i + 1;
        while (j < len && arr[indices[j]] === arr[indices[i]]) {
            j++;
        }
        const rank = (i + 1 + j) / 2;
        for (let k = i; k < j; k++) {
            ranks[indices[k]] = rank;
        }
        i = j;
    }

    return ranks;
}

/**
 * Core mathematical engine that runs a high-performance, single-pass Welford calculation
 * directly on two flat, unzipped numeric buffers to maximize memory efficiency.
 */
export function computeCorrelationOfFlatArrays(
    xArr: ArrayLike<number>,
    yArr: ArrayLike<number>,
    count: number
): number | null {
    const stats = _computeWelfordMatrix(xArr, yArr, count);
    return stats ? stats.correlation : null;
}

/**
 * Computes Spearman Rank Correlation Coefficient
 * Optimized to achieve near-zero secondary allocations.
 */
export function computeSpearmanCorrelation(pairs: ColumnData<[any, any]>): number | null {
    const { xArr, yArr, count } = _unzipValidNumericPairs(pairs);
    if (count < 2) return null;

    const xRanks = _computeRanks(xArr.subarray(0, count));
    const yRanks = _computeRanks(yArr.subarray(0, count));

    return computeCorrelationOfFlatArrays(xRanks, yRanks, count);
}

/**
 * Computes the dot product of two arrays of pairs.
 */
export function computeDotProduct(pairs: ColumnData<[any, any]>): number | null {
    const len = pairs.length;
    let sum = 0;
    let count = 0;

    for (let i = 0; i < len; i++) {
        const pair = pairs[i];
        if (!pair) continue;

        const x = toValidNumber(pair[0]);
        const y = toValidNumber(pair[1]);
        if (x === null || y === null) continue;

        sum += x * y;
        count++;
    }

    return count > 0 ? sum : null;
}

/**
 * Computes the weighted average of two arrays of pairs.
 * Defensive against absolute sum-zero weight errors.
 */
export function computeWeightedAverage(pairs: ColumnData<[any, any]>): number | null {
    const len = pairs.length;
    let sumProducts = 0;
    let sumWeights = 0;
    let count = 0;

    for (let i = 0; i < len; i++) {
        const pair = pairs[i];
        if (!pair) continue;

        const x = toValidNumber(pair[0]);
        const w = toValidNumber(pair[1]);
        if (x === null || w === null) continue;

        sumProducts += x * w;
        sumWeights += w;
        count++;
    }

    if (count === 0 || Math.abs(sumWeights) < 1e-12) return null;
    return sumProducts / sumWeights;
}

/**
 * Generates Cartesian product pair index arrays for two lengths lenA and lenB.
 */
export function computeCartesianProduct(lenA: number, lenB: number): { leftIndices: number[]; rightIndices: number[] } {
    const safeLenA = clamp(Math.floor(lenA || 0), { min: 0 });
    const safeLenB = clamp(Math.floor(lenB || 0), { min: 0 });
    const total = safeLenA * safeLenB;

    if (!isValidInt(total, { range: "UInt32" })) {
        throw new InvalidArgumentError(`Cartesian product size (${total} rows) exceeds maximum JavaScript array capacity.`);
    }

    const leftIndices = new Array<number>(total);
    const rightIndices = new Array<number>(total);
    let pos = 0;
    for (let i = 0; i < safeLenA; i++) {
        for (let j = 0; j < safeLenB; j++) {
            leftIndices[pos] = i;
            rightIndices[pos] = j;
            pos++;
        }
    }
    return { leftIndices, rightIndices };
}

export type BinarySearchSide = "left" | "right";
export interface BinarySearchOptions<T = any> {
    side?: BinarySearchSide;
    getValue?: (index: number, item: T) => number;
}

/**
 * Performs a binary search on a sorted numeric array or ArrayLike structure.
 * Supports an optional `getValue` accessor for indirect index searching without array allocations.
 * @param arr Sorted array or ArrayLike structure to search within.
 * @param target Target numeric value to search for.
 * @param options Binary search options.
 * @param options.side Search side: `"left"` (bisect_left, first index >= target) or `"right"` (bisect_right, first index > target). Default `"left"`.
 * @param options.getValue Optional accessor function `(index, item) => number` for indirect searching.
 * @returns Index insertion point.
 */
export function binarySearch<T = any>(
    arr: ArrayLike<T>,
    target: number,
    options: BinarySearchOptions<T> = {}
): number {
    const isRight = options.side === "right";
    const getValue = options.getValue;
    let low = 0;
    let high = arr.length;

    while (low < high) {
        const mid = (low + high) >>> 1;
        const val = getValue ? getValue(mid, arr[mid]) : (arr[mid] as unknown as number);
        if (isRight ? val <= target : val < target) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    return low;
}

/**
 * Helper to compute count, mean, and central moment sums (m2Sum, m3Sum, m4Sum).
 * Supports both unweighted and weighted evaluation.
 */
export function getCentralMoments(
    arr: ArrayLike<any>,
    weights?: ArrayLike<number> | null,
    options: CentralMomentsOptions = {}
): CentralMomentsResult | null {
    if (!isArrayOrTypedArray(arr)) return null;

    const len = arr.length;
    const minSamples = options.minSamples ?? 2;
    const adjust = options.adjust ?? true;

    let count = 0;
    let sumW = 0;
    let total = 0;

    if (!weights) {
        const stats = getArrayStats(arr);
        if (stats.count < minSamples || stats.mean === null) return null;
        count = stats.count;
        sumW = count;
        total = stats.sum ?? 0;
    } else {
        for (let i = 0; i < len; i++) {
            const val = toValidNumber(arr[i]);
            if (val !== null) {
                const w = weights[i] ?? 0;
                count++;
                sumW += w;
                total += val * w;
            }
        }
        if (count < minSamples) return null;
    }

    const mean = (!weights || adjust) && sumW > 0 ? total / sumW : total;
    const centerMean = sumW > 0 ? total / sumW : 0;

    let m2Sum = 0;
    let m3Sum = 0;
    let m4Sum = 0;

    for (let i = 0; i < len; i++) {
        const val = toValidNumber(arr[i]);
        if (val === null) continue;
        const w = weights ? (weights[i] ?? 0) : 1;
        const diff = val - centerMean;
        const diff2 = diff * diff;
        m2Sum += w * diff2;
        m3Sum += w * diff2 * diff;
        m4Sum += w * diff2 * diff2;
    }

    const rawVar = sumW > 0 ? m2Sum / sumW : 0;
    const variance = rawVar < 1e-12 ? 0 : rawVar;
    const std = Math.sqrt(variance);

    return {
        count,
        sumW,
        weightedSum: total,
        mean,
        m2Sum,
        m3Sum,
        m4Sum,
        variance,
        std
    };
}

/**
 * Computes the sample skewness of a numeric dataset as the Fisher-Pearson coefficient of skewness.
 * @param arr ArrayLike dataset
 * @param options Skewness calculation options ({ bias?: boolean }, default bias=true)
 */
export function computeSkewness(arr: ArrayLike<any>, options: SkewOptions = {}): number | null {
    const stats = getCentralMoments(arr);
    if (!stats || stats.m2Sum <= 0) return null;

    const { count, m2Sum, m3Sum } = stats;
    const m2 = m2Sum / count;
    const m3 = m3Sum / count;
    const g1 = m3 / Math.pow(m2, 1.5);

    const bias = options?.bias ?? true;
    if (bias) {
        return isValidNumber(g1) ? g1 : null;
    }

    if (count < 3) return null;

    const G1 = (Math.sqrt(count * (count - 1)) / (count - 2)) * g1;
    return isValidNumber(G1) ? G1 : null;
}

/**
 * Computes the kurtosis of a numeric dataset.
 * @param arr ArrayLike dataset
 * @param options Kurtosis calculation options ({ fisher?: boolean, bias?: boolean }, default fisher=true, bias=true)
 */
export function computeKurtosis(arr: ArrayLike<any>, options: KurtosisOptions = {}): number | null {
    const stats = getCentralMoments(arr);
    if (!stats || stats.m2Sum <= 0) return null;

    const { count, m2Sum, m4Sum } = stats;
    const m2 = m2Sum / count;
    const m4 = m4Sum / count;
    const a4 = m4 / (m2 * m2);
    const g2 = a4 - 3;

    const fisher = options?.fisher ?? true;
    const bias = options?.bias ?? true;

    if (bias) {
        const val = fisher ? g2 : a4;
        return isValidNumber(val) ? val : null;
    }

    if (count < 4) return null;

    const G2 = ((count - 1) / ((count - 2) * (count - 3))) * ((count + 1) * g2 + 6);
    const val = fisher ? G2 : G2 + 3;
    return isValidNumber(val) ? val : null;
}

/**
 * Computes the Shannon entropy of a dataset.
 * @param arr ArrayLike dataset
 * @param options Entropy options ({ base?: number, normalize?: boolean }, default base=Math.E, normalize=true)
 */
export function computeEntropy(
    arr: ArrayLike<any>,
    options: EntropyOptions = {}
): number | null {
    if (!arr || arr.length === 0) return null;

    const { base = Math.E, normalize = true } = options;
    if (base <= 0 || base === 1) return null;

    const len = arr.length;
    const logBase = Math.log(base);

    if (normalize) {
        // Frequency-based categorical entropy (normalize frequencies to sum to 1)
        const counts = new Map<string, number>();
        let validCount = 0;

        for (let i = 0; i < len; i++) {
            const v = arr[i];
            if (v == null || Number.isNaN(v)) continue;
            const key = toCanonicalString(v);
            counts.set(key, (counts.get(key) || 0) + 1);
            validCount++;
        }

        if (validCount === 0) return null;

        let entropy = 0;
        for (const count of counts.values()) {
            const p = count / validCount;
            if (p > 0) {
                entropy -= p * (Math.log(p) / logBase);
            }
        }
        if (!isValidNumber(entropy)) return null;
        if (entropy < 0 || Object.is(entropy, -0)) entropy = 0;
        return entropy;
    } else {
        // Input values treated directly as discrete probabilities p_k
        const validProbs: number[] = [];
        let totalSum = 0;

        for (let i = 0; i < len; i++) {
            const v = arr[i];
            if (v == null || Number.isNaN(v)) continue;
            const p = Number(v);
            if (!isValidNumber(p) || p < 0) return null;
            if (p > 0) {
                validProbs.push(p);
                totalSum += p;
            }
        }

        if (validProbs.length === 0 || totalSum <= 0) return null;

        let entropy = 0;
        const numProbs = validProbs.length;
        for (let i = 0; i < numProbs; i++) {
            const p = validProbs[i] / totalSum;
            if (p > 0) {
                entropy -= p * (Math.log(p) / logBase);
            }
        }

        if (!isValidNumber(entropy)) return null;
        if (entropy < 0 || Object.is(entropy, -0)) entropy = 0;
        return entropy;
    }
}

/** Reduces elements in an array using a bitwise binary operation across valid BigInts/numbers. */
export function reduceBitwise(
    arr: ArrayLike<any>,
    op: (acc: bigint, val: bigint) => bigint
): number | bigint | null {
    if (!arr || arr.length === 0) return null;
    let res: bigint | null = null;
    const len = arr.length;
    for (let i = 0; i < len; i++) {
        const bigVal = toValidBigInt(arr[i], { range: "Int64" });
        if (bigVal !== null) {
            res = res === null ? bigVal : op(res, bigVal);
        }
    }
    if (res === null) return null;

    return isValidBigInt(res, SAFE_BIGINT_RANGE)
        ? Number(res)
        : res;
}

/** Finds the value in target column corresponding to the minimum or maximum value in `by` column. */
export function computeBy(
    pairs: Array<[any, any]> | null | undefined,
    statKey: "minIdx" | "maxIdx"
): any {
    if (!pairs || pairs.length === 0) return null;
    const len = pairs.length;
    const targets = new Array(len);
    const bys = new Array(len);
    for (let i = 0; i < len; i++) {
        const p = pairs[i];
        targets[i] = p?.[0];
        bys[i] = p?.[1];
    }
    const idx = getArrayStats(bys)[statKey];
    return idx !== null ? targets[idx] : null;
}

export interface FilterByMaskOptions {
    nullify?: boolean;
}

/**
 * Filters an array or ArrayLike structure where the mask evaluates to truthy.
 * @param arr The source array or ArrayLike structure to filter.
 * @param mask A boolean mask array or truthy/falsy scalar.
 * @param options Configuration options ({ nullify?: boolean }). If nullify is true, non-matching items become null while preserving length.
 * @returns Filtered array containing matching elements (or nullified elements).
 */
export function filterByMask<T = any>(
    arr: ArrayLike<T> | null | undefined,
    mask: any,
    options: FilterByMaskOptions = {}
): (T | null)[] {
    if (!arr || arr.length === 0) return [];
    const len = arr.length;
    const { nullify = false } = options;
    const isArr = isArrayOrTypedArray(mask);

    if (!isArr && !mask) {
        return nullify ? new Array(len).fill(null) : [];
    }

    const out: (T | null)[] = [];
    for (let i = 0; i < len; i++) {
        const match = isArr ? mask[i] : mask;
        if (match) out.push(arr[i]);
        else if (nullify) out.push(null);
    }
    return out;
}