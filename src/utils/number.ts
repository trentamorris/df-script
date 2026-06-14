import { isArrayOrTypedArray } from "./guards";
import { sortList } from "./list";

const NUMERIC_CLEAN_REGEX = /[,\s_]/g;
const VALID_DECIMAL_REGEX = /^[+-]?\d+(?:\.\d+)?$/;

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

        if (Number.isNaN(n)) {
            if (options?.allowNonFiniteNumbers && clean.toLowerCase() === "nan") {
                return NaN;
            }
            return null;
        }

        return isValidNumber(n, options) ? n : null;
    }
    return null;
}

export interface NumericFormatOptions extends Intl.NumberFormatOptions {
    /** BCP 47 language tag (e.g., 'en-US' for dot, 'de-DE' for comma). Defaults to 'en-US'. */
    locale?: string;
    /** If true, formats negative numbers in parentheses e.g. (1.23) instead of -1.23. */
    accountingNegatives?: boolean;
    /** Fallback string if the value cannot be parsed into a formatable number. */
    fallback?: string;
}

/**
 * Formats any numeric value (number, bigint, numeric string, Date, etc.) for output,
 * handling NaN, Infinity, scientific notation, precision, and accounting formats.
 */
export function formatNumber({
    locale = "en-US",
    accountingNegatives = false,
    fallback = "NaN",
    ...intlOpts
}: NumericFormatOptions = {}): (value: unknown) => string {
    if (intlOpts.useGrouping === undefined) {
        intlOpts.useGrouping = false;
    }
    if (intlOpts.maximumFractionDigits === undefined && intlOpts.maximumSignificantDigits === undefined) {
        intlOpts.maximumFractionDigits = 20;
    }

    const formatter = new Intl.NumberFormat(locale, intlOpts);

    return (value: unknown): string => {
        if (typeof value === "bigint") {
            if (accountingNegatives && value < 0n) {
                return `(${formatter.format(-value)})`;
            }
            return formatter.format(value);
        }

        const num = toValidNumber(value, { allowNonFiniteNumbers: true });

        if (num === null || Number.isNaN(num)) {
            return fallback;
        }

        if (!Number.isFinite(num)) {
            if (accountingNegatives && num === -Infinity) {
                return "(Infinity)";
            }
            return String(num);
        }

        if (accountingNegatives && num < 0) {
            return `(${formatter.format(Math.abs(num))})`;
        }

        return formatter.format(num);
    };
}

// ============================================================================
// /** Float Functions */
// ============================================================================

export type FloatPrecision = "Float32" | "Float64";

export interface FloatOptions extends NumericValidationOptions {
    floatPrecision?: FloatPrecision;
    /**
     * When true, explicitly accepts scientific notation strings (e.g. "1.23e+4").
     * The result is still validated against the precision range.
     */
    floatScientific?: boolean;
}

export function isValidFloat(
    v: unknown,
    {
        floatPrecision,
        allowNonFiniteNumbers = false,
        floatScientific = false
    }: FloatOptions = {}
): boolean {
    let num: number;
    if (typeof v === "number") {
        num = v;
    } else if (floatScientific && typeof v === "string") {
        const parsed = parseFloat(v);
        if (Number.isNaN(parsed)) return false;
        num = parsed;
    } else {
        return false;
    }

    if (floatPrecision === "Float32") {
        num = Math.fround(num);
    }

    if (!allowNonFiniteNumbers && (Number.isNaN(num) || !Number.isFinite(num))) {
        return false;
    }

    return true;
}

export function toValidFloat(
    v: unknown,
    {
        floatPrecision = "Float64",
        allowNonFiniteNumbers = true,
        floatScientific = false
    }: FloatOptions = {}
): number | null {
    let num = toValidNumber(v, { allowNonFiniteNumbers });

    if (num === null && floatScientific && typeof v === "string") {
        const parsed = parseFloat(v);
        if (isValidNumber(parsed, { allowNonFiniteNumbers })) {
            num = parsed;
        }
    }

    if (num === null) return null;

    if (floatPrecision === "Float32") {
        num = Math.fround(num);
    }

    if (!allowNonFiniteNumbers && !Number.isFinite(num)) {
        return null;
    }

    return num;
}

// ============================================================================
// /** Integer Functions */
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

export type IntCoerceType = "round" | "floor" | "ceil" | "truncate";
export interface IntOptions {
    range?: IntRange;
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

export function toValidInt(
    v: unknown,
    {
        range = "Int32",
        coerce = "truncate"
    }: IntOptions = {}
): number | null {
    const num = toValidNumber(v);
    if (num === null) return null;

    let n = num;
    switch (coerce) {
        case "round": n = Math.round(n); break;
        case "floor": n = Math.floor(n); break;
        case "ceil": n = Math.ceil(n); break;
        case "truncate": n = Math.trunc(n); break;
    }

    const limits = typeof range === "string" ? INT_RANGES[range] : range;
    return clamp(n, { min: limits.min, max: limits.max });
}

// ============================================================================
// /** BigInt Functions */
// ============================================================================

export const BIGINT_RANGES = {
    Int64: { min: -9223372036854775808n, max: 9223372036854775807n },
    UInt64: { min: 0n, max: 18446744073709551615n }
} as const;

export type BigIntRangeType = keyof typeof BIGINT_RANGES;
export type BigIntRange = { min: bigint; max: bigint } | BigIntRangeType;

export interface BigIntOptions {
    range?: BigIntRange;
    truncate?: boolean;
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

export function toValidBigInt(
    v: unknown,
    { range = "Int64", truncate = false }: BigIntOptions = {}
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
            const num = toValidNumber(clean);
            if (num === null) return null;
            if (!truncate && !Number.isInteger(num)) return null;
            bigintVal = BigInt(Math.trunc(num));
        } else {
            if (!truncate && clean.includes(".")) return null;
            const dotIdx = clean.indexOf(".");
            bigintVal = BigInt(dotIdx !== -1 ? clean.slice(0, dotIdx) : clean);
        }
    } else {
        const num = toValidNumber(v);
        if (num === null) return null;
        if (!truncate && !Number.isInteger(num)) return null;
        bigintVal = BigInt(Math.trunc(num));
    }

    const limits = typeof range === "string" ? BIGINT_RANGES[range] : range;
    return clamp(bigintVal, { min: limits.min, max: limits.max });
}

// ============================================================================
// /** Decimal Functions */
// ============================================================================

export interface DecimalOptions {
    precision?: number;
    scale?: number;
}

function getDecimalMaxVal(precision: number, scale: number): number | null {
    const integerDigits = precision - scale;
    const maxVal = Math.pow(10, integerDigits) - Math.pow(10, -scale);
    return maxVal > 0 ? maxVal : null;
}

function roundToScale(v: number, scale: number): number {
    const str = v.toString();
    if (str.includes("e")) {
        const factor = Math.pow(10, scale);
        return Math.round(v * factor) / factor;
    }
    return Number(Math.round(Number(str + "e" + scale)) + "e-" + scale);
}

export function isValidDecimal(
    v: unknown,
    { precision, scale = 0 }: DecimalOptions = {}
): boolean {
    if (!isValidNumber(v)) return false;

    if (precision !== undefined) {
        const maxVal = getDecimalMaxVal(precision, scale);
        if (maxVal !== null && Math.abs(v) > maxVal) {
            return false;
        }
    }

    if (scale !== undefined) {
        const rounded = roundToScale(v, scale);
        if (Math.abs(v - rounded) > 1e-12) {
            return false;
        }
    }

    return true;
}

export function toValidDecimal(
    v: unknown,
    { precision, scale }: DecimalOptions = {}
): number | null {
    const num = toValidNumber(v);
    if (num === null) return null;

    let n = num;

    if (scale !== undefined) {
        n = roundToScale(n, scale);
    }

    if (precision !== undefined) {
        const scaleVal = scale ?? 0;
        const maxVal = getDecimalMaxVal(precision, scaleVal);
        if (maxVal !== null) {
            n = clamp(n, { min: -maxVal, max: maxVal });
        }
    }

    return n;
}

// ============================================================================
// /** Math & Stats Functions */
// ============================================================================

export function clamp<T extends number | bigint>(
    val: T,
    { min = null, max = null, safe = true }: { min?: T | null; max?: T | null; safe?: boolean } = {}
): T {
    if (min !== null && max !== null && min > max) {
        return min;
    }

    let v = val;

    if (safe && typeof v === "number") {
        if (Number.isNaN(v)) {
            // NaN can't be compared — coerce to the nearest boundary, preferring min
            v = min !== null ? min : (max !== null ? max : val);
        } else if (v === Infinity) {
            v = max !== null ? max : val;
        } else if (v === -Infinity) {
            v = min !== null ? min : val;
        }
    }

    if (min !== null && v < min) return min;
    if (max !== null && v > max) return max;
    return v;
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
    return sortList(modes);
}

