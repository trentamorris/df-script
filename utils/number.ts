const NUMERIC_CLEAN_REGEX = /[,\s_]/g;

// ============================================================================
// /** Generic Number Helpers */
// ============================================================================

export function isValidNumber(v: unknown): v is number {
    return typeof v === "number" && !Number.isNaN(v) && Number.isFinite(v);
}

export function clamp<T extends number | bigint>(opts: { val: T; min: T; max: T }): T {
    const { val, min, max } = opts;
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

// ============================================================================
// /** Float Functions */
// ============================================================================

export type FloatPrecision = "Float32" | "Float64";

export function isValidFloat(v: unknown, precision?: FloatPrecision): boolean {
    if (!isValidNumber(v)) return false;
    if (precision === "Float32") {
        const f32Max = 3.4028234663852886e+38;
        return v >= -f32Max && v <= f32Max;
    }
    return true;
}

export function toValidFloat(
    v: unknown,
    precision: FloatPrecision = "Float64",
    opts: { requireInt?: boolean; coerceInt?: "round" | "floor" | "ceil" | "truncate" } = {}
): number | null {
    const { requireInt = false, coerceInt } = opts;
    if (v == null) return null;

    let n: number;
    if (isValidNumber(v)) {
        n = v;
    } else if (typeof v === "boolean") {
        n = v ? 1 : 0;
    } else if (typeof v === "bigint") {
        n = Number(v);
        if (!isValidNumber(n)) return null;
    } else if (v instanceof Date) {
        const t = v.getTime();
        if (Number.isNaN(t)) return null;
        n = t;
    } else {
        const raw = String(v).trim().replace(NUMERIC_CLEAN_REGEX, "");
        n = Number(raw);
        if (!isValidNumber(n)) return null;
    }

    if (coerceInt) {
        switch (coerceInt) {
            case "round": n = Math.round(n); break;
            case "floor": n = Math.floor(n); break;
            case "ceil": n = Math.ceil(n); break;
            case "truncate": n = Math.trunc(n); break;
        }
    }

    if (requireInt && !Number.isInteger(n)) return null;
    return precision === "Float32" ? Math.fround(n) : n;
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

export const BIGINT_RANGES = {
    Int64: { min: -9223372036854775808n, max: 9223372036854775807n },
    UInt64: { min: 0n, max: 18446744073709551615n }
} as const;

export type BigIntRangeType = keyof typeof BIGINT_RANGES;

export function isValidInt(
    v: unknown,
    range?: { min: number | bigint; max: number | bigint } | IntRangeType | BigIntRangeType
): boolean {
    if (typeof v === "number") {
        if (!Number.isInteger(v) || Number.isNaN(v) || !Number.isFinite(v)) return false;
        if (!range) return true;
        if (typeof range === "string") {
            if (range in INT_RANGES) {
                const limits = INT_RANGES[range as IntRangeType];
                return v >= limits.min && v <= limits.max;
            }
            return false;
        }
        return v >= range.min && v <= range.max;
    }
    if (typeof v === "bigint") {
        if (!range) return true;
        if (typeof range === "string") {
            if (range in BIGINT_RANGES) {
                const limits = BIGINT_RANGES[range as BigIntRangeType];
                return v >= limits.min && v <= limits.max;
            }
            return false;
        }
        return v >= range.min && v <= range.max;
    }
    return false;
}

export function toValidInt(
    v: unknown,
    range: { min: number; max: number } | IntRangeType = "Int32"
): number | null {
    const num = toValidFloat(v);
    if (num === null) return null;
    const truncated = Math.trunc(num);

    const limits = typeof range === "string" ? INT_RANGES[range] : range;
    return clamp({ val: truncated, min: limits.min, max: limits.max });
}

export function toValidBigInt(
    v: unknown,
    range: { min: bigint; max: bigint } | BigIntRangeType = "Int64"
): bigint | null {
    if (v == null) return null;

    let bigintVal: bigint;
    if (typeof v === "bigint") {
        bigintVal = v;
    } else if (typeof v === "string") {
        try {
            const str = v.trim().replace(NUMERIC_CLEAN_REGEX, "");
            const dotIdx = str.indexOf(".");
            const cleanStr = dotIdx !== -1 ? str.slice(0, dotIdx) : str;
            bigintVal = BigInt(cleanStr);
        } catch {
            const num = toValidFloat(v);
            if (num === null) return null;
            bigintVal = BigInt(Math.trunc(num));
        }
    } else {
        const num = toValidFloat(v);
        if (num === null) return null;
        bigintVal = BigInt(Math.trunc(num));
    }

    const limits = typeof range === "string" ? BIGINT_RANGES[range] : range;
    return clamp({ val: bigintVal, min: limits.min, max: limits.max });
}
