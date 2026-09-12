import type {
    IExpr,
    StrptimeOptions,
    StringDecodeOptions,
    StringEncodeOptions,
    EscapeRegexOptions,
    ExtractManyOptions,
    ExtractRegexEngineOptions,
    FindOptions,
    FindManyOptions,
    SplitOptions,
    ReplaceOptions,
    ReplaceManyOptions
} from "../../types";
import { ExprBase } from "../ExprBase";
import { TEXT_ENCODER } from "../../constants";
import {
    toValidDate,
    toValidDecimal,
    toValidInt,
    toValidTime,
    strptime,
    stripChars,
    StripCharsOptions,
    isRegExp,
    changeCase,
    encodeString,
    decodeString,
    escapeRegExp,
    extractRegex,
    extractRegexAll,
    extractRegexMany,
    findRegex,
    findManyRegex,
    splitString,
    replaceString,
    replaceManyString,
    extractRegexEngine,
    toCleanRegExp,
    toValidArray,
    joinArray,
    JoinArrayOptions,
    safeJsonParse,
    SafeJsonParseOptions,
    jsonPathMatch
} from "../../utils";

/**
 * @namespace $df.col.str
 * @category ColumnExpression
 * @syntax $df.col(<column_name>).str.{symbol}(...)
 */
export class StringExprNamespace {
    constructor(public _expr: any) { }

    _deriveString(fn: (v: string) => any) {
        return this._expr._deriveUnary((v: any) => fn(String(v)));
    }

    _patternGuard(pattern: any, fn: () => any) {
        if (pattern == null) {
            return this._expr._derive((vArray: any[]) => new Array(vArray.length).fill(null));
        }
        return fn();
    }

    _matchPattern(str: string, pattern: string | RegExp): boolean {
        if (pattern == null) return false;
        if (isRegExp(pattern)) {
            pattern.lastIndex = 0;
            return pattern.test(str);
        }
        return str.includes(pattern);
    }

    /**
     * Concatenates string elements with another string value or expression.
     * @param other The string value or column expression to concatenate.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.concat("!").alias("exclaimed"))
     * shape: (3, 2)
     * ┌──────────┬───────────┐
     * │ s        │ exclaimed │
     * ├──────────┼───────────┤
     * │ "apple"  │ apple!    │
     * │ "banana" │ banana!   │
     * │ "cherry" │ cherry!   │
     * └──────────┴───────────┘
     */
    concat(other: string | IExpr) {
        return this._expr._deriveBinary(other, (v: any, o: any) => String(v) + String(o));
    }

    /**
     * Checks if a string contains the search substring pattern (supports Regex).
     * @param pattern The search substring or regular expression pattern.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("email").str.contains("@example.com").alias("is_example"))
     * shape: (2, 2)
     * ┌──────────────────┬────────────┐
     * │ email            │ is_example │
     * ├──────────────────┼────────────┤
     * │ user@example.com │ true       │
     * │ admin@test.org   │ false      │
     * └──────────────────┴────────────┘
     */
    contains(pattern: string | RegExp) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => this._matchPattern(str, pattern))
        );
    }

    /**
     * Checks if a string contains any of the search patterns.
     * @param patterns Array of substring or regular expression search patterns.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("email").str.containsAny(["@example.com", "@test.org"]).alias("is_target"))
     * shape: (2, 2)
     * ┌──────────────────┬───────────┐
     * │ email            │ is_target │
     * ├──────────────────┼───────────┤
     * │ user@example.com │ true      │
     * │ admin@test.org   │ true      │
     * └──────────────────┴───────────┘
     */
    containsAny(patterns: (string | RegExp)[]) {
        return this._patternGuard(patterns, () => {
            const list = toValidArray(patterns);
            const len = list.length;
            return this._deriveString((str) => {
                for (let i = 0; i < len; i++) {
                    if (this._matchPattern(str, list[i])) return true;
                }
                return false;
            });
        });
    }

    /**
     * Counts occurrences of a substring or regular expression match in each string element.
     * @param pattern Search substring or regular expression.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.countMatches("a").alias("a_count"))
     * shape: (3, 2)
     * ┌──────────┬─────────┐
     * │ s        │ a_count │
     * ├──────────┼─────────┤
     * │ "apple"  │ 1       │
     * │ "banana" │ 3       │
     * │ "cherry" │ 0       │
     * └──────────┴─────────┘
     */
    countMatches(pattern: string | RegExp | any, options: { literal?: boolean } | boolean = {}) {
        const literal = typeof options === "boolean" ? options : (options?.literal ?? false);
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => {
                const patStr = literal ? escapeRegExp(pattern) : pattern;

                const cleanObj = toCleanRegExp(str, patStr, { global: true });
                if (!cleanObj) return 0;

                const matches = cleanObj.input.match(cleanObj.reg);
                return matches ? matches.length : 0;
            })
        );
    }

    /**
     * Escapes special regular expression characters in string elements.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.escapeRegex().alias("escaped"))
     * shape: (3, 2)
     * ┌──────────┬─────────┐
     * │ s        │ escaped │
     * ├──────────┼─────────┤
     * │ "apple"  │ apple   │
     * │ "banana" │ banana  │
     * │ "cherry" │ cherry  │
     * └──────────┴─────────┘
     */
    escapeRegex(options: EscapeRegexOptions = {}) {
        return this._deriveString((str) => escapeRegExp(str, options));
    }

    /**
     * Decodes hex or base64 encoded string column values into string.
     * @note [Runtime Fallback]: Automatically leverages native `Uint8Array.fromBase64` / `Uint8Array.fromHex`
     * when available in the runtime, with seamless automatic fallback to standard decoding across older environments.
     * @param options Object containing encoding ("hex" | "base64") and optional strict flag
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.encode({ encoding: "hex" }).str.decode({ encoding: "hex" }).alias("decoded"))
     * shape: (3, 2)
     * ┌──────────┬─────────┐
     * │ s        │ decoded │
     * ├──────────┼─────────┤
     * │ "apple"  │ apple   │
     * │ "banana" │ banana  │
     * │ "cherry" │ cherry  │
     * └──────────┴─────────┘
     */
    decode(options: StringDecodeOptions) {
        return this._deriveString((str) => decodeString(str, options.encoding, options));
    }

    /**
     * Encodes string column values into hex or base64.
     * @note [Runtime Fallback]: Automatically leverages native `Uint8Array.prototype.toBase64` / `Uint8Array.prototype.toHex`
     * when available, with automatic fallback across standard environments.
     * @param options Object containing encoding ("hex" | "base64")
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.encode({ encoding: "hex" }).alias("encoded"))
     * shape: (3, 2)
     * ┌──────────┬────────────────┐
     * │ s        │ encoded        │
     * ├──────────┼────────────────┤
     * │ "apple"  │ 6170706c65     │
     * │ "banana" │ 62616e616e61   │
     * │ "cherry" │ 636865727279   │
     * └──────────┴────────────────┘
     */
    encode(options: StringEncodeOptions) {
        return this._deriveString((str) => encodeString(str, options.encoding));
    }

    /**
     * Decodes Uniform Resource Identifier (URI) components.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.encodeUriComponent().str.decodeUriComponent().alias("decoded"))
     * shape: (2, 2)
     * ┌─────────────┬─────────────┐
     * │ s           │ decoded     │
     * ├─────────────┼─────────────┤
     * │ "  hello  " │ "  hello  " │
     * │ "  world  " │ "  world  " │
     * └─────────────┴─────────────┘
     */
    decodeUriComponent() {
        return this._deriveString((str) => {
            try { return decodeURIComponent(str); } catch { return str; }
        });
    }

    /**
     * Encodes Uniform Resource Identifier (URI) components.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.encodeUriComponent().alias("encoded"))
     * shape: (2, 2)
     * ┌─────────────┬───────────────────┐
     * │ s           │ encoded           │
     * ├─────────────┼───────────────────┤
     * │ "  hello  " │ "%20%20hello%20%20" │
     * │ "  world  " │ "%20%20world%20%20" │
     * └─────────────┴───────────────────┘
     */
    encodeUriComponent() {
        return this._deriveString((str) => {
            try { return encodeURIComponent(str); } catch { return str; }
        });
    }

    /**
     * Checks if string ends with a suffix.
     * @param suffix The suffix substring.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("email").str.endsWith(".org").alias("is_org"))
     * shape: (2, 2)
     * ┌──────────────────┬────────┐
     * │ email            │ is_org │
     * ├──────────────────┼────────┤
     * │ user@example.com │ false  │
     * │ admin@test.org   │ true   │
     * └──────────────────┴────────┘
     */
    endsWith(suffix: string) {
        return this._deriveString((str) => str.endsWith(suffix));
    }

    /**
     * Splits strings into lists of single characters.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.explode().alias("chars"))
     * shape: (3, 2)
     * ┌──────────┬─────────────────────────────────────┐
     * │ s        │ chars                               │
     * ├──────────┼─────────────────────────────────────┤
     * │ "apple"  │ ["a", "p", "p", "l", "e"]           │
     * │ "banana" │ ["b", "a", "n", "a", "n", "a"]     │
     * │ "cherry" │ ["c", "h", "e", "r", "r", "y"]     │
     * └──────────┴─────────────────────────────────────┘
     */
    explode() {
        return this._deriveString((str) => str.split(""));
    }

    /**
     * Extracts a captured group from the first regex match.
     * @param pattern The regex pattern containing capture groups.
     * @param options Options object. Use `groupIndex` to select the group (default 1).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("email").str.extract(/@(\w+)/).alias("domain"))
     * shape: (2, 2)
     * ┌──────────────────┬─────────┐
     * │ email            │ domain  │
     * ├──────────────────┼─────────┤
     * │ user@example.com │ example │
     * │ admin@test.org   │ test    │
     * └──────────────────┴─────────┘
     */
    extract(pattern: RegExp | string, options?: ExtractRegexEngineOptions) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => extractRegex(str, pattern, options))
        );
    }

    /**
     * Extracts all occurrences matching a regular expression pattern.
     * @param pattern Search pattern (string or RegExp).
     * @param options Options object. Use `groupIndex` to select the group (default 0).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.extractAll(/[aeiou]/).alias("vowels"))
     * shape: (3, 2)
     * ┌──────────┬─────────────────┐
     * │ s        │ vowels          │
     * ├──────────┼─────────────────┤
     * │ "apple"  │ ["a", "e"]      │
     * │ "banana" │ ["a", "a", "a"] │
     * │ "cherry" │ ["e"]           │
     * └──────────┴─────────────────┘
     */
    extractAll(pattern: string | RegExp, options?: ExtractRegexEngineOptions) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => extractRegexAll(str, pattern, options) ?? [])
        );
    }

    /**
     * Extracts all captured groups from the first regex match into a structured object (struct).
     * @param pattern Search pattern containing capture groups.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("email").str.extractGroups(/(?<user>\w+)@(?<domain>\w+)/).alias("parsed"))
     * shape: (2, 2)
     * ┌──────────────────┬────────────────────────────────────┐
     * │ email            │ parsed                             │
     * ├──────────────────┼────────────────────────────────────┤
     * │ user@example.com │ { user: "user", domain: "example" }│
     * │ admin@test.org   │ { user: "admin", domain: "test" }  │
     * └──────────────────┴────────────────────────────────────┘
     */
    extractGroups(pattern: string | RegExp, options: ExtractRegexEngineOptions = {}) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => extractRegexEngine(str, pattern, options)?.[0] ?? null)
        );
    }

    /**
     * Extracts the first regex match for each pattern in a list of patterns.
     * @param patterns Array of regular expression patterns or strings.
     * @param options Named options object ({ asciiCaseInsensitive, overlapping }).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.extractMany([/app/, /ban/, /che/]).alias("extracted"))
     * shape: (3, 2)
     * ┌──────────┬─────────────┐
     * │ s        │ extracted   │
     * ├──────────┼─────────────┤
     * │ "apple"  │ ["app"]     │
     * │ "banana" │ ["ban"]     │
     * │ "cherry" │ ["che"]     │
     * └──────────┴─────────────┘
     */
    extractMany(patterns: (string | RegExp)[], options: ExtractManyOptions = {}) {
        return this._patternGuard(patterns, () =>
            this._deriveString((str) => extractRegexMany(str, patterns, options))
        );
    }

    /**
     * Return the byte offset of the first substring matching a pattern.
     * Returns null if pattern is not found.
     * @param value Search string or regular expression.
     * @param options Configuration options ({ literal, asciiCaseInsensitive }).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.find("a").alias("pos"))
     * shape: (3, 2)
     * ┌──────────┬──────┐
     * │ s        │ pos  │
     * ├──────────┼──────┤
     * │ "apple"  │ 0    │
     * │ "banana" │ 1    │
     * │ "cherry" │ null │
     * └──────────┴──────┘
     */
    find(value: string | RegExp, options: FindOptions = {}) {
        return this._patternGuard(value, () =>
            this._deriveString((str) => findRegex(str, value, options))
        );
    }

    /**
     * Return the starting byte offset of each match for multiple patterns.
     * @param patterns Array of regular expressions or literal search strings.
     * @param options Configuration options ({ literal, asciiCaseInsensitive, overlapping, leftmost }).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.findMany(["a", "e"]).alias("positions"))
     * shape: (3, 2)
     * ┌──────────┬───────────┐
     * │ s        │ positions │
     * ├──────────┼───────────┤
     * │ "apple"  │ [0, 4]    │
     * │ "banana" │ [1]       │
     * │ "cherry" │ [2]       │
     * └──────────┴───────────┘
     */
    findMany(patterns: (string | RegExp)[], options: FindManyOptions = {}) {
        return this._patternGuard(patterns, () =>
            this._deriveString((str) => findManyRegex(str, patterns, options))
        );
    }

    /**
     * Extracts the first n characters of each string element.
     * @param n Number of characters to extract from the start of the string (default 1).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.head(3).alias("prefix"))
     * shape: (3, 2)
     * ┌──────────┬────────┐
     * │ s        │ prefix │
     * ├──────────┼────────┤
     * │ "apple"  │ app    │
     * │ "banana" │ ban    │
     * │ "cherry" │ che    │
     * └──────────┴────────┘
     */
    head(n: number = 1) {
        return this.slice(0, n);
    }

    /**
     * Joins a list of string elements into a single string using a delimiter.
     * Accepts `JoinArrayOptions` (`{ ignoreNulls, nullValue, prefix, suffix, limit, truncationMarker, valueFormatter }`).
     * @param delimiter The string delimiter to join elements with.
     * @param options Formatting configuration options (`JoinArrayOptions`).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_array_nested_2rows -->
     * >>> df.withColumns($df.col("a").str.join("-").alias("joined"))
     * shape: (2, 2)
     * ┌────────────┬────────┐
     * │ a          │ joined │
     * ├────────────┼────────┤
     * │ ["a", "b"] │ a-b    │
     * │ ["c"]      │ c      │
     * └────────────┴────────┘
     */
    join(delimiter: string = "", options: JoinArrayOptions = {}) {
        return this._expr._deriveUnary((v: any) => {
            const arr = toValidArray(v);
            if (arr == null) return null;
            return joinArray(arr, delimiter, options);
        });
    }

    /**
     * Decodes JSON string elements into parsed objects or arrays.
     * Reuses safeJsonParse utility.
     * @param options Configuration options for parsing (`SafeJsonParseOptions`).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.trim().str.jsonDecode().alias("parsed"))
     * shape: (2, 2)
     * ┌─────────────┬─────────┐
     * │ s           │ parsed  │
     * ├─────────────┼─────────┤
     * │ "  hello  " │ "hello" │
     * │ "  world  " │ "world" │
     * └─────────────┴─────────┘
     */
    jsonDecode(options: SafeJsonParseOptions = {}) {
        return this._deriveString((str) => safeJsonParse(str, options));
    }

    /**
     * Extracts fields or array elements from JSON strings using JSONPath syntax.
     * @param jsonPath The JSONPath expression (e.g. `"$.store.book[0].title"` or `"$.a.b"`).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.trim().str.jsonPathMatch("$").alias("val"))
     * shape: (2, 2)
     * ┌─────────────┬─────────┐
     * │ s           │ val     │
     * ├─────────────┼─────────┤
     * │ "  hello  " │ "hello" │
     * │ "  world  " │ "world" │
     * └─────────────┴─────────┘
     */
    jsonPathMatch(jsonPath: string) {
        return this._deriveString((str) => jsonPathMatch(str, jsonPath));
    }

    /**
     * Returns string length in UTF-16 code units. Alias for lenChars.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.len().alias("length"))
     * shape: (3, 2)
     * ┌──────────┬────────┐
     * │ s        │ length │
     * ├──────────┼────────┤
     * │ "apple"  │ 5      │
     * │ "banana" │ 6      │
     * │ "cherry" │ 6      │
     * └──────────┴────────┘
     */
    len() {
        return this.lenChars();
    }

    /**
     * Returns string length in UTF-8 encoded bytes.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.lenBytes().alias("bytes"))
     * shape: (3, 2)
     * ┌──────────┬───────┐
     * │ s        │ bytes │
     * ├──────────┼───────┤
     * │ "apple"  │ 5     │
     * │ "banana" │ 6     │
     * │ "cherry" │ 6     │
     * └──────────┴───────┘
     */
    lenBytes() {
        return this._deriveString((str) => TEXT_ENCODER.encode(str).length);
    }

    /**
     * Returns string length in character count.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.lenChars().alias("length"))
     * shape: (3, 2)
     * ┌──────────┬────────┐
     * │ s        │ length │
     * ├──────────┼────────┤
     * │ "apple"  │ 5      │
     * │ "banana" │ 6      │
     * │ "cherry" │ 6      │
     * └──────────┴────────┘
     */
    lenChars() {
        return this._deriveString((str) => str.length);
    }

    /**
     * Converts strings to lowercase.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.lower().alias("lowered"))
     * shape: (3, 2)
     * ┌─────────────┬───────────┐
     * │ s           │ lowered   │
     * ├─────────────┼───────────┤
     * │ "HELLO"     │ hello     │
     * │ "World"     │ world     │
     * │ "df-script" │ df-script │
     * └─────────────┴───────────┘
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
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.lpad(8, "_").alias("padded"))
     * shape: (3, 2)
     * ┌──────────┬──────────┐
     * │ s        │ padded   │
     * ├──────────┼──────────┤
     * │ "apple"  │ ___apple │
     * │ "banana" │ __banana │
     * │ "cherry" │ __cherry │
     * └──────────┴──────────┘
     */
    lpad(width: number, fill: string = " ") {
        return this._deriveString((str) => str.padStart(width, fill));
    }

    /**
     * Normalizes Unicode strings using standard normalization forms (NFC, NFD, NFKC, NFKD).
     * @param form The Unicode normalization form to apply ("NFC", "NFD", "NFKC", or "NFKD"). Default is "NFC".
     * @returns ColumnExpression
     * @throws InvalidArgumentError If an invalid normalization form is provided.
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.normalize("NFC").alias("normalized"))
     * shape: (3, 2)
     * ┌─────────────┬────────────┐
     * │ s           │ normalized │
     * ├─────────────┼────────────┤
     * │ "HELLO"     │ HELLO      │
     * │ "World"     │ World      │
     * │ "df-script" │ df-script  │
     * └─────────────┴────────────┘
     */
    normalize(form?: Parameters<typeof String.prototype.normalize>[0]) {
        return this._deriveString((str) => str.normalize(form));
    }

    /**
     * Pads end of strings to specified width. Alias for rpad.
     * @param width Target string length.
     * @param fill Character sequence used for padding.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.padEnd(8, "_").alias("padded"))
     * shape: (3, 2)
     * ┌──────────┬──────────┐
     * │ s        │ padded   │
     * ├──────────┼──────────┤
     * │ "apple"  │ apple___ │
     * │ "banana" │ banana__ │
     * │ "cherry" │ cherry__ │
     * └──────────┴──────────┘
     */
    padEnd(width: number, fill: string = " ") {
        return this.rpad(width, fill);
    }

    /**
     * Pads start of strings to specified width. Alias for lpad.
     * @param width Target string length.
     * @param fill Character sequence used for padding.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.padStart(8, "_").alias("padded"))
     * shape: (3, 2)
     * ┌──────────┬──────────┐
     * │ s        │ padded   │
     * ├──────────┼──────────┤
     * │ "apple"  │ ___apple │
     * │ "banana" │ __banana │
     * │ "cherry" │ __cherry │
     * └──────────┴──────────┘
     */
    padStart(width: number, fill: string = " ") {
        return this.lpad(width, fill);
    }

    /**
     * Replaces the first occurrence matching a string pattern.
     * @param pattern The search pattern string or regular expression.
     * @param replacement The string value or match replacement function.
     * @param options Optional replace options (literal, asciiCaseInsensitive, n).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("email").str.replace("example", "test").alias("updated"))
     * shape: (2, 2)
     * ┌──────────────────┬───────────────┐
     * │ email            │ updated       │
     * ├──────────────────┼───────────────┤
     * │ user@example.com │ user@test.com │
     * │ admin@test.org   │ admin@test.org│
     * └──────────────────┴───────────────┘
     */
    replace(
        pattern: string | RegExp,
        replacement: string | ((match: string, ...args: any[]) => string),
        options?: ReplaceOptions
    ) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => replaceString(str, pattern, replacement, { n: 1, ...options }) ?? str)
        );
    }

    /**
     * Replaces all occurrences matching a string pattern or global regular expression.
     * @param pattern The search pattern string or regular expression.
     * @param replacement The replacement value.
     * @param options Optional replace options (literal, asciiCaseInsensitive).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.replaceAll("a", "@").alias("replaced"))
     * shape: (3, 2)
     * ┌──────────┬──────────┐
     * │ s        │ replaced │
     * ├──────────┼──────────┤
     * │ "apple"  │ @pple    │
     * │ "banana" │ b@n@n@   │
     * │ "cherry" │ cherry   │
     * └──────────┴──────────┘
     */
    replaceAll(
        pattern: string | RegExp,
        replacement: string | ((match: string, ...args: any[]) => string),
        options?: Omit<ReplaceOptions, "n">
    ) {
        return this._patternGuard(pattern, () =>
            this._deriveString((str) => replaceString(str, pattern, replacement, { ...options, n: -1 }) ?? str)
        );
    }

    /**
     * Replaces multiple string patterns simultaneously or sequentially with their respective replacements.
     * Matches Polars `.str.replaceMany()` behavior, accepting pattern/replacement arrays or a pattern-to-replacement map dictionary.
     * @param patterns Array of patterns or an object mapping target patterns to replacements.
     * @param replacements Array of replacement strings/callbacks (when patterns is an array).
     * @param options Configuration options ({ literal, asciiCaseInsensitive, mode }).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.replaceMany(["apple", "banana"], ["1", "2"]).alias("res"))
     * shape: (3, 2)
     * ┌──────────┬────────┐
     * │ s        │ res    │
     * ├──────────┼────────┤
     * │ "apple"  │ 1      │
     * │ "banana" │ 2      │
     * │ "cherry" │ cherry │
     * └──────────┴────────┘
     */
    replaceMany(
        patterns: (string | RegExp)[] | Record<string, string>,
        replacements?: (string | ((match: string, ...args: any[]) => string))[],
        options?: ReplaceManyOptions
    ) {
        return this._patternGuard(patterns, () =>
            this._deriveString((str) => replaceManyString(str, patterns, replacements, options) ?? str)
        );
    }

    /**
     * Reverses characters in each string element.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.reverse().alias("rev"))
     * shape: (3, 2)
     * ┌──────────┬────────┐
     * │ s        │ rev    │
     * ├──────────┼────────┤
     * │ "apple"  │ elppa  │
     * │ "banana" │ ananab │
     * │ "cherry" │ yrrehc │
     * └──────────┴────────┘
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
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.rpad(8, "_").alias("padded"))
     * shape: (3, 2)
     * ┌──────────┬──────────┐
     * │ s        │ padded   │
     * ├──────────┼──────────┤
     * │ "apple"  │ apple___ │
     * │ "banana" │ banana__ │
     * │ "cherry" │ cherry__ │
     * └──────────┴──────────┘
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
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.slice(0, 3).alias("sub"))
     * shape: (3, 2)
     * ┌──────────┬─────┐
     * │ s        │ sub │
     * ├──────────┼─────┤
     * │ "apple"  │ app │
     * │ "banana" │ ban │
     * │ "cherry" │ che │
     * └──────────┴─────┘
     */
    slice(offset: number, length?: number) {
        return this._deriveString((str) => {
            const start = offset < 0 ? str.length + offset : offset;
            const end = length !== undefined ? start + length : undefined;
            return str.slice(start, end);
        });
    }

    /**
     * Splits strings into lists by delimiter with optional limit and exact padding.
     * @param delimiter Substring delimiter.
     * @param options Options for controlling limit and exact padding.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("email").str.split("@").alias("parts"))
     * shape: (2, 2)
     * ┌──────────────────┬────────────────────────┐
     * │ email            │ parts                  │
     * ├──────────────────┼────────────────────────┤
     * │ user@example.com │ ["user", "example.com"]│
     * │ admin@test.org   │ ["admin", "test.org"]  │
     * └──────────────────┴────────────────────────┘
     */
    split(delimiter: string, options?: SplitOptions) {
        return this._deriveString((str) => splitString(str, delimiter, options));
    }

    /**
     * Checks if string starts with a prefix.
     * @param prefix The prefix substring.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.startsWith("a").alias("starts_a"))
     * shape: (3, 2)
     * ┌──────────┬──────────┐
     * │ s        │ starts_a │
     * ├──────────┼──────────┤
     * │ "apple"  │ true     │
     * │ "banana" │ false    │
     * │ "cherry" │ false    │
     * └──────────┴──────────┘
     */
    startsWith(prefix: string) {
        return this._deriveString((str) => str.startsWith(prefix));
    }

    /**
     * Strips matching characters from start and end of string.
     * @param characters Characters or regex pattern to strip.
     * @param options Configuration options for strip operation.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.stripChars().alias("stripped"))
     * shape: (2, 2)
     * ┌─────────────┬──────────┐
     * │ s           │ stripped │
     * ├─────────────┼──────────┤
     * │ "  hello  " │ hello    │
     * │ "  world  " │ world    │
     * └─────────────┴──────────┘
     */
    stripChars(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "both", ...options }));
    }

    /**
     * Strips matching characters from end of string.
     * @param characters Characters or regex pattern to strip.
     * @param options Configuration options.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.stripCharsEnd().alias("stripped"))
     * shape: (2, 2)
     * ┌─────────────┬──────────┐
     * │ s           │ stripped │
     * ├─────────────┼──────────┤
     * │ "  hello  " │ "  hello" │
     * │ "  world  " │ "  world" │
     * └─────────────┴──────────┘
     */
    stripCharsEnd(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "end", ...options }));
    }

    /**
     * Strips matching characters from start of string.
     * @param characters Characters or regex pattern to strip.
     * @param options Configuration options.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.stripCharsStart().alias("stripped"))
     * shape: (2, 2)
     * ┌─────────────┬──────────┐
     * │ s           │ stripped │
     * ├─────────────┼──────────┤
     * │ "  hello  " │ "hello  " │
     * │ "  world  " │ "world  " │
     * └─────────────┴──────────┘
     */
    stripCharsStart(characters?: string | RegExp, options?: StripCharsOptions) {
        return this._deriveString((str) => stripChars(str, characters, { mode: "start", ...options }));
    }

    /**
     * Strips matching prefix substring from start of string.
     * @param prefix Prefix substring to remove.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.stripPrefix("df-").alias("stripped"))
     * shape: (3, 2)
     * ┌─────────────┬──────────┐
     * │ s           │ stripped │
     * ├─────────────┼──────────┤
     * │ "HELLO"     │ HELLO    │
     * │ "World"     │ World    │
     * │ "df-script" │ script   │
     * └─────────────┴──────────┘
     */
    stripPrefix(prefix: string) {
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
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("email").str.stripSuffix(".com").alias("stripped"))
     * shape: (2, 2)
     * ┌──────────────────┬────────────────┐
     * │ email            │ stripped       │
     * ├──────────────────┼────────────────┤
     * │ user@example.com │ user@example   │
     * │ admin@test.org   │ admin@test.org │
     * └──────────────────┴────────────────┘
     */
    stripSuffix(suffix: string) {
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
     * Extracts the last n characters of each string element.
     * @param n Number of characters to extract from the end of the string (default 1).
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.tail(3).alias("suffix"))
     * shape: (3, 2)
     * ┌──────────┬────────┐
     * │ s        │ suffix │
     * ├──────────┼────────┤
     * │ "apple"  │ ple    │
     * │ "banana" │ ana    │
     * │ "cherry" │ rry    │
     * └──────────┴────────┘
     */
    tail(n: number = 1) {
        return this.slice(-n);
    }

    /**
     * Parses date/time string into Datetime.
     * @note [Timezone Compatibility]: Direct string parsing with timezone offsets relies on native `Intl.DateTimeFormat`
     * and `Date.UTC`. Unrecognized timezone identifiers safely default to `"UTC"`.
     * @param options Parsing configuration options.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").str.strptime({ format: "%Y-%m-%d" }).alias("parsed"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ parsed                   │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-20T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    strptime(options: StrptimeOptions) {
        return this._deriveString((str) => strptime(str, options));
    }

    /**
     * Converts string casing to camelCase.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.toCamelCase().alias("camel"))
     * shape: (3, 2)
     * ┌─────────────┬───────────┐
     * │ s           │ camel     │
     * ├─────────────┼───────────┤
     * │ "HELLO"     │ hello     │
     * │ "World"     │ world     │
     * │ "df-script" │ dfScript  │
     * └─────────────┴───────────┘
     */
    toCamelCase() {
        return this._deriveString((str) => changeCase(str, { format: "camel" }));
    }

    /**
     * Parses string into Date object.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").str.toDate().alias("date"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ date                     │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-20T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    toDate() {
        return this._deriveString((str) => toValidDate(str, { dateOnly: true }));
    }

    /**
     * Parses string into Datetime value.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_temporal_single -->
     * >>> df.withColumns($df.col("d").str.toDatetime().alias("dt"))
     * shape: (1, 2)
     * ┌────────────┬──────────────────────────┐
     * │ d          │ dt                       │
     * ├────────────┼──────────────────────────┤
     * │ 2026-05-20 │ 2026-05-20T00:00:00.000Z │
     * └────────────┴──────────────────────────┘
     */
    toDatetime() {
        return this._deriveString(toValidDate);
    }

    /**
     * Converts string into numeric decimal representation.
     * @param precision Optional precision limit.
     * @param scale Optional scale limit.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.len().str.toDecimal().alias("num"))
     * shape: (3, 2)
     * ┌──────────┬─────┐
     * │ s        │ num │
     * ├──────────┼─────┤
     * │ "apple"  │ 5   │
     * │ "banana" │ 6   │
     * │ "cherry" │ 6   │
     * └──────────┴─────┘
     */
    toDecimal(precision?: number, scale?: number) {
        return this._deriveString((str) => toValidDecimal(str, { precision, scale }));
    }

    /**
     * Parses string into integer number.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.len().str.toInteger().alias("num"))
     * shape: (3, 2)
     * ┌──────────┬─────┐
     * │ s        │ num │
     * ├──────────┼─────┤
     * │ "apple"  │ 5   │
     * │ "banana" │ 6   │
     * │ "cherry" │ 6   │
     * └──────────┴─────┘
     */
    toInteger() {
        return this._deriveString((str) => toValidInt(str));
    }

    /**
     * Converts string casing to kebab-case.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.toKebabCase().alias("kebab"))
     * shape: (3, 2)
     * ┌─────────────┬───────────┐
     * │ s           │ kebab     │
     * ├─────────────┼───────────┤
     * │ "HELLO"     │ hello     │
     * │ "World"     │ world     │
     * │ "df-script" │ df-script │
     * └─────────────┴───────────┘
     */
    toKebabCase() {
        return this._deriveString((str) => changeCase(str, { format: "kebab" }));
    }

    /**
     * Converts all string elements in the column to lowercase.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.toLowerCase().alias("lower_name"))
     * shape: (3, 2)
     * ┌─────────────┬────────────┐
     * │ s           │ lower_name │
     * ├─────────────┼────────────┤
     * │ "HELLO"     │ hello      │
     * │ "World"     │ world      │
     * │ "df-script" │ df-script  │
     * └─────────────┴────────────┘
     */
    toLowerCase() {
        return this.lower();
    }

    /**
     * Converts string casing to PascalCase.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.toPascalCase().alias("pascal"))
     * shape: (3, 2)
     * ┌─────────────┬───────────┐
     * │ s           │ pascal    │
     * ├─────────────┼───────────┤
     * │ "HELLO"     │ Hello     │
     * │ "World"     │ World     │
     * │ "df-script" │ DfScript  │
     * └─────────────┴───────────┘
     */
    toPascalCase() {
        return this._deriveString((str) => changeCase(str, { format: "pascal" }));
    }

    /**
     * Converts string casing to snake_case.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.toSnakeCase().alias("snake"))
     * shape: (3, 2)
     * ┌─────────────┬───────────┐
     * │ s           │ snake     │
     * ├─────────────┼───────────┤
     * │ "HELLO"     │ hello     │
     * │ "World"     │ world     │
     * │ "df-script" │ df_script │
     * └─────────────┴───────────┘
     */
    toSnakeCase() {
        return this._deriveString((str) => changeCase(str, { format: "snake" }));
    }

    /**
     * Parses string into time component representation.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.toTime().alias("time"))
     * shape: (3, 2)
     * ┌──────────┬──────┐
     * │ s        │ time │
     * ├──────────┼──────┤
     * │ "apple"  │ null │
     * │ "banana" │ null │
     * │ "cherry" │ null │
     * └──────────┴──────┘
     */
    toTime() {
        return this._deriveString(toValidTime);
    }

    /**
     * Converts string casing to Title Case.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.toTitleCase().alias("title"))
     * shape: (3, 2)
     * ┌─────────────┬───────────┐
     * │ s           │ title     │
     * ├─────────────┼───────────┤
     * │ "HELLO"     │ Hello     │
     * │ "World"     │ World     │
     * │ "df-script" │ Df Script │
     * └─────────────┴───────────┘
     */
    toTitleCase() {
        return this._deriveString((str) => changeCase(str, { format: "title" }));
    }

    /**
     * Converts all string elements in the column to uppercase.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.toUpperCase().alias("upper"))
     * shape: (3, 2)
     * ┌─────────────┬───────────┐
     * │ s           │ upper     │
     * ├─────────────┼───────────┤
     * │ "HELLO"     │ HELLO     │
     * │ "World"     │ WORLD     │
     * │ "df-script" │ DF-SCRIPT │
     * └─────────────┴───────────┘
     */
    toUpperCase() {
        return this.upper();
    }

    /**
     * Trims leading and trailing whitespace characters from each string element.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.trim().alias("clean"))
     * shape: (2, 2)
     * ┌─────────────┬───────┐
     * │ s           │ clean │
     * ├─────────────┼───────┤
     * │ "  hello  " │ hello │
     * │ "  world  " │ world │
     * └─────────────┴───────┘
     */
    trim() {
        return this.stripChars();
    }

    /**
     * Trims trailing whitespace characters from each string element.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.trimEnd().alias("clean"))
     * shape: (2, 2)
     * ┌─────────────┬──────────┐
     * │ s           │ clean    │
     * ├─────────────┼──────────┤
     * │ "  hello  " │ "  hello" │
     * │ "  world  " │ "  world" │
     * └─────────────┴──────────┘
     */
    trimEnd() {
        return this.stripCharsEnd();
    }

    /**
     * Trims leading whitespace characters from each string element.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.trimStart().alias("clean"))
     * shape: (2, 2)
     * ┌─────────────┬──────────┐
     * │ s           │ clean    │
     * ├─────────────┼──────────┤
     * │ "  hello  " │ "hello  "│
     * │ "  world  " │ "world  "│
     * └─────────────┴──────────┘
     */
    trimStart() {
        return this.stripCharsStart();
    }

    /**
     * Converts string to uppercase.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.upper().alias("upper"))
     * shape: (3, 2)
     * ┌─────────────┬───────────┐
     * │ s           │ upper     │
     * ├─────────────┼───────────┤
     * │ "HELLO"     │ HELLO     │
     * │ "World"     │ WORLD     │
     * │ "df-script" │ DF-SCRIPT │
     * └─────────────┴───────────┘
     */
    upper() {
        return this._deriveString((str) => str.toUpperCase());
    }

    /**
     * Pads start of string with zeros to target width.
     * @param width Minimum resulting string width.
     * @returns ColumnExpression
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.withColumns($df.col("s").str.zfill(8).alias("padded"))
     * shape: (3, 2)
     * ┌──────────┬──────────┐
     * │ s        │ padded   │
     * ├──────────┼──────────┤
     * │ "apple"  │ 000apple │
     * │ "banana" │ 00banana │
     * │ "cherry" │ 00cherry │
     * └──────────┴──────────┘
     */
    zfill(width: number) {
        return this._deriveString((str) => str.padStart(width, "0"));
    }
}

export class StringExpr extends ExprBase {
    /**
     * String namespace accessor for text operations.
     * @namespace $df.col
     * @category ColumnExpression
     * @syntax $df.col(<column_name>).str
     * @returns StringExprNamespace
     * @example
     * <!-- doc:base_strings_3x1 -->
     * >>> df.select($df.col("s").str.len())
     * shape: (3, 1)
     * ┌─────┐
     * │ len │
     * ├─────┤
     * │ 5   │
     * │ 6   │
     * │ 6   │
     * └─────┘
     */
    get str() {
        return new StringExprNamespace(this);
    }
}
