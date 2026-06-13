import type { JSONFormat } from "../types";

const NEWLINE_REGEX = /\r\n|\n|\r/;
const NO_FALLBACK = Symbol("no_fallback");

const isWrapped = (str: string) =>
    (str.startsWith("{") && str.endsWith("}")) ||
    (str.startsWith("[") && str.endsWith("]"));

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

    /**
     * Skip the initial validation check (`isJsonString`) and attempt parsing directly.
     * Useful for maximum performance when the input is known or expected to be valid.
     * @default false
     */
    skipValidation?: boolean;
};

/**
 * Validates whether the given value is a valid JSON or NDJSON string according to the specified options.
 *
 * @param input - The value to check.
 * @param options - Configuration options for validation.
 * @returns `true` if the input is a valid JSON or NDJSON string; `false` otherwise.
 */
export function isJsonString(
    input: unknown,
    {
        format = "json",
        allowPrimitives = false,
        trimBeforeParse = false,
        reviver,
        ndjson: { skipInvalidLines = false, maxLines, skipLines } = {}
    }: JSONParseOptions = {}
): input is string {
    if (typeof input !== "string") return false;

    const s = trimBeforeParse ? input.trim() : input;
    if (s === "") return false;

    if (format === "ndjson") {
        const rawLines = s.split(NEWLINE_REGEX);
        const rawLen = rawLines.length;
        let hasValidLine = false;
        let nonEmptyCount = 0;
        let parsedCount = 0;
        for (let i = 0; i < rawLen; i++) {
            const line = rawLines[i];
            if (line === "") continue;
            nonEmptyCount++;
            if (skipLines !== undefined && nonEmptyCount <= skipLines) {
                continue;
            }
            if (maxLines !== undefined && parsedCount >= maxLines) {
                break;
            }
            parsedCount++;
            if (!allowPrimitives && !isWrapped(line)) {
                if (skipInvalidLines) continue;
                return false;
            }
            try {
                JSON.parse(line, reviver);
                hasValidLine = true;
            } catch {
                if (skipInvalidLines) continue;
                return false;
            }
        }
        return hasValidLine;
    } else {
        if (!allowPrimitives && !isWrapped(s)) return false;
        try {
            JSON.parse(s, reviver);
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Safely parses a string containing JSON or NDJSON content, returning the parsed value if successful
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
        fallback = NO_FALLBACK as any,
        skipValidation = false
    }: SafeJsonParseOptions<T, F> = {}
): T | I | F {
    if (!skipValidation) {
        if (!isJsonString(input, { format, allowPrimitives, trimBeforeParse, reviver, ndjson: { skipInvalidLines, maxLines, skipLines } })) {
            return fallback !== NO_FALLBACK ? fallback : input;
        }
    } else {
        if (typeof input !== "string") {
            return fallback !== NO_FALLBACK ? fallback : input;
        }
    }

    const s = trimBeforeParse ? (input as string).trim() : (input as string);
    if (s === "") {
        return fallback !== NO_FALLBACK ? fallback : input;
    }
    let result: unknown;

    try {
        if (format === "ndjson") {
            const rawLines = s.split(NEWLINE_REGEX);
            const rawLen = rawLines.length;
            const parsedData: any[] = [];
            let nonEmptyCount = 0;
            let parsedCount = 0;
            for (let i = 0; i < rawLen; i++) {
                const line = rawLines[i];
                if (line === "") continue;
                nonEmptyCount++;
                if (skipLines !== undefined && nonEmptyCount <= skipLines) {
                    continue;
                }
                if (maxLines !== undefined && parsedCount >= maxLines) {
                    break;
                }
                parsedCount++;
                if (skipInvalidLines) {
                    if (!allowPrimitives && !isWrapped(line)) continue;
                    try {
                        parsedData.push(JSON.parse(line, reviver));
                    } catch {
                        continue;
                    }
                } else {
                    if (skipValidation && !allowPrimitives && !isWrapped(line)) {
                        throw new Error("NDJSON line is not wrapped and primitives are disallowed");
                    }
                    parsedData.push(JSON.parse(line, reviver));
                }
            }
            result = parsedData;
        } else {
            if (skipValidation && !allowPrimitives && !isWrapped(s)) {
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

