declare const process: any;
import { extractRegexAll } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING EXTRACTREGEXALL TESTS...");
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
    assertEqual(extractRegexAll(null, /\d+/), null, "null string returns null");
    assertEqual(extractRegexAll(undefined, /\d+/), null, "undefined string returns null");
    assertEqual(extractRegexAll("test", null as any), null, "null pattern returns null");
    assertEqual(extractRegexAll("test", undefined as any), null, "undefined pattern returns null");
    assertEqual(extractRegexAll(null, null as any), null, "both null returns null");

    // --- 2. No Matches Found ---
    assertEqual(extractRegexAll("hello world", /\d+/), null, "no match returns null");
    assertEqual(extractRegexAll("", /\d+/), null, "empty string with no match returns null");

    // --- 3. Default Group Indexing (groupIndex defaults to 0 in extractRegexAll) ---
    // Note: extractRegexAll extracts group 0 by default (the full match of each occurrence)
    assertEqual(
        extractRegexAll("a10 b20 c30", /\d+/),
        ["10", "20", "30"],
        "default groupIndex 0 extracts full matches"
    );
    assertEqual(
        extractRegexAll("apple orange banana", /[a-z]+/),
        ["apple", "orange", "banana"],
        "extracts all words with default groupIndex 0"
    );

    // --- 4. Explicit Group Indexing (Positive Integers) ---
    const tagPattern = /<(\w+)>([^<]+)<\/\1>/;
    const tagStr = "<b>bold</b><i>italic</i><u>underline</u>";
    assertEqual(
        extractRegexAll(tagStr, tagPattern, { groupIndex: 0 }),
        ["<b>bold</b>", "<i>italic</i>", "<u>underline</u>"],
        "groupIndex 0 extracts all full matches"
    );
    assertEqual(
        extractRegexAll(tagStr, tagPattern, { groupIndex: 1 }),
        ["b", "i", "u"],
        "groupIndex 1 extracts all tag names"
    );
    assertEqual(
        extractRegexAll(tagStr, tagPattern, { groupIndex: 2 }),
        ["bold", "italic", "underline"],
        "groupIndex 2 extracts all tag contents"
    );
    assertEqual(
        extractRegexAll(tagStr, tagPattern, { groupIndex: 3 }),
        [null, null, null],
        "groupIndex 3 out of bounds returns array of nulls"
    );

    // --- 5. Negative Group Indexing ---
    // tagPattern has 3 elements: group 0 (full), group 1 (tag), group 2 (content) -> length = 3
    // -1 => targetIndex: 3 + (-1) = 2 (content)
    // -2 => targetIndex: 3 + (-2) = 1 (tag name)
    // -3 => targetIndex: 3 + (-3) = 0 (targetIndex < 1 returns null)
    assertEqual(
        extractRegexAll(tagStr, tagPattern, { groupIndex: -1 }),
        ["bold", "italic", "underline"],
        "groupIndex -1 extracts last capture group"
    );
    assertEqual(
        extractRegexAll(tagStr, tagPattern, { groupIndex: -2 }),
        ["b", "i", "u"],
        "groupIndex -2 extracts first capture group"
    );
    assertEqual(
        extractRegexAll(tagStr, tagPattern, { groupIndex: -3 }),
        [null, null, null],
        "groupIndex -3 points to group 0 or below, returns nulls"
    );

    // --- 6. Named Capture Groups Globally ---
    const kvPattern = /(?<k>[a-z]+)=(?<v>\d+)/;
    const kvStr = "a=1 b=2 c=3";
    assertEqual(
        extractRegexAll(kvStr, kvPattern, { groupIndex: "k" }),
        ["a", "b", "c"],
        "extracts named group 'k' across all occurrences"
    );
    assertEqual(
        extractRegexAll(kvStr, kvPattern, { groupIndex: "v" }),
        ["1", "2", "3"],
        "extracts named group 'v' across all occurrences"
    );
    assertEqual(
        extractRegexAll(kvStr, kvPattern, { groupIndex: "missing" }),
        [null, null, null],
        "missing named group returns array of nulls"
    );

    // --- 7. Optional Capture Groups Partially Present ---
    const optPattern = /(\w+)(?::(\d+))?/;
    const optStr = "host:80 server agent:8080";
    assertEqual(
        extractRegexAll(optStr, optPattern, { groupIndex: 1 }),
        ["host", "server", "agent"],
        "group 1 always matched"
    );
    assertEqual(
        extractRegexAll(optStr, optPattern, { groupIndex: 2 }),
        ["80", null, "8080"],
        "group 2 is null where optional group did not participate"
    );

    // --- 8. Case Insensitivity ---
    assertEqual(
        extractRegexAll("Foo foo FOO", /foo/, { asciiCaseInsensitive: true }),
        ["Foo", "foo", "FOO"],
        "asciiCaseInsensitive matches all casing variants"
    );

    // --- 9. String Pattern Input with Regexp Syntax ---
    assertEqual(
        extractRegexAll("item-1, item-2, item-3", "item-(\\d+)", { groupIndex: 1 }),
        ["1", "2", "3"],
        "string pattern with capture group works globally"
    );

    // --- 10. Single Occurrence with extractRegexAll ---
    assertEqual(
        extractRegexAll("only-one-here", /one/),
        ["one"],
        "single occurrence returns 1-element array"
    );

    // --- 11. Multi-line Strings with Global Patterns ---
    const multiLine = "row 100\nrow 200\nrow 300";
    assertEqual(
        extractRegexAll(multiLine, /^row\s+(\d+)$/m, { groupIndex: 1 }),
        ["100", "200", "300"],
        "multiline regex matches all rows"
    );

    // --- 12. Emojis and Unicode ---
    const emojiStr = "⭐️ 5 star, ⭐️ 4 star, ⭐️ 3 star";
    assertEqual(
        extractRegexAll(emojiStr, /⭐️\s+(\d+)/, { groupIndex: 1 }),
        ["5", "4", "3"],
        "extracts numbers following unicode emoji"
    );

    console.log(`SUCCESS: All extractRegexAll tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: extractRegexAll test failed!`, err);
    process.exit(1);
}
