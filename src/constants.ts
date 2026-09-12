export const NEWLINE = "\n";
export const CARRIAGE_RETURN = "\r";
export const UTF8_BOM = "\ufeff";
export const NEWLINE_PATTERN = "\\r\\n|\\n|\\r";
export const NEWLINE_REGEX = /\r\n|\n|\r/;

/** Reusable singleton TextEncoder instance for UTF-8 string encoding across the codebase. */
export const TEXT_ENCODER = new TextEncoder();
/** Reusable singleton TextDecoder instances for non-fatal and fatal UTF-8 decoding. */
export const TEXT_DECODER = new TextDecoder("utf-8");
export const TEXT_DECODER_FATAL = new TextDecoder("utf-8", { fatal: true });

export const MS_PER_WEEK = 604_800_000;
export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_SECOND = 1000;
export const MS_PER_MILLISECOND = 1;
export const MS_PER_MICROSECOND = 0.001;
export const MS_PER_NANOSECOND = 0.000_001;
export const US_PER_MS = 1000;
export const NS_PER_MS = 1_000_000;
export const US_PER_MS_BI = 1000n;
export const NS_PER_MS_BI = 1_000_000n;

/** Day of week string to UTC day index mapping (Sunday = 0, Saturday = 6) */
export const DAY_OF_WEEK_MAP: Readonly<Record<string, number>> = Object.freeze({
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
});

/** Separates composite key segments within a single row hash (e.g. multi-column join keys). */
export const KEY_SEPARATOR = "\x00";
/** Separates key-value pairs within a serialized object or map canonical hash. */
export const KEY_PAIR_SEPARATOR = "\x01";
/** Sentinel value used in join left-index arrays to indicate a right-only (unmatched) row. */
export const UNMATCHED_ROW_INDEX = -1;

/** JavaScript language-level reserved object property keys to guard against prototype pollution attacks. */
export const DANGEROUS_OBJ_PROPERTIES = Object.freeze([
    "__proto__",
    "proto",
    "constructor",
    "prototype"
] as const);

/** Maximum allowable length for a single JavaScript array (2^32 - 1). */
export const MAX_JS_ARRAY_LENGTH = 4_294_967_295;

/** 64-bit Integer Boundaries */
export const INT64_MIN = -9_223_372_036_854_775_808n;
export const INT64_MAX = 9_223_372_036_854_775_807n;
export const UINT64_MIN = 0n;
export const UINT64_MAX = 18_446_744_073_709_551_615n;

/** 32-bit & Standard Integer Boundaries */
export const INT32_MIN = -2_147_483_648;
export const INT32_MAX = 2_147_483_647;
export const UINT32_MIN = 0;
export const UINT32_MAX = MAX_JS_ARRAY_LENGTH;

export const INT16_MIN = -32_768;
export const INT16_MAX = 32_767;
export const UINT16_MIN = 0;
export const UINT16_MAX = 65_535;

export const INT8_MIN = -128;
export const INT8_MAX = 127;
export const UINT8_MIN = 0;
export const UINT8_MAX = 255;

/** Unicode Codepoint Boundaries for Control Characters & Surrogates */
export const MAX_C0_CONTROL_CODE = 0x1f;
export const ASCII_DEL_CODE = 0x7f;
export const SURROGATE_HIGH_MIN_CODE = 0xd800;
export const SURROGATE_HIGH_MAX_CODE = 0xdbff;
export const SURROGATE_LOW_MIN_CODE = 0xdc00;
export const SURROGATE_LOW_MAX_CODE = 0xdfff;

/** Named escape mappings for common control characters */
export const NAMED_CONTROL_ESCAPES: Readonly<Record<number, string>> = Object.freeze({
    [0x09]: "\\t",
    [0x0a]: "\\n",
    [0x0b]: "\\v",
    [0x0c]: "\\f",
    [0x0d]: "\\r",
});

/** Inverse unescape mapping for control character escape sequences */
export const CONTROL_UNESCAPE_MAP: Readonly<Record<string, string>> = Object.freeze({
    b: "\b",
    0: "\0",
    ...Object.fromEntries(
        Object.entries(NAMED_CONTROL_ESCAPES).map(([code, esc]) => [
            esc.slice(1),
            String.fromCharCode(Number(code))
        ])
    )
});