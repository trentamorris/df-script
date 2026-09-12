declare const process: any;
import { extractRegexEngine } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING EXTRACTREGEXENGINE TESTS...");
console.log("=========================================");

let testsPassed = 0;

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`Assertion failed: ${msg}`);
    testsPassed++;
}

function assertEqual(actual: any, expected: any, msg: string) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        throw new Error(`Assertion failed: ${msg}\n  Expected: ${e}\n  Actual:   ${a}`);
    }
    testsPassed++;
}

try {
    // --- 1. Null / Undefined / Invalid Inputs ---
    assertEqual(extractRegexEngine(null, /\d+/), null, "null string returns null");
    assertEqual(extractRegexEngine(undefined, /\d+/), null, "undefined string returns null");
    assertEqual(extractRegexEngine("test", null as any), null, "null pattern returns null");
    assertEqual(extractRegexEngine("test", undefined as any), null, "undefined pattern returns null");
    assertEqual(extractRegexEngine(null, null as any), null, "both null returns null");

    // --- 2. Basic Single Match without Global ---
    {
        const res = extractRegexEngine("hello 123 world", /(\d+)/);
        assert(res !== null && res.length === 1, "extracts single regex match");
        assertEqual(res![0]["0"], "123", "group 0 is full match");
        assertEqual(res![0]["1"], "123", "group 1 is first capture group");
        assertEqual((res![0] as any)._index, "6", "_index property matches offset");
        assertEqual((res![0] as any)._length, 2, "_length property is match.length");
    }

    // --- 3. No Match Cases ---
    assertEqual(extractRegexEngine("no digits here", /\d+/), null, "returns null when pattern does not match");
    assertEqual(extractRegexEngine("no digits here", /\d+/, { global: true }), null, "returns null when global pattern does not match");

    // --- 4. Empty String Inputs and Patterns ---
    {
        const res = extractRegexEngine("", /^$/);
        assert(res !== null && res.length === 1, "matches empty string on ^$");
        assertEqual(res![0]["0"], "", "group 0 is empty string");
        assertEqual((res![0] as any)._index, "0", "_index is 0");

        const noMatch = extractRegexEngine("", /\w+/);
        assertEqual(noMatch, null, "empty string on non-matching pattern returns null");

        const zeroWidth = extractRegexEngine("abc", /(?=b)/);
        assert(zeroWidth !== null && zeroWidth.length === 1, "lookahead matches zero width");
        assertEqual(zeroWidth![0]["0"], "", "zero-width match value is empty string");
        assertEqual((res![0] as any)._index, "0", "_index is start of lookahead");
    }

    // --- 5. Multiple Capture Groups and Unmatched Groups ---
    {
        const res = extractRegexEngine("user:john:30", /(\w+):(\w+)(?::(\d+))?/);
        assert(res !== null && res.length === 1, "matches multi-group");
        assertEqual(res![0]["0"], "user:john:30", "group 0 full");
        assertEqual(res![0]["1"], "user", "group 1");
        assertEqual(res![0]["2"], "john", "group 2");
        assertEqual(res![0]["3"], "30", "group 3");

        // Optional capture group not matched
        const resOpt = extractRegexEngine("user:john", /(\w+):(\w+)(?::(\d+))?/);
        assert(resOpt !== null && resOpt.length === 1, "matches with optional group");
        assertEqual(resOpt![0]["1"], "user", "group 1 matched");
        assertEqual(resOpt![0]["2"], "john", "group 2 matched");
        assertEqual(resOpt![0]["3"], null, "unmatched optional group is null");
    }

    // --- 6. Named Capture Groups ---
    {
        const res = extractRegexEngine("2026-09-11", /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/);
        assert(res !== null && res.length === 1, "matches named groups");
        assertEqual(res![0]["year"], "2026", "named group year");
        assertEqual(res![0]["month"], "09", "named group month");
        assertEqual(res![0]["day"], "11", "named group day");
        assertEqual(res![0]["1"], "2026", "indexed group 1 matches named group 1");
        assertEqual(res![0]["2"], "09", "indexed group 2 matches named group 2");
        assertEqual(res![0]["3"], "11", "indexed group 3 matches named group 3");
    }

    // --- 7. Global Matching ({ global: true }) ---
    {
        const res = extractRegexEngine("item10 item20 item30", /item(\d+)/, { global: true });
        assert(res !== null && res.length === 3, "returns 3 items for global match");
        assertEqual(res![0]["0"], "item10", "first full match");
        assertEqual(res![0]["1"], "10", "first group 1");
        assertEqual((res![0] as any)._index, "0", "first index");

        assertEqual(res![1]["0"], "item20", "second full match");
        assertEqual(res![1]["1"], "20", "second group 1");
        assertEqual((res![1] as any)._index, "7", "second index");

        assertEqual(res![2]["0"], "item30", "third full match");
        assertEqual(res![2]["1"], "30", "third group 1");
        assertEqual((res![2] as any)._index, "14", "third index");
    }

    // --- 8. String Patterns & Escaped Metacharacters ---
    {
        const res = extractRegexEngine("price is $100.50 today", "\\$([0-9]+\\.[0-9]+)");
        assert(res !== null && res.length === 1, "string pattern with regex escapes");
        assertEqual(res![0]["1"], "100.50", "extracts group 1 from string pattern");
    }

    // --- 9. asciiCaseInsensitive Option ---
    {
        const resLower = extractRegexEngine("UPPERCASE", /upper([a-z]+)/, { asciiCaseInsensitive: true });
        assert(resLower !== null && resLower.length === 1, "asciiCaseInsensitive matches lowercase pattern on uppercase");
        assertEqual(resLower![0]["1"], "CASE", "extracts captured group preserving original input casing");

        const resDefault = extractRegexEngine("UPPERCASE", /upper([a-z]+)/);
        assertEqual(resDefault, null, "without asciiCaseInsensitive, case mismatch returns null");
    }

    // --- 10. Unicode and Emoji Handling ---
    {
        const res = extractRegexEngine("🚀 rocket and 🌟 star", /([🚀🌟])\s+(\w+)/u, { global: true });
        assert(res !== null && res.length === 2, "matches emojis globally");
        assertEqual(res![0]["1"], "🚀", "first emoji captured");
        assertEqual(res![0]["2"], "rocket", "first word captured");
        assertEqual(res![1]["1"], "🌟", "second emoji captured");
        assertEqual(res![1]["2"], "star", "second word captured");
    }

    // --- 11. Multiline and Newlines ---
    {
        const text = "line1: alpha\nline2: beta\nline3: gamma";
        const res = extractRegexEngine(text, /^line\d+:\s+(\w+)$/m, { global: true });
        assert(res !== null && res.length === 3, "multiline flag matches each line");
        assertEqual(res![0]["1"], "alpha", "line 1 captured");
        assertEqual(res![1]["1"], "beta", "line 2 captured");
        assertEqual(res![2]["1"], "gamma", "line 3 captured");
    }

    // --- 12. Non-Enumerable Properties Verification ---
    {
        const res = extractRegexEngine("foo 999 bar", /(\d+)/);
        assert(res !== null, "matches number");
        const keys = Object.keys(res![0]);
        assert(keys.includes("0") && keys.includes("1"), "keys include '0' and '1'");
        assert(!keys.includes("_index"), "_index is not enumerable");
        assert(!keys.includes("_length"), "_length is not enumerable");
        assertEqual((res![0] as any)._index, "4", "_index is accessible");
        assertEqual((res![0] as any)._length, 2, "_length is accessible");
    }

    console.log(`SUCCESS: All extractRegexEngine tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: extractRegexEngine test failed!`, err);
    process.exit(1);
}
