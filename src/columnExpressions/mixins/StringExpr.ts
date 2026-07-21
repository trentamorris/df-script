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

    /**
     * Concatenates string elements with another string value or expression.
     * @param other The string value or column expression to concatenate.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ first: ["John"], last: ["Doe"] })
     * >>> df.with_columns($df.col("first").str.concat(" ").str.concat($df.col("last")).alias("full"))
     * shape: (1, 3)
     * ┌───────┬──────┬──────────┐
     * │ first │ last │ full     │
     * ├───────┼──────┼──────────┤
     * │ John  │ Doe  │ John Doe │
     * └───────┴──────┴──────────┘
     * @since v1.6.0
     */
    concat(other: string | IExpr) {
        return derive(this.expr, kleeneBinary(this.expr, other, (v, o) => String(v) + String(o)));
    }

    /**
     * Checks if a string contains the search substring pattern (supports Regex).
     * @param pattern The search substring or regular expression pattern.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ email: ["user@example.com", "admin@test.org"] })
     * >>> df.with_columns($df.col("email").str.contains("@example.com").alias("is_example"))
     * shape: (2, 2)
     * ┌──────────────────┬────────────┐
     * │ email            │ is_example │
     * ├──────────────────┼────────────┤
     * │ user@example.com │ true       │
     * │ admin@test.org   │ false      │
     * └──────────────────┴────────────┘
     * @since v1.7.0
     */
    contains(pattern: string | RegExp) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => isRegExp(pattern) ? pattern.test(str) : str.includes(pattern))
        );
    }

    /**
     * Counts occurrences of a substring or regular expression match in each string element.
     * @param pattern Search substring or regular expression.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ code: ["banana", "apple"] })
     * >>> df.with_columns($df.col("code").str.count_matches("a").alias("a_count"))
     * shape: (2, 2)
     * ┌────────┬─────────┐
     * │ code   │ a_count │
     * ├────────┼─────────┤
     * │ banana │ 3       │
     * │ apple  │ 1       │
     * └────────┴─────────┘
     * @since v1.7.0
     */
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

    /**
     * Decodes Uniform Resource Identifier (URI) components.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ url: ["hello%20world"] })
     * >>> df.with_columns($df.col("url").str.decode_uri_component().alias("decoded"))
     * shape: (1, 2)
     * ┌───────────────┬─────────────┐
     * │ url           │ decoded     │
     * ├───────────────┼─────────────┤
     * │ hello%20world │ hello world │
     * └───────────────┴─────────────┘
     * @since v1.7.0
     */
    decode_uri_component() {
        return this._deriveString((str) => {
            try {
                return decodeURIComponent(str);
            } catch {
                return str;
            }
        });
    }

    /**
     * Encodes Uniform Resource Identifier (URI) components.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ term: ["hello world"] })
     * >>> df.with_columns($df.col("term").str.encode_uri_component().alias("encoded"))
     * shape: (1, 2)
     * ┌─────────────┬───────────────┐
     * │ term        │ encoded       │
     * ├─────────────┼───────────────┤
     * │ hello world │ hello%20world │
     * └─────────────┴───────────────┘
     * @since v1.7.0
     */
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
     * Checks if string ends with a suffix.
     * @param suffix The suffix substring.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ email: ["user@org.org", "admin@com.com"] })
     * >>> df.with_columns($df.col("email").str.ends_with(".org").alias("is_org"))
     * shape: (2, 2)
     * ┌──────────────┬────────┐
     * │ email        │ is_org │
     * ├──────────────┼────────┤
     * │ user@org.org │ true   │
     * │ admin@com.com│ false  │
     * └──────────────┴────────┘
     * @since v1.5.0
     */
    ends_with(suffix: string) {
        return this._deriveString((str) => str.endsWith(suffix));
    }

    /**
     * Splits strings into lists of single characters.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ word: ["cat"] })
     * >>> df.with_columns($df.col("word").str.explode().alias("chars"))
     * shape: (1, 2)
     * ┌──────┬─────────────────┐
     * │ word │ chars           │
     * ├──────┼─────────────────┤
     * │ cat  │ ["c", "a", "t"] │
     * └──────┴─────────────────┘
     * @since v1.7.0
     */
    explode() {
        return this._deriveString((str) => str.split(""));
    }

    /**
     * Extracts captured group matching a regular expression pattern.
     * @param pattern The regex pattern containing capture groups.
     * @param group Group index to extract (default 0 for whole match).
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ info: ["id:123"] })
     * >>> df.with_columns($df.col("info").str.extract(/id:(\d+)/, 1).alias("id"))
     * shape: (1, 2)
     * ┌────────┬─────┐
     * │ info   │ id  │
     * ├────────┼─────┤
     * │ id:123 │ 123 │
     * └────────┴─────┘
     * @since v1.7.0
     */
    extract(pattern: RegExp, group: number = 0) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => {
                const match = str.match(pattern);
                if (!match) return null;
                return match[group] !== undefined ? match[group] : null;
            })
        );
    }

    /**
     * Returns string length in UTF-16 code units. Alias for len_chars.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ str: ["hello"] })
     * >>> df.with_columns($df.col("str").str.len().alias("length"))
     * shape: (1, 2)
     * ┌───────┬────────┐
     * │ str   │ length │
     * ├───────┼────────┤
     * │ hello │ 5      │
     * └───────┴────────┘
     * @since v1.5.0
     */
    len() {
        return this.len_chars();
    }

    /**
     * Returns string length in UTF-8 encoded bytes.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ str: ["hello"] })
     * >>> df.with_columns($df.col("str").str.len_bytes().alias("bytes"))
     * shape: (1, 2)
     * ┌───────┬───────┐
     * │ str   │ bytes │
     * ├───────┼───────┤
     * │ hello │ 5     │
     * └───────┴───────┘
     * @since v1.6.0
     */
    len_bytes() {
        return this._deriveString((str) => new TextEncoder().encode(str).length);
    }

    /**
     * Returns string length in character count.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["hello"] })
     * >>> df.with_columns($df.col("text").str.len_chars().alias("length"))
     * shape: (1, 2)
     * ┌───────┬────────┐
     * │ text  │ length │
     * ├───────┼────────┤
     * │ hello │ 5      │
     * └───────┴────────┘
     * @since v1.6.0
     */
    len_chars() {
        return this._deriveString((str) => str.length);
    }

    /**
     * Converts strings to lowercase.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ str: ["HELLO"] })
     * >>> df.with_columns($df.col("str").str.lower().alias("lowered"))
     * shape: (1, 2)
     * ┌───────┬─────────┐
     * │ str   │ lowered │
     * ├───────┼─────────┤
     * │ HELLO │ hello   │
     * └───────┴─────────┘
     * @since v1.5.0
     */
    lower() {
        return this._deriveString((str) => str.toLowerCase());
    }

    /**
     * Pads start of strings to specified width.
     * @param width Minimum resulting string length.
     * @param fill Character sequence used for padding.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ num: ["5"] })
     * >>> df.with_columns($df.col("num").str.lpad(3, "0").alias("padded"))
     * shape: (1, 2)
     * ┌─────┬────────┐
     * │ num │ padded │
     * ├─────┼────────┤
     * │ 5   │ 005    │
     * └─────┴────────┘
     * @since v1.6.0
     */
    lpad(width: number, fill: string = " ") {
        return this._deriveString((str) => str.padStart(width, fill));
    }

    /**
     * Pads end of strings to specified width. Alias for rpad.
     * @param width Target string length.
     * @param fill Character sequence used for padding.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["a"] })
     * >>> df.with_columns($df.col("text").str.pad_end(3, "-").alias("padded"))
     * shape: (1, 2)
     * ┌──────┬────────┐
     * │ text │ padded │
     * ├──────┼────────┤
     * │ a    │ a--    │
     * └──────┴────────┘
     * @since v1.6.0
     */
    pad_end(width: number, fill: string = " ") {
        return this.rpad(width, fill);
    }

    /**
     * Pads start of strings to specified width. Alias for lpad.
     * @param width Target string length.
     * @param fill Character sequence used for padding.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ num: ["5"] })
     * >>> df.with_columns($df.col("num").str.pad_start(3, "0").alias("padded"))
     * shape: (1, 2)
     * ┌─────┬────────┐
     * │ num │ padded │
     * ├─────┼────────┤
     * │ 5   │ 005    │
     * └─────┴────────┘
     * @since v1.6.0
     */
    pad_start(width: number, fill: string = " ") {
        return this.lpad(width, fill);
    }

    /**
     * Replaces the first occurrence matching a string pattern.
     * @param pattern The search pattern string or regular expression.
     * @param replacement The string value or match replacement function.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ email: ["old.com"] })
     * >>> df.with_columns($df.col("email").str.replace("old.com", "new.com").alias("updated"))
     * shape: (1, 2)
     * ┌─────────┬─────────┐
     * │ email   │ updated │
     * ├─────────┼─────────┤
     * │ old.com │ new.com │
     * └─────────┴─────────┘
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

    /**
     * Replaces all occurrences matching a string pattern or global regular expression.
     * @param pattern The search pattern string or regular expression.
     * @param replacement The replacement value.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["foo bar foo"] })
     * >>> df.with_columns($df.col("text").str.replace_all("foo", "baz").alias("replaced"))
     * shape: (1, 2)
     * ┌─────────────┬─────────────┐
     * │ text        │ replaced    │
     * ├─────────────┼─────────────┤
     * │ foo bar foo │ baz bar baz │
     * └─────────────┴─────────────┘
     * @since v1.6.0
     */
    replace_all(
        pattern: string | RegExp,
        replacement: string | ((match: string, ...args: any[]) => string)
    ) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => str.replaceAll(pattern, replacement as any))
        );
    }

    /**
     * Reverses characters in each string element.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ str: ["abc"] })
     * >>> df.with_columns($df.col("str").str.reverse().alias("rev"))
     * shape: (1, 2)
     * ┌─────┬─────┐
     * │ str │ rev │
     * ├─────┼─────┤
     * │ abc │ cba │
     * └─────┴─────┘
     * @since v1.7.0
     */
    reverse() {
        return this._deriveString((str) => str.split("").reverse().join(""));
    }

    /**
     * Pads end of strings to specified width.
     * @param width Minimum resulting string length.
     * @param fill Character sequence used for padding.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["a"] })
     * >>> df.with_columns($df.col("text").str.rpad(3, "-").alias("padded"))
     * shape: (1, 2)
     * ┌──────┬────────┐
     * │ text │ padded │
     * ├──────┼────────┤
     * │ a    │ a--    │
     * └──────┴────────┘
     * @since v1.6.0
     */
    rpad(width: number, fill: string = " ") {
        return this._deriveString((str) => str.padEnd(width, fill));
    }

    /**
     * Extracts a substring slice using start offset and length.
     * @param offset Starting position index.
     * @param length Number of characters to include.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ str: ["hello world"] })
     * >>> df.with_columns($df.col("str").str.slice(0, 5).alias("sub"))
     * shape: (1, 2)
     * ┌─────────────┬───────┐
     * │ str         │ sub   │
     * ├─────────────┼───────┤
     * │ hello world │ hello │
     * └─────────────┴───────┘
     * @since v1.6.0
     */
    slice(offset: number, length?: number) {
        return this._deriveString((str) => {
            const start = offset < 0 ? str.length + offset : offset;
            const end = length !== undefined ? start + length : undefined;
            return str.slice(start, end);
        });
    }

    /**
     * Extracts a substring slice. Alias for slice.
     * @param offset Starting position index.
     * @param length Number of characters to include.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ str: ["hello world"] })
     * >>> df.with_columns($df.col("str").str.slice_str(0, 5).alias("sub"))
     * shape: (1, 2)
     * ┌─────────────┬───────┐
     * │ str         │ sub   │
     * ├─────────────┼───────┤
     * │ hello world │ hello │
     * └─────────────┴───────┘
     * @since v1.6.0
     */
    slice_str(offset: number, length?: number) {
        return this.slice(offset, length);
    }

    /**
     * Splits strings into lists by delimiter.
     * @param delimiter Substring delimiter.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ csv: ["a,b,c"] })
     * >>> df.with_columns($df.col("csv").str.split(",").alias("items"))
     * shape: (1, 2)
     * ┌───────┬─────────────────┐
     * │ csv   │ items           │
     * ├───────┼─────────────────┤
     * │ a,b,c │ ["a", "b", "c"] │
     * └───────┴─────────────────┘
     * @since v1.6.0
     */
    split(delimiter: string) {
        return this._deriveString((str) => str.split(delimiter));
    }

    /**
     * Checks if string starts with a prefix.
     * @param prefix The prefix substring.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ name: ["John Doe", "Alice"] })
     * >>> df.with_columns($df.col("name").str.starts_with("John").alias("is_john"))
     * shape: (2, 2)
     * ┌──────────┬─────────┐
     * │ name     │ is_john │
     * ├──────────┼─────────┤
     * │ John Doe │ true    │
     * │ Alice    │ false   │
     * └──────────┴─────────┘
     * @since v1.5.0
     */
    starts_with(prefix: string) {
        return this._deriveString((str) => str.startsWith(prefix));
    }

    /**
     * Strips matching characters from start and end of string.
     * @param characters Characters or regex pattern to strip.
     * @param options Configuration options for strip operation.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["--hello--"] })
     * >>> df.with_columns($df.col("text").str.strip_chars("-").alias("stripped"))
     * shape: (1, 2)
     * ┌───────────┬──────────┐
     * │ text      │ stripped │
     * ├───────────┼──────────┤
     * │ --hello-- │ hello    │
     * └───────────┴──────────┘
     * @since v1.7.0
     */
    strip_chars(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "both", ...options }));
    }

    /**
     * Strips matching characters from end of string.
     * @param characters Characters or regex pattern to strip.
     * @param options Configuration options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["hello--"] })
     * >>> df.with_columns($df.col("text").str.strip_chars_end("-").alias("stripped"))
     * shape: (1, 2)
     * ┌─────────┬──────────┐
     * │ text    │ stripped │
     * ├─────────┼──────────┤
     * │ hello-- │ hello    │
     * └─────────┴──────────┘
     * @since v1.7.0
     */
    strip_chars_end(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "end", ...options }));
    }

    /**
     * Strips matching characters from start of string.
     * @param characters Characters or regex pattern to strip.
     * @param options Configuration options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["--hello"] })
     * >>> df.with_columns($df.col("text").str.strip_chars_start("-").alias("stripped"))
     * shape: (1, 2)
     * ┌─────────┬──────────┐
     * │ text    │ stripped │
     * ├─────────┼──────────┤
     * │ --hello │ hello    │
     * └─────────┴──────────┘
     * @since v1.7.0
     */
    strip_chars_start(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "start", ...options }));
    }

    /**
     * Strips matching prefix substring from start of string.
     * @param prefix Prefix substring to remove.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["pre_fix"] })
     * >>> df.with_columns($df.col("text").str.strip_prefix("pre_").alias("stripped"))
     * shape: (1, 2)
     * ┌─────────┬──────────┐
     * │ text    │ stripped │
     * ├─────────┼──────────┤
     * │ pre_fix │ fix      │
     * └─────────┴──────────┘
     * @since v1.7.0
     */
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

    /**
     * Strips matching suffix substring from end of string.
     * @param suffix Suffix substring to remove.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["fix_post"] })
     * >>> df.with_columns($df.col("text").str.strip_suffix("_post").alias("stripped"))
     * shape: (1, 2)
     * ┌──────────┬──────────┐
     * │ text     │ stripped │
     * ├──────────┼──────────┤
     * │ fix_post │ fix      │
     * └──────────┴──────────┘
     * @since v1.7.0
     */
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

    /**
     * Parses date/time string into Datetime.
     * @param options Parsing configuration options.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").str.strptime({ format: "%Y-%m-%d" }).alias("parsed"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ parsed                   │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-20T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     * @since v1.6.0
     */
    strptime(options: StrptimeOptions) {
        return this._deriveString((str) => strptime(str, options));
    }

    /**
     * Converts string casing to camelCase.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["hello_world"] })
     * >>> df.with_columns($df.col("text").str.to_camelcase().alias("camel"))
     * shape: (1, 2)
     * ┌─────────────┬────────────┐
     * │ text        │ camel      │
     * ├─────────────┼────────────┤
     * │ hello_world │ helloWorld │
     * └─────────────┴────────────┘
     * @since v1.7.0
     */
    to_camelcase() {
        return this._deriveString((str) => changeCase(str, { format: "camel" }));
    }

    /**
     * Parses string into Date object.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ d: ["2026-05-20"] })
     * >>> df.with_columns($df.col("d").str.to_date().alias("date"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ date                     │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-20T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     * @since v1.6.0
     */
    to_date() {
        return this._deriveString((str) => toValidDate(str, { dateOnly: true }));
    }

    /**
     * Parses string into Datetime value.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ ts: ["2026-05-20T10:00:00Z"] })
     * >>> df.with_columns($df.col("ts").str.to_datetime().alias("dt"))
     * shape: (1, 2)
     * ┌──────────────────────┬──────────────────────────┐
     * │ ts                   │ dt                       │
     * ├──────────────────────┼──────────────────────────┤
     * │ 2026-05-20T10:00:00Z │ 2026-05-20T10:00:00.000Z │
     * └──────────────────────┴──────────────────────────┘
     * @since v1.6.0
     */
    to_datetime() {
        return this._deriveString(toValidDate);
    }

    /**
     * Converts string into numeric decimal representation.
     * @param precision Optional precision limit.
     * @param scale Optional scale limit.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: ["12.34"] })
     * >>> df.with_columns($df.col("val").str.to_decimal().alias("num"))
     * shape: (1, 2)
     * ┌───────┬───────┐
     * │ val   │ num   │
     * ├───────┼───────┤
     * │ 12.34 │ 12.34 │
     * └───────┴───────┘
     * @since v1.7.0
     */
    to_decimal(precision?: number, scale?: number) {
        return this._deriveString((str) => toValidDecimal(str, { precision, scale }));
    }

    /**
     * Parses string into integer number.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ val: ["42"] })
     * >>> df.with_columns($df.col("val").str.to_integer().alias("num"))
     * shape: (1, 2)
     * ┌─────┬─────┐
     * │ val │ num │
     * ├─────┼─────┤
     * │ 42  │ 42  │
     * └─────┴─────┘
     * @since v1.6.0
     */
    to_integer() {
        return this._deriveString((str) => toValidInt(str));
    }

    /**
     * Converts string casing to kebab-case.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["helloWorld"] })
     * >>> df.with_columns($df.col("text").str.to_kebabcase().alias("kebab"))
     * shape: (1, 2)
     * ┌────────────┬─────────────┐
     * │ text       │ kebab       │
     * ├────────────┼─────────────┤
     * │ helloWorld │ hello-world │
     * └────────────┴─────────────┘
     * @since v1.7.0
     */
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

    /**
     * Converts string casing to PascalCase.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["hello_world"] })
     * >>> df.with_columns($df.col("text").str.to_pascalcase().alias("pascal"))
     * shape: (1, 2)
     * ┌─────────────┬────────────┐
     * │ text        │ pascal     │
     * ├─────────────┼────────────┤
     * │ hello_world │ HelloWorld │
     * └─────────────┴────────────┘
     * @since v1.7.0
     */
    to_pascalcase() {
        return this._deriveString((str) => changeCase(str, { format: "pascal" }));
    }

    /**
     * Converts string casing to snake_case.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["helloWorld"] })
     * >>> df.with_columns($df.col("text").str.to_snakecase().alias("snake"))
     * shape: (1, 2)
     * ┌────────────┬─────────────┐
     * │ text       │ snake       │
     * ├────────────┼─────────────┤
     * │ helloWorld │ hello_world │
     * └────────────┴─────────────┘
     * @since v1.7.0
     */
    to_snakecase() {
        return this._deriveString((str) => changeCase(str, { format: "snake" }));
    }

    /**
     * Parses string into time component representation.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ t: ["10:30:00"] })
     * >>> df.with_columns($df.col("t").str.to_time().alias("time"))
     * shape: (1, 2)
     * ┌──────────┬──────────┐
     * │ t        │ time     │
     * ├──────────┼──────────┤
     * │ 10:30:00 │ 10:30:00 │
     * └──────────┴──────────┘
     * @since v1.6.0
     */
    to_time() {
        return this._deriveString(toValidTime);
    }

    /**
     * Converts string casing to Title Case.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["hello world"] })
     * >>> df.with_columns($df.col("text").str.to_titlecase().alias("title"))
     * shape: (1, 2)
     * ┌─────────────┬─────────────┐
     * │ text        │ title       │
     * ├─────────────┼─────────────┤
     * │ hello world │ Hello World │
     * └─────────────┴─────────────┘
     * @since v1.7.0
     */
    to_titlecase() {
        return this._deriveString((str) => str.replace(/\b\w/g, c => c.toUpperCase()));
    }

    /**
     * Converts all string elements in the column to uppercase.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ name: ["alice"] })
     * >>> df.with_columns($df.col("name").str.to_uppercase().alias("upper"))
     * shape: (1, 2)
     * ┌───────┬───────┐
     * │ name  │ upper │
     * ├───────┼───────┤
     * │ alice │ ALICE │
     * └───────┴───────┘
     * @since v1.5.0
     */
    to_uppercase() {
        return this.upper();
    }

    /**
     * Trims leading and trailing whitespace characters from each string element.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ name: ["  alice  "] })
     * >>> df.with_columns($df.col("name").str.trim().alias("clean"))
     * shape: (1, 2)
     * ┌───────────┬───────┐
     * │ name      │ clean │
     * ├───────────┼───────┤
     * │   alice   │ alice │
     * └───────────┴───────┘
     * @since v1.6.0
     */
    trim() {
        return this.strip_chars();
    }

    /**
     * Trims trailing whitespace characters from each string element.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ name: ["alice  "] })
     * >>> df.with_columns($df.col("name").str.trim_end().alias("clean"))
     * shape: (1, 2)
     * ┌─────────┬───────┐
     * │ name    │ clean │
     * ├─────────┼───────┤
     * │ alice   │ alice │
     * └─────────┴───────┘
     * @since v1.6.0
     */
    trim_end() {
        return this.strip_chars_end();
    }

    /**
     * Trims leading whitespace characters from each string element.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ name: ["  alice"] })
     * >>> df.with_columns($df.col("name").str.trim_start().alias("clean"))
     * shape: (1, 2)
     * ┌─────────┬───────┐
     * │ name    │ clean │
     * ├─────────┼───────┤
     * │   alice │ alice │
     * └─────────┴───────┘
     * @since v1.6.0
     */
    trim_start() {
        return this.strip_chars_start();
    }

    /**
     * Converts string to uppercase.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ text: ["alice"] })
     * >>> df.with_columns($df.col("text").str.upper().alias("upper"))
     * shape: (1, 2)
     * ┌───────┬───────┐
     * │ text  │ upper │
     * ├───────┼───────┤
     * │ alice │ ALICE │
     * └───────┴───────┘
     * @since v1.5.0
     */
    upper() {
        return this._deriveString((str) => str.toUpperCase());
    }

    /**
     * Pads start of string with zeros to target width.
     * @param width Minimum resulting string width.
     * @returns ColumnExpression
     * @example
     * >>> const df = $df.data({ num: ["42"] })
     * >>> df.with_columns($df.col("num").str.zfill(5).alias("padded"))
     * shape: (1, 2)
     * ┌─────┬────────┐
     * │ num │ padded │
     * ├─────┼────────┤
     * │ 42  │ 00042  │
     * └─────┴────────┘
     * @since v1.6.0
     */
    zfill(width: number) {
        return this._deriveString((str) => str.padStart(width, "0"));
    }
}

export class StringExpr extends ExprBase {
    get str() {
        return new StringExprNamespace(this);
    }
}
