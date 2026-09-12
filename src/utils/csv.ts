/** @internalfile */
import type { ColumnDict } from "../types";
import { strftime, toValidDate } from "./date";
import { createSafeJsonReplacer, type SafeJsonReplacerOptions } from "./json";
import { formatNumber, toValidNumber, toValidBigInt, type NumericFormatOptions } from "./number";
import { NEWLINE, CARRIAGE_RETURN, UTF8_BOM, NEWLINE_REGEX } from "../constants";
import { DataType, Utf8, Boolean as BoolType, Int64, Float64, Datetime } from "../datatypes";
import type { ReadCSVOptions } from "../dataframe/types";
import { unboxPrimitiveObj, isValidDateObj } from "./object";
import { replaceString, stripChars } from "./string";

export interface FormatCSVValueOptions {
    /**
     * The string representation to use for null/missing values.
     * @default ""
     */
    nullValue?: string;

    /**
     * Custom format string for Date values (e.g. "%Y-%m-%d").
     */
    dateFormat?: string;

    /**
     * Custom format string for Time values (e.g. "%H:%M:%S").
     */
    timeFormat?: string;

    /**
     * Custom format string for Datetime values (e.g. "%Y-%m-%d %H:%M:%S").
     */
    datetimeFormat?: string;

    /**
     * Options for numeric formatting (floats, ints, bigints).
     */
    numericFormatOptions?: NumericFormatOptions;

    /**
     * Options for the safe JSON replacer used when formatting objects/arrays.
     */
    replacerOptions?: SafeJsonReplacerOptions;
}

export interface WriteCSVOptions extends FormatCSVValueOptions {
    /**
     * Whether to write the header row.
     * @default true
     */
    includeHeader?: boolean;

    /**
     * Character that separates fields.
     * @default ","
     */
    separator?: string;

    /**
     * The string used to end each row.
     * @default "\n"
     */
    lineTerminator?: string;

    /**
     * The character used for quoting fields.
     * @default '"'
     */
    quoteChar?: string;

    /**
     * Defines when to use quotes.
     * - "necessary": Quotes only when required (e.g., value contains separator, quote_char, or newlines).
     * - "always": Quotes every field.
     * - "never": Never quotes fields.
     * - "non_numeric": Quotes all fields that are non-numeric.
     * @default "necessary"
     */
    quoteStyle?: "necessary" | "always" | "never" | "non_numeric";

    /**
     * Whether to include a Byte Order Mark (BOM) at the start of the file.
     * @default false
     */
    includeBom?: boolean;
}

function _formatCsvValue(options: FormatCSVValueOptions = {}) {
    const {
        nullValue = "",
        numericFormatOptions,
        datetimeFormat,
        dateFormat,
        timeFormat,
        replacerOptions
    } = options;
    const formatNum = formatNumber(numericFormatOptions);
    const format = datetimeFormat ?? dateFormat ?? timeFormat;
    const formatDate = (v: Date): string => isValidDateObj(v) ? (format ? strftime(v, { format }) : v.toISOString()) : nullValue;

    const replacer = createSafeJsonReplacer({
        formatDate,
        onBigInt: formatNum,
        ...replacerOptions
    });

    const onBigInt = replacerOptions?.onBigInt;

    return (val: any): { str: string; isNumeric: boolean } => {
        if (val == null || typeof val === "symbol" || typeof val === "function" || (val instanceof Date && !isValidDateObj(val))) {
            return { str: nullValue, isNumeric: false };
        }

        const raw = unboxPrimitiveObj(val);
        const t = typeof raw;
        if (t === "number") {
            return { str: formatNum(raw), isNumeric: true };
        }
        if (t === "bigint") {
            const custom = onBigInt ? onBigInt(raw as bigint) : formatNum(raw);
            return { str: String(custom), isNumeric: true };
        }
        if (t === "boolean" || t === "string") {
            return { str: String(raw), isNumeric: false };
        }

        const res = unboxPrimitiveObj(replacer.call(null, "", val));
        if (res == null || typeof res === "symbol" || typeof res === "function") {
            return { str: nullValue, isNumeric: false };
        }
        return {
            str: typeof res === "object" ? JSON.stringify(res, replacer) : String(res),
            isNumeric: false
        };
    };
}

export function stringifyCSV(
    columns: ColumnDict,
    height: number,
    options: WriteCSVOptions & { onRow?: (rowStr: string) => void } = {}
): string {
    const {
        separator = ",",
        quoteChar = '"',
        includeHeader = true,
        lineTerminator = NEWLINE,
        quoteStyle = "necessary",
        includeBom = false,
        onRow,
        ...formatOptions
    } = options;

    const keys = Object.keys(columns);
    const numKeys = keys.length;
    const lines: string[] = [];
    let isFirstRow = true;

    const formatValue = _formatCsvValue(formatOptions);

    const escapeAndQuote = (val: any, isHeader = false): string => {
        const formatted = isHeader ? { str: String(val), isNumeric: false } : formatValue(val);
        const strVal = formatted.str;
        if (quoteStyle === "never") return strVal;

        const shouldQuote =
            quoteStyle === "always" ||
            (quoteStyle === "non_numeric" && (isHeader || (!formatted.isNumeric && val != null))) ||
            strVal.includes(separator) ||
            strVal.includes(quoteChar) ||
            NEWLINE_REGEX.test(strVal);

        if (!shouldQuote) return strVal;
        const escaped = replaceString(strVal, quoteChar, quoteChar + quoteChar, { literal: true, n: Infinity })!;
        return quoteChar + escaped + quoteChar;
    };

    const outputLine = (line: string) => {
        const prefix = isFirstRow ? (includeBom ? UTF8_BOM : "") : (onRow ? lineTerminator : "");
        isFirstRow = false;
        const fullLine = prefix + line;
        if (onRow) onRow(fullLine);
        else lines.push(fullLine);
    };

    const writeRow = (getVal: (i: number) => any, isHeader: boolean) => {
        const row = new Array(numKeys);
        for (let i = 0; i < numKeys; i++) {
            row[i] = escapeAndQuote(getVal(i), isHeader);
        }
        outputLine(row.join(separator));
    };

    if (includeHeader) writeRow((i) => keys[i], true);
    for (let r = 0; r < height; r++) writeRow((i) => columns[keys[i]][r], false);

    return onRow ? (includeBom ? UTF8_BOM : "") : lines.join(lineTerminator);
}

const _parseBool = (v: string): boolean | null => {
    const l = v.toLowerCase();
    return (l === "true" || l === "1") ? true : (l === "false" || l === "0") ? false : null;
};

const CSV_CANDIDATES = [
    { type: BoolType, parse: _parseBool },
    { type: Int64, parse: (v: string) => toValidBigInt(v, { truncate: false }) },
    { type: Float64, parse: (v: string) => toValidNumber(v, { allowNonFiniteNumbers: true }) },
    { type: Datetime, parse: (v: string) => toValidDate(v) }
] as const;

export function parseCSV(content: string, options: ReadCSVOptions = {}): string[][] {
    const separator = options.separator || ",";
    const quoteChar = options.quoteChar || '"';

    const csvContent = stripChars(content, UTF8_BOM, { mode: "start", returnStringOnNull: true }) ?? "";
    const len = csvContent.length;
    if (len === 0) return [];

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = "";
    let inQuotes = false;
    let hasRowData = false;

    for (let i = 0; i < len; i++) {
        const char = csvContent[i];

        if (inQuotes) {
            hasRowData = true;
            if (char !== quoteChar) {
                currentCell += char;
            } else if (i + 1 < len && csvContent[i + 1] === quoteChar) {
                currentCell += quoteChar;
                i++;
            } else {
                inQuotes = false;
            }
            continue;
        }

        if (char === quoteChar) {
            hasRowData = true;
            if (currentCell.length === 0) {
                inQuotes = true;
            } else {
                currentCell += quoteChar;
            }
            continue;
        }

        if (char === separator) {
            currentRow.push(currentCell);
            currentCell = "";
            hasRowData = true;
            continue;
        }

        if (char === CARRIAGE_RETURN || char === NEWLINE) {
            if (char === CARRIAGE_RETURN && i + 1 < len && csvContent[i + 1] === NEWLINE) {
                i++;
            }
            if (hasRowData || currentRow.length > 0 || currentCell.length > 0) {
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentRow = [];
                currentCell = "";
                hasRowData = false;
            }
            continue;
        }

        hasRowData = true;
        currentCell += char;
    }

    if (hasRowData || currentRow.length > 0 || currentCell.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows;
}

export function inferAndCoerceCSVColumn(
    values: string[],
    options: ReadCSVOptions = {}
): { type: DataType; values: any[] } {
    const nullValues = new Set(options.nullValues ?? ["", "NA", "null", "NaN"]);
    const len = values.length;
    const trimmedValues = new Array<string>(len);

    let activeMask = 0b1111; // 4 candidate bits
    let hasValidData = false;

    for (let i = 0; i < len; i++) {
        const trimmed = stripChars(values[i], null, { returnStringOnNull: true }) ?? "";
        trimmedValues[i] = trimmed;
        if (nullValues.has(trimmed)) continue;

        hasValidData = true;
        if (activeMask !== 0) {
            for (let bit = 0; bit < 4; bit++) {
                if ((activeMask & (1 << bit)) && CSV_CANDIDATES[bit].parse(trimmed) === null) {
                    activeMask &= ~(1 << bit);
                }
            }
        }
    }

    let matchIdx = -1;
    if (hasValidData && activeMask !== 0) {
        for (let bit = 0; bit < 4; bit++) {
            if (activeMask & (1 << bit)) {
                matchIdx = bit;
                break;
            }
        }
    }

    const type = matchIdx >= 0 ? CSV_CANDIDATES[matchIdx].type : Utf8;
    const parseFn = matchIdx >= 0 ? CSV_CANDIDATES[matchIdx].parse : null;

    const out = new Array(len);
    for (let i = 0; i < len; i++) {
        const trimmed = trimmedValues[i];
        out[i] = nullValues.has(trimmed) ? null : (parseFn !== null ? parseFn(trimmed) : values[i]);
    }

    return { type, values: out };
}

