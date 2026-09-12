declare const process: any;
import { extractRegex } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING EXTRACTREGEX TESTS...");
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
    assertEqual(extractRegex(null, /\d+/), null, "null string returns null");
    assertEqual(extractRegex(undefined, /\d+/), null, "undefined string returns null");
    assertEqual(extractRegex("test", null as any), null, "null pattern returns null");
    assertEqual(extractRegex("test", undefined as any), null, "undefined pattern returns null");
    assertEqual(extractRegex(null, null as any), null, "both null returns null");

    // --- 2. Default Group Extraction (groupIndex defaults to 1) ---
    assertEqual(extractRegex("order #12345 confirmed", /#(\d+)/), "12345", "extracts group 1 by default");
    assertEqual(extractRegex("no capture group", /test/), null, "pattern with no capture group defaults to group 1 which is null");
    assertEqual(extractRegex("no match at all", /\d+/), null, "returns null on no match");

    // --- 3. Full Match Extraction (groupIndex: 0) ---
    assertEqual(extractRegex("order #12345 confirmed", /#\d+/, { groupIndex: 0 }), "#12345", "groupIndex: 0 returns full match");
    assertEqual(extractRegex("hello world", /\w+/, { groupIndex: 0 }), "hello", "groupIndex: 0 returns first word");

    // --- 4. Capture Group Indexing (Positive Integers) ---
    const multiPattern = /(\w+)\s+(\d+)\s+([a-z]+)/;
    const multiStr = "abc 789 xyz";
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: 0 }), "abc 789 xyz", "groupIndex: 0 full match");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: 1 }), "abc", "groupIndex: 1 first group");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: 2 }), "789", "groupIndex: 2 second group");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: 3 }), "xyz", "groupIndex: 3 third group");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: 4 }), null, "groupIndex: 4 out of bounds returns null");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: 99 }), null, "groupIndex: 99 out of bounds returns null");

    // --- 5. Negative Group Indexing ---
    // In multiPattern, match.length = 4 (groups 0, 1, 2, 3).
    // -1 => targetIndex: 4 + (-1) = 3 ("xyz")
    // -2 => targetIndex: 4 + (-2) = 2 ("789")
    // -3 => targetIndex: 4 + (-3) = 1 ("abc")
    // -4 => targetIndex: 4 + (-4) = 0 (targetIndex < 1 returns null per _resolveGroupRecord specification)
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: -1 }), "xyz", "negative index -1 resolves to last capture group");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: -2 }), "789", "negative index -2 resolves to second-to-last capture group");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: -3 }), "abc", "negative index -3 resolves to first capture group");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: -4 }), null, "negative index -4 pointing to group 0 or below returns null");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: -10 }), null, "large negative index returns null");

    // --- 6. Named Capture Group Extraction ---
    const namedPattern = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
    const dateStr = "Date: 2026-09-11";
    assertEqual(extractRegex(dateStr, namedPattern, { groupIndex: "year" }), "2026", "extracts named group 'year'");
    assertEqual(extractRegex(dateStr, namedPattern, { groupIndex: "month" }), "09", "extracts named group 'month'");
    assertEqual(extractRegex(dateStr, namedPattern, { groupIndex: "day" }), "11", "extracts named group 'day'");
    assertEqual(extractRegex(dateStr, namedPattern, { groupIndex: "hour" }), null, "non-existent named group returns null");

    // --- 7. Numeric String Group Index ---
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: "2" }), "789", "string numeric '2' extracts group 2");
    assertEqual(extractRegex(multiStr, multiPattern, { groupIndex: "not_a_number_and_not_named" }), null, "invalid group name returns null");

    // --- 8. Optional Groups that did not participate in match ---
    const optPattern = /(\d+)(?:-(\w+))?/;
    assertEqual(extractRegex("123", optPattern, { groupIndex: 1 }), "123", "group 1 matched");
    assertEqual(extractRegex("123", optPattern, { groupIndex: 2 }), null, "group 2 did not participate returns null");

    // --- 9. String Patterns (not RegExp instance) ---
    assertEqual(extractRegex("key=value123", "key=([a-z0-9]+)"), "value123", "string regex pattern extracts group 1");
    assertEqual(extractRegex("cost: $49.99", "\\$([0-9.]+)"), "49.99", "string regex with escapes extracts group 1");

    // --- 10. asciiCaseInsensitive Option ---
    assertEqual(extractRegex("STATUS: ACTIVE", /status:\s+([a-z]+)/, { asciiCaseInsensitive: true }), "ACTIVE", "asciiCaseInsensitive captures group with original case");
    assertEqual(extractRegex("STATUS: ACTIVE", /status:\s+([a-z]+)/), null, "without case insensitive returns null");

    // --- 11. Empty Strings and Zero-width Matches ---
    assertEqual(extractRegex("", /^$/), null, "empty string on ^$ has no group 1, returns null");
    assertEqual(extractRegex("", /^$/, { groupIndex: 0 }), "", "empty string on ^$ with groupIndex 0 returns empty string");
    assertEqual(extractRegex("", /(.*)/), "", "empty string on (.*) returns empty string for group 1");

    // --- 12. Multiline Matching ---
    const multiLineStr = "first\nTARGET: 42\nlast";
    assertEqual(extractRegex(multiLineStr, /^TARGET:\s+(\d+)$/m), "42", "matches multiline pattern");

    // --- 13. Unicode / Surrogate Pairs / Emojis ---
    assertEqual(extractRegex("Status: 🚀 launch", /Status:\s+(.)/u), "🚀", "extracts emoji as single capture group with unicode flag");
    assertEqual(extractRegex("Currency: €150", /Currency:\s+€(\d+)/), "150", "extracts currency symbol correctly");

    console.log(`SUCCESS: All extractRegex tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: extractRegex test failed!`, err);
    process.exit(1);
}
