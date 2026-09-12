declare const process: any;
import { safeJsonParse, isJsonString } from "../../../src/utils/json";
import { InvalidArgumentError, IOStreamError } from "../../../src/exceptions";

console.log("=========================================");
console.log("STARTING SAFEJSONPARSE TESTS...");
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
    // 1. Non-string inputs & Fallbacks (Symbol, BigInt, Functions, Objects, Arrays, NaN, Infinity)
    const sym = Symbol("test");
    const fn = () => { };
    const dateObj = new Date();
    const arrInput = [1, 2, 3];
    const objInput = { key: "val" };

    let invalidPersonErr: any = null;
    const invalidPerson = safeJsonParse('{"name": "Unknown"}', {
        guard: (val: any) => val.name !== "Unknown",
        fallback: { name: "Unknown" },
        onError: (err: any) => { invalidPersonErr = err; }
    });
    assertEqual(invalidPerson, { name: "Unknown" }, "object failing guard returns fallback");
    assert(invalidPersonErr instanceof InvalidArgumentError && invalidPersonErr.message.includes("failed guard validation"), "onError captured guard error");

    assertEqual(safeJsonParse(null as any), null, "null input returns null");
    assertEqual(safeJsonParse(undefined as any), undefined, "undefined input returns undefined");
    assertEqual(safeJsonParse(123 as any), 123, "number 123 returns 123");
    assertEqual(safeJsonParse(NaN as any), NaN, "NaN returns NaN");
    assertEqual(safeJsonParse(Infinity as any), Infinity, "Infinity returns Infinity");
    assertEqual(safeJsonParse(sym as any), sym, "Symbol returns Symbol");
    assertEqual(safeJsonParse(fn as any), fn, "Function returns Function");
    assertEqual(safeJsonParse(dateObj as any), dateObj, "Date object returns Date object");
    assertEqual(safeJsonParse(arrInput as any), arrInput, "Array input returns Array");
    assertEqual(safeJsonParse(objInput as any), objInput, "Object input returns Object");

    assertEqual(safeJsonParse(null as any, { fallback: "FALLBACK" }), "FALLBACK", "null returns fallback when specified");
    assertEqual(safeJsonParse(undefined as any, { fallback: "FALLBACK" }), "FALLBACK", "undefined returns fallback when specified");
    assertEqual(safeJsonParse(NaN as any, { fallback: null }), null, "NaN returns fallback null");
    assertEqual(safeJsonParse(false as any, { fallback: true }), true, "boolean false returns fallback true when specified");

    // 2. Empty string, whitespace, tab, carriage return, newline handling
    assertEqual(safeJsonParse(""), "", "empty string returns empty string");
    assertEqual(safeJsonParse("   \t\r\n   "), "   \t\r\n   ", "whitespace-only string returns original string");
    assertEqual(safeJsonParse("   \t\r\n   ", { fallback: "DEFAULT" }), "DEFAULT", "whitespace-only string returns fallback");
    assertEqual(safeJsonParse("   \t\r\n   ", { trimBeforeParse: true, fallback: "TRIMMED_FB" }), "TRIMMED_FB", "trimmed whitespace string returns fallback");

    // 3. Unwrapped JSON Primitives & allowPrimitives Flag
    assertEqual(safeJsonParse("123"), "123", "unwrapped 123 returns raw input string when allowPrimitives=false");
    assertEqual(safeJsonParse("123", { fallback: -1 }), -1, "unwrapped 123 returns fallback when allowPrimitives=false");
    assertEqual(safeJsonParse("123", { allowPrimitives: true }), 123, "unwrapped 123 returns number when allowPrimitives=true");

    assertEqual(safeJsonParse('"hello"'), '"hello"', 'unwrapped "hello" returns raw input string when allowPrimitives=false');
    assertEqual(safeJsonParse('"hello"', { allowPrimitives: true }), "hello", 'unwrapped "hello" returns string when allowPrimitives=true');

    assertEqual(safeJsonParse("true"), "true", "unwrapped true returns raw input string when allowPrimitives=false");
    assertEqual(safeJsonParse("true", { allowPrimitives: true }), true, "unwrapped true returns boolean true when allowPrimitives=true");

    assertEqual(safeJsonParse("false"), "false", "unwrapped false returns raw input string when allowPrimitives=false");
    assertEqual(safeJsonParse("false", { allowPrimitives: true }), false, "unwrapped false returns boolean false when allowPrimitives=true");

    assertEqual(safeJsonParse("null"), "null", "unwrapped null returns raw input string when allowPrimitives=false");
    assertEqual(safeJsonParse("null", { allowPrimitives: true }), null, "unwrapped null returns null when allowPrimitives=true");

    // 4. Extreme Unicode, Escapes, Surrogates, Emojis & Special Characters
    const unicodeJson = '{"emoji":"🚀","surrogate":"\\uD83D\\uDE80","chinese":"中文","escapes":"\\n\\t\\r\\\\\\\""}';
    const parsedUnicode = safeJsonParse(unicodeJson) as any;
    assertEqual(parsedUnicode.emoji, "🚀", "parses emoji character");
    assertEqual(parsedUnicode.surrogate, "🚀", "parses escaped unicode surrogate pair");
    assertEqual(parsedUnicode.chinese, "中文", "parses UTF-8 non-ASCII characters");
    assertEqual(parsedUnicode.escapes, "\n\t\r\\\"", "parses control escape sequences");

    // 5. Deeply Nested Objects & Arrays
    const deepObj = '{"a":{"b":{"c":{"d":[1,{"e":true}]}}}}';
    assertEqual(safeJsonParse(deepObj), { a: { b: { c: { d: [1, { e: true }] } } } }, "parses deeply nested JSON structure");

    // 6. Malformed JSON Edge Cases
    assertEqual(safeJsonParse('{"key": value}'), '{"key": value}', "unquoted identifier returns raw input");
    assertEqual(safeJsonParse("{'key': 'value'}"), "{'key': 'value'}", "single quoted JSON returns raw input");
    assertEqual(safeJsonParse('{"a": 1, }'), '{"a": 1, }', "trailing comma in object returns raw input");
    assertEqual(safeJsonParse('[1, 2, 3, ]'), '[1, 2, 3, ]', "trailing comma in array returns raw input");
    assertEqual(safeJsonParse('{"a": 1', { fallback: "ERR" }), "ERR", "truncated object returns fallback");
    assertEqual(safeJsonParse('[1, 2,', { fallback: "ERR" }), "ERR", "truncated array returns fallback");
    assertEqual(safeJsonParse('{a: 1}', { fallback: null }), null, "unquoted key returns fallback null");
    assertEqual(safeJsonParse('{"a": NaN}', { fallback: "ERR" }), "ERR", "JSON with NaN returns fallback");
    assertEqual(safeJsonParse('{"a": Infinity}', { fallback: "ERR" }), "ERR", "JSON with Infinity returns fallback");

    // 7. Reviver Exception Handling & Custom Transformation
    let reviverErrorLogged = false;
    const ThrowingReviver = () => { throw new Error("Reviver explosion"); };
    assertEqual(safeJsonParse('{"a": 1}', {
        reviver: ThrowingReviver,
        fallback: "REVIVER_FAILED",
        onError: (err: any) => { reviverErrorLogged = err.message === "Reviver explosion"; }
    }), "REVIVER_FAILED", "reviver throw caught and returns fallback");
    assert(reviverErrorLogged, "onError triggered when reviver throws");

    // 8. Guard function throw & validation failure edge cases
    let guardErrorCount = 0;
    let guardErrorType: any = null;
    const throwingGuard = () => { throw new Error("Guard exception"); };
    const failingGuard = (val: any) => typeof val === "object" && val !== null && val.a === 999;

    assertEqual(safeJsonParse('{"a": 1}', {
        guard: throwingGuard,
        fallback: "GUARD_THREW",
        onError: () => { guardErrorCount++; }
    }), "GUARD_THREW", "throwing guard caught and returns fallback");

    assertEqual(safeJsonParse('{"a": 1}', {
        guard: failingGuard,
        fallback: "GUARD_FAILED",
        onError: (err) => {
            guardErrorCount++;
            guardErrorType = err;
        }
    }), "GUARD_FAILED", "failing guard returns fallback");
    assertEqual(guardErrorCount, 2, "onError triggered for throwing guard and failing guard");
    assert(guardErrorType instanceof InvalidArgumentError, "guard validation failure throws InvalidArgumentError");

    // 9. NDJSON Advanced Edge Cases (CRLF, mixed invalid, empty lines, skip/max limits)
    const ndjsonCrlf = '{"id":1}\r\n{"id":2}\r\n\r\n{"id":3}\r\n';
    assertEqual(safeJsonParse(ndjsonCrlf, { format: "ndjson" }), [{ id: 1 }, { id: 2 }, { id: 3 }], "NDJSON with CRLF newlines");

    const ndjsonSkipOnly = '{"a":1}\n{"a":2}\n{"a":3}';
    assertEqual(safeJsonParse(ndjsonSkipOnly, { format: "ndjson", ndjson: { skipLines: 2 } }), [{ a: 3 }], "NDJSON skipLines=2");

    const ndjsonMaxOnly = '{"a":1}\n{"a":2}\n{"a":3}';
    assertEqual(safeJsonParse(ndjsonMaxOnly, { format: "ndjson", ndjson: { maxLines: 1 } }), [{ a: 1 }], "NDJSON maxLines=1");

    const ndjsonAllInvalid = 'INVALID1\nINVALID2\nINVALID3';
    assertEqual(safeJsonParse(ndjsonAllInvalid, {
        format: "ndjson",
        ndjson: { skipInvalidLines: true },
        fallback: "NO_VALID_LINES"
    }), "NO_VALID_LINES", "NDJSON with skipInvalidLines=true and 0 valid lines returns fallback");

    const ndjsonPrimitives = '123\n"hello"\ntrue';
    assertEqual(safeJsonParse(ndjsonPrimitives, {
        format: "ndjson",
        allowPrimitives: true
    }), [123, "hello", true], "NDJSON with allowPrimitives=true parses primitive lines");

    // 10. Explicit { fallback: undefined } Support
    assertEqual(safeJsonParse("invalid json", { fallback: undefined }), undefined, "explicit fallback: undefined returns undefined on parse failure");
    assertEqual(safeJsonParse(123 as any, { fallback: undefined }), undefined, "explicit fallback: undefined returns undefined on non-string input");
    assertEqual(safeJsonParse('{"a": 1}', { guard: () => false, fallback: undefined }), undefined, "explicit fallback: undefined returns undefined on guard failure");

    // 11. Re-entrant NDJSON Parsing (inner NDJSON parse inside reviver/guard)
    const nestedNdjsonInput = '{"nested":"{\\"x\\":10}\\n{\\"x\\":20}"}\n{"nested":"{\\"x\\":30}"}';
    const reentrantResult = safeJsonParse(nestedNdjsonInput, {
        format: "ndjson",
        reviver: (_key, val) => {
            if (typeof val === "string" && val.includes("x")) {
                return safeJsonParse(val, { format: "ndjson" });
            }
            return val;
        }
    }) as any;
    assertEqual(reentrantResult, [
        { nested: [{ x: 10 }, { x: 20 }] },
        { nested: [{ x: 30 }] }
    ], "re-entrant NDJSON parsing within reviver completes without state corruption");

    // 12. BigInt input handling
    const bigIntVal = BigInt(9007199254740991);
    assert(safeJsonParse(bigIntVal as any) === bigIntVal, "BigInt input returns BigInt when no fallback");
    assert(safeJsonParse(bigIntVal as any, { fallback: "FB" }) === "FB", "BigInt input returns fallback when specified");

    // 13. Prototype Pollution Safety
    const protoPayload = '{"__proto__": {"polluted": true}, "a": 1}';
    const parsedProto = safeJsonParse(protoPayload) as any;
    assertEqual(parsedProto.a, 1, "parses normal property alongside __proto__ key");
    assert((Object.prototype as any).polluted === undefined, "__proto__ in JSON string does not pollute Object.prototype");

    // 14. NDJSON with carriage return only (\r) and mixed invalid line skipping
    const crNdjson = '{"a":1}\r{"a":2}\r';
    assertEqual(safeJsonParse(crNdjson, { format: "ndjson" }), [{ a: 1 }, { a: 2 }], "NDJSON with CR line endings");

    const mixedSkipNdjson = '{"a":1}\nBAD_LINE\n{"a":2}\n12345';
    assertEqual(safeJsonParse(mixedSkipNdjson, {
        format: "ndjson",
        ndjson: { skipInvalidLines: true }
    }), [{ a: 1 }, { a: 2 }], "NDJSON with skipInvalidLines=true skips unwrapped/invalid lines when primitives disallowed");

    // 15. Additional Edge Cases:
    // a. NDJSON combining skipLines and maxLines
    const ndjsonCombo = '{"n":1}\n{"n":2}\n{"n":3}\n{"n":4}\n{"n":5}';
    assertEqual(safeJsonParse(ndjsonCombo, {
        format: "ndjson",
        ndjson: { skipLines: 1, maxLines: 2 }
    }), [{ n: 2 }, { n: 3 }], "NDJSON combining skipLines=1 and maxLines=2");

    // b. JSON with leading/trailing whitespace when trimBeforeParse is false/true
    const paddedJson = '   {"a": 100}   \n';
    assertEqual(safeJsonParse(paddedJson), { a: 100 }, "JSON string wrapped with outer whitespace parses cleanly when trimBeforeParse=false");
    assertEqual(safeJsonParse(paddedJson, { trimBeforeParse: true }), { a: 100 }, "JSON string wrapped with outer whitespace parses cleanly when trimBeforeParse=true");

    // c. Boolean guard returning simple false (non-throwing)
    assertEqual(safeJsonParse('{"val": -5}', {
        guard: (v: any) => v.val > 0,
        fallback: "INVALID_VAL"
    }), "INVALID_VAL", "guard returning false returns fallback value");

    // d. Non-string inputs without fallback returning input unchanged
    const sampleObj = { x: 1 };
    assertEqual(safeJsonParse(sampleObj as any), sampleObj, "non-string input without fallback returns exact reference");

    // e. Mismatched JSON outer brackets (e.g., '{1, 2, 3]' or '[1, 2, 3}')
    assertEqual(safeJsonParse('{1, 2, 3]', { fallback: "MISMATCH" }), "MISMATCH", "mismatched outer brackets { ... ] caught and returns fallback");
    assertEqual(safeJsonParse('[1, 2, 3}', { fallback: "MISMATCH" }), "MISMATCH", "mismatched outer brackets [ ... } caught and returns fallback");

    // f. onError callback throwing an error itself - safeJsonParse traps onError exceptions and returns fallback
    const onErrorThrowResult = safeJsonParse('{bad json}', {
        fallback: "SAFE_FALLBACK",
        onError: () => { throw new Error("onError failure"); }
    });
    assertEqual(onErrorThrowResult, "SAFE_FALLBACK", "safeJsonParse traps onError callback exceptions and returns fallback");

    // Empty object and array literals
    assertEqual(safeJsonParse('{}'), {}, "parses empty object literal");
    assertEqual(safeJsonParse('[]'), [], "parses empty array literal");
    assertEqual(safeJsonParse('   {}   '), {}, "parses empty object literal surrounded by whitespace");

    // Reviver filtering keys
    const filteredObj = safeJsonParse('{"a": 1, "b": 2}', {
        reviver: (k, v) => (k === "b" ? undefined : v)
    });
    assertEqual(filteredObj, { a: 1 }, "reviver returning undefined filters key out");

    // NDJSON skipLines exceeding total line count returns []
    assertEqual(safeJsonParse('{"a": 1}\n{"a": 2}', {
        format: "ndjson",
        ndjson: { skipLines: 10 }
    }), [], "NDJSON with skipLines > line count successfully returns empty array");

    // NDJSON maxLines = 0 returns []
    assertEqual(safeJsonParse('{"a": 1}\n{"a": 2}', {
        format: "ndjson",
        ndjson: { maxLines: 0 }
    }), [], "NDJSON maxLines=0 successfully returns empty array");

    // NDJSON lines with surrounding whitespace around objects
    const paddedNdjson = '   {"item": 1}   \n   {"item": 2}   ';
    assertEqual(safeJsonParse(paddedNdjson, { format: "ndjson" }), [{ item: 1 }, { item: 2 }], "NDJSON lines with outer whitespace parse correctly");

    // 18. Additional Specific Edge Cases
    // Reviver mutation & throwing on nested keys
    let reviverKeyLogged: string[] = [];
    safeJsonParse('{"a": {"b": 1}}', {
        reviver: (k, v) => {
            if (k) reviverKeyLogged.push(k);
            return v;
        }
    });
    assertEqual(reviverKeyLogged, ["b", "a"], "reviver processes keys in bottom-up order");

    // Guard returning truthy non-boolean value
    assertEqual(safeJsonParse('{"status": "ok"}', {
        guard: (v: any) => v.status as any,
        fallback: "GUARD_FAILED"
    }), { status: "ok" }, "guard returning truthy non-boolean passes validation");

    // Explicit fallback: undefined with allowPrimitives=true on invalid JSON
    assertEqual(safeJsonParse('{invalid}', { allowPrimitives: true, fallback: undefined }), undefined, "fallback: undefined honored when allowPrimitives=true on syntax error");

    // 19. Additional In-depth Edge Case Tests
    // Mixed newline styles in NDJSON (CRLF, LF, CR)
    const mixedNewlines = '{"id": 1}\r\n{"id": 2}\n{"id": 3}\r{"id": 4}';
    assertEqual(safeJsonParse(mixedNewlines, { format: "ndjson" }), [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], "handles mixed CRLF, LF, CR newlines");

    // NDJSON with consecutive blank lines and trailing newlines
    const spacedNdjson = '\n\n  {"x": 10}  \r\n\r\n  {"x": 20}  \n\n';
    assertEqual(safeJsonParse(spacedNdjson, { format: "ndjson" }), [{ x: 10 }, { x: 20 }], "handles leading/trailing/intermediate empty lines in NDJSON");

    // NDJSON with skipLines, maxLines, and skipInvalidLines together
    const complexNdjson = 'invalid_line_1\n{"valid": 1}\ninvalid_line_2\n{"valid": 2}\n{"valid": 3}\n{"valid": 4}';
    const complexResult = safeJsonParse(complexNdjson, {
        format: "ndjson",
        ndjson: {
            skipInvalidLines: true,
            maxLines: 2,
            skipLines: 1 // skips 'invalid_line_1' as the 1st non-empty line
        }
    });
    assertEqual(complexResult, [{ valid: 1 }, { valid: 2 }], "complex combination of skipInvalidLines, maxLines, and skipLines works seamlessly");

    // JSON Primitive edge cases with allowPrimitives: true vs false
    assertEqual(safeJsonParse("true", { allowPrimitives: true }), true, "parses boolean literal true when allowPrimitives=true");
    assertEqual(safeJsonParse("false", { allowPrimitives: true }), false, "parses boolean literal false when allowPrimitives=true");
    assertEqual(safeJsonParse("null", { allowPrimitives: true }), null, "parses null literal when allowPrimitives=true");
    assertEqual(safeJsonParse("0", { allowPrimitives: true }), 0, "parses 0 when allowPrimitives=true");
    assertEqual(safeJsonParse("-123.456", { allowPrimitives: true }), -123.456, "parses negative float when allowPrimitives=true");

    assertEqual(safeJsonParse("true", { allowPrimitives: false, fallback: "NOT_ALLOWED" }), "NOT_ALLOWED", "rejects boolean true when allowPrimitives=false");
    assertEqual(safeJsonParse("false", { allowPrimitives: false, fallback: "NOT_ALLOWED" }), "NOT_ALLOWED", "rejects boolean false when allowPrimitives=false");
    assertEqual(safeJsonParse("null", { allowPrimitives: false, fallback: "NOT_ALLOWED" }), "NOT_ALLOWED", "rejects null when allowPrimitives=false");
    assertEqual(safeJsonParse("0", { allowPrimitives: false, fallback: "NOT_ALLOWED" }), "NOT_ALLOWED", "rejects 0 when allowPrimitives=false");

    // NDJSON with allowPrimitives: true
    const primitiveNdjson = '10\n"text"\ntrue\nnull\n{"obj": 1}';
    assertEqual(safeJsonParse(primitiveNdjson, { format: "ndjson", allowPrimitives: true }), [10, "text", true, null, { obj: 1 }], "NDJSON parses primitives when allowPrimitives=true");

    // NDJSON with allowPrimitives: false rejecting unwrapped line
    assertEqual(safeJsonParse(primitiveNdjson, { format: "ndjson", allowPrimitives: false, fallback: "REJECTED" }), "REJECTED", "NDJSON with allowPrimitives=false rejects primitive lines");

    // NDJSON with allowPrimitives: false and skipInvalidLines: true skips primitive lines
    assertEqual(safeJsonParse(primitiveNdjson, { format: "ndjson", allowPrimitives: false, ndjson: { skipInvalidLines: true } }), [{ obj: 1 }], "NDJSON with skipInvalidLines skips primitive lines when allowPrimitives=false");

    // Mismatched composite wrappers should fail
    assertEqual(safeJsonParse('{"a": 1]', { fallback: "MISMATCH" }), "MISMATCH", "mismatched { and ] fails parsing");
    assertEqual(safeJsonParse('["a", 1}', { fallback: "MISMATCH" }), "MISMATCH", "mismatched [ and } fails parsing");

    // Malformed expressions with wrapped edges (e.g. "{ a: 1 } + { b: 2 }" or "{ valid } trailing junk")
    assertEqual(safeJsonParse('{ "a": 1 } + { "b": 2 }', { fallback: "INVALID_EXPR" }), "INVALID_EXPR", "fails concatenated objects with wrapped outer braces");
    assertEqual(safeJsonParse('{ "a": 1 } trailing_text', { fallback: "TRAILING_JUNK" }), "TRAILING_JUNK", "fails object with trailing junk");
    assertEqual(safeJsonParse('[1, 2] [3, 4]', { fallback: "TWO_ARRAYS" }), "TWO_ARRAYS", "fails multiple arrays in single JSON string");

    // Guard receiving full array in NDJSON
    assert(isJsonString('{"a": 1}\n{"a": 2}', { format: "ndjson", guard: (arr: any) => Array.isArray(arr) && arr.length === 2 }), "isJsonString passes guard on NDJSON array");
    assert(!isJsonString('{"a": 1}\n{"a": 2}', { format: "ndjson", guard: (arr: any) => Array.isArray(arr) && arr.length === 5 }), "isJsonString fails when guard predicate is false on NDJSON array");

    // onError handler throws an exception - safeJsonParse must NOT crash and must return fallback
    const crashOnError = safeJsonParse("invalid json", {
        fallback: "SAFE_RECOVERY",
        onError: () => {
            throw new Error("Logger crashed internally");
        }
    });
    assertEqual(crashOnError, "SAFE_RECOVERY", "safeJsonParse catches errors thrown inside custom onError callbacks");

    // 20. Ultra-Complex & Adversarial JSON Tests
    // Escaped quotes, newlines, and Unicode inside JSON strings
    const complexJsonPayload = JSON.stringify({
        nested: {
            arr: [1, "line1\nline2\r\nline3\t", { "unicode": "\u0041\u0042\u0043 \uD83D\uDE00", flag: true }],
            emptyObj: {},
            emptyArr: []
        },
        nullVal: null,
        num: -9007199254740991
    });
    const parsedComplex = safeJsonParse(complexJsonPayload);
    assertEqual((parsedComplex as any)?.nested?.arr?.[1], "line1\nline2\r\nline3\t", "safely parses complex multi-line escaped strings");
    assertEqual((parsedComplex as any)?.nested?.arr?.[2]?.unicode, "ABC 😀", "safely parses surrogate pair emojis and unicode escapes");

    // Prototype pollution payload check - ensure standard Object prototype is untouched
    const maliciousPayload = '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"admin": true}}}';
    const parsedMalicious = safeJsonParse(maliciousPayload);
    assert(parsedMalicious !== null, "malicious payload parses without throwing");
    assert(({} as any).polluted === undefined, "global Object.prototype is not polluted by __proto__ JSON key");
    assert(({} as any).admin === undefined, "global Object.prototype is not polluted by constructor.prototype JSON key");

    // Deeply nested JSON tree
    let deepJson = '{"leaf": 42}';
    for (let d = 0; d < 20; d++) {
        deepJson = `{"level_${d}": ${deepJson}}`;
    }
    const parsedDeep = safeJsonParse(deepJson);
    let curr: any = parsedDeep;
    for (let d = 19; d >= 0; d--) {
        curr = curr?.[`level_${d}`];
    }
    assertEqual(curr?.leaf, 42, "safely parses 20 levels of nested JSON objects");

    // 21. Prototype Pollution via JSON.parse Native Quirk & Deep Clones
    const parsedPollution = safeJsonParse('{"__proto__": {"admin": true}}') as any;
    const mergedObj = Object.assign({}, parsedPollution);
    assert((Object.prototype as any).admin === undefined, "Object.prototype.admin remains unpolluted");
    assert(Object.prototype.hasOwnProperty.call(parsedPollution, "__proto__"), "JSON.parse creates an own property '__proto__'");
    assert(mergedObj.admin === true, "Object.assign invokes target prototype setter when copying __proto__ property");

    // 22. Large Precision Integer Truncation (BigInt / 64-bit Integers)
    const bigIdJson = '{"id": 9007199254740999}';
    const parsedBigId = safeJsonParse(bigIdJson) as any;
    assertEqual(parsedBigId.id, 9007199254741000, "asserts standard IEEE-754 rounding behavior for integers above Number.MAX_SAFE_INTEGER");

    // 23. NDJSON Valid Empty Lines / Whitespace-Only File
    assertEqual(
        safeJsonParse("\n\n   \n", { format: "ndjson" }),
        [],
        "NDJSON with only blank lines returns empty array without throwing"
    );

    // 24. NDJSON with maxLines on Trailing Newlines
    const ndjsonTrailing = '{"a": 1}\n{"a": 2}\n\n\n';
    assertEqual(
        safeJsonParse(ndjsonTrailing, { format: "ndjson", ndjson: { maxLines: 2 } }),
        [{ a: 1 }, { a: 2 }],
        "NDJSON with maxLines=2 terminates cleanly even with trailing empty newlines"
    );

    // 25. Type-Narrowing with Guard in isJsonString
    interface TestUser { name: string }
    const isUser = (val: unknown): val is TestUser => typeof val === "object" && val !== null && "name" in val;
    const rawUserStr: unknown = '{"name": "Alice"}';
    if (isJsonString(rawUserStr, { guard: isUser })) {
        assert(typeof rawUserStr === "string", "rawUserStr narrowed to string");
    }

    // 26. Control Characters Inside JSON Strings (RFC 8259 Compliance)
    const rawNewlineInString = '{"key": "line1\nline2"}';
    assertEqual(
        safeJsonParse(rawNewlineInString, { fallback: "FAIL" }),
        "FAIL",
        "rejects raw unescaped ASCII control characters in JSON strings"
    );

    // 27. UTF-8 Byte Order Mark (BOM) (\uFEFF)
    assertEqual(
        safeJsonParse("\uFEFF{\"a\":1}", { trimBeforeParse: true }),
        { a: 1 },
        "strips leading BOM character when trimBeforeParse is true"
    );

    // 28. Number Precision & Safe Primitives Edge Cases (-0 and Subnormals)
    const negZero = safeJsonParse("-0", { allowPrimitives: true });
    assert(Object.is(negZero, -0), "preserves sign on negative zero -0");

    // 29. ReDoS / Catastrophic Regex Backtracking on Very Large Lines (50k chars)
    const longJsonLine = `{"data":"${"x".repeat(50000)}"}\n{"data":"y"}`;
    const parsedLong = safeJsonParse(longJsonLine, { format: "ndjson" }) as any;
    assertEqual(parsedLong.length, 2, "handles massive 50k character single-line NDJSON without choking");

    // 30. NDJSON Lines Containing Unicode Whitespace (NBSP, Tab, etc.)
    const nbspNdjson = '{"a":1}\n \u00A0 \t \n{"b":2}';
    assertEqual(
        safeJsonParse(nbspNdjson, { format: "ndjson" }),
        [{ a: 1 }, { b: 2 }],
        "correctly ignores lines with NBSP and tabs as empty whitespace"
    );

    // 31. Reviver Mutating Objects to undefined on Root
    const strippedRoot = safeJsonParse('{"a":1}', {
        reviver: (key, val) => (key === "" ? undefined : val),
        fallback: "FB"
    });
    assertEqual(strippedRoot, undefined, "reviver returning undefined on root produces undefined without triggering fallback");

    // 32. Lone JSON Escaped Null Bytes (\u0000)
    const nullByteJson = '{"key":"foo\\u0000bar"}';
    const parsedNullByte = safeJsonParse(nullByteJson) as any;
    assertEqual(parsedNullByte.key, "foo\u0000bar", "preserves encoded null bytes in strings");

    // 33. Guard Parameter In-Place Mutation
    const mutatingGuard = (val: any): boolean => {
        if (typeof val === "object" && val !== null) {
            val.injected = true;
            return true;
        }
        return false;
    };
    const mutatedResult = safeJsonParse('{"a":1}', { guard: mutatingGuard }) as any;
    assertEqual(mutatedResult.injected, true, "handles guard mutating the parsed object in-place");

    // 34. Maximum Call Stack via Extreme Object Depth & Recursive Revivers (RangeError handling)
    let deepNestedJson = '{"a": 1}';
    for (let i = 0; i < 5000; i++) {
        deepNestedJson = `{"child": ${deepNestedJson}}`;
    }
    const recursiveReviver = (k: string, v: any) => {
        if (k === "child") {
            return safeJsonParse(JSON.stringify(v), { reviver: recursiveReviver });
        }
        return v;
    };
    assertEqual(
        safeJsonParse(deepNestedJson, { reviver: recursiveReviver, fallback: "STACK_OVERFLOW" }),
        "STACK_OVERFLOW",
        "catches RangeError from recursion depth limits and returns fallback"
    );

    // 35. _isWrappedJsonComposite Boundary & Escape Edge Cases
    assertEqual(
        safeJsonParse('"{ hello }"', { allowPrimitives: false, fallback: "PRIMITIVE_STRING" }),
        "PRIMITIVE_STRING",
        "rejects primitive string that looks like an object when allowPrimitives=false"
    );
    assertEqual(
        safeJsonParse('{"escaped": "\\\"}"}'),
        { escaped: '"}' },
        "handles escaped quotes and braces at string boundaries"
    );

    // 36. Duplicate Object Keys (ECMAScript silent overwrite behavior)
    const dupKeyJson = '{"key": "first", "key": "second"}';
    assertEqual(
        safeJsonParse(dupKeyJson),
        { key: "second" },
        "V8 standard behavior: subsequent duplicate keys overwrite previous values"
    );

    // 37. Lone and Unpaired UTF-16 Surrogates
    const loneSurrogate = '{"lone": "\\uD800"}';
    const parsedSurrogate = safeJsonParse(loneSurrogate) as any;
    assertEqual(parsedSurrogate.lone, "\uD800", "preserves lone surrogate code points without throwing");

    // 38. JSON Superset Unicode Separators (\u2028 / \u2029)
    const lineSepJson = '{"line": "foo\u2028bar"}';
    assertEqual(
        (safeJsonParse(lineSepJson) as any).line,
        "foo\u2028bar",
        "correctly parses ECMAScript JSON superset line separators"
    );

    // 39. Object.freeze fallback integrity
    const frozenFallback = Object.freeze({ status: "error" });
    const fallbackRes = safeJsonParse("invalid json", { fallback: frozenFallback });
    assertEqual(fallbackRes, frozenFallback, "returns exact reference of frozen fallback object without attempting mutation");

    // 40. Additional Edge Case Tests:
    // a. isJsonString with empty string or pure whitespace
    assert(!isJsonString(""), "isJsonString returns false for empty string");
    assert(!isJsonString("   \n\t  "), "isJsonString returns false for whitespace-only string");
    assert(isJsonString("   {}   "), "isJsonString returns true for object wrapped in whitespace");
    assert(isJsonString("   []   "), "isJsonString returns true for array wrapped in whitespace");

    // b. Reviver returning primitive false and null values
    const reviverReturningNull = safeJsonParse('{"a": 1, "b": 2}', {
        reviver: (k, v) => (k === "b" ? null : v)
    });
    assertEqual(reviverReturningNull, { a: 1, b: null }, "reviver returning null sets property to null");

    const reviverReturningFalse = safeJsonParse('{"a": 1}', {
        reviver: (_k, v) => (typeof v === "number" ? false : v)
    });
    assertEqual(reviverReturningFalse, { a: false }, "reviver returning false sets property to false");

    // c. Leading/trailing whitespace preserved inside object keys
    const spaceKeys = safeJsonParse('{"  spaced_key  ": 42}');
    assertEqual(spaceKeys, { "  spaced_key  ": 42 }, "preserves intentional leading/trailing spaces inside JSON object keys");

    // d. Strict JSON number formats (e.g. +10 is invalid JSON, 1e+10 is valid)
    assertEqual(safeJsonParse('{"num": +10}', { fallback: "INVALID_PLUS" }), "INVALID_PLUS", "rejects numbers with leading plus sign (+10) per JSON spec");
    assertEqual(safeJsonParse('{"num": 1e+10}'), { num: 1e10 }, "accepts scientific exponential notation with plus sign (1e+10)");
    assertEqual(safeJsonParse('{"num": .5}', { fallback: "INVALID_DECIMAL" }), "INVALID_DECIMAL", "rejects numbers without leading zero (.5) per JSON spec");

    // e. NDJSON empty string / only newlines behavior
    assertEqual(safeJsonParse("", { format: "ndjson" }), [], "empty string NDJSON returns empty array");
    assertEqual(safeJsonParse("   ", { format: "ndjson" }), [], "whitespace-only NDJSON returns empty array");

    // f. NDJSON with trailing spaces on intermediate blank lines
    assertEqual(safeJsonParse('{"a": 1}\n   \t  \n{"a": 2}', { format: "ndjson" }), [{ a: 1 }, { a: 2 }], "NDJSON ignores lines containing only spaces and tabs");

    // g. trimBeforeParse: true with outer whitespace around invalid composite characters
    assertEqual(safeJsonParse("  { invalid JSON }  ", { trimBeforeParse: true, fallback: "TRIMMED_BAD" }), "TRIMMED_BAD", "trimBeforeParse handles invalid JSON surrounded by whitespace");

    // h. allowPrimitives: true with JSON string primitives containing composite-like syntax
    assertEqual(safeJsonParse('"[1, 2, 3]"', { allowPrimitives: true }), "[1, 2, 3]", "parses string primitive containing array syntax without composite unwrapping confusion");
    assertEqual(safeJsonParse('"{\\"nested\\": true}"', { allowPrimitives: true }), '{"nested": true}', "parses string primitive containing object syntax");

    // i. guard function receiving null when allowPrimitives: true and input is literal null
    let guardReceivedNull = false;
    const guardedNull = safeJsonParse("null", {
        allowPrimitives: true,
        guard: (v: unknown): v is null => {
            if (v === null) guardReceivedNull = true;
            return v === null;
        }
    });
    assertEqual(guardedNull, null, "guard receives null value correctly on literal null parse with allowPrimitives=true");
    assert(guardReceivedNull, "guard was executed with null argument");

    // 41. Comprehensive Edge Cases for NDJSON & Option Combinations
    // a. maxLines = 0 with skipLines > 0
    assertEqual(
        safeJsonParse('{"a":1}\n{"a":2}\n{"a":3}', { format: "ndjson", ndjson: { skipLines: 1, maxLines: 0 } }),
        [],
        "NDJSON with maxLines=0 and skipLines=1 returns empty array"
    );

    // b. maxLines larger than available lines
    assertEqual(
        safeJsonParse('{"a":1}\n{"a":2}', { format: "ndjson", ndjson: { maxLines: 100 } }),
        [{ a: 1 }, { a: 2 }],
        "NDJSON with maxLines exceeding available line count returns all parsed lines"
    );

    // c. skipLines exactly equal to total line count
    assertEqual(
        safeJsonParse('{"a":1}\n{"a":2}', { format: "ndjson", ndjson: { skipLines: 2 } }),
        [],
        "NDJSON with skipLines equal to total lines returns empty array"
    );

    // d. skipLines larger than total line count with skipInvalidLines
    assertEqual(
        safeJsonParse('{"a":1}\n{"a":2}', { format: "ndjson", ndjson: { skipLines: 10, skipInvalidLines: true } }),
        [],
        "NDJSON with skipLines > total lines and skipInvalidLines=true returns empty array"
    );

    // e. Single line NDJSON with no trailing newline
    assertEqual(
        safeJsonParse('{"single": true}', { format: "ndjson" }),
        [{ single: true }],
        "single-line NDJSON without trailing newline parses correctly"
    );

    // f. Single line NDJSON with maxLines = 1
    assertEqual(
        safeJsonParse('{"first": 1}\n{"second": 2}', { format: "ndjson", ndjson: { maxLines: 1 } }),
        [{ first: 1 }],
        "NDJSON with maxLines=1 stops after first line without parsing subsequent lines"
    );

    // g. Multi-line NDJSON where first line is invalid and skipInvalidLines = false throws
    assertEqual(
        safeJsonParse('INVALID_JSON\n{"a": 1}', { format: "ndjson", ndjson: { skipInvalidLines: false }, fallback: "FAILED" }),
        "FAILED",
        "NDJSON with skipInvalidLines=false returns fallback on first invalid line"
    );

    // h. Multi-line NDJSON where intermediate line is invalid and skipInvalidLines = false throws
    assertEqual(
        safeJsonParse('{"a": 1}\nINVALID_JSON\n{"a": 2}', { format: "ndjson", ndjson: { skipInvalidLines: false }, fallback: "FAILED" }),
        "FAILED",
        "NDJSON with skipInvalidLines=false returns fallback on intermediate invalid line"
    );

    // i. Multi-line NDJSON where last line has no newline and is invalid
    assertEqual(
        safeJsonParse('{"a": 1}\n{"a": 2}\nINVALID_TAIL', {
            format: "ndjson",
            ndjson: { skipInvalidLines: true }
        }),
        [{ a: 1 }, { a: 2 }],
        "NDJSON with skipInvalidLines=true skips invalid final line with no trailing newline"
    );

    // j. NDJSON where every line is an empty or whitespace-only line
    assertEqual(
        safeJsonParse('\n   \n\t\n  \r\n', { format: "ndjson" }),
        [],
        "NDJSON with various empty whitespace lines returns empty array"
    );

    // k. NDJSON with reviver modifying values and skipLines/maxLines
    const revivedNdjson = safeJsonParse('{"count": 10}\n{"count": 20}\n{"count": 30}', {
        format: "ndjson",
        reviver: (k, v) => (k === "count" ? v * 2 : v),
        ndjson: { skipLines: 1, maxLines: 1 }
    });
    assertEqual(revivedNdjson, [{ count: 40 }], "NDJSON reviver modifies parsed objects with skipLines and maxLines");

    // l. NDJSON allowPrimitives=true with diverse primitives across lines
    const mixedPrimitivesNdjson = '42\n"string_val"\nfalse\ntrue\nnull\n[1, 2]\n{"x": 99}';
    assertEqual(
        safeJsonParse(mixedPrimitivesNdjson, { format: "ndjson", allowPrimitives: true }),
        [42, "string_val", false, true, null, [1, 2], { x: 99 }],
        "NDJSON with allowPrimitives=true parses all primitives alongside composites"
    );

    // m. NDJSON allowPrimitives=false with primitive at the end with no newline
    assertEqual(
        safeJsonParse('{"ok": 1}\n123', {
            format: "ndjson",
            allowPrimitives: false,
            ndjson: { skipInvalidLines: true }
        }),
        [{ ok: 1 }],
        "NDJSON with allowPrimitives=false skips terminal primitive when skipInvalidLines=true"
    );

    // n. NDJSON allowPrimitives=false with primitive at end causing failure when skipInvalidLines=false
    assertEqual(
        safeJsonParse('{"ok": 1}\n123', {
            format: "ndjson",
            allowPrimitives: false,
            ndjson: { skipInvalidLines: false },
            fallback: "PRIMITIVE_REJECTED"
        }),
        "PRIMITIVE_REJECTED",
        "NDJSON with allowPrimitives=false fails on terminal primitive when skipInvalidLines=false"
    );

    // o. NDJSON empty lines should NOT count towards skipLines count
    // Line 1: empty, Line 2: empty, Line 3: {"a": 1} (1st non-empty), Line 4: {"a": 2} (2nd non-empty)
    const emptySpacedNdjson = '\n\n{"a": 1}\n\n{"a": 2}';
    assertEqual(
        safeJsonParse(emptySpacedNdjson, { format: "ndjson", ndjson: { skipLines: 1 } }),
        [{ a: 2 }],
        "NDJSON non-empty count properly skips only non-empty lines"
    );

    // p. NDJSON empty lines should NOT count towards maxLines limit
    assertEqual(
        safeJsonParse('\n\n{"a": 1}\n\n\n{"a": 2}\n\n', { format: "ndjson", ndjson: { maxLines: 1 } }),
        [{ a: 1 }],
        "NDJSON maxLines terminates only after reaching maxLines of non-empty content"
    );

    // q. NDJSON all non-empty lines are invalid and skipped -> IOStreamError triggered
    let ndjsonIoErrorCaptured: any = null;
    assertEqual(
        safeJsonParse('INVALID_1\nINVALID_2\nINVALID_3', {
            format: "ndjson",
            ndjson: { skipInvalidLines: true },
            fallback: "IO_FALLBACK",
            onError: (err) => { ndjsonIoErrorCaptured = err; }
        }),
        "IO_FALLBACK",
        "NDJSON where all lines were invalid triggers fallback and IOStreamError"
    );
    assert(ndjsonIoErrorCaptured instanceof IOStreamError, "onError received IOStreamError when 0 valid lines were processed");

    // r. NDJSON all non-empty lines are skipped by skipLines -> should NOT throw IOStreamError, returns []
    let ndjsonSkipErrorCaptured: any = null;
    assertEqual(
        safeJsonParse('{"a": 1}\n{"a": 2}', {
            format: "ndjson",
            ndjson: { skipLines: 5 },
            fallback: "SHOULD_NOT_USE_FB",
            onError: (err) => { ndjsonSkipErrorCaptured = err; }
        }),
        [],
        "NDJSON where all lines are skipped by skipLines returns empty array without error"
    );
    assert(ndjsonSkipErrorCaptured === null, "no error logged when skipLines > lines");

    // s. Standard JSON: trimBeforeParse with allowPrimitives=true
    assertEqual(
        safeJsonParse("   12345   ", { trimBeforeParse: true, allowPrimitives: true }),
        12345,
        "standard JSON trims whitespace and parses primitive number"
    );
    assertEqual(
        safeJsonParse('   "hello world"   ', { trimBeforeParse: true, allowPrimitives: true }),
        "hello world",
        "standard JSON trims whitespace and parses primitive string"
    );
    assertEqual(
        safeJsonParse("   true   ", { trimBeforeParse: true, allowPrimitives: true }),
        true,
        "standard JSON trims whitespace and parses primitive boolean"
    );
    assertEqual(
        safeJsonParse("   null   ", { trimBeforeParse: true, allowPrimitives: true }),
        null,
        "standard JSON trims whitespace and parses primitive null"
    );

    // t. Standard JSON: trimBeforeParse=false with leading/trailing whitespace on primitive with allowPrimitives=true
    assertEqual(
        safeJsonParse("   999   ", { trimBeforeParse: false, allowPrimitives: true }),
        999,
        "standard JSON parses primitive number even when trimBeforeParse=false"
    );

    // u. Standard JSON: composite validation when trimBeforeParse is false vs true
    assertEqual(
        safeJsonParse("  [1, 2, 3]  ", { trimBeforeParse: false }),
        [1, 2, 3],
        "composite array with outer spaces parses when trimBeforeParse=false"
    );
    assertEqual(
        safeJsonParse("  { \"key\": 10 }  ", { trimBeforeParse: false }),
        { key: 10 },
        "composite object with outer spaces parses when trimBeforeParse=false"
    );

    // v. Guard function on NDJSON results with empty array
    let emptyGuardCalled = false;
    const guardedEmpty = safeJsonParse("", {
        format: "ndjson",
        guard: (arr: any) => {
            emptyGuardCalled = true;
            return Array.isArray(arr) && arr.length === 0;
        }
    });
    assertEqual(guardedEmpty, [], "guard validates empty NDJSON result");
    assert(emptyGuardCalled, "guard was called for empty NDJSON array");

    // w. Guard function rejecting NDJSON result invokes onError and returns fallback
    let ndjsonGuardError: any = null;
    const rejectedNdjson = safeJsonParse('{"a": 1}\n{"a": 2}', {
        format: "ndjson",
        guard: (arr: any) => arr.length > 5,
        fallback: "GUARD_FAILED",
        onError: (err) => { ndjsonGuardError = err; }
    });
    assertEqual(rejectedNdjson, "GUARD_FAILED", "NDJSON failing guard returns fallback");
    assert(ndjsonGuardError instanceof InvalidArgumentError, "onError captured InvalidArgumentError for failed NDJSON guard");

    // x. Non-string inputs with different types when fallback is specified vs unspecified
    assertEqual(safeJsonParse(true as any, { fallback: "BOOL_FB" }), "BOOL_FB", "non-string boolean returns fallback");
    assertEqual(safeJsonParse(false as any), false, "non-string boolean false returns false directly");
    assertEqual(safeJsonParse(0 as any, { fallback: 999 }), 999, "non-string 0 returns fallback");
    assertEqual(safeJsonParse(0 as any), 0, "non-string 0 returns 0 directly");

    // y. isJsonString validation across the options matrix
    assert(isJsonString('{"valid": 1}'), "isJsonString returns true for valid JSON object");
    assert(isJsonString('[1, 2, 3]'), "isJsonString returns true for valid JSON array");
    assert(!isJsonString('123'), "isJsonString returns false for primitive number when allowPrimitives=false");
    assert(isJsonString('123', { allowPrimitives: true }), "isJsonString returns true for primitive number when allowPrimitives=true");
    assert(isJsonString('{"a": 1}\n{"b": 2}', { format: "ndjson" }), "isJsonString returns true for NDJSON");
    assert(!isJsonString('{"a": 1}\nINVALID', { format: "ndjson" }), "isJsonString returns false for NDJSON with invalid line");
    assert(isJsonString('{"a": 1}\nINVALID', { format: "ndjson", ndjson: { skipInvalidLines: true } }), "isJsonString returns true for NDJSON with skipped invalid line");
    assert(!isJsonString(12345 as any), "isJsonString returns false for non-string input");
    assert(!isJsonString(null as any), "isJsonString returns false for null");
    // z. 10/10 Comprehensive Edge Case Tests for NDJSON & safeJsonParse Flattening
    // 1. Mixed CRLF (\r\n), LF (\n), and CR (\r) with trailing and leading newlines
    const edgeMixedNewlines = "\r\n\r\n{\"id\":1}\r\n{\"id\":2}\r{\"id\":3}\n{\"id\":4}\r\n\r\n";
    assertEqual(
        safeJsonParse(edgeMixedNewlines, { format: "ndjson" }),
        [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        "Edge 1: handles arbitrary mixture of \\r\\n, \\r, and \\n with leading/trailing newlines"
    );

    // 2. maxLines = 0 stops immediately without processing lines
    assertEqual(
        safeJsonParse('{"a":1}\n{"a":2}', { format: "ndjson", ndjson: { maxLines: 0 } }),
        [],
        "Edge 2: maxLines = 0 returns empty array without throwing IOStreamError"
    );

    // 3. skipLines exceeding non-empty lines with no valid parsed items returns empty array
    assertEqual(
        safeJsonParse('{"a":1}\n\n{"a":2}\n', { format: "ndjson", ndjson: { skipLines: 5 } }),
        [],
        "Edge 3: skipLines greater than available non-empty lines yields empty array"
    );

    // 4. skipInvalidLines with trailing unparseable junk and whitespace
    const trailingJunk = '{"a":1}\n{"b":2}\n   corrupt line   \n';
    assertEqual(
        safeJsonParse(trailingJunk, { format: "ndjson", ndjson: { skipInvalidLines: true } }),
        [{ a: 1 }, { b: 2 }],
        "Edge 4: skipInvalidLines properly isolates and drops corrupt line"
    );

    // 5. maxLines reached before encountering an invalid line does not throw even if skipInvalidLines is false
    const invalidAfterLimit = '{"a":1}\n{"a":2}\nINVALID_JSON_HERE';
    assertEqual(
        safeJsonParse(invalidAfterLimit, { format: "ndjson", ndjson: { maxLines: 2, skipInvalidLines: false } }),
        [{ a: 1 }, { a: 2 }],
        "Edge 5: maxLines terminates parse loop before processing subsequent invalid lines"
    );

    // 6. allowPrimitives with mixed arrays, objects, numbers, booleans, strings, and null
    const edgeMixedPrimitives = '{"a":1}\n[1, 2]\n12345\n"quoted string"\ntrue\nnull';
    assertEqual(
        safeJsonParse(edgeMixedPrimitives, { format: "ndjson", allowPrimitives: true }),
        [{ a: 1 }, [1, 2], 12345, "quoted string", true, null],
        "Edge 6: allowPrimitives handles all primitive and compound JSON data types"
    );

    // 7. reviver transforming values line-by-line across NDJSON entries
    const reviverNdjson = '{"val":1}\n{"val":2}\n{"val":3}';
    const revivedResult = safeJsonParse(reviverNdjson, {
        format: "ndjson",
        reviver: (k, v) => (k === "val" ? (v as number) * 10 : v)
    });
    assertEqual(
        revivedResult,
        [{ val: 10 }, { val: 20 }, { val: 30 }],
        "Edge 7: reviver function correctly maps keys/values in NDJSON mode"
    );

    // 8. All lines invalid with skipInvalidLines=true raises IOStreamError and returns fallback
    let allInvalidCaughtError: any = null;
    const allInvalidFallback = safeJsonParse("bad1\nbad2\nbad3", {
        format: "ndjson",
        ndjson: { skipInvalidLines: true },
        fallback: "ALL_INVALID_FALLBACK",
        onError: (err) => { allInvalidCaughtError = err; }
    });
    assertEqual(allInvalidFallback, "ALL_INVALID_FALLBACK", "Edge 8: all invalid lines triggers fallback");
    assert(allInvalidCaughtError instanceof IOStreamError, "Edge 8: IOStreamError dispatched when 0 valid lines parsed");

    // 9. whitespace-only lines intertwined between valid lines do not increment nonEmptyCount
    const spacedLines = '   \n\t  \n{"step":1}\n    \n{"step":2}\n\r\n';
    assertEqual(
        safeJsonParse(spacedLines, { format: "ndjson", ndjson: { skipLines: 1 } }),
        [{ step: 2 }],
        "Edge 9: whitespace-only lines are ignored and do not count towards skipLines"
    );

    // 10. Combination of trimBeforeParse, skipLines, maxLines, and reviver
    const comboNdjson = '   \r\n  {"x": 10}  \r\n  {"x": 20}  \r\n  {"x": 30}  \r\n  {"x": 40}  \r\n  ';
    const comboResult = safeJsonParse(comboNdjson, {
        format: "ndjson",
        trimBeforeParse: true,
        ndjson: { skipLines: 1, maxLines: 2 },
        reviver: (k, v) => (k === "x" ? (v as number) + 1 : v)
    });
    assertEqual(
        comboResult,
        [{ x: 21 }, { x: 31 }],
        "Edge 10: combined trimBeforeParse + skipLines + maxLines + reviver executes accurately"
    );

    console.log(`SUCCESS: All safeJsonParse tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: safeJsonParse test failed!`, err);
    process.exit(1);
}
