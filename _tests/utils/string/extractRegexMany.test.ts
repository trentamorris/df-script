declare const process: any;
import { extractRegexMany } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING EXTRACTREGEXMANY TESTS...");
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
    assertEqual(extractRegexMany(null, [/\d+/]), null, "null string returns null");
    assertEqual(extractRegexMany(undefined, [/\d+/]), null, "undefined string returns null");
    assertEqual(extractRegexMany("test", null as any), null, "null patterns returns null");
    assertEqual(extractRegexMany("test", undefined as any), null, "undefined patterns returns null");
    assertEqual(extractRegexMany(null, null as any), null, "both null returns null");
    assertEqual(extractRegexMany("test", []), [], "empty pattern array returns empty array");

    // --- 2. Mutually Exclusive Options Check ---
    let threw = false;
    try {
        extractRegexMany("test", [/t/], { overlapping: true, leftmost: true } as any);
    } catch {
        threw = true;
    }
    assert(threw, "throws InvalidArgumentError when both overlapping and leftmost are true");

    // --- 3. Single Pattern (Scalar or 1-element Array) ---
    assertEqual(extractRegexMany("foo 123 bar", /\d+/), ["123"], "single regex pattern as scalar");
    assertEqual(extractRegexMany("foo 123 bar", [/\d+/]), ["123"], "single regex pattern in array");
    assertEqual(extractRegexMany("foo bar", [/\d+/]), [null], "non-matching pattern yields null in array");

    // --- 4. Disjoint Multiple Patterns ---
    const patterns = [/\d+/, /[a-z]+/, /[A-Z]+/];
    const text = "123 abc XYZ";
    assertEqual(extractRegexMany(text, patterns), ["123", "abc", "XYZ"], "matches disjoint patterns in order");

    // --- 5. Partial Matches (Some Match, Some Don't) ---
    assertEqual(
        extractRegexMany("hello 123", [/foo/, /\d+/, /bar/]),
        [null, "123", null],
        "preserves positions and returns null for non-matching patterns"
    );

    // --- 6. Overlapping Option (overlapping: true) ---
    // In "abcde", /abc/ and /cde/ overlap at 'c'.
    // With overlapping: true, each pattern independently extracts its match.
    assertEqual(
        extractRegexMany("abcde", [/abc/, /cde/], { overlapping: true }),
        ["abc", "cde"],
        "overlapping: true extracts both overlapping matches"
    );

    // In "aaaaa", /aaa/ and /aa/ overlap.
    assertEqual(
        extractRegexMany("aaaaa", [/aaa/, /aa/], { overlapping: true }),
        ["aaa", "aa"],
        "overlapping: true resolves each pattern against the original string"
    );

    // --- 7. Non-Overlapping Greedy / Leftmost (default behavior) ---
    // In "abcde", pattern 0 matches "abc" (indices 0..3).
    // Pattern 1 /cde/ starts at index 2, which conflicts with "abc" [0, 3).
    // Therefore pattern 1 cannot be selected because pattern 0 started earlier (leftmost).
    assertEqual(
        extractRegexMany("abcde", [/abc/, /cde/]),
        ["abc", null],
        "default non-overlapping skips candidate that overlaps with earlier leftmost match"
    );

    // If pattern 1 starts strictly after pattern 0 ends:
    assertEqual(
        extractRegexMany("abc_xyz_cde", [/abc/, /cde/]),
        ["abc", "cde"],
        "non-overlapping selects second match when it appears after first match"
    );

    // --- 8. Tie-Breaking on Identical Start Index ---
    // Two patterns matching starting at index 0: /ab/ and /a/
    // Pattern 0 (/ab/) starts at 0, Pattern 1 (/a/) starts at 0.
    // In _selectLeftmostCandidates, identical starts tie-break by pattern index (pattern 0 wins).
    assertEqual(
        extractRegexMany("abc", [/ab/, /a/]),
        ["ab", null],
        "tie-breaking on identical start index gives priority to earlier pattern in list"
    );

    // Conversely, if the order is inverted:
    assertEqual(
        extractRegexMany("abc", [/a/, /ab/]),
        ["a", null],
        "inverted order gives priority to pattern 0 (/a/)"
    );

    // --- 9. groupIndex Support with extractRegexMany ---
    // extractRegexMany defaults to groupIndex: 0
    assertEqual(
        extractRegexMany("user:john id:42", [/user:(\w+)/, /id:(\d+)/]),
        ["user:john", "id:42"],
        "default groupIndex is 0 (full match)"
    );
    assertEqual(
        extractRegexMany("user:john id:42", [/user:(\w+)/, /id:(\d+)/], { groupIndex: 1 }),
        ["john", "42"],
        "groupIndex: 1 extracts first capture group of each matched pattern"
    );

    // Named groups in extractRegexMany:
    const namedPatterns = [/(?<name>[a-z]+):/, /:(?<val>\d+)/];
    assertEqual(
        extractRegexMany("foo:100", namedPatterns, { groupIndex: "val", overlapping: true }),
        [null, "100"],
        "named group index extracts only from pattern containing that named group"
    );

    // Negative groupIndex:
    assertEqual(
        extractRegexMany("a-10 b-20", [/([a-z])-(\d+)/, /([a-z])-(\d+)/], { groupIndex: -1, overlapping: true }),
        ["10", "10"],
        "negative groupIndex -1 resolves to last group for both"
    );

    // --- 10. String Patterns (mixed with RegExp) ---
    assertEqual(
        extractRegexMany("key=value; 123", ["key=([a-z]+)", /([0-9]+)/], { groupIndex: 1 }),
        ["value", "123"],
        "handles string regex pattern mixed with RegExp object"
    );

    // --- 11. asciiCaseInsensitive Option ---
    assertEqual(
        extractRegexMany("ALPHA beta", [/alpha/, /BETA/], { asciiCaseInsensitive: true }),
        ["ALPHA", "beta"],
        "asciiCaseInsensitive works across multiple patterns"
    );

    // --- 12. Emojis and Unicode Strings ---
    assertEqual(
        extractRegexMany("🚀 rocket and 🌟 star", [/🚀\s+(\w+)/, /🌟\s+(\w+)/], { groupIndex: 1 }),
        ["rocket", "star"],
        "extracts unicode emoji captures across multiple patterns"
    );

    console.log(`SUCCESS: All extractRegexMany tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: extractRegexMany test failed!`, err);
    process.exit(1);
}
