declare const process: any;
import { replaceString } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING REPLACESTRING TESTS...");
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

    // 1. Basic & Null / Undefined Guards
    assertEqual(replaceString(null, "foo", "bar"), null, "null string returns null");
    assertEqual(replaceString(undefined, "foo", "bar"), null, "undefined string returns null");
    assertEqual(replaceString("hello", null as any, "bar"), null, "null pattern returns null");
    assertEqual(replaceString("hello", "foo", null as any), null, "null replacement returns null");
    assertEqual(replaceString("", "foo", "bar"), "", "empty string returns empty string");
    assertEqual(replaceString("hello", "", "X"), "Xhello", "empty string pattern matches at index 0");

    // 2. n options (counts, 0, negative, Infinity, floats)
    assertEqual(replaceString("aaaa", "a", "b", { n: 0 }), "aaaa", "n=0 performs no replacements");
    assertEqual(replaceString("aaaa", "a", "b", { n: 1 }), "baaa", "default n=1 replaces first occurrence");
    assertEqual(replaceString("aaaa", "a", "b", { n: 2 }), "bbaa", "n=2 replaces first 2 occurrences");
    assertEqual(replaceString("aaaa", "a", "b", { n: 2.9 }), "bbaa", "n=2.9 truncates to 2");
    assertEqual(replaceString("aaaa", "a", "b", { n: -1 }), "bbbb", "n=-1 replaces all occurrences");
    assertEqual(replaceString("aaaa", "a", "b", { n: Infinity }), "bbbb", "n=Infinity replaces all");
    assertEqual(replaceString("aaaa", "a", "b", { n: NaN }), "baaa", "n=NaN defaults to 1");

    // 3. Literal vs Regex Pattern with Special Regex Metacharacters
    const metaStr = "foo.[bar]*+?^${}()|baz";
    assertEqual(replaceString(metaStr, ".[bar]*+?^${}()|", "___", { literal: true }), "foo___baz", "literal: true ignores regex metachars");
    assertEqual(replaceString(metaStr, /\[bar\]/, "[qux]"), "foo.[qux]*+?^${}()|baz", "regex pattern matching brackets");

    // 4. Case sensitivity & asciiCaseInsensitive
    assertEqual(replaceString("Hello WORLD", "world", "earth", { asciiCaseInsensitive: true }), "Hello earth", "asciiCaseInsensitive single");
    assertEqual(replaceString("foo FOO Foo", "foo", "bar", { asciiCaseInsensitive: true, n: -1 }), "bar bar bar", "asciiCaseInsensitive global");
    assertEqual(replaceString("Hello World", /world/i, "Universe"), "Hello Universe", "RegExp /i flag");

    // 5. Replacement template tokens ($$, $&, $', $`, $1..$n, $<name>)
    const target = "item: apple price: 100";
    assertEqual(
        replaceString(target, /(apple)\s+price:\s+(\d+)/, "cost: $$ $2 for $1"),
        "item: cost: $ 100 for apple",
        "tokens $$ and positional capture groups $1, $2"
    );
    assertEqual(
        replaceString("foo-BAR-baz", "BAR", "[$&]", { literal: false }),
        "foo-[BAR]-baz",
        "token $& expands to full match"
    );
    assertEqual(
        replaceString("abcDEFghi", "DEF", "<$`>", { literal: false }),
        "abc<abc>ghi",
        "token $` expands to preceding substring"
    );
    assertEqual(
        replaceString("abcDEFghi", "DEF", "<$'>", { literal: false }),
        "abc<ghi>ghi",
        "token $' expands to succeeding substring"
    );
    assertEqual(
        replaceString("2026-09-12", /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/, "$<month>/$<day>/$<year>"),
        "09/12/2026",
        "named capture groups $<name>"
    );

    // 6. Literal mode with replacement containing $ signs (must NOT expand)
    assertEqual(
        replaceString("Price is 100", "100", "$50 $& $1", { literal: true }),
        "Price is $50 $& $1",
        "literal: true does not expand $ tokens in replacement string"
    );

    // 7. Function replacement callbacks
    let callCount = 0;
    const fnResult = replaceString("apple 1, apple 2, apple 3", /apple\s+(\d+)/, (match, p1) => {
        callCount++;
        return `fruit #${p1}`;
    }, { n: 2 });
    assertEqual(fnResult, "fruit #1, fruit #2, apple 3", "callback replacement respecting n limit");
    assertEqual(callCount, 2, "callback called exact number of times requested by n");

    // 8. Empty & zero-length regex matches
    assertEqual(replaceString("abc", /(?=b)/, "-"), "a-bc", "zero-width lookahead assertion replacement");
    assertEqual(replaceString("abc", /^/, "[START]-"), "[START]-abc", "zero-width start of string anchor");
    assertEqual(replaceString("abc", /$/, "-[END]"), "abc-[END]", "zero-width end of string anchor");

    // 9. Unicode and multi-byte surrogate pairs
    const emoStr = "Hello 🌍 World 🚀";
    assertEqual(replaceString(emoStr, "🌍", "🪐", { literal: true }), "Hello 🪐 World 🚀", "surrogate pair literal replacement");
    assertEqual(replaceString(emoStr, /🚀/, "🛸"), "Hello 🌍 World 🛸", "surrogate pair regex replacement");

    // 10. Boundary: Pattern not found
    assertEqual(replaceString("The brown fox", "elephant", "cat"), "The brown fox", "unmatched pattern leaves input unchanged");
    assertEqual(replaceString("The brown fox", /zebra/g, "cat"), "The brown fox", "unmatched regex leaves input unchanged");


    console.log(`SUCCESS: All replaceString tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: replaceString test failed!`, err);
    process.exit(1);
}
