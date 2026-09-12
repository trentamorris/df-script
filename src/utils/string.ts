/** @internalfile */
import { isPlainObj, isRegExp, isValidDateObj, isSet, isMap, isSafeObjPropertyKey, unboxPrimitiveObj } from "./object";
import { isTypedArray, toValidArray } from "./array";
import { isValidNumber, isValidInt } from "./number";
import {
    KEY_SEPARATOR,
    KEY_PAIR_SEPARATOR,
    TEXT_ENCODER,
    TEXT_DECODER,
    TEXT_DECODER_FATAL,
    MAX_C0_CONTROL_CODE,
    ASCII_DEL_CODE,
    SURROGATE_HIGH_MIN_CODE,
    SURROGATE_HIGH_MAX_CODE,
    SURROGATE_LOW_MIN_CODE,
    SURROGATE_LOW_MAX_CODE,
    NAMED_CONTROL_ESCAPES,
} from "../constants";
import { InvalidArgumentError } from "../exceptions";
import type { StringEncoding, EscapeRegexOptions, ExtractManyOptions, ExtractRegexEngineOptions, RegexEngineOptions, FindOptions, FindManyOptions, SplitOptions, ReplaceOptions, ReplaceManyOptions } from "../types";


export function isBlankString(v: unknown): v is string {
    const unwrapped = unboxPrimitiveObj(v);
    if (typeof unwrapped === "string") {
        return unwrapped.trim().length === 0;
    }
    return false;
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

function _trimByMode(str: string, mode: StripMode = "both"): string {
    if (mode === "start") return str.trimStart();
    if (mode === "end") return str.trimEnd();
    return str.trim();
}

export function stripChars(
    str: string | null | undefined,
    characters: string | RegExp | null = null,
    options: StripCharsOptions = {}
): string | null {
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

    if (str == null) return returnStringOnNull ? "" : null;

    const finish = (res: string) => (returnStringOnNull || res.length > 0) ? res : null;

    if (characters == null) return finish(_trimByMode(str, mode));

    const workStr = trimFirst ? _trimByMode(str, mode) : str;
    const len = workStr.length;
    if (len === 0) return returnStringOnNull ? "" : null;

    const isReg = isRegExp(characters);
    if (!isReg && typeof characters !== "string") return finish(workStr);
    if (typeof characters === "string" && characters.length === 0) return finish(workStr);

    const { literal = false, caseInsensitive = false } = stringOptions ?? {};
    const pattern = isReg
        ? characters
        : (literal ? escapeRegExp(characters) : `[${escapeRegExp(characters)}]+`);
    const asciiCaseInsensitive = isReg ? (characters.ignoreCase || caseInsensitive) : caseInsensitive;

    const matches = _collectPatternCandidates(
        workStr,
        pattern,
        0,
        { asciiCaseInsensitive },
        () => null
    );

    const matchCount = matches.length;
    if (matchCount === 0) return finish(workStr);

    const stripped = new Uint8Array(len);
    let hasStripped = false;

    const scan = (
        isStart: boolean,
        maxScan: number | null,
        maxMatches: number | null
    ): void => {
        if (maxMatches === 0) return;

        let totalSkipped = 0;
        let lastPos = isStart ? 0 : len;
        let blockCount = 0;

        const startIdx = isStart ? 0 : matchCount - 1;
        const endIdx = isStart ? matchCount : -1;
        const step = isStart ? 1 : -1;

        for (let i = startIdx; i !== endIdx; i += step) {
            const m = matches[i];
            const skipped = isStart ? (m._start - lastPos) : (lastPos - m._end);

            if (skipped > 0) {
                totalSkipped += skipped;
                if (maxScan !== null && maxScan >= 0 && totalSkipped >= maxScan) break;
            }

            if (skipped > 0 || literal || blockCount === 0) blockCount++;
            if (maxMatches !== null && maxMatches >= 0 && blockCount > maxMatches) break;

            stripped.fill(1, m._start, m._end);
            hasStripped = true;
            lastPos = isStart ? m._end : m._start;
        }
    };

    if (mode === "both" || mode === "start") scan(true, maxScanStart, maxMatchesStart);
    if (mode === "both" || mode === "end") scan(false, maxScanEnd, maxMatchesEnd);

    if (!hasStripped) return finish(workStr);

    let result = "";
    for (let i = 0; i < len; i++) {
        if (stripped[i] === 0) result += workStr[i];
    }
    return finish(result);
}

function _canonicalizeKeyed(
    keys: unknown[],
    getValue: (k: unknown) => unknown,
    nextOpt: { depth: number; maxDepth: number },
    prefix: string
): string {
    const len = keys.length;
    const parts = new Array(len);
    for (let i = 0; i < len; i++) {
        const k = keys[i];
        let v: unknown;
        try {
            v = getValue(k);
        } catch {
            v = "v:error";
        }
        parts[i] = `${toCanonicalString(k, nextOpt)}${KEY_SEPARATOR}${toCanonicalString(v, nextOpt)}`;
    }
    return `${prefix}{${parts.sort().join(KEY_PAIR_SEPARATOR)}}`;
}

function _canonicalizeList(items: unknown[], nextOpt: { depth: number; maxDepth: number }): string[] {
    const len = items.length;
    const parts = new Array(len);
    for (let i = 0; i < len; i++) {
        parts[i] = toCanonicalString(items[i], nextOpt);
    }
    return parts;
}

export function toCanonicalString(
    val: any,
    { depth = 0, maxDepth = 50 }: { depth?: number; maxDepth?: number } = {}
): string {
    if (depth > maxDepth) return "v:circular";
    if (val === null) return "v:null";
    if (val === undefined) return "v:undefined";

    val = unboxPrimitiveObj(val);
    const type = typeof val;

    if (type === "number" || type === "boolean" || type === "bigint") return `${type}:${val}`;
    if (type === "string") return `s:${val.length}:${val}`;
    if (type === "symbol" || type === "function") {
        const s = val.toString();
        return `${type === "symbol" ? "y" : "f"}:${s.length}:${s}`;
    }

    if (isValidDateObj(val)) return `d:${val.getTime()}`;
    if (isTypedArray(val)) {
        const s = val.toString();
        return `u:${val.constructor.name}:${s.length}:${s}`;
    }

    const nextOpt = { depth: depth + 1, maxDepth };

    if (Array.isArray(val)) return `a:[${_canonicalizeList(val, nextOpt).join(KEY_PAIR_SEPARATOR)}]`;
    if (isSet(val)) return `set:[${_canonicalizeList(Array.from(val), nextOpt).sort().join(KEY_PAIR_SEPARATOR)}]`;
    if (isMap(val)) return _canonicalizeKeyed(Array.from(val.keys()), (k) => val.get(k), nextOpt, "map:");

    if (typeof val.toJSON === "function") {
        try {
            const jsonVal = val.toJSON();
            if (jsonVal !== val) return `j:${toCanonicalString(jsonVal, nextOpt)}`;
        } catch {
            // Fall through
        }
    }

    if (isRegExp(val)) {
        const s = val.toString();
        return `r:${s.length}:${s}`;
    }

    if (isPlainObj(val)) {
        return _canonicalizeKeyed(Object.keys(val).sort(), (k) => val[k as string], nextOpt, "o:");
    }

    const s = String(val);
    return `${type}:${s.length}:${s}`;
}

export interface ChangeCaseOptions {
    format: "camel" | "kebab" | "pascal" | "snake" | "title";
}

const _CONTRACTION_REGEX = /(\p{L})['’]+(?=\p{L})/gu;
const _WORDS_REGEX = new RegExp(
    [
        // Rule A: Acronym Plurals (e.g., 'KPIs', 'APIs')
        `[\\p{Lu}\\p{M}]+s(?![\\p{Ll}\\p{M}])`,
        // Rule B: Acronym Transitions (e.g., 'HTTP' in 'HTTPClient')
        `[\\p{Lu}\\p{M}]+(?=[\\p{Lu}\\p{M}][\\p{Ll}\\p{M}])`,
        // Rule C: TitleCase / PascalCase words (e.g., 'Client')
        `[\\p{Lu}\\p{M}]+[\\p{Ll}\\p{M}]*`,
        // Rule D: Pure lowercase words
        `[\\p{Ll}\\p{M}]+`,
        // Rule E: Numeric digit groups
        `\\p{N}+`,
        // Rule F: Non-cased global scripts (e.g., Devanagari, Thai, Arabic, Kanji, CJK)
        `[\\p{L}\\p{M}]+`
    ].join("|"),
    "gu"
);

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
        .replace(_CONTRACTION_REGEX, "$1");

    const matches = normalized.match(_WORDS_REGEX) || [];

    const safeTokens: string[] = [];
    for (let i = 0; i < matches.length; i++) {
        const token = matches[i];
        if (isSafeObjPropertyKey(token)) {
            safeTokens.push(token);
        }
    }

    return safeTokens;
}

function _getCodePointStep(str: string, index: number = 0): number {
    const cp = str.codePointAt(index);
    return cp != null && cp > 0xffff ? 2 : 1;
}

export function changeCase(str: any, options: ChangeCaseOptions): string {
    const words = toWords(str);
    const len = words.length;
    if (len === 0) return "";

    const { format } = options ?? {};
    if (!format) return words.join(" ");

    const delimiter = format === "kebab" ? "-" : format === "snake" ? "_" : format === "title" ? " " : "";
    const isLower = format === "kebab" || format === "snake";
    const result = new Array(len);

    for (let i = 0; i < len; i++) {
        const w = words[i];
        if (isLower || (i === 0 && format === "camel")) {
            result[i] = w.toLowerCase();
        } else {
            const step = _getCodePointStep(w, 0);
            result[i] = w.slice(0, step).toUpperCase() + w.slice(step).toLowerCase();
        }
    }

    return result.join(delimiter);
}


const _BUFFER_REF = typeof globalThis !== "undefined" ? (globalThis as any).Buffer : undefined;
const _HAS_BUFFER = typeof _BUFFER_REF !== "undefined";

const _HAS_NATIVE_HEX = typeof Uint8Array !== "undefined" && typeof (Uint8Array as any).fromHex === "function";
const _HAS_NATIVE_BASE64 = typeof Uint8Array !== "undefined" && typeof (Uint8Array as any).fromBase64 === "function";
const _MAX_BYTE_CHUNK_SIZE = 8192;
const _STRICT_B64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const _HEX_REGEX = /^[0-9a-fA-F]*$/;

// ============================================================================
// ENCODING & DECODING
// ============================================================================

/**
 * Encodes string to hex or base64 based on specified encoding option.
 */
export function encodeString(str: string | null | undefined, encoding: StringEncoding): string | null {
    if (str == null) return null;
    const s = String(str);

    if (encoding === "hex") {
        if (_HAS_BUFFER) return _BUFFER_REF.from(s, "utf-8").toString("hex");
        const bytes = TEXT_ENCODER.encode(s);
        let hex = "";
        for (let i = 0; i < bytes.length; i++) {
            hex += bytes[i].toString(16).padStart(2, "0");
        }
        return hex;
    }

    if (encoding === "base64") {
        if (_HAS_BUFFER) return _BUFFER_REF.from(s, "utf-8").toString("base64");
        const bytes = TEXT_ENCODER.encode(s);
        if (_HAS_NATIVE_BASE64 && typeof (Uint8Array as any).prototype.toBase64 === "function") {
            return (bytes as any).toBase64();
        }
        let bin = "";
        for (let i = 0; i < bytes.length; i += _MAX_BYTE_CHUNK_SIZE) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + _MAX_BYTE_CHUNK_SIZE) as unknown as number[]);
        }
        return btoa(bin);
    }

    throw new Error(`Unsupported encoding: ${encoding}`);
}

/**
 * Decodes hex or base64 encoded string back to standard UTF-8 string.
 */
export function decodeString(
    str: string | null | undefined,
    encoding: StringEncoding,
    options: { strict?: boolean } | boolean = {}
): string | null {
    if (str == null) return null;
    const strict = typeof options === "boolean" ? options : (options.strict ?? true);
    const decoder = strict ? TEXT_DECODER_FATAL : TEXT_DECODER;
    const s = String(str).trim();

    try {
        if (encoding === "hex") {
            if (s.length % 2 !== 0 || !_HEX_REGEX.test(s)) {
                throw new Error("Invalid hex format");
            }
            if (_HAS_BUFFER) return decoder.decode(_BUFFER_REF.from(s, "hex"));
            if (_HAS_NATIVE_HEX) return decoder.decode((Uint8Array as any).fromHex(s));
            const bytes = new Uint8Array(s.length / 2);
            for (let i = 0; i < bytes.length; i++) {
                const byte = parseInt(s.substring(i * 2, i * 2 + 2), 16);
                if (Number.isNaN(byte)) throw new Error("Invalid hex format");
                bytes[i] = byte;
            }
            return decoder.decode(bytes);
        }

        if (encoding === "base64") {
            if (s !== "" && (s.length % 4 !== 0 || !_STRICT_B64_REGEX.test(s))) {
                throw new Error("Invalid base64 format");
            }
            if (_HAS_NATIVE_BASE64) {
                return decoder.decode((Uint8Array as any).fromBase64(s, { strict }));
            }
            if (_HAS_BUFFER) {
                return decoder.decode(_BUFFER_REF.from(s, "base64"));
            }
            const bin = atob(s);
            const len = bin.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = bin.charCodeAt(i);
            }
            return decoder.decode(bytes);
        }

        throw new Error(`Unsupported encoding: ${encoding}`);
    } catch (err) {
        if (strict) throw err;
        return null;
    }
}


// ============================================================================
// REGEX UTILITIES & EXTRACTION HELPERS
// ============================================================================



// Lone surrogate check to prevent native RegExp.escape from throwing a TypeError on unpaired surrogates.
const _LONE_SURROGATE_REGEX = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;

// Shared control & lone-surrogate pattern fragment (C0 controls, DEL, lone surrogates)
const _BASE_CONTROL_PATTERN = "\\x00-\\x1F\\x7F\\u{D800}-\\u{DFFF}";

// TC39 mode: Syntax characters + C0 controls + DEL + lone/unpaired surrogates
const _TC39_REGEX = new RegExp(`[${_BASE_CONTROL_PATTERN}\\\\^$*+?.()|[\\]{}/#,=<>&!%:;@~'"\`-]`, "gu");

// nonAlphanumeric mode: C0 controls/surrogates + ASCII non-alphanumerics (< 0x80)
const _NON_ALPHANUMERIC_ASCII_REGEX = new RegExp(`[${_BASE_CONTROL_PATTERN}]|[\\x20-\\x2F\\x3A-\\x40\\x5B-\\x5E\\x5F\\x60\\x7B-\\x7E]`, "gu");

export type UnicodeSurrogateType = "all" | "high" | "low";

export type IsUnicodeSurrogateOptions = {
    type?: UnicodeSurrogateType;
};

/**
 * Checks whether a 16-bit code unit is a Unicode surrogate.
 * @internal
 */
function _isUnicodeSurrogate(code: number, options: IsUnicodeSurrogateOptions = {}): boolean {
    if (!isValidInt(code, { range: "UInt16" })) return false;

    const { type = "all" } = options;
    switch (type) {
        case "high": return code >= SURROGATE_HIGH_MIN_CODE && code <= SURROGATE_HIGH_MAX_CODE;
        case "low": return code >= SURROGATE_LOW_MIN_CODE && code <= SURROGATE_LOW_MAX_CODE;
        case "all": return code >= SURROGATE_HIGH_MIN_CODE && code <= SURROGATE_LOW_MAX_CODE;
        default: return false;
    }
}

function _replaceRegexChar(ch: string): string {
    const code = ch.codePointAt(0)!;
    const isControl = code <= MAX_C0_CONTROL_CODE || code === ASCII_DEL_CODE;
    const isSurrogateChar = ch.length === 1 && _isUnicodeSurrogate(code);

    if (isControl || isSurrogateChar) {
        const named = NAMED_CONTROL_ESCAPES[code];
        if (named) return named;
        const hex = code.toString(16);
        return isControl ? `\\x${hex.padStart(2, "0")}` : `\\u${hex.padStart(4, "0")}`;
    }
    return "\\" + ch;
}

export function escapeRegExp(
    val: unknown,
    options?: EscapeRegexOptions
): string {
    const cleanVal = unboxPrimitiveObj(val);
    if (cleanVal == null) return "";

    const str = isRegExp(cleanVal) ? cleanVal.source : (typeof cleanVal === "string" ? cleanVal : String(cleanVal));
    const mode = options?.mode ?? "tc39";

    if (mode === "tc39") {
        if (typeof (RegExp as any).escape === "function" && !_LONE_SURROGATE_REGEX.test(str)) {
            return (RegExp as any).escape(str);
        }
        return str.replace(_TC39_REGEX, _replaceRegexChar);
    }

    return str.replace(_NON_ALPHANUMERIC_ASCII_REGEX, _replaceRegexChar);
}

export function toCleanRegExp(
    str: string | null | undefined,
    pattern: string | RegExp,
    options?: RegexEngineOptions
): { reg: RegExp; input: string } | null {
    if (str == null || pattern == null) return null;

    try {
        const isReg = isRegExp(pattern);
        const patStr = isReg ? pattern.source : String(pattern);

        let flags = isReg ? pattern.flags.replace(/y/g, "") : "";

        flags = flags.replace(/g/g, "");
        if (options?.global) flags += "g";

        if (options?.asciiCaseInsensitive !== undefined) {
            flags = flags.replace(/i/g, "");
            if (options.asciiCaseInsensitive) flags += "i";
        }

        const candidates = (/\\p\{/i.test(patStr) && !/[uv]/.test(flags))
            ? [flags + "u", flags + "v", flags]
            : [flags];

        for (const f of candidates) {
            try { return { reg: new RegExp(patStr, f), input: str }; } catch { }
        }
    } catch {
        // Fall through
    }

    return null;
}

function _matchToRecord(match: RegExpMatchArray | RegExpExecArray): Record<string, string | null> {
    const result: Record<string, string | null> = Object.create(null);
    if (match.index !== undefined) {
        Object.defineProperty(result, "_index", { value: String(match.index), writable: true, configurable: true });
    }
    Object.defineProperty(result, "_length", { value: match.length, writable: true, configurable: true });
    for (let i = 0; i < match.length; i++) {
        result[String(i)] = match[i] !== undefined ? match[i] : null;
    }
    if (match.groups) {
        for (const key in match.groups) {
            const val = match.groups[key];
            result[key] = val !== undefined ? val : null;
        }
    }
    return result;
}

function _resolveGroupRecord(
    record: Record<string, string | null>,
    groupIndex: number | string
): string | null {
    if (typeof groupIndex === "string") return record[groupIndex] ?? null;

    const num = Number(groupIndex);
    if (Number.isNaN(num)) return null;

    const index = Math.trunc(num);
    if (index >= 0) return record[String(index)] ?? null;

    const targetIndex = ((record as any)._length ?? 0) + index;
    return targetIndex >= 1 ? (record[String(targetIndex)] ?? null) : null;
}

type CandidateMatch<T = unknown> = {
    _i: number;
    _start: number;
    _end: number;
    _payload: T;
};

function _collectPatternCandidates<T>(
    input: string,
    pattern: string | RegExp,
    patternIndex: number,
    options: { literal?: boolean; mode?: EscapeRegexOptions["mode"]; asciiCaseInsensitive?: boolean } | undefined,
    createPayload: (match: RegExpExecArray, start: number, end: number) => T
): CandidateMatch<T>[] {
    const { literal = false, mode, asciiCaseInsensitive = false } = options ?? {};
    const escapedPat = literal ? escapeRegExp(pattern, { mode }) : pattern;
    const cleanObj = toCleanRegExp(input, escapedPat, { global: true, asciiCaseInsensitive });
    const reg = cleanObj?.reg ?? null;
    if (!reg) return [];

    const candidates: CandidateMatch<T>[] = [];
    reg.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = reg.exec(input)) !== null) {
        const start = match.index;
        const end = reg.lastIndex;
        const payload = createPayload(match, start, end);

        candidates.push({ _i: patternIndex, _start: start, _end: end, _payload: payload });

        if (start === end) {
            if (start === input.length) break;
            reg.lastIndex = start + _getCodePointStep(input, start);
        }
    }
    return candidates;
}

function _selectLeftmostCandidates<T>(candidates: CandidateMatch<T>[]): CandidateMatch<T>[] {
    if (candidates.length <= 1) return candidates;
    candidates.sort((a, b) => {
        if (a._start !== b._start) return a._start - b._start;
        return a._i - b._i;
    });
    const selected: CandidateMatch<T>[] = [];
    let lastPos = 0;
    const len = candidates.length;
    for (let i = 0; i < len; i++) {
        const c = candidates[i];
        if (c._start >= lastPos) {
            selected.push(c);
            lastPos = c._end;
        }
    }
    return selected;
}

function _matchManyCore<T>(
    str: string | null | undefined,
    patterns: (string | RegExp)[] | (string | RegExp),
    options: ExtractManyOptions | undefined,
    resolveSingle: (pat: string | RegExp) => T | null,
    resolvePayload: (res: Record<string, string | null>, start: number) => T
): (T | null)[] | null {
    const { overlapping = false, leftmost, ...engineOpts } = options ?? {};
    const isLeftmost = leftmost ?? true;

    if (overlapping && leftmost) {
        throw new InvalidArgumentError("Cannot specify both 'overlapping' and 'leftmost'");
    }
    if (str == null || patterns == null) return null;
    const list = toValidArray(patterns);
    const len = list.length;
    if (len === 0) return [];

    if (overlapping) {
        const result = new Array<T | null>(len);
        for (let i = 0; i < len; i++) {
            result[i] = resolveSingle(list[i]);
        }
        return result;
    }

    const candidates: CandidateMatch<T>[] = [];

    for (let i = 0; i < len; i++) {
        const res = extractRegexEngine(str, list[i], { ...engineOpts, global: false });
        if (res && res[0] && res[0]._index != null) {
            const start = Number(res[0]._index);
            const matchLen = res[0]["0"]?.length ?? 0;
            candidates.push({
                _i: i,
                _start: start,
                _end: start + matchLen,
                _payload: resolvePayload(res[0], start)
            });
        }
    }

    const result = new Array<T | null>(len).fill(null);
    if (candidates.length === 0) return result;

    const selected = isLeftmost ? _selectLeftmostCandidates(candidates) : [];
    if (!isLeftmost) {
        candidates.sort((a, b) => a._i - b._i);
        const candLen = candidates.length;
        for (let i = 0; i < candLen; i++) {
            const c = candidates[i];
            let overlaps = false;
            const selLen = selected.length;
            for (let j = 0; j < selLen; j++) {
                const a = selected[j];
                let isOverlapping = false;
                if (c._start === c._end && a._start === a._end) isOverlapping = c._start === a._start;
                else if (a._start === a._end) isOverlapping = a._start >= c._start && a._start < c._end;
                else if (c._start === c._end) isOverlapping = c._start >= a._start && c._start < a._end;
                else isOverlapping = c._start < a._end && c._end > a._start;
                if (isOverlapping) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps) selected.push(c);
        }
    }

    for (let i = 0; i < selected.length; i++) {
        const c = selected[i];
        result[c._i] = c._payload;
    }

    return result;
}

export function extractRegexEngine(
    str: string | null | undefined,
    pattern: string | RegExp,
    options?: ExtractRegexEngineOptions
): Record<string, string | null>[] | null {
    const cleaned = toCleanRegExp(str, pattern, options);
    if (!cleaned) return null;

    if (!options?.global) {
        const match = cleaned.input.match(cleaned.reg);
        if (!match) return null;
        return [_matchToRecord(match)];
    }

    const matches = Array.from(cleaned.input.matchAll(cleaned.reg));
    if (matches.length === 0) return null;

    const result = new Array<Record<string, string | null>>(matches.length);
    for (let i = 0; i < matches.length; i++) {
        result[i] = _matchToRecord(matches[i]);
    }
    return result;
}

export function extractRegex(
    str: string | null | undefined,
    pattern: string | RegExp,
    options?: ExtractRegexEngineOptions
): string | null {
    const res = extractRegexEngine(str, pattern, options);
    return res ? _resolveGroupRecord(res[0], options?.groupIndex ?? 1) : null;
}

export function extractRegexAll(
    str: string | null | undefined,
    pattern: string | RegExp,
    options?: ExtractRegexEngineOptions
): (string | null)[] | null {
    const res = extractRegexEngine(str, pattern, { ...options, global: true });
    if (!res) return null;

    const groupIndex = options?.groupIndex ?? 0;
    const result = new Array<string | null>(res.length);
    for (let i = 0; i < res.length; i++) result[i] = _resolveGroupRecord(res[i], groupIndex);
    return result;
}

export function extractRegexMany(
    str: string | null | undefined,
    patterns: (string | RegExp)[] | (string | RegExp),
    options?: ExtractManyOptions
): (string | null)[] | null {
    const groupIndex = options?.groupIndex ?? 0;
    return _matchManyCore(
        str,
        patterns,
        options,
        (pat) => extractRegex(str, pat, { ...options, groupIndex }),
        (res) => _resolveGroupRecord(res, groupIndex)
    );
}

function _toLiteralPattern(pattern: string | RegExp, mode?: EscapeRegexOptions["mode"]): string | RegExp {
    return isRegExp(pattern)
        ? new RegExp(escapeRegExp(pattern, { mode }), pattern.flags)
        : escapeRegExp(pattern, { mode });
}

export function findRegex(
    str: string | null | undefined,
    pattern: string | RegExp,
    options?: FindOptions
): number | null {
    if (str == null || pattern == null) return null;
    const { literal = false, mode, ...engineOpts } = options ?? {};

    const pat = literal ? _toLiteralPattern(pattern, mode) : pattern;
    const cleanObj = toCleanRegExp(str, pat, { ...engineOpts, global: false });
    if (!cleanObj) return null;

    const match = cleanObj.input.match(cleanObj.reg);
    if (!match || match.index == null) return null;
    return TEXT_ENCODER.encode(cleanObj.input.slice(0, match.index)).length;
}

export function findManyRegex(
    str: string | null | undefined,
    patterns: (string | RegExp)[] | (string | RegExp),
    options?: FindManyOptions
): (number | null)[] | null {
    if (options?.literal) {
        if (str == null || patterns == null) return null;
        const list = toValidArray(patterns);
        const result = new Array<number | null>(list.length);
        for (let i = 0; i < list.length; i++) result[i] = findRegex(str, list[i], options);
        return result;
    }

    return _matchManyCore(
        str,
        patterns,
        options,
        (pat) => findRegex(str, pat, options),
        (_, start) => TEXT_ENCODER.encode(str!.slice(0, start)).length
    );
}

export function splitString(
    str: string | null | undefined,
    delimiter: string,
    options?: SplitOptions
): (string | null)[] | null {
    if (str == null || delimiter == null) return null;

    const {
        literal = true,
        inclusive = false,
        limit,
        exact = false,
        strict = false,
        mode,
        ...engineOpts
    } = options ?? {};

    const patStr = literal ? _toLiteralPattern(delimiter, mode) : delimiter;
    const cleanObj = toCleanRegExp(str, patStr, { ...engineOpts, global: true });
    if (!cleanObj) return null;
    const { reg: pattern } = cleanObj;

    pattern.lastIndex = 0;

    const parts: (string | null)[] = [];
    let lastIndex = 0;
    let matchCount = 0;
    const maxSplits = limit != null && limit >= 0 ? limit : Infinity;
    let match: RegExpExecArray | null;

    while (matchCount < maxSplits && (match = pattern.exec(str)) !== null) {
        const matchStart = match.index;
        const matchEnd = pattern.lastIndex;

        if (matchStart === matchEnd) {
            if (matchStart === str.length) break;
            pattern.lastIndex = matchStart + _getCodePointStep(str, matchStart);
            if (matchStart === 0) continue;
        }

        parts.push(str.slice(lastIndex, inclusive ? matchEnd : matchStart));
        lastIndex = matchEnd;
        matchCount++;
    }

    parts.push(str.slice(lastIndex));

    if (limit == null || limit < 0) return parts;

    const targetCount = limit + 1;
    if (strict && parts.length < targetCount) {
        throw new InvalidArgumentError(`Expected ${targetCount} parts, got ${parts.length}`);
    }
    if (exact) {
        while (parts.length < targetCount) parts.push(null);
    }

    return parts;
}

function _expandReplacementString(
    template: string,
    match: string,
    offset: number,
    fullStr: string,
    captures: (string | undefined)[],
    groups?: Record<string, string>
): string {
    if (!template.includes("$")) return template;
    return template.replace(/\$\$|\$([$'`&]|\d{1,2}|<[^>]+>)/g, (m, token?: string) => {
        if (m === "$$" || token === "$") return "$";
        if (!token) return m;
        if (token === "&") return match;
        if (token === "`") return fullStr.slice(0, offset);
        if (token === "'") return fullStr.slice(offset + match.length);
        if (token.startsWith("<")) return groups ? (groups[token.slice(1, -1)] ?? "") : m;

        const idx = Number(token);
        if (idx > 0 && idx <= captures.length) return captures[idx - 1] ?? "";

        if (token.length === 2) {
            const first = Number(token[0]);
            if (first > 0 && first <= captures.length) return (captures[first - 1] ?? "") + token[1];
        }
        return m;
    });
}

export function replaceString(
    str: string | null | undefined,
    pattern: string | RegExp,
    replacement: string | ((match: string, ...args: any[]) => string),
    options?: ReplaceOptions
): string | null {
    if (str == null || pattern == null || replacement == null) return null;
    const input = typeof str === "string" ? str : String(str);

    const { literal = false, n, mode, ...engineOpts } = options ?? {};
    const rawN = n ?? (engineOpts?.global ? Infinity : 1);
    const effectiveN = isValidNumber(rawN, { allowNonFiniteNumbers: true, allowNaN: false }) ? Math.trunc(rawN) : 1;

    if (effectiveN === 0) return input;

    const pat = literal ? _toLiteralPattern(pattern, mode) : pattern;
    const cleanObj = toCleanRegExp(input, pat, { ...engineOpts, global: engineOpts?.global ?? (effectiveN !== 1) });
    if (!cleanObj) return input;

    const isFn = typeof replacement === "function";
    const repStr = isFn ? "" : String(replacement);

    if (literal && !isFn) {
        if (effectiveN === 1 || effectiveN < 0 || effectiveN === Infinity) {
            return input.replace(cleanObj.reg, () => repStr);
        }
        let count = 0;
        return input.replace(cleanObj.reg, (m) => (count++ < effectiveN ? repStr : m));
    }

    let count = 0;
    const isLimited = effectiveN > 0 && effectiveN !== Infinity;

    return input.replace(cleanObj.reg, (...args: any[]) => {
        if (isLimited && count++ >= effectiveN) return args[0];
        if (isFn) return String((replacement as Function)(...args));

        const len = args.length;
        const hasGroups = typeof args[len - 1] === "object" && args[len - 1] !== null;
        const groups = hasGroups ? args[len - 1] : undefined;
        const offset = (hasGroups ? args[len - 3] : args[len - 2]) as number;
        const captures = args.slice(1, hasGroups ? len - 3 : len - 2);

        return _expandReplacementString(repStr, args[0], offset, input, captures, groups);
    });
}

export function replaceManyString(
    str: string | null | undefined,
    patterns: (string | RegExp)[] | Record<string, string>,
    replaceWith?: (string | ((match: string, ...args: any[]) => string))[] | string | ((match: string, ...args: any[]) => string),
    options?: ReplaceManyOptions
): string | null {
    if (str == null || patterns == null) return null;
    const input = typeof str === "string" ? str : String(str);

    const isObj = isPlainObj(patterns);
    if (!isObj && !Array.isArray(patterns)) return input;

    const patList = isObj ? Object.keys(patterns) : patterns;
    const len = patList.length;
    if (len === 0) return input;

    if (!isObj && replaceWith == null) return input;

    if (Array.isArray(replaceWith) && replaceWith.length !== len) {
        if (replaceWith.length !== 1) throw new InvalidArgumentError(`replaceMany length mismatch: expected ${len}, got ${replaceWith.length}`);
        replaceWith = replaceWith[0];
    }

    const isList = isObj || Array.isArray(replaceWith);
    const repList = isObj ? Object.values(patterns) : (replaceWith as any[]);

    const candidates: CandidateMatch<string>[] = [];

    for (let i = 0; i < len; i++) {
        const pat = patList[i];
        const rawRep = isList ? repList[i] : replaceWith;
        if (pat == null || rawRep == null) continue;

        const isFn = typeof rawRep === "function";
        const repStr = isFn ? "" : String(rawRep);

        const items = _collectPatternCandidates(input, pat, i, options, (match, start) => {
            if (options?.literal && !isFn) return repStr;
            const captures = Array.prototype.slice.call(match, 1);
            if (isFn) {
                const fnArgs = [match[0], ...captures, start, input];
                if (match.groups !== undefined) fnArgs.push(match.groups);
                return String((rawRep as Function)(...fnArgs));
            }
            return _expandReplacementString(repStr, match[0], start, input, captures, match.groups);
        });

        for (let j = 0; j < items.length; j++) candidates.push(items[j]);
    }

    if (candidates.length === 0) return input;

    const selected = _selectLeftmostCandidates(candidates);
    let result = "";
    let lastIndex = 0;
    const selLen = selected.length;

    for (let i = 0; i < selLen; i++) {
        const c = selected[i];
        result += input.slice(lastIndex, c._start) + c._payload;
        lastIndex = c._end;
    }

    return result + input.slice(lastIndex);
}