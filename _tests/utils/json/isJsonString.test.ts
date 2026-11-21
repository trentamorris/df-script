declare const process: any;
import { isJsonString } from "../../../src/utils/json";
import { InvalidArgumentError, IOStreamError } from "../../../src/exceptions";

console.log("=========================================");
console.log("STARTING ISJSONSTRING TESTS...");
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
    assert(isJsonString('{"a": 1}'), "isJsonString returns true for valid JSON object");
    assert(isJsonString('[1, 2, 3]'), "isJsonString returns true for valid JSON array");
    assert(!isJsonString('invalid json'), "isJsonString returns false for invalid JSON syntax");
    assert(!isJsonString(123 as any), "isJsonString returns false for non-string number");
    assert(!isJsonString(null as any), "isJsonString returns false for null input");
    assert(!isJsonString(undefined as any), "isJsonString returns false for undefined input");
    assert(!isJsonString('{a: 1}'), "isJsonString returns false for unquoted object keys");

    // isJsonString with allowPrimitives
    assert(!isJsonString('123'), "isJsonString returns false for un-wrapped number when allowPrimitives=false");
    assert(isJsonString('123', { allowPrimitives: true }), "isJsonString returns true for un-wrapped number when allowPrimitives=true");
    assert(isJsonString('"hello"', { allowPrimitives: true }), "isJsonString returns true for primitive string when allowPrimitives=true");
    assert(isJsonString('true', { allowPrimitives: true }), "isJsonString returns true for primitive boolean when allowPrimitives=true");

    // isJsonString with NDJSON
    assert(isJsonString('{"a": 1}\n{"a": 2}', { format: "ndjson" }), "isJsonString returns true for valid NDJSON");
    assert(!isJsonString('invalid ndjson line', { format: "ndjson" }), "isJsonString returns false for invalid NDJSON line");

    // isJsonString with guard
    assert(isJsonString('{"count": 10}', { guard: (v: any) => v.count > 5 }), "isJsonString returns true when guard condition is met");
    assert(!isJsonString('{"count": 2}', { guard: (v: any) => v.count > 5 }), "isJsonString returns false when guard condition fails");
    assert(!isJsonString('not json', { guard: () => true }), "isJsonString returns false for invalid json even if guard is true");
    assert(isJsonString('{"a": 1}\n{"a": 2}', { format: "ndjson", guard: (arr: any) => Array.isArray(arr) && arr.length === 2 }), "isJsonString passes guard on NDJSON array");
    assert(!isJsonString('{"a": 1}\n{"a": 2}', { format: "ndjson", guard: (arr: any) => Array.isArray(arr) && arr.length === 5 }), "isJsonString fails when guard predicate is false on NDJSON array");


    console.log(`SUCCESS: All isJsonString tests passed! (${testsPassed} assertions)`);
} catch (err: any) {
    console.error(`FAILURE: isJsonString test failed! Error details:`, err?.stack || err?.message || err);
    process.exit(1);
}
