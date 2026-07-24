/** @internalfile */
import type { JSONFormat } from "../types";
import { isTypedArray } from "./array";
import { isSet, isMap, isRegExp, isError, isURLSearchParams, isValidDateObj } from "./object";

const NEWLINE_REGEX = /\r\n|\n|\r/g;
const NO_FALLBACK = Symbol("no_fallback");

const isWrapped = (str: string): boolean => {
    const len = str.length;
    if (len < 2) return false;
    const fChar = str[0];
    const lChar = str[len - 1];
    return (fChar === "{" && lChar === "}") || (fChar === "[" && lChar === "]");
};

const isWrappedUntrimmed = (str: string): boolean => {
    let first = 0;
    const len = str.length;
    while (first < len && /\s/.test(str[first])) {
        first++;
    }
    let last = len - 1;
    while (last >= first && /\s/.test(str[last])) {
        last--;
    }
    if (first >= last) return false;
    const fChar = str[first];
    const lChar = str[last];
    return (fChar === "{" && lChar === "}") || (fChar === "[" && lChar === "]");
};

export interface NDJSONParseOptions {
    /**
     * Skip malformed or invalid lines instead of failing the entire parse.
     * @default false
     */
    skipInvalidLines?: boolean;

    /**
     * Maximum number of non-empty lines to validate or parse. Lines beyond this limit are ignored.
     */
    maxLines?: number;

    /**
     * Number of non-empty lines to skip at the beginning of the content.
     * @default 0
     */
    skipLines?: number;
}

export interface JSONParseOptions {
    /**
     * The format of the JSON content, either "json" (standard JSON) or "ndjson" (Newline Delimited JSON).
     * @default "json"
     */
    format?: JSONFormat;

    /**
     * Whether to allow JSON primitives (like numbers, booleans, strings, or null) instead of requiring wrapped arrays/objects.
     * @default false
     */
    allowPrimitives?: boolean;

    /**
     * Whether to trim leading and trailing whitespace from the outermost input before validating/parsing.
     * @default false
     */
    trimBeforeParse?: boolean;

    /**
     * A reviver function passed directly to JSON.parse for custom value transformation.
     */
    reviver?: Parameters<typeof JSON.parse>[1];

    /**
     * Options specific to NDJSON parsing. Only applicable when format is "ndjson".
     */
    ndjson?: NDJSONParseOptions;

}

export type SafeJsonParseOptions<T = unknown, F = T> = JSONParseOptions & {
    /**
     * A guard function to validate the shape of the parsed result. If the guard returns false,
     * `onError` is called and the fallback (or original input) is returned.
     */
    guard?: ((value: unknown) => value is T) | ((value: unknown) => boolean);

    /**
     * Called when parsing succeeds but the guard check fails.
     */
    onError?: (err: unknown) => void;

    /**
     * A fallback value to return if parsing fails or the guard check fails.
     * If not specified, the original input is returned.
     */
    fallback?: F;
};

/**
 * Validates whether the given value is a valid JSON or NDJSON string.
 * Leverages single-pass parsing under the hood to ensure zero duplicate loops.
 *
 * @param input - The value to check.
 * @param options - Configuration options for validation.
 * @returns `true` if the input is a valid JSON or NDJSON string; `false` otherwise.
 */
export function isJsonString(
    input: unknown,
    options: JSONParseOptions = {}
): input is string {
    if (typeof input !== "string") return false;

    const sentinel = Symbol("invalid");
    const result = safeJsonParse(input, {
        ...options,
        fallback: sentinel,
        onError: () => { } // Silence errors during pure structural checking
    });

    return result !== sentinel;
}

/**
 * Safely parses a string containing JSON or NDJSON content in a single pass, returning the parsed value if successful
 * and passing the guard validation. If parsing or validation fails, returns the fallback value (if provided)
 * or the original input.
 *
 * @param input - The value to parse.
 * @param options - Configuration options for parsing and validation.
 * @returns The parsed value, the fallback, or the original input.
 */
export function safeJsonParse<T = unknown, I = unknown, F = T>(
    input: I,
    {
        format = "json",
        allowPrimitives = false,
        trimBeforeParse = false,
        reviver,
        ndjson: { skipInvalidLines = false, maxLines, skipLines } = {},
        guard,
        onError,
        fallback = NO_FALLBACK as any
    }: SafeJsonParseOptions<T, F> = {}
): T | I | F {
    if (typeof input !== "string") {
        return fallback !== NO_FALLBACK ? fallback : input;
    }

    const s = trimBeforeParse ? input.trim() : input;
    if (s === "") {
        return fallback !== NO_FALLBACK ? fallback : input;
    }

    let result: unknown;

    try {
        if (format === "ndjson") {
            const parsedData: any[] = [];
            let nonEmptyCount = 0;
            let parsedCount = 0;
            let lastIndex = 0;
            NEWLINE_REGEX.lastIndex = 0;
            let match: RegExpExecArray | null;

            while (true) {
                match = NEWLINE_REGEX.exec(s);
                const line = match ? s.substring(lastIndex, match.index) : s.substring(lastIndex);
                if (match) {
                    lastIndex = NEWLINE_REGEX.lastIndex;
                }

                const trimmedLine = line.trim();
                if (trimmedLine !== "") {
                    nonEmptyCount++;
                    if (skipLines === undefined || nonEmptyCount > skipLines) {
                        if (!allowPrimitives && !isWrapped(trimmedLine)) {
                            if (!skipInvalidLines) {
                                throw new Error("NDJSON line is not wrapped and primitives are disallowed");
                            }
                        } else {
                            try {
                                parsedData.push(JSON.parse(trimmedLine, reviver));
                                parsedCount++;
                                if (maxLines !== undefined && parsedCount >= maxLines) break;
                            } catch (err) {
                                if (!skipInvalidLines) throw err;
                            }
                        }
                    }
                }

                if (!match) break;
            }

            if (parsedData.length === 0) {
                throw new Error("No valid NDJSON lines processed");
            }
            result = parsedData;
        } else {
            if (!allowPrimitives && !isWrappedUntrimmed(s)) {
                throw new Error("JSON string is not wrapped and primitives are disallowed");
            }
            result = JSON.parse(s, reviver);
        }
    } catch (err) {
        onError?.(err);
        return fallback !== NO_FALLBACK ? fallback : input;
    }

    if (guard && !guard(result)) {
        onError?.(new Error("Parsed value failed guard validation"));
        return fallback !== NO_FALLBACK ? fallback : input;
    }

    return result as T;
}

export interface SafeJsonReplacerOptions {
    /** Custom formatter function for Date objects. Ignored if onDate is specified. */
    formatDate?: (v: Date) => string;

    /** Convert BigInts to numeric strings ("123") or numbers if safe. Defaults to "string". */
    bigintStrategy?: "string" | "number";

    /** Custom serialization override for BigInt values. */
    onBigInt?: (v: bigint) => any;

    /** Custom serialization override for TypedArray values. */
    onTypedArray?: (v: any) => any;

    /** Custom serialization override for Set objects. */
    onSet?: (v: Set<any>) => any;

    /** Custom serialization override for Map objects. */
    onMap?: (v: Map<any, any>) => any;

    /** Custom serialization override for RegExp objects. */
    onRegExp?: (v: RegExp) => any;

    /** Custom serialization override for Date objects. Takes precedence over formatDate. */
    onDate?: (v: Date) => any;

    /** Custom serialization override for Error objects. Prevents empty {} strings. */
    onError?: (v: Error) => any;

    /** Custom serialization override for URLSearchParams objects. */
    onURLSearchParams?: (v: URLSearchParams) => any;

    /** Catch-all serialization override for custom types. Runs after native type checks. */
    onCustom?: (this: any, k: string, v: any) => any;

    /** If true, handles circular references by replacing them with a string/override instead of throwing. */
    handleCircular?: boolean;

    /** Custom fallback string or value when a circular reference is found. Defaults to "[Circular]" */
    onCircular?: (this: any, k: string, v: any) => any;

    /** If true, disables/voids the default safe serialization for BigInt values. */
    voidBigIntReplacement?: boolean;

    /** If true, disables/voids the default safe serialization for TypedArray values. */
    voidTypedArrayReplacement?: boolean;

    /** If true, disables/voids the default safe serialization for Set objects. */
    voidSetReplacement?: boolean;

    /** If true, disables/voids the default safe serialization for Map objects. */
    voidMapReplacement?: boolean;

    /** If true, disables/voids the default safe serialization for RegExp objects. */
    voidRegExpReplacement?: boolean;

    /** If true, disables/voids the default safe serialization for Date objects. */
    voidDateReplacement?: boolean;

    /** A custom replacer function or array whitelist that runs first for pre-processing keys/values. */
    replacer?: ((this: any, k: string, v: any) => any) | (string | number)[] | null;
}

export function createSafeJsonReplacer(options: SafeJsonReplacerOptions = {}) {
    const bigintStrat = options.bigintStrategy ?? "string";
    let seen = options.handleCircular ? new WeakSet<any>() : null;
    const isArrayReplacer = Array.isArray(options.replacer);
    const whitelist = isArrayReplacer ? (options.replacer as (string | number)[]).map(String) : null;

    const handleBigInt = (val: bigint) => {
        if (bigintStrat === "number") {
            return val <= BigInt(Number.MAX_SAFE_INTEGER) && val >= BigInt(Number.MIN_SAFE_INTEGER)
                ? Number(val)
                : val.toString();
        }
        return val.toString();
    };

    return function replacer(this: any, k: string, v: any): any {
        let val = v;
        if (typeof options.replacer === "function") {
            val = options.replacer.call(this, k, v);
        } else if (whitelist) {
            if (k !== "" && !Array.isArray(this) && !whitelist.includes(k)) {
                return undefined;
            }
        }

        if (val === undefined) return undefined;

        const raw = (val === v && this != null) ? this[k] : val;

        if (typeof options.onCustom === "function") {
            const customVal = options.onCustom.call(this, k, raw);
            if (customVal !== raw || (customVal === undefined && raw !== undefined)) {
                return customVal;
            }
        }

        if (raw !== null && typeof raw !== "object" && typeof raw !== "bigint") {
            return val;
        }

        if (seen && raw !== null && typeof raw === "object") {
            if (k === "") {
                seen = new WeakSet();
            }
            if (seen.has(raw)) {
                return options.onCircular ? options.onCircular.call(this, k, raw) : "[Circular]";
            }
            seen.add(raw);
        }

        if (typeof raw === "bigint") {
            if (options.voidBigIntReplacement) return val;
            return options.onBigInt ? options.onBigInt(raw) : handleBigInt(raw);
        }
        if (isTypedArray(raw)) {
            if (options.voidTypedArrayReplacement) return val;
            return options.onTypedArray ? options.onTypedArray(raw) : Array.from(raw as any);
        }
        if (isSet(raw)) {
            if (options.voidSetReplacement) return val;
            return options.onSet ? options.onSet(raw) : Array.from(raw);
        }
        if (isMap(raw)) {
            if (options.voidMapReplacement) return val;
            return options.onMap ? options.onMap(raw) : Array.from(raw.entries());
        }
        if (isRegExp(raw)) {
            if (options.voidRegExpReplacement) return val;
            return options.onRegExp ? options.onRegExp(raw) : raw.toString();
        }
        if (isValidDateObj(raw)) {
            if (options.voidDateReplacement) return val;
            if (options.onDate) return options.onDate(raw);
            return options.formatDate ? options.formatDate(raw) : raw.toISOString();
        }
        if (isError(raw)) {
            return options.onError ? options.onError(raw) : { name: raw.name, message: raw.message, stack: raw.stack };
        }
        if (isURLSearchParams(raw)) {
            return options.onURLSearchParams ? options.onURLSearchParams(raw) : raw.toString();
        }

        return val;
    };
}
