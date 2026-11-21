declare const process: any;
import { createSafeJsonReplacer } from "../../../src/utils/json";
import { InvalidArgumentError, IOStreamError } from "../../../src/exceptions";

console.log("=========================================");
console.log("STARTING CREATESAFEJSONREPLACER TESTS...");
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
    // 41. createSafeJsonReplacer with bigintStrategy ("string" vs "number")
    const bigIntObj = {
        safeNumber: 123n,
        unsafeLarge: 9007199254740999n,
        negativeSafe: -50n
    };

    const strReplacer = createSafeJsonReplacer({ bigintStrategy: "string" });
    const strSerialized = JSON.parse(JSON.stringify(bigIntObj, strReplacer));
    assertEqual(strSerialized.safeNumber, "123", "safe BigInt serializes to string when bigintStrategy=string");
    assertEqual(strSerialized.unsafeLarge, "9007199254740999", "large BigInt serializes to string when bigintStrategy=string");

    const numReplacer = createSafeJsonReplacer({ bigintStrategy: "number" });
    const numSerialized = JSON.parse(JSON.stringify(bigIntObj, numReplacer));
    assertEqual(numSerialized.safeNumber, 123, "safe BigInt serializes to number when bigintStrategy=number");
    assertEqual(numSerialized.negativeSafe, -50, "negative safe BigInt serializes to number when bigintStrategy=number");
    assertEqual(numSerialized.unsafeLarge, "9007199254740999", "unsafe large BigInt falls back to string to preserve precision when bigintStrategy=number");

    // 42. Boxed BigInt Object(123n) serialization via unboxPrimitiveObj
    const boxedObj = { boxed: Object(BigInt(456)) };
    const boxedSerialized = JSON.parse(JSON.stringify(boxedObj, numReplacer));
    assertEqual(boxedSerialized.boxed, 456, "boxed BigInt Object(456n) unboxed and serialized to number");

    // 43. Circular Reference Handling (handleCircular: true vs custom onCircular)
    const circularObj: any = { name: "root" };
    circularObj.self = circularObj;
    circularObj.nested = { parent: circularObj };

    const defaultCircReplacer = createSafeJsonReplacer({ handleCircular: true });
    const circSerialized = JSON.parse(JSON.stringify(circularObj, defaultCircReplacer));
    assertEqual(circSerialized.name, "root", "serializes non-circular fields on circular structure");
    assertEqual(circSerialized.self, "[Circular]", "default circular placeholder string applied");
    assertEqual(circSerialized.nested.parent, "[Circular]", "nested circular reference replaced with [Circular]");

    const customCircReplacer = createSafeJsonReplacer({
        handleCircular: true,
        onCircular: (_k, v) => ({ $ref: `#/${v.name}` })
    });
    const customCircSerialized = JSON.parse(JSON.stringify(circularObj, customCircReplacer));
    assertEqual(customCircSerialized.self, { $ref: "#/root" }, "custom onCircular callback override works");

    // 44. Set, Map, RegExp, and TypedArray Serialization
    const complexStructures = {
        setVal: new Set([1, 2, 3]),
        mapVal: new Map([["k1", "v1"], ["k2", "v2"]]),
        regexVal: /test-[a-z]+/gi,
        typedArr: new Uint8Array([10, 20, 30])
    };
    const defaultComplexReplacer = createSafeJsonReplacer();
    const serializedComplex = JSON.parse(JSON.stringify(complexStructures, defaultComplexReplacer));
    assertEqual(serializedComplex.setVal, [1, 2, 3], "Set serialized to Array");
    assertEqual(serializedComplex.mapVal, [["k1", "v1"], ["k2", "v2"]], "Map serialized to Array of entries");
    assertEqual(serializedComplex.regexVal, "/test-[a-z]+/gi", "RegExp serialized to string format");
    assertEqual(serializedComplex.typedArr, [10, 20, 30], "Uint8Array serialized to number array");

    // 45. Date formatting: custom onDate vs formatDate vs default ISO string
    const testDate = new Date("2026-05-20T12:00:00.000Z");
    const dateObjContainer = { d: testDate };

    const defaultDateRep = createSafeJsonReplacer();
    assertEqual(JSON.parse(JSON.stringify(dateObjContainer, defaultDateRep)).d, "2026-05-20T12:00:00.000Z", "default Date serialized as ISO string");

    const customFormatDateRep = createSafeJsonReplacer({
        formatDate: (d) => `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`
    });
    assertEqual(JSON.parse(JSON.stringify(dateObjContainer, customFormatDateRep)).d, "2026-5", "formatDate callback produces custom date string");

    const onDatePrecedenceRep = createSafeJsonReplacer({
        formatDate: () => "IGNORED",
        onDate: (d) => ({ timestamp: d.getTime() })
    });
    assertEqual(JSON.parse(JSON.stringify(dateObjContainer, onDatePrecedenceRep)).d, { timestamp: 1779278400000 }, "onDate takes precedence over formatDate");

    // 46. Error Objects Serialization (name, message, stack vs custom onError)
    const errObj = { error: new TypeError("Invalid argument supplied") };
    const errRep = createSafeJsonReplacer();
    const serializedErr = JSON.parse(JSON.stringify(errObj, errRep));
    assertEqual(serializedErr.error.name, "TypeError", "Error name preserved");
    assertEqual(serializedErr.error.message, "Invalid argument supplied", "Error message preserved");
    assert(serializedErr.error.stack === undefined || typeof serializedErr.error.stack === "string", "Error stack trace is string or undefined");

    const customErrRep = createSafeJsonReplacer({
        onError: (e) => `[ERR: ${e.name} - ${e.message}]`
    });
    assertEqual(JSON.parse(JSON.stringify(errObj, customErrRep)).error, "[ERR: TypeError - Invalid argument supplied]", "custom onError callback formats error");

    // 47. URLSearchParams Serialization
    const paramsObj = { query: new URLSearchParams("page=2&sort=desc&tag=a&tag=b") };
    const paramsRep = createSafeJsonReplacer();
    assertEqual(JSON.parse(JSON.stringify(paramsObj, paramsRep)).query, "page=2&sort=desc&tag=a&tag=b", "URLSearchParams serialized to query string");

    // 48. Voiding default Replacements (voidSetReplacement, voidMapReplacement, voidRegExpReplacement, etc.)
    const voidReplacer = createSafeJsonReplacer({
        voidSetReplacement: true,
        voidMapReplacement: true,
        voidRegExpReplacement: true,
        voidDateReplacement: true,
        voidBigIntReplacement: true
    });
    const voidTestObj = {
        set: new Set([1]),
        map: new Map([["a", 1]]),
        reg: /abc/,
        date: new Date("2026-01-01T00:00:00.000Z")
    };
    const voidSerialized = JSON.parse(JSON.stringify(voidTestObj, voidReplacer));
    assertEqual(voidSerialized.set, {}, "voidSetReplacement leaves Set as raw object ({})");
    assertEqual(voidSerialized.map, {}, "voidMapReplacement leaves Map as raw object ({})");
    assertEqual(voidSerialized.reg, {}, "voidRegExpReplacement leaves RegExp as raw object ({})");
    assertEqual(voidSerialized.date, "2026-01-01T00:00:00.000Z", "voidDateReplacement falls back to native Date.prototype.toJSON");

    // 49. Whitelist Array filtering vs custom function replacer composition
    const multiKeyObj = { a: 1, b: 2, c: 3, d: 4 };
    const whitelistRep = createSafeJsonReplacer({ replacer: ["a", "c"] });
    assertEqual(JSON.parse(JSON.stringify(multiKeyObj, whitelistRep)), { a: 1, c: 3 }, "array whitelist filters out unlisted keys");

    const composedFnRep = createSafeJsonReplacer({
        replacer: (k, v) => (k === "b" ? v * 10 : v)
    });
    assertEqual(JSON.parse(JSON.stringify(multiKeyObj, composedFnRep)), { a: 1, b: 20, c: 3, d: 4 }, "custom function replacer mutates target key");

    // 50. onCustom catch-all handler execution order
    const customTypeObj = { symbolKey: "SPECIAL_MARKER", other: 100 };
    const customCatchAllRep = createSafeJsonReplacer({
        onCustom: (_k, v) => {
            if (v === "SPECIAL_MARKER") return { transformed: true };
            return v;
        }
    });
    assertEqual(JSON.parse(JSON.stringify(customTypeObj, customCatchAllRep)), { symbolKey: { transformed: true }, other: 100 }, "onCustom transforms matched values");

    // 51. Basic & BigInt Serialization Strategies
    const bigintObj = { big: 9007199254740991n, huge: 9007199254740999n };

    // 51a. BigInt default ("string")
    assertEqual(
        JSON.stringify(bigintObj, createSafeJsonReplacer()),
        '{"big":"9007199254740991","huge":"9007199254740999"}',
        "converts BigInts to string by default"
    );

    // 51b. BigInt "number" strategy (safe int -> number, unsafe int -> string fallback)
    assertEqual(
        JSON.stringify(bigintObj, createSafeJsonReplacer({ bigintStrategy: "number" })),
        '{"big":9007199254740991,"huge":"9007199254740999"}',
        "converts safe BigInt to number and unsafe BigInt to string"
    );

    // 51c. BigInt custom onBigInt hook
    assertEqual(
        JSON.stringify({ val: 42n }, createSafeJsonReplacer({ onBigInt: (b) => `BI:${b}` })),
        '{"val":"BI:42"}',
        "custom onBigInt override format"
    );

    // 51d. BigInt voidBigIntReplacement flag
    let threwBigIntVoid = false;
    try {
        JSON.stringify({ val: 42n }, createSafeJsonReplacer({ voidBigIntReplacement: true }));
    } catch (e: any) {
        threwBigIntVoid = e instanceof TypeError;
    }
    assert(threwBigIntVoid, "voidBigIntReplacement causes native BigInt TypeError");

    // 52. Collection Serializations (Map & Set)
    // 52a. Set conversion to array
    const setObj = { tags: new Set(["a", "b", "c"]) };
    assertEqual(
        JSON.stringify(setObj, createSafeJsonReplacer()),
        '{"tags":["a","b","c"]}',
        "serializes Set to Array"
    );

    // 52b. Map conversion to entries array
    const mapObj = { lookup: new Map([["key1", 1], ["key2", 2]]) };
    assertEqual(
        JSON.stringify(mapObj, createSafeJsonReplacer()),
        '{"lookup":[["key1",1],["key2",2]]}',
        "serializes Map to array of key-value pairs"
    );

    // 52c. Nested and Empty Maps/Sets
    assertEqual(
        JSON.stringify({ emptySet: new Set(), emptyMap: new Map() }, createSafeJsonReplacer()),
        '{"emptySet":[],"emptyMap":[]}',
        "serializes empty Set and Map"
    );

    // 53. TypedArray & Buffer Serializations
    const typedArrayObj = {
        u8: new Uint8Array([1, 2, 3]),
        i32: new Int32Array([10, -20, 30]),
        f64: new Float64Array([1.5, 2.5])
    };
    assertEqual(
        JSON.stringify(typedArrayObj, createSafeJsonReplacer()),
        '{"u8":[1,2,3],"i32":[10,-20,30],"f64":[1.5,2.5]}',
        "serializes TypedArrays into number arrays"
    );

    // 54. RegExp, URLSearchParams, & Error Objects
    // 54a. RegExp to string
    assertEqual(
        JSON.stringify({ pattern: /abc/gi }, createSafeJsonReplacer()),
        '{"pattern":"/abc/gi"}',
        "serializes RegExp to string representation"
    );

    // 54b. URLSearchParams to query string
    const searchParams = new URLSearchParams({ search: "query", page: "1" });
    assertEqual(
        JSON.stringify({ params: searchParams }, createSafeJsonReplacer()),
        '{"params":"search=query&page=1"}',
        "serializes URLSearchParams to standard string"
    );

    // 54c. Error object serialization (prevents empty {})
    const errObjBattery = new Error("Database failed");
    const serializedErrBattery = JSON.parse(JSON.stringify({ error: errObjBattery }, createSafeJsonReplacer()));
    assertEqual(serializedErrBattery.error.name, "Error", "preserves error name");
    assertEqual(serializedErrBattery.error.message, "Database failed", "preserves error message");
    assert(serializedErrBattery.error.stack === undefined || typeof serializedErrBattery.error.stack === "string", "stack trace is string or undefined");

    // 55. Date Formatting & Invalid Date Handling
    // 55a. Valid Date with custom formatDate
    const fixedDate = new Date("2026-08-16T12:00:00.000Z");
    assertEqual(
        JSON.stringify({ date: fixedDate }, createSafeJsonReplacer({
            formatDate: (d) => `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`
        })),
        '{"date":"2026-8"}',
        "applies custom formatDate"
    );

    // 55b. onDate custom override
    assertEqual(
        JSON.stringify({ date: fixedDate }, createSafeJsonReplacer({
            onDate: (d) => ({ timestamp: d.getTime() })
        })),
        `{"date":{"timestamp":${fixedDate.getTime()}}}`,
        "applies onDate object override"
    );

    // 55c. Invalid Date (new Date(NaN))
    const invalidDate = new Date(NaN);
    assertEqual(
        JSON.stringify({ date: invalidDate }, createSafeJsonReplacer()),
        '{"date":null}',
        "safely serializes invalid Date without throwing RangeError"
    );

    // 56. Circular Reference Handling
    // 56a. Direct Self-Reference
    const selfCircular: any = { name: "Root" };
    selfCircular.self = selfCircular;
    assertEqual(
        JSON.stringify(selfCircular, createSafeJsonReplacer({ handleCircular: true })),
        '{"name":"Root","self":"[Circular]"}',
        "replaces direct self-circular reference with [Circular]"
    );

    // 56b. Deep/Mutual Circular Reference
    const nodeA: any = { id: "A" };
    const nodeB: any = { id: "B", toA: nodeA };
    nodeA.toB = nodeB;
    assertEqual(
        JSON.stringify(nodeA, createSafeJsonReplacer({ handleCircular: true })),
        '{"id":"A","toB":{"id":"B","toA":"[Circular]"}}',
        "replaces mutual circular reference with [Circular]"
    );

    // 56c. Custom onCircular replacer
    assertEqual(
        JSON.stringify(selfCircular, createSafeJsonReplacer({
            handleCircular: true,
            onCircular: (_k, v) => `<Ref to ${v.name}>`
        })),
        '{"name":"Root","self":"<Ref to Root>"}',
        "uses custom onCircular formatter"
    );

    // 56d. Repeated (Non-Circular) Identical Object References (Deduplicated as [Circular] by WeakSet replacer)
    const sharedLeaf = { leaf: true };
    const dagObj = { left: sharedLeaf, right: sharedLeaf };
    assertEqual(
        JSON.stringify(dagObj, createSafeJsonReplacer({ handleCircular: true })),
        '{"left":{"leaf":true},"right":"[Circular]"}',
        "treats repeated object instances as circular references in single pass"
    );

    // 56e. Circular Array Reference
    const circularArr: any = [1, 2];
    circularArr.push(circularArr);
    assertEqual(
        JSON.stringify(circularArr, createSafeJsonReplacer({ handleCircular: true })),
        '[1,2,"[Circular]"]',
        "handles circular references inside arrays"
    );

    // 57. Whitelist & User Replacer Interoperability
    // 57a. Array Whitelist filtering
    const multiKeyObjBattery = { a: 1, b: 2, c: 3 };
    assertEqual(
        JSON.stringify(multiKeyObjBattery, createSafeJsonReplacer({ replacer: ["a", "c"] })),
        '{"a":1,"c":3}',
        "filters object keys using array whitelist"
    );

    // 57b. Numeric vs String Whitelist keys
    assertEqual(
        JSON.stringify({ 0: "zero", 1: "one", test: "no" }, createSafeJsonReplacer({ replacer: [0, "1"] })),
        '{"0":"zero","1":"one"}',
        "matches numeric and string whitelist keys seamlessly"
    );

    // 57c. User Replacer Function returning undefined (Key Deletion)
    assertEqual(
        JSON.stringify({ secret: "hidden", public: "visible" }, createSafeJsonReplacer({
            replacer: (k, v) => (k === "secret" ? undefined : v)
        })),
        '{"public":"visible"}',
        "user replacer can strip keys by returning undefined"
    );

    // 58. Boxed Primitives (String, Number, Boolean, BigInt)
    const boxedObjBattery = {
        str: new String("boxed text"),
        num: new Number(42),
        bool: new Boolean(false),
        big: Object(100n)
    };
    assertEqual(
        JSON.stringify(boxedObjBattery, createSafeJsonReplacer()),
        '{"str":"boxed text","num":42,"bool":false,"big":"100"}',
        "unboxes String, Number, Boolean, and BigInt object wrappers"
    );

    // 59. Replacer Instance Re-use & State Isolation
    const sharedReplacerInstance = createSafeJsonReplacer({ handleCircular: true });
    const payload1: any = { id: 1 };
    payload1.self = payload1;
    const payload2: any = { id: 2 };
    payload2.self = payload2;

    const res1 = JSON.stringify(payload1, sharedReplacerInstance);
    const res2 = JSON.stringify(payload2, sharedReplacerInstance);
    assertEqual(res1, '{"id":1,"self":"[Circular]"}', "first serialization succeeds with circular check");
    assertEqual(res2, '{"id":2,"self":"[Circular]"}', "second run on same replacer instance resets seen cache cleanly");

    // 60. onCustom Hook Hierarchy
    // 60a. Intercepting custom classes
    class Point {
        constructor(public x: number, public y: number) { }
    }
    const customObjPoint = { pt: new Point(10, 20) };
    assertEqual(
        JSON.stringify(customObjPoint, createSafeJsonReplacer({
            onCustom: (_k, v) => (v instanceof Point ? `(${v.x},${v.y})` : v)
        })),
        '{"pt":"(10,20)"}',
        "onCustom catches and serializes custom class instances"
    );

    // 60b. onCustom returning undefined (property omission)
    assertEqual(
        JSON.stringify({ removeMe: "bad", keepMe: "good" }, createSafeJsonReplacer({
            onCustom: (_k, v) => (v === "bad" ? undefined : v)
        })),
        '{"keepMe":"good"}',
        "onCustom returning undefined omits property"
    );

    // 61. Edge Values & Prototype Security
    // 61a. Object with Object.create(null) (No Prototype)
    const nullProtoObj = Object.create(null);
    nullProtoObj.key = "val";
    nullProtoObj.big = 50n;
    assertEqual(
        JSON.stringify({ item: nullProtoObj }, createSafeJsonReplacer()),
        '{"item":{"key":"val","big":"50"}}',
        "handles objects without prototype (Object.create(null))"
    );

    // 61b. Negative Zero, NaN, Infinity
    assertEqual(
        JSON.stringify({ negZero: -0, nan: NaN, inf: Infinity }, createSafeJsonReplacer()),
        '{"negZero":0,"nan":null,"inf":null}',
        "maintains standard JSON serialization for IEEE-754 edge numbers"
    );

    // 61c. Objects with overridden toJSON methods
    const objWithToJSON = {
        data: "raw",
        toJSON() {
            return { transformed: true, big: 99n };
        }
    };
    assertEqual(
        JSON.stringify({ custom: objWithToJSON }, createSafeJsonReplacer()),
        '{"custom":{"transformed":true,"big":"99"}}',
        "safely processes BigInts produced by native toJSON() methods"
    );

    // 62. Remaining `void*Replacement` Flags
    assertEqual(
        JSON.stringify({ set: new Set([1, 2]), map: new Map([["a", 1]]) }, createSafeJsonReplacer({
            voidSetReplacement: true,
            voidMapReplacement: true
        })),
        '{"set":{},"map":{}}',
        "voidSetReplacement and voidMapReplacement fall back to native empty object serialization"
    );

    assertEqual(
        JSON.stringify({ u8: new Uint8Array([1, 2]) }, createSafeJsonReplacer({ voidTypedArrayReplacement: true })),
        '{"u8":{"0":1,"1":2}}',
        "voidTypedArrayReplacement falls back to native typed array serialization"
    );

    assertEqual(
        JSON.stringify({ reg: /xyz/ }, createSafeJsonReplacer({ voidRegExpReplacement: true })),
        '{"reg":{}}',
        "voidRegExpReplacement falls back to native RegExp serialization"
    );

    assertEqual(
        JSON.stringify({ date: new Date("2026-01-01T00:00:00.000Z") }, createSafeJsonReplacer({ voidDateReplacement: true })),
        '{"date":"2026-01-01T00:00:00.000Z"}',
        "voidDateReplacement allows native toJSON to handle Date"
    );

    // 63. Type-Specific Custom Overrides
    assertEqual(
        JSON.stringify({ bytes: new Uint8Array([0xde, 0xad]) }, createSafeJsonReplacer({
            onTypedArray: (arr) => Array.from(arr).map((b: any) => b.toString(16)).join("")
        })),
        '{"bytes":"dead"}',
        "onTypedArray custom formatter"
    );

    assertEqual(
        JSON.stringify({ tags: new Set(["a", "b"]) }, createSafeJsonReplacer({
            onSet: (s) => ({ size: s.size, values: Array.from(s) })
        })),
        '{"tags":{"size":2,"values":["a","b"]}}',
        "onSet custom formatter"
    );

    assertEqual(
        JSON.stringify({ lookup: new Map([["a", 1], ["b", 2]]) }, createSafeJsonReplacer({
            onMap: (m) => Object.fromEntries(m)
        })),
        '{"lookup":{"a":1,"b":2}}',
        "onMap custom object transformer"
    );

    assertEqual(
        JSON.stringify({ re: /hello/i }, createSafeJsonReplacer({
            onRegExp: (r) => ({ source: r.source, flags: r.flags })
        })),
        '{"re":{"source":"hello","flags":"i"}}',
        "onRegExp custom structured object transformer"
    );

    assertEqual(
        JSON.stringify({ err: new TypeError("bad type") }, createSafeJsonReplacer({
            onError: (e) => `[${e.name}] ${e.message}`
        })),
        '{"err":"[TypeError] bad type"}',
        "onError custom string formatter"
    );

    assertEqual(
        JSON.stringify({ q: new URLSearchParams("a=1&b=2") }, createSafeJsonReplacer({
            onURLSearchParams: (usp) => Object.fromEntries(usp)
        })),
        '{"q":{"a":"1","b":"2"}}',
        "onURLSearchParams custom transformer"
    );

    // 64. Nested & Deeply Nested Collections Containing BigInts / Special Values
    const complexNested = {
        setOfBigInts: new Set([10n, 20n]),
        mapWithSets: new Map([["items", new Set([1n, 2n])]]),
        arrayOfErrors: [new Error("E1")]
    };
    const complexSerialized = JSON.parse(JSON.stringify(complexNested, createSafeJsonReplacer()));
    assertEqual(complexSerialized.setOfBigInts, ["10", "20"], "safely traverses BigInts inside Sets");
    assertEqual(complexSerialized.mapWithSets, [["items", ["1", "2"]]], "safely traverses Sets of BigInts inside Maps");
    assertEqual(complexSerialized.arrayOfErrors[0].message, "E1", "safely traverses Error objects inside Arrays");

    // 65. Array Whitelist and Array Handling
    const objWithArray = { keep: [1, 2, 3], drop: "skip" };
    assertEqual(
        JSON.stringify(objWithArray, createSafeJsonReplacer({ replacer: ["keep"] })),
        '{"keep":[1,2,3]}',
        "whitelist filters top-level keys without discarding inner array indices"
    );

    assertEqual(
        JSON.stringify({ bigA: 100n, bigB: 200n }, createSafeJsonReplacer({ replacer: ["bigA"] })),
        '{"bigA":"100"}',
        "whitelist preserves BigInt serialization on allowed keys"
    );

    // 66. `this` Context Binding & Top-Level Value Handling
    let rootContainerSeen = false;
    JSON.stringify({ a: 1 }, createSafeJsonReplacer({
        replacer(k, v) {
            if (k === "a" && this.a === 1) rootContainerSeen = true;
            return v;
        }
    }));
    assert(rootContainerSeen, "replacer correctly binds `this` to container object");

    assertEqual(
        JSON.stringify(123n, createSafeJsonReplacer()),
        '"123"',
        "handles top-level primitive BigInt serialization directly"
    );

    assertEqual(
        JSON.stringify(new Set([1, 2]), createSafeJsonReplacer()),
        '[1,2]',
        "handles top-level Set passed directly to JSON.stringify"
    );

    // 67. Sparse Arrays & Symbol-keyed Properties
    const sparseArr = [1, , 3]; // eslint-disable-line no-sparse-arrays
    assertEqual(
        JSON.stringify(sparseArr, createSafeJsonReplacer()),
        '[1,null,3]',
        "sparse array empty slots serialize to null"
    );

    const symKey = Symbol("test");
    const symKeyObj = { [symKey]: "symbolValue", regular: "normal" };
    assertEqual(
        JSON.stringify(symKeyObj, createSafeJsonReplacer()),
        '{"regular":"normal"}',
        "symbol-keyed properties are cleanly ignored"
    );

    // 68. Additional Edge Cases for createSafeJsonReplacer
    // A. Top-level primitive / object variants
    assertEqual(
        JSON.stringify(null, createSafeJsonReplacer()),
        'null',
        "handles top-level null"
    );
    assertEqual(
        JSON.stringify(true, createSafeJsonReplacer()),
        'true',
        "handles top-level boolean true"
    );
    assertEqual(
        JSON.stringify(false, createSafeJsonReplacer()),
        'false',
        "handles top-level boolean false"
    );
    assertEqual(
        JSON.stringify(42, createSafeJsonReplacer()),
        '42',
        "handles top-level number"
    );
    assertEqual(
        JSON.stringify("hello", createSafeJsonReplacer()),
        '"hello"',
        "handles top-level string"
    );
    assertEqual(
        JSON.stringify(new Map([["x", 10], ["y", 20]]), createSafeJsonReplacer()),
        '[["x",10],["y",20]]',
        "handles top-level Map passed directly"
    );
    assertEqual(
        JSON.stringify(/abc/g, createSafeJsonReplacer()),
        '"/abc/g"',
        "handles top-level RegExp passed directly"
    );
    assertEqual(
        JSON.stringify(new Uint8Array([1, 2, 3]), createSafeJsonReplacer()),
        '[1,2,3]',
        "handles top-level Uint8Array passed directly"
    );
    assertEqual(
        JSON.stringify(new Int32Array([100, 200]), createSafeJsonReplacer()),
        '[100,200]',
        "handles top-level Int32Array passed directly"
    );

    // B. BigInt safe integer boundary cases with bigintStrategy: "number"
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER); // 9007199254740991n
    const minSafe = BigInt(Number.MIN_SAFE_INTEGER); // -9007199254740991n
    const overMaxSafe = maxSafe + 1n;
    const underMinSafe = minSafe - 1n;

    assertEqual(
        JSON.stringify({ maxSafe, minSafe, overMaxSafe, underMinSafe }, createSafeJsonReplacer({ bigintStrategy: "number" })),
        `{"maxSafe":9007199254740991,"minSafe":-9007199254740991,"overMaxSafe":"9007199254740992","underMinSafe":"-9007199254740992"}`,
        "bigintStrategy number converts in-range safe BigInts to numbers and out-of-range BigInts to strings"
    );

    assertEqual(
        JSON.stringify({ zero: 0n, negZero: -0n }, createSafeJsonReplacer({ bigintStrategy: "number" })),
        '{"zero":0,"negZero":0}',
        "bigintStrategy number handles 0n correctly"
    );

    // C. Objects with custom .toJSON() returning non-standard types
    const objToBigInt = { toJSON: () => 999n };
    assertEqual(
        JSON.stringify({ nested: objToBigInt }, createSafeJsonReplacer()),
        '{"nested":"999"}',
        "handles .toJSON() returning a BigInt"
    );

    const objToSet = { toJSON: () => new Set(["alpha", "beta"]) };
    assertEqual(
        JSON.stringify({ nested: objToSet }, createSafeJsonReplacer()),
        '{"nested":["alpha","beta"]}',
        "handles .toJSON() returning a Set"
    );

    const objToMap = { toJSON: () => new Map([["key", "val"]]) };
    assertEqual(
        JSON.stringify({ nested: objToMap }, createSafeJsonReplacer()),
        '{"nested":[["key","val"]]}',
        "handles .toJSON() returning a Map"
    );

    // D. onCustom context, returning undefined to omit property, returning primitive, returning object
    let onCustomThisChecks: any[] = [];
    const customContextObj = { propA: "testA", propB: 123, propDrop: "remove" };
    const customResult = JSON.stringify(customContextObj, createSafeJsonReplacer({
        onCustom(k, v) {
            onCustomThisChecks.push({ k, v, hasSelf: this?.propA === "testA" });
            if (k === "propDrop") return undefined;
            if (k === "propA") return "MODIFIED_" + v;
            return v;
        }
    }));
    assertEqual(
        customResult,
        '{"propA":"MODIFIED_testA","propB":123}',
        "onCustom correctly modifies values and omits undefined returns"
    );
    assert(
        onCustomThisChecks.some(c => c.k === "propA" && c.hasSelf),
        "onCustom receives correct `this` binding"
    );

    // E. DAG vs. Circular graphs (multiple references without cycle)
    const leaf = { name: "sharedLeaf", val: 42 };
    const dag = { branchA: { item: leaf }, branchB: { item: leaf }, direct: leaf };
    assertEqual(
        JSON.stringify(dag, createSafeJsonReplacer({ handleCircular: true })),
        '{"branchA":{"item":{"name":"sharedLeaf","val":42}},"branchB":{"item":"[Circular]"},"direct":"[Circular]"}',
        "DAG with shared nodes is deduplicated by single-pass WeakSet circular detection"
    );

    // Multiple independent cycles in different branches
    const cycle1: any = { id: 1 };
    cycle1.self = cycle1;
    const cycle2: any = { id: 2 };
    cycle2.self = cycle2;
    const multiCycle = { first: cycle1, second: cycle2 };
    assertEqual(
        JSON.stringify(multiCycle, createSafeJsonReplacer({ handleCircular: true })),
        '{"first":{"id":1,"self":"[Circular]"},"second":{"id":2,"self":"[Circular]"}}',
        "handles multiple independent circular structures in one object tree"
    );

    // Circular array referencing itself
    const selfArr: any[] = [1, 2];
    selfArr.push(selfArr);
    assertEqual(
        JSON.stringify({ list: selfArr }, createSafeJsonReplacer({ handleCircular: true })),
        '{"list":[1,2,"[Circular]"]}',
        "handles circular array nested inside object"
    );

    // Custom onCircular handler
    assertEqual(
        JSON.stringify({ list: selfArr }, createSafeJsonReplacer({
            handleCircular: true,
            onCircular: (k) => `<CYCLE_AT_${k}>`
        })),
        '{"list":[1,2,"<CYCLE_AT_2>"]}',
        "custom onCircular receives key and returns custom placeholder"
    );

    // F. Nested array whitelist filtering behavior
    const deepWhitelistObj = {
        includeMe: [{ subA: 1, subB: 2 }, { subA: 3, subB: 4 }],
        ignoreMe: { subA: 5 }
    };
    assertEqual(
        JSON.stringify(deepWhitelistObj, createSafeJsonReplacer({ replacer: ["includeMe", "subA"] })),
        '{"includeMe":[{"subA":1},{"subA":3}]}',
        "whitelist preserves elements inside arrays while filtering sub-properties"
    );

    // G. Boxed primitive objects (String, Number, Boolean)
    const boxedObjs = {
        str: new String("boxedStr"),
        num: new Number(42),
        bool: new Boolean(true)
    };
    assertEqual(
        JSON.stringify(boxedObjs, createSafeJsonReplacer()),
        '{"str":"boxedStr","num":42,"bool":true}',
        "unboxes String, Number, Boolean wrapper objects"
    );

    // H. Special float values (NaN, Infinity, -Infinity)
    assertEqual(
        JSON.stringify({ a: NaN, b: Infinity, c: -Infinity }, createSafeJsonReplacer()),
        '{"a":null,"b":null,"c":null}',
        "NaN and Infinity serialize to null according to standard JSON spec"
    );


    console.log(`SUCCESS: All createSafeJsonReplacer tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: createSafeJsonReplacer test failed!`, err);
    process.exit(1);
}
