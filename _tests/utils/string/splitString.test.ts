declare const process: any;
import { splitString } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING SPLITSTRING TESTS...");
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

    // 1. Null & Undefined Guards
    assertEqual(splitString(null, ","), null, "null str returns null");
    assertEqual(splitString(undefined, ","), null, "undefined str returns null");
    assertEqual(splitString("a,b", null as any), null, "null delimiter returns null");
    assertEqual(splitString("a,b", undefined as any), null, "undefined delimiter returns null");

    // 2. Empty String & Empty Delimiter (Zero-Width Split)
    assertEqual(splitString("", ","), [""], "empty string with non-empty delimiter returns ['']");
    assertEqual(splitString("", ""), [""], "empty string with empty delimiter returns ['']");
    assertEqual(splitString("abc", ""), ["a", "b", "c"], "empty delimiter splits every character");
    assertEqual(splitString("a", ""), ["a"], "single char string with empty delimiter");

    // 3. Consecutive & Edge Delimiters
    assertEqual(splitString(",a,,b,", ","), ["", "a", "", "b", ""], "leading, consecutive, and trailing delimiters");
    assertEqual(splitString(",,,", ","), ["", "", "", ""], "delimiter-only string yields n+1 empty parts");
    assertEqual(splitString("no delimiter here", ","), ["no delimiter here"], "delimiter not found returns single element array");

    // 4. Limit Parameter & Partitioning
    assertEqual(splitString("a,b,c,d,e", ",", { limit: 0 }), ["a,b,c,d,e"], "limit: 0 returns entire string in 1 partition");
    assertEqual(splitString("a,b,c,d,e", ",", { limit: 1 }), ["a", "b,c,d,e"], "limit: 1 splits into 2 parts");
    assertEqual(splitString("a,b,c,d,e", ",", { limit: 2 }), ["a", "b", "c,d,e"], "limit: 2 splits into 3 parts");
    assertEqual(splitString("a,b,c", ",", { limit: 100 }), ["a", "b", "c"], "limit larger than match count");
    assertEqual(splitString("a,b,c", ",", { limit: -1 }), ["a", "b", "c"], "limit: -1 splits all");
    assertEqual(splitString("a,b,c", ",", { limit: -99 }), ["a", "b", "c"], "negative limit splits all");

    // 5. Inclusive Option (Delimiter Kept with Preceding Chunk)
    assertEqual(
        splitString("a,b,c", ",", { inclusive: true }),
        ["a,", "b,", "c"],
        "inclusive: true preserves delimiter at end of parts"
    );
    assertEqual(
        splitString("a,b,c,d", ",", { inclusive: true, limit: 2 }),
        ["a,", "b,", "c,d"],
        "inclusive: true with limit"
    );
    assertEqual(
        splitString("apple;banana;cherry", ";", { inclusive: true }),
        ["apple;", "banana;", "cherry"],
        "inclusive with word delimiters"
    );

    // 6. Exact Option (Null Padding to limit + 1)
    assertEqual(
        splitString("a,b", ",", { limit: 3, exact: true }),
        ["a", "b", null, null],
        "exact: true pads with null when splits < limit + 1"
    );
    assertEqual(
        splitString("a", ",", { limit: 2, exact: true }),
        ["a", null, null],
        "exact: true on string with 0 matches pads up to targetCount"
    );
    assertEqual(
        splitString("a,b,c,d", ",", { limit: 2, exact: true }),
        ["a", "b", "c,d"],
        "exact: true does not pad when parts match targetCount"
    );

    // 7. Strict Option (Throws InvalidArgumentError if parts < limit + 1)
    let strictThrew = false;
    try {
        splitString("a,b", ",", { limit: 3, strict: true });
    } catch (err: any) {
        strictThrew = err.name === "InvalidArgumentError";
    }
    assertEqual(strictThrew, true, "strict: true throws InvalidArgumentError if parts < limit + 1");

    let strictSucceeded = false;
    try {
        const parts = splitString("a,b,c,d", ",", { limit: 2, strict: true });
        strictSucceeded = parts?.length === 3;
    } catch {
        strictSucceeded = false;
    }
    assertEqual(strictSucceeded, true, "strict: true succeeds when parts >= limit + 1");

    // 8. Literal: true vs Regex Metacharacters in Delimiter
    const specialDelim = ".[*+?^${}()|";
    assertEqual(
        splitString(`part1${specialDelim}part2${specialDelim}part3`, specialDelim, { literal: true }),
        ["part1", "part2", "part3"],
        "literal: true cleanly handles all regex metacharacters in delimiter"
    );
    assertEqual(
        splitString("foo.bar.baz", ".", { literal: true }),
        ["foo", "bar", "baz"],
        "literal: true splits on literal dot not any-char"
    );

    // 9. Regex Delimiters (literal: false)
    assertEqual(
        splitString("a1b2c3d", "\\d", { literal: false }),
        ["a", "b", "c", "d"],
        "regex digit delimiter splits on all digits"
    );
    assertEqual(
        splitString("apple   banana \t cherry\nmelon", "\\s+", { literal: false }),
        ["apple", "banana", "cherry", "melon"],
        "regex whitespace class delimiter"
    );

    // 10. Zero-width Assertions (Lookahead / Lookbehind)
    assertEqual(
        splitString("camelCaseWords", "(?=[A-Z])", { literal: false }),
        ["camel", "Case", "Words"],
        "zero-width positive lookahead delimiter"
    );
    assertEqual(
        splitString("12345", "(?<=\\d)", { literal: false }),
        ["1", "2", "3", "4", "5"],
        "zero-width lookbehind delimiter"
    );

    // 11. Multi-byte Unicode & Surrogate Pairs (Emojis)
    assertEqual(
        splitString("apple🍎banana🍎cherry", "🍎", { literal: true }),
        ["apple", "banana", "cherry"],
        "splits correctly on emoji surrogate pair"
    );
    assertEqual(
        splitString("🚀🛸🪐", ""),
        ["🚀", "🛸", "🪐"],
        "empty delimiter splits surrogate pair emojis without splitting high/low surrogates"
    );

    // 12. Case Insensitivity in Delimiter
    assertEqual(
        splitString("part1SPLITpart2splitpart3", "split", { asciiCaseInsensitive: true }),
        ["part1", "part2", "part3"],
        "asciiCaseInsensitive delimiter matching"
    );


    console.log(`SUCCESS: All splitString tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: splitString test failed!`, err);
    process.exit(1);
}
