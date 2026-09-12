declare const process: any;
import { jsonPathMatch } from "../../../src/utils/json";
import { InvalidArgumentError, IOStreamError } from "../../../src/exceptions";

console.log("=========================================");
console.log("STARTING JSONPATHMATCH TESTS...");
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
    // Direct parsed object and JSON string input
    const sampleData = {
        store: {
            book: [
                { category: "reference", author: "Nigel Rees", title: "Sayings of the Century", price: 8.95 },
                { category: "fiction", author: "Evelyn Waugh", title: "Sword of Honour", price: 12.99 }
            ]
        }
    };
    const sampleDataJson = JSON.stringify(sampleData);

    assertEqual(jsonPathMatch(sampleData, "$.store.book[0].title"), "Sayings of the Century", "matches nested string property from object input");
    assertEqual(jsonPathMatch(sampleDataJson, "$.store.book[0].title"), "Sayings of the Century", "matches nested string property from string input");
    assertEqual(jsonPathMatch(sampleData, "$.store.book[0].price"), "8.95", "matches nested number property");
    assertEqual(jsonPathMatch(sampleData, "$.store.book[-1].author"), "Evelyn Waugh", "matches negative index from end");
    assertEqual(jsonPathMatch(sampleData, "$..author"), "Nigel Rees", "recursive descent returns first matched item");
    assertEqual(jsonPathMatch(sampleData, "$.store.book[0]"), JSON.stringify(sampleData.store.book[0]), "returns object result serialized as JSON string");

    // Root-level array and root-level match
    const rootArr = [{ id: 1 }, { id: 2 }];
    assertEqual(jsonPathMatch(rootArr, "$[1].id"), "2", "matches root level array indexing");
    assertEqual(jsonPathMatch(rootArr, "$"), JSON.stringify(rootArr), "returns entire root when path is $");

    // Circular object returned by jsonPathMatch uses safe serialization
    const cyclicMatchTarget: any = { name: "cyclicNode" };
    cyclicMatchTarget.loop = cyclicMatchTarget;
    assertEqual(
        jsonPathMatch({ target: cyclicMatchTarget }, "$.target"),
        '{"name":"cyclicNode","loop":"[Circular]"}',
        "jsonPathMatch safely serializes circular matched objects using safe replacer"
    );

    // Boundary & invalid inputs
    assertEqual(jsonPathMatch(null, "$.a"), null, "null input returns null");
    assertEqual(jsonPathMatch(undefined, "$.a"), null, "undefined input returns null");
    assertEqual(jsonPathMatch({}, ""), null, "empty path returns null");
    assertEqual(jsonPathMatch({}, "   "), null, "blank whitespace path returns null");
    assertEqual(jsonPathMatch({ a: 1 }, "$.nonexistent"), null, "nonexistent path returns null");
    assertEqual(jsonPathMatch({ a: null }, "$.a"), null, "path pointing to null value returns null");

    let invalidJsonThrew = false;
    try {
        jsonPathMatch("{ malformed: json }", "$.a");
    } catch (err: any) {
        invalidJsonThrew = err instanceof InvalidArgumentError;
    }
    assert(invalidJsonThrew, "jsonPathMatch throws InvalidArgumentError on malformed JSON string input");

    // ============================================================================
    // 70. Extreme & Insane Edge Case Battery
    // ============================================================================

    // 1. Unicode, Emoji, and whitespace keys in bracket notation
    const emojiAndWeirdKeys = {
        "🚀 rocket": {
            "hello\nworld": {
                "key with spaces and.dots": "found me!",
                "": "empty key value",
                "null": "literal null key",
                "true": "literal true key",
                "123": "numeric string key"
            }
        }
    };
    assertEqual(
        jsonPathMatch(emojiAndWeirdKeys, "$['🚀 rocket']['hello\\nworld']['key with spaces and.dots']"),
        "found me!",
        "matches unicode emoji keys and keys with newlines and dots"
    );
    assertEqual(
        jsonPathMatch(emojiAndWeirdKeys, "$['🚀 rocket']['hello\\nworld']['']"),
        "empty key value",
        "matches empty string object key"
    );
    assertEqual(
        jsonPathMatch(emojiAndWeirdKeys, "$['🚀 rocket']['hello\\nworld']['null']"),
        "literal null key",
        "matches string key named 'null'"
    );
    assertEqual(
        jsonPathMatch(emojiAndWeirdKeys, "$['🚀 rocket']['hello\\nworld']['123']"),
        "numeric string key",
        "matches numeric string key in bracket notation"
    );

    // 2. Deep slice & reverse slice on empty and single-element arrays
    assertEqual(jsonPathMatch({ arr: [] }, "$.arr[0]"), null, "index 0 on empty array returns null");
    assertEqual(jsonPathMatch({ arr: [] }, "$.arr[-1]"), null, "index -1 on empty array returns null");
    assertEqual(jsonPathMatch({ arr: [] }, "$.arr[:]"), null, "slice on empty array returns null");
    assertEqual(jsonPathMatch({ arr: [42] }, "$.arr[::-1]"), "42", "reverse slice on single element returns element");
    assertEqual(jsonPathMatch({ arr: [1, 2, 3, 4, 5] }, "$.arr[10:20]"), null, "slice completely out of bounds returns null");

    // 3. Object with prototype null or weird prototype properties
    const nullProto: any = Object.create(null);
    nullProto.nested = { deep: "null-proto-val" };
    assertEqual(
        jsonPathMatch(nullProto, "$.nested.deep"),
        "null-proto-val",
        "traverses objects with Object.create(null) prototype"
    );

    // 4. Recursive search matching multiple levels including arrays of objects
    const deepTree = {
        level1: {
            target: "L1",
            level2: [
                { target: "L2_item0" },
                { level3: { target: "L3" } }
            ]
        }
    };
    assertEqual(
        jsonPathMatch(deepTree, "$..target"),
        "L1",
        "recursive search extracts first target at shallowest depth"
    );

    // 5. Deep nested structure with primitive JSON string input
    assertEqual(jsonPathMatch('"plain string json"', "$"), "plain string json", "jsonPathMatch parses and returns top-level string JSON");
    assertEqual(jsonPathMatch('12345', "$"), "12345", "jsonPathMatch parses and returns top-level number JSON");
    assertEqual(jsonPathMatch('true', "$"), "true", "jsonPathMatch parses and returns top-level boolean JSON");
    assertEqual(jsonPathMatch('null', "$"), null, "jsonPathMatch parses top-level null JSON and returns null");

    // 6. Mutated prototype attempts (verifying prototype isolation)
    const pollutedPayload: any = JSON.parse('{"__proto__": {"injected": "dangerous"}, "normal": "ok"}');
    assertEqual(jsonPathMatch(pollutedPayload, "$.__proto__.injected"), null, "blocks attempts to query __proto__ via dot notation");
    assertEqual(jsonPathMatch(pollutedPayload, "$['__proto__']['injected']"), null, "blocks attempts to query __proto__ via bracket notation");
    assertEqual(jsonPathMatch(pollutedPayload, "$.constructor"), null, "blocks attempts to query constructor via dot notation");
    assertEqual(jsonPathMatch(pollutedPayload, "$..__proto__"), null, "blocks attempts to query __proto__ via recursive scan");

    // 7. Highly recursive array nests
    const nestedArrays = [[[[["deepestValue"]]]]];
    assertEqual(
        jsonPathMatch(nestedArrays, "$[0][0][0][0][0]"),
        "deepestValue",
        "handles 5 levels of deeply nested array indexing"
    );

    // 8. JSONPath Syntax & Tokenization Variations (indirectly testing _tokenizeJsonPath)
    assertEqual(jsonPathMatch({ user: { name: "Alice" } }, ""), null, "empty path returns null");
    assertEqual(jsonPathMatch({ user: { name: "Alice" } }, "$"), '{"user":{"name":"Alice"}}', "single $ returns root object");
    assertEqual(jsonPathMatch({ user: { name: "Alice" } }, "   $   "), '{"user":{"name":"Alice"}}', "padded $ returns root object");
    assertEqual(jsonPathMatch({ user: { name: "Alice" } }, "$.user.name"), "Alice", "parses dot properties");
    assertEqual(jsonPathMatch({ user: { name: "Alice" } }, "$['user'][\"name\"]"), "Alice", "parses bracket quoted properties");
    assertEqual(jsonPathMatch({ "escaped'quote": "found" }, "$['escaped\\'quote']"), "found", "parses escaped quotes inside brackets");
    assertEqual(jsonPathMatch({ items: ["first", "second"] }, "$.items[0]"), "first", "parses array index [0]");
    assertEqual(jsonPathMatch({ items: ["first", "second"] }, "$.items[-1]"), "second", "parses negative array index [-1]");
    assertEqual(jsonPathMatch({ items: [10, 20] }, "$.items[*]"), "10", "bracket wildcard returns first item");
    assertEqual(jsonPathMatch({ items: [10, 20] }, "$.items.*"), "10", "dot wildcard returns first item");
    assertEqual(jsonPathMatch({ a: { name: "match" } }, "$..name"), "match", "recursive dot key finds match");
    assertEqual(jsonPathMatch({ a: { val: 42 } }, "$..*"), '{"val":42}', "recursive star wildcard finds first value");
    assertEqual(jsonPathMatch({ a: { deep: "nested_val" } }, "$..['deep']"), "nested_val", "recursive bracket single quote");
    assertEqual(jsonPathMatch({ a: { deep: "nested_val" } }, "$..[\"deep\"]"), "nested_val", "recursive bracket double quote");
    assertEqual(jsonPathMatch({ items: [0, 10, 20, 30, 40, 50] }, "$.items[1:5:2]"), "10", "slice with start, end, and step");
    assertEqual(jsonPathMatch({ items: [100, 200, 300] }, "$.items[:2]"), "100", "slice with omitted start");
    assertEqual(jsonPathMatch({ items: [100, 200, 300] }, "$.items[1:]"), "200", "slice with omitted end");
    assertEqual(jsonPathMatch({ items: [100, 200, 300] }, "$.items[::-1]"), "300", "reverse slice [::-1]");

    // Invalid syntax handling (returns null)
    assertEqual(jsonPathMatch({ user: "Alice" }, "$.user..[invalid"), null, "invalid bracket syntax returns null");
    assertEqual(jsonPathMatch({ user: "Alice" }, "$.user[abc]"), null, "unquoted identifier in brackets returns null");
    assertEqual(jsonPathMatch({ user: "Alice" }, "$.user.@#$!"), null, "illegal characters in path return null");

    // 9. Evaluation details (indirectly testing _evaluateJsonToken)
    // Out-of-bounds indexing
    assertEqual(jsonPathMatch({ items: [1, 2, 3] }, "$.items[99]"), null, "out-of-bounds positive array index returns null");
    assertEqual(jsonPathMatch({ items: [1, 2, 3] }, "$.items[-99]"), null, "out-of-bounds negative array index returns null");

    // Wildcard across objects vs arrays
    assertEqual(jsonPathMatch(["x", "y"], "$[*]"), "x", "array wildcard returns first item");
    assertEqual(jsonPathMatch({ k1: "v1", k2: "v2" }, "$.*"), "v1", "object wildcard returns first value");

    // Cyclic objects traversed with recursive token
    const recCyclicObj: any = { tag: "root", child: { tag: "nested" } };
    recCyclicObj.self = recCyclicObj;
    assertEqual(jsonPathMatch(recCyclicObj, "$..tag"), "root", "recursive path traversal safely handles cyclic object references without infinite recursion");

    // 10. Comprehensive Tokenizer & Combinatorial Edge Cases
    const complexObj = {
        users: [
            { id: 101, details: { "first name": "John", "last.name": "Doe", nested: { val: "alpha" } } },
            { id: 102, details: { "first name": "Jane", "last.name": "Smith", nested: { val: "beta" } } }
        ],
        special: {
            "key-with-dash": "dash-val",
            "key_with_underscore": "underscore-val",
            "$dollarKey": "dollar-val",
            "escaped\"dq": "dq-val",
            "matrix": [[1, 2], [3, 4]]
        }
    };

    // Identifiers with dashes, underscores, and dollar signs
    assertEqual(jsonPathMatch(complexObj, "$.special.key-with-dash"), "dash-val", "matches identifier with dash");
    assertEqual(jsonPathMatch(complexObj, "$.special.key_with_underscore"), "underscore-val", "matches identifier with underscore");
    assertEqual(jsonPathMatch(complexObj, "$.special.$dollarKey"), "dollar-val", "matches identifier with dollar sign");
    assertEqual(jsonPathMatch(complexObj, "$['special']['key-with-dash']"), "dash-val", "matches single quote bracket with dash");
    assertEqual(jsonPathMatch(complexObj, "$.special['escaped\\\"dq']"), "dq-val", "matches escaped double quote inside bracket");

    // Recursive search with bracketed property names containing dots, spaces, or special characters
    assertEqual(jsonPathMatch(complexObj, "$..['first name']"), "John", "recursive bracket search with spaces");
    assertEqual(jsonPathMatch(complexObj, "$..['last.name']"), "Doe", "recursive bracket search with dot in property name");
    assertEqual(jsonPathMatch(complexObj, "$..[\"val\"]"), "alpha", "recursive double quoted bracket search");

    // Multiple slices and matrix indexing
    assertEqual(jsonPathMatch(complexObj, "$.special.matrix[1][0]"), "3", "nested 2D matrix indexing");
    assertEqual(jsonPathMatch(complexObj, "$.users[:1]"), JSON.stringify(complexObj.users[0]), "slice with omitted start [:1]");
    assertEqual(jsonPathMatch(complexObj, "$.users[1:2]"), JSON.stringify(complexObj.users[1]), "slice with start and end [1:2]");
    assertEqual(jsonPathMatch(complexObj, "$.users[::2]"), JSON.stringify(complexObj.users[0]), "slice with step only [::2]");
    assertEqual(jsonPathMatch(complexObj, "$.special.matrix[ * ]"), JSON.stringify([1, 2]), "tolerates whitespace in wildcard bracket");

    // Whitespace variations inside brackets
    assertEqual(jsonPathMatch(complexObj, "$[ 'special' ][ 'key-with-dash' ]"), "dash-val", "tolerates whitespace in brackets");
    assertEqual(jsonPathMatch(complexObj, "$.special.matrix[ 0 ][ 1 ]"), "2", "tolerates whitespace in array index brackets");
    assertEqual(jsonPathMatch(complexObj, "$.special.matrix[ * ]"), JSON.stringify([1, 2]), "tolerates whitespace in wildcard bracket");

    // Trailing / leading dots and invalid tokens return null
    assertEqual(jsonPathMatch(complexObj, "$.special."), null, "trailing dot is invalid and returns null");
    assertEqual(jsonPathMatch(complexObj, "$.special.."), null, "trailing double dot is invalid and returns null");
    assertEqual(jsonPathMatch(complexObj, "$.special["), null, "unclosed bracket is invalid and returns null");
    assertEqual(jsonPathMatch(complexObj, "$.special[]"), null, "empty bracket is invalid and returns null");
    assertEqual(jsonPathMatch(complexObj, "$.special[0:1:2:3]"), null, "too many slice colons is invalid and returns null");
    assertEqual(jsonPathMatch(complexObj, "$.special[invalid_token]"), null, "unquoted non-numeric identifier in brackets returns null");
    assertEqual(jsonPathMatch(complexObj, "$.users[0].details.nonexistent.val"), null, "deep nonexistent property path safely returns null");

    // Primitives at root and JSON matching
    assertEqual(jsonPathMatch(false, "$"), "false", "boolean false returns 'false'");
    assertEqual(jsonPathMatch(0, "$"), "0", "number 0 returns '0'");
    assertEqual(jsonPathMatch("", "$"), null, "empty string input returns null");
    assertEqual(jsonPathMatch('""', "$"), "", "JSON string with empty string returns empty string");

    // 11. 10/10 Ultra-Hardcore Tokenizer & Traversal Edge Cases
    const extremeData = {
        "": { "": "empty-in-empty" },
        "0": ["item0", "item1"],
        "true": { "false": "boolean-keys" },
        "null": { "undefined": "null-undef-keys" },
        "arr": [10, 20, 30, 40, 50],
        "nested": {
            "a.b.c": "dotted-prop",
            "['brackets']": "bracket-named-prop",
            "spaced key": { "*": "literal-star" }
        },
        "escapes": {
            "tab\there": "tab-val",
            "back\\slash": "slash-val",
            "quote\"in\"prop": "quote-val",
            "single'quote": "sq-val"
        },
        "deep": [
            { id: 1, sub: [{ val: "d1" }, { val: "d2" }] },
            { id: 2, sub: [{ val: "d3" }] }
        ]
    };

    // Extreme quote unescaping inside brackets
    assertEqual(jsonPathMatch(extremeData, "$['nested']['a.b.c']"), "dotted-prop", "matches literal dots inside brackets");
    assertEqual(jsonPathMatch(extremeData, "$['nested']['[\\'brackets\\']']"), "bracket-named-prop", "matches literal brackets and quotes in key");
    assertEqual(jsonPathMatch(extremeData, "$['nested']['spaced key']['*']"), "literal-star", "matches quoted literal star key rather than wildcard");
    assertEqual(jsonPathMatch(extremeData, "$['escapes']['tab\\there']"), "tab-val", "matches escaped control char in brackets");
    assertEqual(jsonPathMatch(extremeData, "$['escapes']['back\\\\slash']"), "slash-val", "matches escaped backslash in brackets");
    assertEqual(jsonPathMatch(extremeData, "$['escapes'][\"quote\\\"in\\\"prop\"]"), "quote-val", "matches escaped double quote in double quote brackets");
    assertEqual(jsonPathMatch(extremeData, "$['escapes']['single\\'quote']"), "sq-val", "matches escaped single quote in single quote brackets");

    // Root edge cases & empty keys
    assertEqual(jsonPathMatch(extremeData, "$['']['']"), "empty-in-empty", "matches empty string keys nested in brackets");
    assertEqual(jsonPathMatch(extremeData, "$['0'][1]"), "item1", "matches numeric string property followed by array index");
    assertEqual(jsonPathMatch(extremeData, "$['true']['false']"), "boolean-keys", "matches boolean string keys in brackets");
    assertEqual(jsonPathMatch(extremeData, "$['null']['undefined']"), "null-undef-keys", "matches null and undefined string keys");

    // Extreme Slice Edge Cases
    assertEqual(jsonPathMatch(extremeData, "$.arr[-3:-1]"), "30", "negative start and negative end slice returns first match");
    assertEqual(jsonPathMatch(extremeData, "$.arr[-1:-4:-1]"), "50", "negative step reverse slice with negative indices");
    assertEqual(jsonPathMatch(extremeData, "$.arr[10:20]"), null, "slice out of bounds positive returns null");
    assertEqual(jsonPathMatch(extremeData, "$.arr[-20:-10]"), null, "slice out of bounds negative returns null");
    assertEqual(jsonPathMatch(extremeData, "$.arr[3:1]"), null, "slice with start > end on positive step returns null");
    assertEqual(jsonPathMatch(extremeData, "$.arr[1:3:-1]"), null, "slice with start < end on negative step returns null");
    assertEqual(jsonPathMatch(extremeData, "$.arr[::999]"), "10", "huge step returns first element");
    assertEqual(jsonPathMatch(extremeData, "$.arr[::-999]"), "50", "huge negative step returns last element");
    assertEqual(jsonPathMatch(extremeData, "$.arr[0:5:0]"), null, "zero step slice is invalid and returns null");

    // Recursive traversal with deep combinations
    assertEqual(jsonPathMatch(extremeData, "$..sub[1].val"), "d2", "recursive descent with trailing index and prop");
    assertEqual(jsonPathMatch(extremeData, "$..sub[*].val"), "d1", "recursive descent into array wildcard");
    assertEqual(jsonPathMatch(extremeData, "$..['tab\\there']"), "tab-val", "recursive descent with escaped bracket key");
    assertEqual(jsonPathMatch(extremeData, "$..['a.b.c']"), "dotted-prop", "recursive descent matching property with dots");

    // Malformed syntax variations (must strictly return null without crashing)
    assertEqual(jsonPathMatch(extremeData, "$."), null, "path with only dot returns null");
    assertEqual(jsonPathMatch(extremeData, "$.."), null, "path with only double dot returns null");
    assertEqual(jsonPathMatch(extremeData, "$["), null, "unclosed root bracket returns null");
    assertEqual(jsonPathMatch(extremeData, "$]"), null, "unopened bracket returns null");
    assertEqual(jsonPathMatch(extremeData, "$['unclosed"), null, "unclosed quote inside bracket returns null");
    assertEqual(jsonPathMatch(extremeData, "$.arr[1 2]"), null, "space separated numbers in bracket returns null");
    assertEqual(jsonPathMatch(extremeData, "$.arr[1,2]"), null, "comma separated numbers in bracket returns null");
    assertEqual(jsonPathMatch(extremeData, "$.arr[1:2:3:4]"), null, "three colons in slice returns null");
    assertEqual(jsonPathMatch(extremeData, "$...arr"), null, "triple dot returns null");
    assertEqual(jsonPathMatch(extremeData, "$.arr.0"), null, "dot property on array does not index into array");
    assertEqual(jsonPathMatch(extremeData, "$.arr[0]"), "10", "bracket indexing retrieves array element");
    assertEqual(jsonPathMatch(extremeData, "$..*.*"), "item0", "chained wildcards return first match");

    console.log(`SUCCESS: All jsonPathMatch tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: jsonPathMatch test failed!`, err);
    process.exit(1);
}
