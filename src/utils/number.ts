const NUMERIC_CLEAN_REGEX = /[,\s_]/g;
const VALID_DECIMAL_REGEX = /^[+-]?\d+(?:\.\d+)?$/;

import { isArrayOrTypedArray } from "./guards";
import { sortList } from "./list";

// ============================================================================
// /** Generic Number Helpers */
// ============================================================================

export interface NumericValidationOptions {
    allowNonFiniteNumbers?: boolean;
}

export function isValidNumber(
    v: unknown,
    options?: NumericValidationOptions
): v is number {
    if (typeof v !== "number") return false;
    if (options && options.allowNonFiniteNumbers) return true;
    return !Number.isNaN(v) && Number.isFinite(v);
}

export function toValidNumber(
    v: unknown,
    options?: NumericValidationOptions
): number | null {
    if (v == null) return null;
    if (typeof v === "symbol") return null;

    if (isValidNumber(v, options)) {
        return v;
    }
    if (typeof v === "boolean") {
        return v ? 1 : 0;
    }
    if (typeof v === "bigint") {
        const n = Number(v);
        return isValidNumber(n, options) ? n : null;
    }
    if (v instanceof Date) {
        const t = v.getTime();
        return isValidNumber(t, options) ? t : null;
    }
    if (typeof v === "string") {
        const clean = v.trim().replace(NUMERIC_CLEAN_REGEX, "");
        if (clean === "") return null;
        const n = Number(clean);
        if (isValidNumber(n, options)) {
            if (Number.isNaN(n) && clean.toLowerCase() !== "nan") {
                return null;
            }
            return n;
        }
        return null;
    }
    return null;
}

export function clamp<T extends number | bigint>(
    val: T,
    min: T,
    max: T,
    options: { safe?: boolean } = { safe: true }
): T {
    let v = val;
    if (options.safe && typeof v === "number" && Number.isNaN(v)) {
        v = min;
    }
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

// ============================================================================
// /** Float Functions */
// ============================================================================

export type FloatPrecision = "Float32" | "Float64";

export const FLOAT_32_BOUNDARY = 3.4028234663852886e+38;
export const FLOAT_RANGES = {
    Float32: { min: -FLOAT_32_BOUNDARY, max: FLOAT_32_BOUNDARY },
    Float64: { min: -Number.MAX_VALUE, max: Number.MAX_VALUE }
} as const;

export function isValidFloat(v: unknown, precision?: FloatPrecision): boolean {
    if (!isValidNumber(v)) return false;
    if (precision) {
        const limits = FLOAT_RANGES[precision];
        return v >= limits.min && v <= limits.max;
    }
    return true;
}

export interface FloatOptions extends NumericValidationOptions {
    precision?: FloatPrecision;
}

export function toValidFloat(
    v: unknown,
    options: FloatOptions = {}
): number | null {
    const { precision = "Float64", allowNonFiniteNumbers = true } = options;
    const num = toValidNumber(v, { allowNonFiniteNumbers });
    if (num === null) return null;
    return precision === "Float32" ? Math.fround(num) : num;
}

// ============================================================================
// /** Integer & BigInt Functions */
// ============================================================================

export const INT_RANGES = {
    Int8: { min: -128, max: 127 },
    Int16: { min: -32768, max: 32767 },
    Int32: { min: -2147483648, max: 2147483647 },
    UInt8: { min: 0, max: 255 },
    UInt16: { min: 0, max: 65535 },
    UInt32: { min: 0, max: 4294967295 }
} as const;

export type IntRangeType = keyof typeof INT_RANGES;
export type IntRange = { min: number; max: number } | IntRangeType;

export const BIGINT_RANGES = {
    Int64: { min: -9223372036854775808n, max: 9223372036854775807n },
    UInt64: { min: 0n, max: 18446744073709551615n }
} as const;

export type BigIntRangeType = keyof typeof BIGINT_RANGES;
export type BigIntRange = { min: bigint; max: bigint } | BigIntRangeType;

export type IntCoerceType = "round" | "floor" | "ceil" | "truncate";
export interface IntOptions {
    coerce?: IntCoerceType;
}

export function isValidInt(
    v: unknown,
    range?: IntRange
): v is number {
    if (!isValidNumber(v)) return false;
    if (!Number.isInteger(v)) return false;
    if (!range) return true;
    const limits = typeof range === "string" ? INT_RANGES[range] : range;
    return v >= limits.min && v <= limits.max;
}

export function isValidBigInt(
    v: unknown,
    range?: BigIntRange
): v is bigint {
    if (typeof v !== "bigint") return false;
    if (!range) return true;
    const limits = typeof range === "string" ? BIGINT_RANGES[range] : range;
    return v >= limits.min && v <= limits.max;
}

export function toValidInt(
    v: unknown,
    range: IntRange = "Int32",
    opts: IntOptions = {}
): number | null {
    const num = toValidNumber(v);
    if (num === null) return null;

    let n = num;
    const coerce = opts.coerce || "truncate";
    switch (coerce) {
        case "round": n = Math.round(n); break;
        case "floor": n = Math.floor(n); break;
        case "ceil": n = Math.ceil(n); break;
        case "truncate": n = Math.trunc(n); break;
    }

    const limits = typeof range === "string" ? INT_RANGES[range] : range;
    return clamp(n, limits.min, limits.max);
}

export function toValidBigInt(
    v: unknown,
    range: BigIntRange = "Int64"
): bigint | null {
    if (v == null) return null;
    if (typeof v === "symbol") return null;

    let bigintVal: bigint | null = null;

    if (typeof v === "bigint") {
        bigintVal = v;
    } else if (typeof v === "boolean") {
        bigintVal = v ? 1n : 0n;
    } else if (typeof v === "string") {
        const clean = v.trim().replace(NUMERIC_CLEAN_REGEX, "");
        if (clean === "") return null;
        if (!VALID_DECIMAL_REGEX.test(clean)) {
            const num = toValidNumber(v);
            if (num === null) return null;
            bigintVal = BigInt(Math.trunc(num));
        } else {
            bigintVal = BigInt(clean.split(".")[0]);
        }
    } else {
        const num = toValidNumber(v);
        if (num === null) return null;
        bigintVal = BigInt(Math.trunc(num));
    }

    const limits = typeof range === "string" ? BIGINT_RANGES[range] : range;
    return clamp(bigintVal, limits.min, limits.max);
}

// ============================================================================
// /** Decimal Functions */
// ============================================================================

export interface DecimalOptions {
    precision?: number;
    scale?: number;
}

export function isValidDecimal(
    v: unknown,
    opts: DecimalOptions = {}
): boolean {
    if (!isValidNumber(v)) return false;

    const { precision, scale = 0 } = opts;

    if (precision !== undefined) {
        const integerDigits = precision - scale;
        const maxVal = Math.pow(10, integerDigits) - Math.pow(10, -scale);
        if (integerDigits > 0 && Math.abs(v) > maxVal) {
            return false;
        }
    }

    if (scale !== undefined) {
        const str = v.toString();
        const dotIdx = str.indexOf(".");
        if (dotIdx !== -1 && str.slice(dotIdx + 1).length > scale) {
            return false;
        }
    }

    return true;
}

export function toValidDecimal(
    v: unknown,
    opts: DecimalOptions = {}
): number | null {
    const num = toValidNumber(v);
    if (num === null) return null;

    const { precision, scale } = opts;
    let n = num;

    if (scale !== undefined) {
        const multiplier = Math.pow(10, scale);
        n = Math.round(n * multiplier) / multiplier;
    }

    if (precision !== undefined) {
        const scaleVal = scale || 0;
        const integerDigits = precision - scaleVal;
        if (integerDigits > 0) {
            const maxVal = Math.pow(10, integerDigits) - Math.pow(10, -scaleVal);
            n = clamp(n, -maxVal, maxVal);
        }
    }

    return n;
}

/**
 * Creates a seedable pseudo-random number generator using the Mulberry32 PRNG algorithm.
 * Returns a function that generates a pseudo-random float in the range [0, 1).
 */
export function mulberry32(seed: number): () => number {
    let s = seed | 0;
    return function (): number {
        let t = s = (s + 0x6D2B79F5) | 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Computes the median of a numeric array, filtering out null/undefined values.
 * Returns null if no valid numbers remain.
 */
export function computeMedian(values: ArrayLike<any>): number | null {
    const len = values.length;
    const nums: number[] = [];
    for (let i = 0; i < len; i++) {
        const val = values[i];
        if (val != null) nums.push(val);
    }
    const n = nums.length;
    if (n === 0) return null;
    nums.sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    return n % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/**
 * Computes the quantile of a numeric array using linear interpolation, filtering out null/undefined values.
 * q must be in [0, 1]. Returns null if no valid numbers remain.
 */
export function computeQuantile(values: ArrayLike<any>, q: number): number | null {
    const len = values.length;
    const nums: number[] = [];
    for (let i = 0; i < len; i++) {
        if (values[i] != null) nums.push(values[i]);
    }
    const n = nums.length;
    if (n === 0) return null;
    nums.sort((a, b) => a - b);
    const idx = q * (n - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    if (low === high) return nums[low];
    return nums[low] + (idx - low) * (nums[high] - nums[low]);
}

/**
 * Computes the mode(s) of an array, filtering out null/undefined values.
 * Returns an array of the most frequent values, sorted, or null if empty/no mode.
 */
export function computeMode(values: ArrayLike<any>): any[] | null {
    if (!isArrayOrTypedArray(values) || values.length === 0) return null;

    const counts = new Map<any, number>();
    let max = 0;
    let modes: any[] = [];

    for (let i = 0; i < values.length; i++) {
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
    return sortList(modes);
}

