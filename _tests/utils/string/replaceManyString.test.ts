declare const process: any;
import { replaceManyString } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING REPLACEMANYSTRING TESTS...");
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

    // 1. Basic Guards & Empty Inputs
    assertEqual(replaceManyString(null, { a: "1" }), null, "null input returns null");
    assertEqual(replaceManyString(undefined, { a: "1" }), null, "undefined input returns null");
    assertEqual(replaceManyString("hello", null as any), null, "null patterns returns null");
    assertEqual(replaceManyString("hello", []), "hello", "empty pattern array returns input");
    assertEqual(replaceManyString("hello", {}), "hello", "empty pattern record returns input");
    assertEqual(replaceManyString("", { a: "1" }), "", "empty string returns empty string");
    assertEqual(replaceManyString("hello", ["world"]), "hello", "missing replaceWith returns input");

    // 2. Object Dictionary Mapping
    assertEqual(
        replaceManyString("apple banana cherry", { apple: "1", banana: "2", cherry: "3" }),
        "1 2 3",
        "dictionary map replaces all entries"
    );

    // 3. Array of Patterns with Array of Replacements
    assertEqual(
        replaceManyString("foo bar baz", ["foo", "baz"], ["FOO", "BAZ"]),
        "FOO bar BAZ",
        "array of patterns with corresponding array of replacements"
    );

    // 4. Array of Patterns with Scalar Replacement
    assertEqual(
        replaceManyString("apple banana apple cherry", ["apple", "cherry"], "fruit"),
        "fruit banana fruit fruit",
        "array of patterns with scalar replacement string"
    );

    // 5. Length Mismatch Validation (Throws InvalidArgumentError)
    let threwMismatch = false;
    try {
        replaceManyString("hello", ["a", "b", "c"], ["1", "2"]);
    } catch (err: any) {
        threwMismatch = err.name === "InvalidArgumentError";
    }
    assertEqual(threwMismatch, true, "throws InvalidArgumentError on length mismatch");

    // 6. Single-element Replacement Array Auto-unpacking
    assertEqual(
        replaceManyString("a b c", ["a", "b", "c"], ["X"]),
        "X X X",
        "single-element replacement array unpacks to scalar replacement"
    );

    // 7. Leftmost / Non-overlapping Precedence (First-match takes priority)
    assertEqual(
        replaceManyString("catastrophe", ["cat", "catastrophe"], ["feline", "disaster"]),
        "felineastrophe",
        "leftmost match is selected first even if a later pattern is longer"
    );
    assertEqual(
        replaceManyString("catastrophe", ["catastrophe", "cat"], ["disaster", "feline"]),
        "disaster",
        "earlier listed pattern takes precedence on tie at same start index"
    );

    // 8. Overlapping Patterns
    assertEqual(
        replaceManyString("aaaa", ["aa", "a"], ["2", "1"]),
        "22",
        "non-overlapping matching consumes characters sequentially"
    );

    // 9. Regex Patterns with Captures and Replacement Functions
    assertEqual(
        replaceManyString(
            "user: john_doe, age: 30, score: 95",
            [/user:\s+(\w+)/, /score:\s+(\d+)/],
            [
                (m, name) => `USER[${name.toUpperCase()}]`,
                (m, score) => `POINTS[${Number(score) * 10}]`
            ]
        ),
        "USER[JOHN_DOE], age: 30, POINTS[950]",
        "regex patterns with replacement callbacks"
    );

    // 10. Literal Mode vs Special Regex Characters
    assertEqual(
        replaceManyString(
            "a[1] + b[2] = c[3]",
            ["[1]", "[2]", "[3]"],
            ["_one_", "_two_", "_three_"],
            { literal: true }
        ),
        "a_one_ + b_two_ = c_three_",
        "literal: true replaces exact bracket strings without escaping errors"
    );

    // 11. Case Insensitive Matching
    assertEqual(
        replaceManyString("Foo BaR BAZ", ["foo", "bar"], ["1", "2"], { asciiCaseInsensitive: true }),
        "1 2 BAZ",
        "asciiCaseInsensitive replaces regardless of casing"
    );

    // 12. Unicode and Emoji Multi-pattern
    assertEqual(
        replaceManyString("I like 🍎 and 🍌 and 🍇", { "🍎": "🍏", "🍌": "🍍" }),
        "I like 🍏 and 🍍 and 🍇",
        "surrogate pairs and emoji mapping"
    );

    // 13. Replacement String Expansion ($1, $& tokens)
    assertEqual(
        replaceManyString(
            "swap: foo-bar and baz-qux",
            [/(\w+)-(\w+)/],
            ["$2-$1"]
        ),
        "swap: bar-foo and qux-baz",
        "expands $1, $2 capture groups across matches"
    );


    console.log(`SUCCESS: All replaceManyString tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: replaceManyString test failed!`, err);
    process.exit(1);
}
