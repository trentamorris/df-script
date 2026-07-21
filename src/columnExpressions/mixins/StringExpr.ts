import type { IExpr, StrptimeOptions } from "../../types";
import { ExprBase, derive } from "../ExprBase";
import { kleeneUnary, kleeneBinary } from "../utils";
import {
    toValidDate,
    toValidDecimal,
    toValidInt,
    toValidTime,
    strptime,
    stripChars,
    StripCharsOptions,
    isRegExp,
    changeCase
} from "../../utils";

export class StringExprNamespace {
    constructor(public expr: any) { }

    _deriveString(fn: (v: string) => any) {
        return derive(this.expr, kleeneUnary((v) => fn(String(v))));
    }

    _patternGuard(pattern: any, fn: () => any) {
        if (pattern == null) {
            return derive(this.expr, (vArray) => new Array(vArray.length).fill(null));
        }
        return fn();
    }

    concat(other: string | IExpr) {
        return derive(this.expr, kleeneBinary(this.expr, other, (v, o) => String(v) + String(o)));
    }

    /**
     * Checks if a string contains the search substring pattern (supports Regex).
     * @param pattern The search substring or regular expression pattern.
     * @example
     * $df.col("email").str.contains("@example.com")
     * @since v1.7.0
     */
    contains(pattern: string | RegExp) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => isRegExp(pattern) ? pattern.test(str) : str.includes(pattern))
        );
    }

    count_matches(pattern: string | RegExp) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => {
                if (isRegExp(pattern)) {
                    const regex = pattern.global
                        ? pattern
                        : new RegExp(pattern.source, pattern.flags + "g");
                    const matches = str.match(regex);
                    return matches ? matches.length : 0;
                } else {
                    let count = 0;
                    let pos = str.indexOf(pattern);
                    while (pos !== -1) {
                        count++;
                        pos = str.indexOf(pattern, pos + pattern.length);
                    }
                    return count;
                }
            })
        );
    }

    decode_uri_component() {
        return this._deriveString((str) => {
            try {
                return decodeURIComponent(str);
            } catch {
                return str;
            }
        });
    }

    encode_uri_component() {
        return this._deriveString((str) => {
            try {
                return encodeURIComponent(str);
            } catch {
                return str;
            }
        });
    }

    /**
     * Checks if string ends with a suffix suffix.
     * @param suffix The suffix substring.
     * @example
     * $df.col("email").str.ends_with(".org")
     * @since v1.5.0
     */
    ends_with(suffix: string) {
        return this._deriveString((str) => str.endsWith(suffix));
    }

    explode() {
        return this._deriveString((str) => str.split(""));
    }

    extract(pattern: RegExp, group: number = 0) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => {
                const match = str.match(pattern);
                if (!match) return null;
                return match[group] !== undefined ? match[group] : null;
            })
        );
    }

    len() {
        return this.len_chars();
    }

    len_bytes() {
        return this._deriveString((str) => new TextEncoder().encode(str).length);
    }

    len_chars() {
        return this._deriveString((str) => str.length);
    }

    lower() {
        return this._deriveString((str) => str.toLowerCase());
    }

    lpad(width: number, fill: string = " ") {
        return this._deriveString((str) => str.padStart(width, fill));
    }

    pad_end(width: number, fill: string = " ") {
        return this.rpad(width, fill);
    }

    pad_start(width: number, fill: string = " ") {
        return this.lpad(width, fill);
    }

    /**
     * Replaces the first occurrence matching a string pattern.
     * @param pattern The search pattern string or regular expression.
     * @param replacement The string value or match replacement function.
     * @example
     * $df.col("email").str.replace("old.com", "new.com")
     * @since v1.6.0
     */
    replace(
        pattern: string | RegExp,
        replacement: string | ((match: string, ...args: any[]) => string)
    ) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => str.replace(pattern, replacement as any))
        );
    }

    replace_all(
        pattern: string | RegExp,
        replacement: string | ((match: string, ...args: any[]) => string)
    ) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => str.replaceAll(pattern, replacement as any))
        );
    }

    reverse() {
        return this._deriveString((str) => str.split("").reverse().join(""));
    }

    rpad(width: number, fill: string = " ") {
        return this._deriveString((str) => str.padEnd(width, fill));
    }

    slice(offset: number, length?: number) {
        return this._deriveString((str) => {
            const start = offset < 0 ? str.length + offset : offset;
            const end = length !== undefined ? start + length : undefined;
            return str.slice(start, end);
        });
    }

    slice_str(offset: number, length?: number) {
        return this.slice(offset, length);
    }

    split(delimiter: string) {
        return this._deriveString((str) => str.split(delimiter));
    }

    /**
     * Checks if string starts with a prefix prefix.
     * @param prefix The prefix substring.
     * @example
     * $df.col("name").str.starts_with("John")
     * @since v1.5.0
     */
    starts_with(prefix: string) {
        return this._deriveString((str) => str.startsWith(prefix));
    }

    strip_chars(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "both", ...options }));
    }

    strip_chars_end(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "end", ...options }));
    }

    strip_chars_start(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "start", ...options }));
    }

    strip_prefix(prefix: string) {
        return this._deriveString((str) => {
            return stripChars(str, prefix, {
                mode: "start",
                maxScanStart: 1,
                maxMatchesStart: 1,
                returnStringOnNull: true,
                stringOptions: { literal: true }
            }) as string;
        });
    }

    strip_suffix(suffix: string) {
        return this._deriveString((str) => {
            return stripChars(str, suffix, {
                mode: "end",
                maxScanEnd: 1,
                maxMatchesEnd: 1,
                returnStringOnNull: true,
                stringOptions: { literal: true }
            }) as string;
        });
    }

    strptime(options: StrptimeOptions) {
        return this._deriveString((str) => strptime(str, options));
    }

    to_camelcase() {
        return this._deriveString((str) => changeCase(str, { format: "camel" }));
    }

    to_date() {
        return this._deriveString((str) => toValidDate(str, { dateOnly: true }));
    }

    to_datetime() {
        return this._deriveString(toValidDate);
    }

    to_decimal(precision?: number, scale?: number) {
        return this._deriveString((str) => toValidDecimal(str, { precision, scale }));
    }

    to_integer() {
        return this._deriveString((str) => toValidInt(str));
    }

    to_kebabcase() {
        return this._deriveString((str) => changeCase(str, { format: "kebab" }));
    }

    /**
     * Converts all string elements in the column to lowercase.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({
     * ...   c: ["ALICE", "Bob", "charlie"]
     * ... })
     * shape: (3, 1)
     * ┌─────────┐
     * │ c       │
     * ├─────────┤
     * │ ALICE   │
     * │ Bob     │
     * │ charlie │
     * └─────────┘
     * 
     * >>> df.with_columns($df.col("c").str.to_lowercase().alias("lower_name"))
     * shape: (3, 2)
     * ┌─────────┬────────────┐
     * │ c       │ lower_name │
     * ├─────────┼────────────┤
     * │ ALICE   │ alice      │
     * │ Bob     │ bob        │
     * │ charlie │ charlie    │
     * └─────────┴────────────┘
     * @since v1.5.0
     */
    to_lowercase() {
        return this.lower();
    }

    to_pascalcase() {
        return this._deriveString((str) => changeCase(str, { format: "pascal" }));
    }

    to_snakecase() {
        return this._deriveString((str) => changeCase(str, { format: "snake" }));
    }

    to_time() {
        return this._deriveString(toValidTime);
    }

    to_titlecase() {
        return this._deriveString((str) => str.replace(/\b\w/g, c => c.toUpperCase()));
    }

    /**
     * Converts all string elements in the column to uppercase.
     * @example
     * $df.col("name").str.to_uppercase()
     * @since v1.5.0
     */
    to_uppercase() {
        return this.upper();
    }

    /**
     * Trims leading and trailing white space characters from each string element.
     * @example
     * $df.col("name").str.trim()
     * @since v1.6.0
     */
    trim() {
        return this.strip_chars();
    }

    trim_end() {
        return this.strip_chars_end();
    }

    trim_start() {
        return this.strip_chars_start();
    }

    upper() {
        return this._deriveString((str) => str.toUpperCase());
    }

    zfill(width: number) {
        return this._deriveString((str) => str.padStart(width, "0"));
    }
}

export class StringExpr extends ExprBase {
    get str() {
        return new StringExprNamespace(this);
    }
}
