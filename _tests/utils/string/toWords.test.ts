declare const process: any;
import { toWords } from "../../../src/utils/string";

console.log("=========================================");
console.log("STARTING TOWORDS TESTS...");
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

    assertEqual(toWords("helloWorld"), ["hello", "World"], "splits camelCase");
    assertEqual(toWords("hello_world"), ["hello", "world"], "splits snake_case");
    assertEqual(toWords("hello-world"), ["hello", "world"], "splits kebab-case");
    assertEqual(toWords(""), [], "empty string returns empty array");
    assertEqual(toWords("__proto__ constructor prototype safe_word"), ["safe", "word"], "filters dangerous prototype pollution property keys");


    console.log(`SUCCESS: All toWords tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: toWords test failed!`, err);
    process.exit(1);
}
