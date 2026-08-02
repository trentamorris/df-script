export const NEWLINE = "\n";
export const CARRIAGE_RETURN = "\r";
export const UTF8_BOM = "\ufeff";

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

/** Separates composite key segments within a single row hash (e.g. multi-column join keys). */
export const KEY_SEPARATOR = "\x00";
/** Separates key-value pairs within a serialized object or map canonical hash. */
export const KEY_PAIR_SEPARATOR = "\x01";
/** Sentinel value used in join left-index arrays to indicate a right-only (unmatched) row. */
export const UNMATCHED_ROW_INDEX = -1;

/** Maximum allowable length for a single JavaScript array (2^32 - 1). */
export const MAX_JS_ARRAY_LENGTH = 4_294_967_295;
