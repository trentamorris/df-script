declare const process: any;
import { isTypedArrayConstructor } from "../../../src/utils/object";

console.log("=========================================");
console.log("STARTING ISTYPEDARRAYCONSTRUCTOR TESTS...");
console.log("=========================================");

let testsPassed = 0;

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`Assertion failed: ${msg}`);
    testsPassed++;
}

try {
    // 1. All standard typed array constructors should pass
    assert(isTypedArrayConstructor(Float64Array), "Float64Array should be recognized");
    assert(isTypedArrayConstructor(Float32Array), "Float32Array should be recognized");
    assert(isTypedArrayConstructor(Int32Array), "Int32Array should be recognized");
    assert(isTypedArrayConstructor(Int16Array), "Int16Array should be recognized");
    assert(isTypedArrayConstructor(Int8Array), "Int8Array should be recognized");
    assert(isTypedArrayConstructor(Uint32Array), "Uint32Array should be recognized");
    assert(isTypedArrayConstructor(Uint16Array), "Uint16Array should be recognized");
    assert(isTypedArrayConstructor(Uint8Array), "Uint8Array should be recognized");
    assert(isTypedArrayConstructor(Uint8ClampedArray), "Uint8ClampedArray should be recognized");
    assert(isTypedArrayConstructor(BigInt64Array), "BigInt64Array should be recognized");
    assert(isTypedArrayConstructor(BigUint64Array), "BigUint64Array should be recognized");

    // 2. Subclasses of TypedArrays should pass (inherit from %TypedArray%)
    class CustomFloat64Array extends Float64Array {}
    class CustomUint8Array extends Uint8Array {}
    assert(isTypedArrayConstructor(CustomFloat64Array), "CustomFloat64Array subclass should be recognized");
    assert(isTypedArrayConstructor(CustomUint8Array), "CustomUint8Array subclass should be recognized");

    // 3. Non-typed array constructors should fail
    assert(!isTypedArrayConstructor(Array), "Array should fail");
    assert(!isTypedArrayConstructor(ArrayBuffer), "ArrayBuffer should fail");
    assert(!isTypedArrayConstructor(SharedArrayBuffer), "SharedArrayBuffer should fail");
    assert(!isTypedArrayConstructor(DataView), "DataView should fail");
    assert(!isTypedArrayConstructor(Date), "Date should fail");
    assert(!isTypedArrayConstructor(RegExp), "RegExp should fail");
    assert(!isTypedArrayConstructor(Map), "Map should fail");
    assert(!isTypedArrayConstructor(Set), "Set should fail");
    assert(!isTypedArrayConstructor(WeakMap), "WeakMap should fail");
    assert(!isTypedArrayConstructor(WeakSet), "WeakSet should fail");
    assert(!isTypedArrayConstructor(Promise), "Promise should fail");
    assert(!isTypedArrayConstructor(Object), "Object should fail");
    assert(!isTypedArrayConstructor(Function), "Function should fail");
    assert(!isTypedArrayConstructor(Boolean), "Boolean should fail");
    assert(!isTypedArrayConstructor(String), "String should fail");
    assert(!isTypedArrayConstructor(Number), "Number should fail");
    assert(!isTypedArrayConstructor(Symbol), "Symbol should fail");
    assert(!isTypedArrayConstructor(BigInt), "BigInt should fail");
    assert(!isTypedArrayConstructor(Error), "Error should fail");
    assert(!isTypedArrayConstructor(TypeError), "TypeError should fail");

    // 4. Custom non-typed array user classes and functions
    class CustomClass {}
    class SubCustomClass extends CustomClass {}
    assert(!isTypedArrayConstructor(CustomClass), "CustomClass should fail");
    assert(!isTypedArrayConstructor(SubCustomClass), "SubCustomClass should fail");
    assert(!isTypedArrayConstructor(() => {}), "Arrow function should fail");
    assert(!isTypedArrayConstructor(function normalFn() {}), "Regular function should fail");
    assert(!isTypedArrayConstructor(async function asyncFn() {}), "Async function should fail");
    assert(!isTypedArrayConstructor(function* genFn() {}), "Generator function should fail");

    // 5. Spoofed prototype attacks and edge-case prototypes
    const fakeCtor = function () {};
    fakeCtor.prototype = Object.create(Float64Array.prototype);
    assert(!isTypedArrayConstructor(fakeCtor), "Function with spoofed instance prototype should fail (ctor does not inherit from %TypedArray%)");

    const fakeObjWithProto = Object.create(Object.getPrototypeOf(Uint8Array));
    assert(!isTypedArrayConstructor(fakeObjWithProto), "Plain object inheriting %TypedArray% should fail (not a function)");

    // 6. Instances, buffers, and views should fail
    assert(!isTypedArrayConstructor(new Float64Array(10)), "Float64Array instance should fail");
    assert(!isTypedArrayConstructor(new Uint8Array([1, 2, 3])), "Uint8Array instance should fail");
    assert(!isTypedArrayConstructor(new ArrayBuffer(16)), "ArrayBuffer instance should fail");
    assert(!isTypedArrayConstructor(new DataView(new ArrayBuffer(16))), "DataView instance should fail");
    assert(!isTypedArrayConstructor([1, 2, 3]), "Array instance should fail");

    // 7. Primitives, null, undefined, Symbols, BigInts
    assert(!isTypedArrayConstructor(null), "null should fail");
    assert(!isTypedArrayConstructor(undefined), "undefined should fail");
    assert(!isTypedArrayConstructor(123), "number should fail");
    assert(!isTypedArrayConstructor(NaN), "NaN should fail");
    assert(!isTypedArrayConstructor(Infinity), "Infinity should fail");
    assert(!isTypedArrayConstructor(true), "true should fail");
    assert(!isTypedArrayConstructor(false), "false should fail");
    assert(!isTypedArrayConstructor("Float64Array"), "string should fail");
    assert(!isTypedArrayConstructor(Symbol("Float64Array")), "Symbol should fail");
    assert(!isTypedArrayConstructor(100n), "bigint should fail");

    // 8. Null prototype objects & proxy objects
    assert(!isTypedArrayConstructor(Object.create(null)), "Object.create(null) should fail");
    const proxiedCtor = new Proxy(Float64Array, {});
    assert(isTypedArrayConstructor(proxiedCtor), "Transparent proxy over Float64Array should pass");

    console.log(`SUCCESS: All isTypedArrayConstructor edge case tests passed! (${testsPassed} assertions)`);
} catch (err: any) {
    console.error(`FAILED: isTypedArrayConstructor test failed: ${err.message}`);
    process.exit(1);
}
