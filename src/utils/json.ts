/** @internalfile */
import type { JSONFormat } from "../types";
import { isTypedArray, stepSliceArray } from "./array";
import { isObj, isSafeObjPropertyKey, isSet, isMap, isRegExp, isError, isURLSearchParams, isValidDateObj, unboxPrimitiveObj } from "./object";
import { isValidBigInt, toValidInt, SAFE_BIGINT_RANGE } from "./number";
import { isBlankString, stripChars } from "./string";
import { InvalidArgumentError, IOStreamError } from "../exceptions";
import { CONTROL_UNESCAPE_MAP, NEWLINE_REGEX } from "../constants";

const _INVALID_SYMBOL = Symbol("invalid");
const _WILDCARD = "*";

function _isWrappedJsonComposite(str: string, options: { trim?: boolean } = {}): boolean {
    const s = options?.trim ? (stripChars(str) ?? "") : str;
    const len = s.length;
    if (len < 2) return false;
    const fChar = s[0];
    const lChar = s[len - 1];
    return (fChar === "{" && lChar === "}") || (fChar === "[" && lChar === "]");
}

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
export function isJsonString<T = unknown>(
    input: unknown,
    options: SafeJsonParseOptions<T> = {}
): input is string {
    if (typeof input !== "string") return false;

    return safeJsonParse(input, {
        ...options,
        fallback: _INVALID_SYMBOL,
        onError: undefined
    }) !== _INVALID_SYMBOL;
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
export function safeJsonParse<T = unknown, F = unknown>(
    input: unknown,
    options: SafeJsonParseOptions<T, F> = {}
): T | F {
    const fallbackVal = "fallback" in options ? options.fallback : input;
    if (typeof input !== "string") return fallbackVal as F;

    const {
        format = "json",
        allowPrimitives = false,
        trimBeforeParse = false,
        reviver,
        ndjson = {},
        guard,
        onError
    } = options;

    const s = trimBeforeParse ? input.trim() : input;

    try {
        let result: unknown;

        if (format === "ndjson") {
            const { skipInvalidLines = false, maxLines, skipLines = 0 } = ndjson;
            const parsedData: any[] = [];
            const rawLines = s.split(NEWLINE_REGEX);
            const limit = maxLines ?? Infinity;
            let skipped = 0;
            let nonBlankCount = 0;

            for (let i = 0; i < rawLines.length && parsedData.length < limit; i++) {
                const line = rawLines[i].trim();
                if (line.length === 0 || skipped++ < skipLines) continue;
                nonBlankCount++;

                try {
                    if (!allowPrimitives && !_isWrappedJsonComposite(line)) {
                        throw new InvalidArgumentError("NDJSON line is not wrapped and primitives are disallowed");
                    }
                    parsedData.push(JSON.parse(line, reviver));
                } catch (err) {
                    if (!skipInvalidLines) throw err;
                }
            }

            if (parsedData.length === 0 && nonBlankCount > 0) {
                throw new IOStreamError("No valid NDJSON lines processed");
            }

            result = parsedData;
        } else {
            if (!allowPrimitives && !_isWrappedJsonComposite(s, { trim: !trimBeforeParse })) {
                throw new InvalidArgumentError("JSON string is not wrapped and primitives are disallowed");
            }
            result = JSON.parse(s, reviver);
        }

        if (guard && !guard(result)) {
            throw new InvalidArgumentError("Parsed value failed guard validation");
        }

        return result as any;
    } catch (err) {
        try { onError?.(err); } catch { /* ignore user handler errors */ }
        return fallbackVal as any;
    }
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
    const whitelist = Array.isArray(options.replacer)
        ? new Set(options.replacer.map(String))
        : null;

    let seen = options.handleCircular ? new WeakSet<object>() : null;

    return function replacer(this: any, k: string, v: any): any {
        let val = v;

        if (typeof options.replacer === "function") {
            val = options.replacer.call(this, k, v);
        } else if (whitelist && k !== "" && !Array.isArray(this) && !whitelist.has(k)) {
            return undefined;
        }

        if (val === undefined) return undefined;

        const raw = (val === v && this != null) ? this[k] : val;

        if (options.onCustom) {
            const customVal = options.onCustom.call(this, k, raw);
            if (customVal !== raw || (customVal === undefined && raw !== undefined)) {
                return customVal;
            }
        }

        const candidate = (val !== null && typeof val === "object") || typeof val === "bigint" ? val : raw;
        const unboxed = isObj(candidate) ? unboxPrimitiveObj(candidate) : candidate;

        if (unboxed !== null && typeof unboxed !== "object" && typeof unboxed !== "bigint") {
            return val;
        }

        if (seen && (isObj(unboxed) || Array.isArray(unboxed))) {
            if (k === "") seen = new WeakSet();
            if (seen.has(unboxed)) return options.onCircular ? options.onCircular.call(this, k, unboxed) : "[Circular]";
            seen.add(unboxed);
        }

        if (typeof unboxed === "bigint") {
            if (options.voidBigIntReplacement) return val;
            if (options.onBigInt) return options.onBigInt(unboxed);
            if (bigintStrat === "number" && isValidBigInt(unboxed, SAFE_BIGINT_RANGE)) return Number(unboxed);
            return unboxed.toString();
        }

        if (isTypedArray(unboxed)) return options.voidTypedArrayReplacement ? val : (options.onTypedArray?.(unboxed) ?? Array.from(unboxed as any));
        if (isSet(unboxed)) return options.voidSetReplacement ? val : (options.onSet?.(unboxed) ?? Array.from(unboxed));
        if (isMap(unboxed)) return options.voidMapReplacement ? val : (options.onMap?.(unboxed) ?? Array.from(unboxed.entries()));
        if (isRegExp(unboxed)) return options.voidRegExpReplacement ? val : (options.onRegExp?.(unboxed) ?? unboxed.toString());
        if (isValidDateObj(unboxed)) return options.voidDateReplacement ? val : (options.onDate?.(unboxed) ?? options.formatDate?.(unboxed) ?? unboxed.toISOString());
        if (isError(unboxed)) return options.onError?.(unboxed) ?? { name: unboxed.name, message: unboxed.message, stack: unboxed.stack };
        if (isURLSearchParams(unboxed)) return options.onURLSearchParams?.(unboxed) ?? unboxed.toString();

        return val;
    };
}

/**
 * Represents the type of operation a JSONPath token performs.
 */
type JsonTokenType =
    /**
     * Selects an object property by name (e.g., .foo or ['foo']) 
     */
    | "prop"
    /**
     * Selects a zero-based or negative array index (e.g., [0] or [-1]) 
     */
    | "idx"
    /**
     * Selects a range or stepped slice of an array (e.g., [1:5:2]) 
     */
    | "slice"
    /**
     * Selects all immediate properties of an object or elements of an array (e.g., .* or [*]) 
     */
    | "wildcard"
    /** 
     * Recursively searches and collects matching keys down the hierarchy (e.g., ..foo) 
     */
    | "rec";

/**
 * Parsed AST token representing a single evaluation step in a JSONPath expression.
 */
interface JsonToken {
    /** The evaluation operation type. */
    type: JsonTokenType;

    /** Property name or recursive search key. Used by "prop" and "rec" tokens. */
    key?: string;

    /** Target index position. Used by "idx" tokens. Supports negative indices. */
    idx?: number;

    /** Starting array index (inclusive). Used by "slice" tokens. Defaults to 0 or end of array depending on step. */
    start?: number;

    /** Ending array index (exclusive). Used by "slice" tokens. Defaults to array bound depending on step. */
    end?: number;

    /** Increment step value. Used by "slice" tokens. Defaults to 1. Cannot be 0. */
    step?: number;
}



const _unescapeQuotes = (str: string): string =>
    str.replace(/\\(.)/g, (_, c) => CONTROL_UNESCAPE_MAP[c] ?? c);

/**
 * Tokenizes a JSONPath query string (e.g. "$.user.items[0]") into an array 
 * of executable query tokens without polluting global regex state.
 * Returns null if path contains unparsed/invalid syntax fragments.
 */
function _tokenizeJsonPath(path: string): JsonToken[] | null {
    const cleanPath = path.trim().replace(/^\$/, "");
    if (!cleanPath) return [];

    const tokens: JsonToken[] = [];
    const tokenRegex = /(\.\.|\.)?(?:\[\s*(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"|(\*)|(-?\d*(?::-?\d*){0,2}))\s*\]|([^\.\[]+))/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = tokenRegex.exec(cleanPath)) !== null) {
        if (match.index !== lastIndex) return null;
        lastIndex = tokenRegex.lastIndex;

        const [, dot, sq, dq, star, numOrSlice, key] = match;
        const isRec = dot === "..";
        const str = sq ?? dq;
        const prop = str !== undefined ? _unescapeQuotes(str) : (star ?? key);

        if (prop !== undefined) {
            tokens.push(prop === _WILDCARD && !isRec ? { type: "wildcard" } : { type: isRec ? "rec" : "prop", key: prop });
            continue;
        }

        if (numOrSlice !== undefined) {
            if (!numOrSlice.includes(":")) {
                const idx = toValidInt(numOrSlice);
                if (idx === null) return null;
                tokens.push({ type: "idx", idx });
            } else {
                const [s0, s1, s2] = numOrSlice.split(":");
                tokens.push({
                    type: "slice",
                    start: toValidInt(s0) ?? undefined,
                    end: toValidInt(s1) ?? undefined,
                    step: toValidInt(s2) ?? 1
                });
            }
        }
    }

    return lastIndex === cleanPath.length ? tokens : null;
}

function _collectJsonRecursive(val: any, tok: JsonToken, results: any[], visited = new Set<object>()): void {
    if (val == null || !isSafeObjPropertyKey(tok.key) || typeof val !== "object" || visited.has(val)) return;

    visited.add(val);

    const isArr = Array.isArray(val);
    if (!isArr && !isObj(val)) return;

    const children = isArr ? val : Object.values(val);

    if (tok.key === _WILDCARD) {
        for (let i = 0; i < children.length; i++) results.push(children[i]);
    } else if (!isArr && Object.hasOwn(val, tok.key)) {
        results.push(val[tok.key]);
    }

    for (let i = 0; i < children.length; i++) {
        _collectJsonRecursive(children[i], tok, results, visited);
    }
}

function _resolveJsonPathStep(item: any, tok: JsonToken, next: any[]): void {
    if (item == null) return;

    switch (tok.type) {
        case "prop":
            if (isObj(item) && isSafeObjPropertyKey(tok.key) && Object.hasOwn(item, tok.key!)) {
                next.push(item[tok.key!]);
            }
            break;
        case "idx": {
            if (!Array.isArray(item)) break;
            const i = tok.idx! < 0 ? item.length + tok.idx! : tok.idx!;
            if (i >= 0 && i < item.length) next.push(item[i]);
            break;
        }
        case "slice": {
            if (!Array.isArray(item) || tok.step === 0) break;
            const step = tok.step ?? 1;
            const sliced = stepSliceArray(item, {
                step,
                offsetStart: tok.start ?? (step > 0 ? 0 : item.length - 1),
                offsetEnd: tok.end,
                nullOnOob: true
            });
            if (sliced) {
                for (let i = 0; i < sliced.length; i++) next.push(sliced[i]);
            }
            break;
        }
        case "wildcard": {
            const vals = Array.isArray(item) ? item : (isObj(item) ? Object.values(item) : null);
            if (vals) {
                for (let i = 0; i < vals.length; i++) next.push(vals[i]);
            }
            break;
        }
        case "rec":
            _collectJsonRecursive(item, tok, next);
            break;
    }
}

/**
 * Extracts the first match from a JSON string or object using the provided JSONPath expression.
 */
export function jsonPathMatch(jsonInput: unknown, path: string): string | null {
    if (jsonInput == null || isBlankString(path)) return null;

    let root: any = jsonInput;
    if (typeof jsonInput === "string") {
        const trimmed = jsonInput.trim();
        if (trimmed === "") return null;

        root = safeJsonParse(trimmed, { allowPrimitives: true, fallback: _INVALID_SYMBOL });
        if (root === _INVALID_SYMBOL) {
            throw new InvalidArgumentError(`Invalid JSON string encountered in jsonPathMatch: "${jsonInput}"`);
        }
    }

    const tokens = _tokenizeJsonPath(path);
    if (tokens === null) return null;

    let curr: any[] = [root];
    for (let t = 0; t < tokens.length && curr.length > 0; t++) {
        const next: any[] = [];
        for (let c = 0; c < curr.length; c++) {
            _resolveJsonPathStep(curr[c], tokens[t], next);
        }
        curr = next;
    }

    if (curr.length === 0 || curr[0] == null) return null;

    const res = curr[0];
    if (isObj(res) || Array.isArray(res)) {
        try {
            return JSON.stringify(res, createSafeJsonReplacer({ handleCircular: true }));
        } catch {
            return null;
        }
    }
    return String(res);
}