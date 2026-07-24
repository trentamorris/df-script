/** @internalfile */
import { isPlainObj, isRegExp, isValidDateObj, isSet, isMap, unboxPrimitiveObj } from "./object";
import { isTypedArray } from "./array";

export function isBlankString(v: unknown): v is string {
    const unwrapped = unboxPrimitiveObj(v);
    if (typeof unwrapped === "string") {
        return unwrapped.trim().length === 0;
    }
    return false;
}

const ESCAPE_CHARS_REGEX = /[-\/\\^$*+?.()|\[\]{}]/g;

export function escapeRegExp(val: unknown): string {
    const cleanVal = unboxPrimitiveObj(val);
    if (cleanVal == null) return "";
    const str = String(cleanVal);

    if (typeof (RegExp as any).escape === "function") {
        return (RegExp as any).escape(str);
    }

    return str.replace(ESCAPE_CHARS_REGEX, "\\$&");
}

export type StripMode = "both" | "start" | "end";

export type StripCharsOptions = {
    /**
     * The strip mode: "both" (default), "start", or "end".
     */
    mode?: StripMode;
    /**
     * If true, returns an empty string instead of null when the result is empty or input is null.
     */
    returnStringOnNull?: boolean;
    /**
     * The maximum number of non-matching characters allowed to be skipped from the start
     * before a match block is found. Passing -1 or null means scan the full length.
     */
    maxScanStart?: number | null;
    /**
     * The maximum number of non-matching characters allowed to be skipped from the end
     * before a match block is found. Passing -1 or null means scan the full length.
     */
    maxScanEnd?: number | null;
    /**
     * The maximum number of non-contiguous matching blocks allowed to be stripped from the start.
     * Passing -1 or null means strip all matching blocks.
     */
    maxMatchesStart?: number | null;
    /**
     * The maximum number of non-contiguous matching blocks allowed to be stripped from the end.
     * Passing -1 or null means strip all matching blocks.
     */
    maxMatchesEnd?: number | null;
    /**
     * If true, trims standard whitespace first before performing character stripping.
     */
    trimFirst?: boolean;
    /**
     * Options that apply only when the characters parameter is a string (and not a RegExp).
     */
    stringOptions?: {
        /**
         * If true, treats the characters string as a literal substring rather than a set of characters.
         */
        literal?: boolean;
        /**
         * If true, performs case-insensitive character and substring matching.
         */
        caseInsensitive?: boolean;
    };
};

export function stripChars(
    str: string | null | undefined,
    characters: string | RegExp | null = null,
    options: StripCharsOptions = {}
): string | null {
    if (str == null) {
        return options.returnStringOnNull ? "" : null;
    }

    const {
        mode = "both",
        returnStringOnNull = false,
        maxScanStart = 1,
        maxScanEnd = 1,
        maxMatchesStart = 1,
        maxMatchesEnd = 1,
        trimFirst = false,
        stringOptions
    } = options;

    const { literal = false, caseInsensitive = false } = stringOptions ?? {};

    const trimString = (s: string, m: StripMode = "both"): string => {
        if (m === "start") return s.trimStart();
        if (m === "end") return s.trimEnd();
        return s.trim();
    };

    let workStr = str;
    if (trimFirst && characters != null) {
        workStr = trimString(str, mode);
    }

    if (characters == null) {
        const result = trimString(workStr, mode);
        return (returnStringOnNull || result !== "") ? result : null;
    }

    const matches = isRegExp(characters)
        ? (char: string) => {
            try {
                characters.lastIndex = 0;
            } catch { }
            return characters.test(char);
        }
        : (() => {
            const targetSet = new Set(caseInsensitive ? (characters as string).toLowerCase() : characters);
            return (char: string) => targetSet.has(caseInsensitive ? char.toLowerCase() : char);
        })();

    const len = workStr.length;

    const isDefaultScan = maxScanStart === 1 && maxMatchesStart === 1 && maxScanEnd === 1 && maxMatchesEnd === 1;
    if (isDefaultScan && !literal) {
        let startIndex = 0;
        let endIndex = len;

        if (mode === "both" || mode === "start") {
            while (startIndex < len && matches(workStr[startIndex])) {
                startIndex++;
            }
        }

        if (mode === "both" || mode === "end") {
            while (endIndex > startIndex && matches(workStr[endIndex - 1])) {
                endIndex--;
            }
        }

        const result = startIndex === 0 && endIndex === len ? workStr : workStr.substring(startIndex, endIndex);
        return (returnStringOnNull || result !== "") ? result : null;
    }

    const stripped = new Uint8Array(len);

    const scanNonLiteral = (
        isStart: boolean,
        limit: number | null,
        maxMatches: number | null
    ): void => {
        if (len === 0 || maxMatches === 0) {
            return;
        }

        const start = isStart ? 0 : len - 1;
        const end = isStart ? len : -1;
        const step = isStart ? 1 : -1;

        let inBlock = false;
        let matchesFound = 0;
        let totalSkipped = 0;

        for (let i = start; i !== end; i += step) {
            if (matches(workStr[i])) {
                if (!inBlock) {
                    if (limit !== null && limit >= 0 && totalSkipped >= limit) {
                        break;
                    }
                    if (maxMatches !== null && maxMatches >= 0 && matchesFound >= maxMatches) {
                        break;
                    }
                    inBlock = true;
                    matchesFound++;
                }
                stripped[i] = 1;
            } else {
                inBlock = false;
                totalSkipped++;
                if (limit !== null && limit >= 0 && totalSkipped >= limit) {
                    break;
                }
            }
        }
    };

    const scanLiteral = (
        patStr: string,
        patLen: number,
        isStart: boolean,
        limit: number | null,
        maxMatches: number | null
    ): void => {
        if (len === 0 || maxMatches === 0 || patLen === 0) {
            return;
        }

        let currentIdx = isStart ? 0 : len - 1;
        let matchesFound = 0;
        let totalSkipped = 0;
        const searchStr = caseInsensitive ? workStr.toLowerCase() : workStr;

        while (currentIdx >= 0 && currentIdx < len) {
            if (maxMatches !== null && maxMatches >= 0 && matchesFound >= maxMatches) {
                break;
            }

            const searchStart = isStart ? currentIdx : (currentIdx - patLen + 1);
            if (!isStart && searchStart < 0) {
                break;
            }

            const matchIdx = isStart
                ? searchStr.indexOf(patStr, searchStart)
                : searchStr.lastIndexOf(patStr, searchStart);

            if (matchIdx === -1) {
                break;
            }

            const skippedInThisStep = isStart
                ? (matchIdx - currentIdx)
                : (currentIdx - (matchIdx + patLen - 1));
            totalSkipped += skippedInThisStep;

            if (limit !== null && limit >= 0 && totalSkipped >= limit) {
                break;
            }

            for (let i = 0; i < patLen; i++) {
                stripped[matchIdx + i] = 1;
            }
            matchesFound++;
            currentIdx = isStart ? (matchIdx + patLen) : (matchIdx - 1);
        }
    };

    if (mode === "both" || mode === "start") {
        if (literal && typeof characters === "string") {
            const patStr = caseInsensitive ? characters.toLowerCase() : characters;
            scanLiteral(patStr, characters.length, true, maxScanStart, maxMatchesStart);
        } else {
            scanNonLiteral(true, maxScanStart, maxMatchesStart);
        }
    }

    if (mode === "both" || mode === "end") {
        if (literal && typeof characters === "string") {
            const patStr = caseInsensitive ? characters.toLowerCase() : characters;
            scanLiteral(patStr, characters.length, false, maxScanEnd, maxMatchesEnd);
        } else {
            scanNonLiteral(false, maxScanEnd, maxMatchesEnd);
        }
    }

    let result = "";
    for (let i = 0; i < len; i++) {
        if (stripped[i] === 0) {
            result += workStr[i];
        }
    }
    return (returnStringOnNull || result !== "") ? result : null;
}

export function toCanonicalString(
    val: any,
    { depth = 0, maxDepth = 50 }: { depth?: number; maxDepth?: number } = {}
): string {
    if (depth > maxDepth) {
        return "v:circular";
    }
    if (val === null) {
        return "v:null";
    }
    if (val === undefined) {
        return "v:undefined";
    }

    if (isValidDateObj(val)) {
        return `d:${val.getTime()}`;
    }

    if (isTypedArray(val)) {
        return `u:${val.constructor.name}:${val.toString()}`;
    }

    if (Array.isArray(val)) {
        const len = val.length;
        const parts = new Array(len);
        const nextOpt = { depth: depth + 1, maxDepth };
        for (let i = 0; i < len; i++) {
            parts[i] = toCanonicalString(val[i], nextOpt);
        }
        return `a:[${parts.join(",")}]`;
    }

    if (isSet(val)) {
        const arr = Array.from(val);
        const len = arr.length;
        const parts = new Array(len);
        const nextOpt = { depth: depth + 1, maxDepth };
        for (let i = 0; i < len; i++) {
            parts[i] = toCanonicalString(arr[i], nextOpt);
        }
        parts.sort();
        return `set:[${parts.join(",")}]`;
    }

    if (isMap(val)) {
        const keys = Array.from(val.keys());
        const len = keys.length;
        const parts = new Array(len);
        const nextOpt = { depth: depth + 1, maxDepth };
        for (let i = 0; i < len; i++) {
            const k = keys[i];
            parts[i] = `${toCanonicalString(k, nextOpt)}:${toCanonicalString(val.get(k), nextOpt)}`;
        }
        parts.sort();
        return `map:{${parts.join(",")}}`;
    }

    if (typeof val === "object" && typeof val.toJSON === "function") {
        const jsonVal = val.toJSON();
        if (jsonVal !== val) {
            return `j:${toCanonicalString(jsonVal, { depth: depth + 1, maxDepth })}`;
        }
    }

    if (isPlainObj(val)) {
        const keys = Object.keys(val).sort();
        const len = keys.length;
        const parts = new Array(len);
        const nextOpt = { depth: depth + 1, maxDepth };
        for (let i = 0; i < len; i++) {
            const k = keys[i];
            parts[i] = `${k}:${toCanonicalString(val[k], nextOpt)}`;
        }
        return `o:{${parts.join(",")}}`;
    }

    if (isRegExp(val)) {
        return `r:${val.toString()}`;
    }

    if (typeof val === "function") {
        return `f:${val.toString()}`;
    }

    if (typeof val === "string") {
        return `s:${val}`;
    }

    if (typeof val === "symbol") {
        return `y:${val.toString()}`;
    }

    return `${typeof val}:${val}`;
}

export interface ChangeCaseOptions {
    format: "camel" | "kebab" | "pascal" | "snake";
}

const CONTRACTION_REGEX = /(\p{L})['’](\p{L})/gu;
const WORDS_REGEX = new RegExp(
    [
        // Rule A: Acronym Plurals (e.g., 'KPIs', 'APIs')
        `\\p{Lu}+s(?!\\p{Ll})`,
        // Rule B: Acronym Transitions (e.g., 'HTTP' in 'HTTPClient')
        `\\p{Lu}+(?=\\p{Lu}\\p{Ll})`,
        // Rule C: TitleCase / PascalCase words (e.g., 'Client')
        `\\p{Lu}+\\p{Ll}*`,
        // Rule D: Pure lowercase words
        `\\p{Ll}+`,
        // Rule E: Numeric digit groups
        `\\p{N}+`,
        // Rule F: Non-cased global scripts (e.g., Kanji, Cyrillic variants, Arabic)
        `\\p{L}+`
    ].join("|"),
    "gu"
);

// JavaScript language-level reserved keywords to block prototype pollution attacks
const DANGEROUS_PROPERTIES = new Set(["__proto__", "proto", "constructor", "prototype"]);

/**
 * Fully robust, Unicode-aware string tokenization engine.
 * Guarded against prototype pollution, type errors, and NFD text formatting.
 */
export function toWords(str: any): string[] {
    if (str === null || str === undefined) return [];
    const primitiveStr = String(str);
    if (!primitiveStr) return [];

    const normalized = primitiveStr
        .normalize("NFC")
        .replace(CONTRACTION_REGEX, "$1$2");

    const matches = normalized.match(WORDS_REGEX) || [];

    const safeTokens: string[] = [];
    for (let i = 0; i < matches.length; i++) {
        const token = matches[i];
        if (!DANGEROUS_PROPERTIES.has(token)) {
            safeTokens.push(token);
        }
    }

    return safeTokens;
}

/**
 * High-performance, predictable case converter
 */
export function changeCase(str: any, options: ChangeCaseOptions): string {
    const words = toWords(str);
    const len = words.length;
    if (len === 0) return "";

    const { format } = options;

    if (format === "camel" || format === "pascal") {
        let res = "";
        for (let i = 0; i < len; i++) {
            const w = words[i];
            res += (i === 0 && format === "camel")
                ? w.toLowerCase()
                : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }
        return res;
    }

    if (format === "kebab" || format === "snake") {
        const joinChar = format === "kebab" ? "-" : "_";
        const lowerWords = new Array(len);
        for (let i = 0; i < len; i++) {
            lowerWords[i] = words[i].toLowerCase();
        }
        return lowerWords.join(joinChar);
    }

    return String(str);
}
