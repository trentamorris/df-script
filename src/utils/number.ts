import { isValidDateObj, unboxPrimitiveObj } from "./object";


const STRICT_SCIENTIFIC_REGEX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const NON_BASE10_INJECTION_REGEX = /0[xobXOB]/;
const WHITESPACE_UNDERSCORE_REGEX = /[\s_]/g;
const EXPONENT_INDICATOR_REGEX = /[eE]/;

// ============================================================================
// /** Generic Number Helpers */
// ============================================================================

export interface NumericValidationOptions {
    allowNonFiniteNumbers?: boolean;
    strictNumericString?: boolean;
}

export function isValidNumber(
    v: unknown,
    options?: NumericValidationOptions
): v is number {
    if (typeof v !== "number") return false;
    if (options && options.allowNonFiniteNumbers) return true;
    return Number.isFinite(v);
}

export interface ParseNumberOptions extends NumericValidationOptions {
    floatScientific?: boolean;
}

function validateGroupLengths(parts: string[]): boolean {
    for (let i = 1; i < parts.length; i++) {
        if (parts[i].length !== 3) return false;
    }
    return true;
}

function cleanNumericString(str: string, strict: boolean): string | null {
    if (NON_BASE10_INJECTION_REGEX.test(str)) return null;

    let clean = str.trim();
    if (clean === "") return null;

    if (clean.startsWith("(") && clean.endsWith(")")) {
        clean = "-" + clean.slice(1, -1).trim();
    }

    if (!strict) {
        clean = clean.replace(WHITESPACE_UNDERSCORE_REGEX, "");
    }

    const hasDot = clean.includes(".");
    const hasComma = clean.includes(",");

    if (hasDot && hasComma) {
        const lastDot = clean.lastIndexOf(".");
        const lastComma = clean.lastIndexOf(",");
        if (lastComma > lastDot) {
            const parts = clean.slice(0, lastComma).split(".");
            if (parts.length > 1 && !validateGroupLengths(parts)) return null;
            clean = clean.replace(/\./g, "").replace(/,/g, ".");
        } else {
            const parts = clean.slice(0, lastDot).split(",");
            if (parts.length > 1 && !validateGroupLengths(parts)) return null;
            clean = clean.replace(/,/g, "");
        }
    } else if (hasComma && !hasDot) {
        if (clean.indexOf(",") !== clean.lastIndexOf(",")) {
            const parts = clean.split(",");
            if (!validateGroupLengths(parts)) return null;
            clean = clean.replace(/,/g, "");
        } else {
            clean = clean.replace(/,/g, ".");
        }
    } else if (hasDot && !hasComma) {
        if (clean.indexOf(".") !== clean.lastIndexOf(".")) {
            const parts = clean.split(".");
            if (!validateGroupLengths(parts)) return null;
            clean = clean.replace(/\./g, "");
        }
    }

    return clean;
}

export function toValidNumber(
    v: unknown,
    {
        allowNonFiniteNumbers = false,
        strictNumericString = false,
        floatScientific = true
    }: ParseNumberOptions = {}
): number | null {
    if (v == null || typeof v === "symbol") return null;

    v = unboxPrimitiveObj(v);

    switch (typeof v) {
        case "number":
            return isValidNumber(v, { allowNonFiniteNumbers }) ? v : null;
        case "boolean":
            return v ? 1 : 0;
        case "bigint": {
            const n = Number(v);
            return isValidNumber(n, { allowNonFiniteNumbers }) ? n : null;
        }
        case "object": {
            if (isValidDateObj(v)) {
                const t = v.getTime();
                return isValidNumber(t, { allowNonFiniteNumbers }) ? t : null;
            }
            return null;
        }
        case "string": {
            const clean = cleanNumericString(v, strictNumericString);
            if (clean === null) return null;

            if (allowNonFiniteNumbers) {
                const lower = clean.toLowerCase();
                if (lower === "nan" || lower === "-nan") return NaN;
                if (lower === "infinity" || lower === "+infinity") return Infinity;
                if (lower === "-infinity") return -Infinity;
            }

            const hasExponent = EXPONENT_INDICATOR_REGEX.test(clean);
            if (hasExponent && !floatScientific) return null;
            if (!STRICT_SCIENTIFIC_REGEX.test(clean)) return null;

            const parsed = Number(clean);
            return isValidNumber(parsed, { allowNonFiniteNumbers }) ? parsed : null;
        }
        default:
            return null;
    }
}


export interface NumericFormatOptions extends Intl.NumberFormatOptions {
    /** BCP 47 language tag (e.g., 'en-US' for dot, 'de-DE' for comma). Defaults to 'en-US'. */
    locale?: string;
    /** If true, formats negative numbers in parentheses e.g. (1.23) instead of -1.23. */
    accountingNegatives?: boolean;
    /** Fallback string if the value cannot be parsed into a formatable number. */
    fallback?: string;
    /** If true, returns the fallback string for Infinity and -Infinity values. */
    formatNonFinite?: boolean;
}

/**
 * Formats any numeric value (number, bigint, numeric string, Date, etc.) for output,
 * handling NaN, Infinity, scientific notation, precision, and accounting formats.
 */
export function formatNumber({
    locale = "en-US",
    accountingNegatives = false,
    fallback = "NaN",
    formatNonFinite = false,
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
            if (formatNonFinite) {
                return fallback;
            }
            if (accountingNegatives && num === -Infinity) {
                return `(${formatter.format(Infinity)})`;
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

export interface FloatOptions extends ParseNumberOptions {
    floatPrecision?: FloatPrecision;
}

export function isValidFloat(
    v: unknown,
    { floatPrecision, allowNonFiniteNumbers = false }: FloatOptions = {}
): v is number {
    if (!isValidNumber(v, { allowNonFiniteNumbers })) return false;
    if (floatPrecision === "Float32") {
        return isValidNumber(Math.fround(v), { allowNonFiniteNumbers });
    }
    return true;
}

export function toValidFloat(
    v: unknown,
    {
        floatPrecision = "Float64",
        allowNonFiniteNumbers = true,
        floatScientific = false,
        strictNumericString = false
    }: FloatOptions = {}
): number | null {
    let num = toValidNumber(v, { allowNonFiniteNumbers, floatScientific, strictNumericString });

    if (num === null) return null;

    if (floatPrecision === "Float32") {
        num = Math.fround(num);
    }

    if (!isValidNumber(num, { allowNonFiniteNumbers })) {
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

export function toValidBigInt(
    v: unknown,
    { range = "Int64", truncate = false }: BigIntOptions = {}
): bigint | null {
    if (v == null || typeof v === "symbol") return null;

    v = unboxPrimitiveObj(v);

    let bigintVal: bigint | null = null;

    switch (typeof v) {
        case "bigint":
            bigintVal = v;
            break;
        case "boolean":
            bigintVal = v ? 1n : 0n;
            break;
        case "number":
            if (!Number.isFinite(v)) return null;
            if (!truncate && !Number.isInteger(v)) return null;
            bigintVal = BigInt(Math.trunc(v));
            break;
        case "string": {
            let clean = cleanNumericString(v, false);
            if (clean === null) return null;

            if (!STRICT_SCIENTIFIC_REGEX.test(clean)) return null;

            if (EXPONENT_INDICATOR_REGEX.test(clean)) {
                const num = Number(clean);
                if (!Number.isFinite(num)) return null;
                if (!truncate && !Number.isInteger(num)) return null;
                bigintVal = BigInt(Math.trunc(num));
            } else {
                const dotIdx = clean.indexOf(".");
                if (dotIdx !== -1) {
                    if (!truncate) {
                        const fraction = clean.slice(dotIdx + 1);
                        if (/[^0]/.test(fraction)) return null;
                    }
                    clean = clean.slice(0, dotIdx);
                }
                try {
                    bigintVal = BigInt(clean);
                } catch {
                    return null;
                }
            }
            break;
        }
        default: {
            const num = toValidNumber(v);
            if (num === null) return null;
            if (!truncate && !Number.isInteger(num)) return null;
            bigintVal = BigInt(Math.trunc(num));
            break;
        }
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
    if (integerDigits < 0 || scale < 0) return null;
    if (integerDigits > 15) {
        return Number.MAX_SAFE_INTEGER;
    }

    const safeScale = Math.min(scale, 16);
    const maxVal = Math.pow(10, integerDigits) - Math.pow(10, -safeScale);
    return maxVal > 0 ? maxVal : null;
}

export function roundToScale(v: number, scale: number): number {
    const str = v.toString();
    if (str.includes("e")) {
        const factor = Math.pow(10, scale);
        return Math.round(v * factor) / factor;
    }
    return Number(Math.round(Number(str + "e" + scale)) + "e-" + scale);
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
    options?: { min?: T | null; max?: T | null; safe?: boolean }
): T {
    if (!options) return val;
    const min = options.min;
    const max = options.max;
    const safe = options.safe !== false;

    const hasMin = min !== null && min !== undefined;
    const hasMax = max !== null && max !== undefined;

    if (hasMin && hasMax && (min as any) > (max as any)) {
        return min as T;
    }

    let v = val;
    if (safe && typeof v === "number") {
        if (Number.isNaN(v)) {
            return hasMin ? (min as T) : (hasMax ? (max as T) : val);
        }
        if (v === Infinity) {
            return hasMax ? (max as T) : val;
        }
        if (v === -Infinity) {
            return hasMin ? (min as T) : val;
        }
    }

    if (hasMin && v < (min as T)) return min as T;
    if (hasMax && v > (max as T)) return max as T;
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

