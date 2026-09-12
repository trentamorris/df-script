declare const process: any;
import { isSafeObjPropertyKey } from "../../../src/utils/object";

console.log("=========================================");
console.log("STARTING ISSAFEOBJPROPERTYKEY TESTS...");
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
    // 1. Prototype pollution keys must return false
    assertEqual(isSafeObjPropertyKey("__proto__"), false, "__proto__ is not a safe property key");
    assertEqual(isSafeObjPropertyKey("proto"), false, "proto is not a safe property key");
    assertEqual(isSafeObjPropertyKey("constructor"), false, "constructor is not a safe property key");
    assertEqual(isSafeObjPropertyKey("prototype"), false, "prototype is not a safe property key");

    // 2. Standard safe string keys must return true
    assertEqual(isSafeObjPropertyKey("name"), true, "standard string 'name' is a safe property key");
    assertEqual(isSafeObjPropertyKey("id"), true, "standard string 'id' is a safe property key");
    assertEqual(isSafeObjPropertyKey(""), true, "empty string '' is a safe property key");
    assertEqual(isSafeObjPropertyKey("foo.bar"), true, "dotted string is a safe property key");
    assertEqual(isSafeObjPropertyKey("0"), true, "numeric string '0' is a safe property key");
    assertEqual(isSafeObjPropertyKey("_proto"), true, "near-match '_proto' is a safe property key");
    assertEqual(isSafeObjPropertyKey("prototype_"), true, "near-match 'prototype_' is a safe property key");
    assertEqual(isSafeObjPropertyKey("CONSTRUCTOR"), true, "case-differing 'CONSTRUCTOR' is a safe property key");

    // 3. Non-string inputs must return false
    assertEqual(isSafeObjPropertyKey(null), false, "null returns false");
    assertEqual(isSafeObjPropertyKey(undefined), false, "undefined returns false");
    assertEqual(isSafeObjPropertyKey(123), false, "number 123 returns false");
    assertEqual(isSafeObjPropertyKey(0), false, "number 0 returns false");
    assertEqual(isSafeObjPropertyKey(true), false, "boolean true returns false");
    assertEqual(isSafeObjPropertyKey(false), false, "boolean false returns false");
    assertEqual(isSafeObjPropertyKey(Symbol("test")), false, "symbol returns false");
    assertEqual(isSafeObjPropertyKey({}), false, "object returns false");
    assertEqual(isSafeObjPropertyKey([]), false, "array returns false");

    console.log(`SUCCESS: All isSafeObjPropertyKey tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: isSafeObjPropertyKey test failed!`, err);
    process.exit(1);
}
