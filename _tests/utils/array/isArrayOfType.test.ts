declare const process: any;
import { isArrayOfType } from "../../../src/utils/array";

try {
    // 1. Basic Type Validation - Every Mode
    if (!isArrayOfType([1, 2, 3], "number")) throw new Error("Expected [1, 2, 3] to be of type 'number'");
    if (isArrayOfType([1, 2, null], "number")) throw new Error("Expected [1, 2, null] to not be of type 'number'");
    if (isArrayOfType([1, "2", 3], "number")) throw new Error("Expected [1, '2', 3] to not be of type 'number'");
    if (isArrayOfType([1, NaN, 3], "number")) throw new Error("Expected [1, NaN, 3] to not be valid 'number'");
    if (isArrayOfType([1, Infinity, 3], "number")) throw new Error("Expected [1, Infinity, 3] to not be valid 'number'");
    if (isArrayOfType([1, -Infinity, 3], "number")) throw new Error("Expected [1, -Infinity, 3] to not be valid 'number'");

    if (!isArrayOfType(["a", "b", "c"], "string")) throw new Error("Expected ['a', 'b', 'c'] to be of type 'string'");
    if (isArrayOfType(["a", "b", null], "string")) throw new Error("Expected ['a', 'b', null] to not be of type 'string'");
    if (isArrayOfType(["a", 1, "c"], "string")) throw new Error("Expected ['a', 1, 'c'] to not be of type 'string'");

    if (!isArrayOfType([true, false], "boolean")) throw new Error("Expected [true, false] to be of type 'boolean'");
    if (isArrayOfType([true, false, null], "boolean")) throw new Error("Expected [true, false, null] to not be of type 'boolean'");
    if (isArrayOfType([true, 1, false], "boolean")) throw new Error("Expected [true, 1, false] to not be of type 'boolean'");

    if (!isArrayOfType([1n, 2n, 0n], "bigint")) throw new Error("Expected [1n, 2n, 0n] to be 'bigint'");
    if (isArrayOfType([1n, 2, 0n], "bigint")) throw new Error("Expected [1n, 2, 0n] to not be 'bigint'");

    if (!isArrayOfType([new Date(), new Date(0)], "date")) throw new Error("Expected Date array to be of type 'date'");
    if (isArrayOfType([new Date(), null], "date")) throw new Error("Expected Date array with null to not be of type 'date'");
    if (isArrayOfType([new Date("invalid-date")], "date")) throw new Error("Expected invalid Date to fail 'date'");

    if (!isArrayOfType([{ a: 1 }, { b: 2 }], "object")) throw new Error("Expected Object array to be of type 'object'");
    if (isArrayOfType([{ a: 1 }, null], "object")) throw new Error("Expected Object array with null to not be of type 'object'");

    if (!isArrayOfType([{ a: 1 }, Object.create(null)], "plainObject")) throw new Error("Expected plainObject array");
    if (isArrayOfType([new Date()], "plainObject")) throw new Error("Expected Date to not be plainObject");

    // 2. "null", "undefined", "nullish", "any" types
    if (!isArrayOfType([null, null], "null")) throw new Error("Expected [null, null] to be 'null'");
    if (isArrayOfType([null, undefined], "null")) throw new Error("Expected [null, undefined] to not be 'null'");

    if (!isArrayOfType([undefined, undefined], "undefined")) throw new Error("Expected [undefined] to be 'undefined'");
    if (isArrayOfType([undefined, null], "undefined")) throw new Error("Expected [undefined, null] to not be 'undefined'");

    if (!isArrayOfType([null, undefined, null], "nullish")) throw new Error("Expected [null, undefined] to be 'nullish'");
    if (isArrayOfType([null, 0], "nullish")) throw new Error("Expected [null, 0] to not be 'nullish'");
    if (isArrayOfType([null, ""], "nullish")) throw new Error("Expected [null, ''] to not be 'nullish'");

    if (!isArrayOfType([1, "a", null, undefined, {}], "any")) throw new Error("Expected any to accept everything");

    // 3. Custom Predicate Functions & Function edge cases
    const isEven = (v: any) => typeof v === "number" && v % 2 === 0;
    if (!isArrayOfType([2, 4, 6], isEven)) throw new Error("Expected [2, 4, 6] to satisfy isEven");
    if (isArrayOfType([2, 5, 6], isEven)) throw new Error("Expected [2, 5, 6] to not satisfy isEven");

    // Predicate returning truthy/falsy non-boolean
    const truthyVal = (v: any) => v ? 1 : 0;
    if (!isArrayOfType([10, "yes", {}], truthyVal)) throw new Error("Expected truthy non-boolean return to pass predicate");
    if (isArrayOfType([10, 0, {}], truthyVal)) throw new Error("Expected falsy 0 return to fail predicate");

    // 4. Class Prototypes & Subclasses (isClass path)
    class TestClass { }
    class SubClass extends TestClass { }
    class OtherClass { }
    const obj1 = new TestClass();
    const obj2 = new SubClass();
    const obj3 = new OtherClass();
    if (!isArrayOfType([obj1, obj2], TestClass)) throw new Error("Expected [obj1, obj2] to be of class TestClass");
    if (isArrayOfType([obj1, obj3], TestClass)) throw new Error("Expected [obj1, obj3] to not be of class TestClass");
    if (isArrayOfType([obj1, null], TestClass)) throw new Error("Expected null item to fail class check without allowNulls");
    if (!isArrayOfType([obj1, null, obj2], TestClass, { allowNulls: true })) throw new Error("Expected null item to pass class check with allowNulls");

    // Built-in class constructors (Date, RegExp, Error)
    if (!isArrayOfType([new Date(), new Date()], Date)) throw new Error("Expected Date instances to pass Date constructor");
    if (isArrayOfType([new Date(), "2025-01-01"], Date)) throw new Error("Expected string date to fail Date constructor instance check");
    if (!isArrayOfType([new Error("a"), new TypeError("b")], Error)) throw new Error("Expected Error and TypeError to pass Error class");

    // 5. Typed Array Constructors as Target Type (isTypedArrayConstructor path)
    if (!isArrayOfType([10, 20, 30.5], Float64Array)) throw new Error("Expected numbers to match Float64Array constructor");
    if (isArrayOfType([10, "not-a-number"], Float64Array)) throw new Error("Expected non-number to fail Float64Array constructor");
    if (isArrayOfType([10, NaN], Float64Array)) throw new Error("Expected NaN to fail Float64Array constructor check");
    if (!isArrayOfType(new Float64Array([1, 2, 3]), Float64Array)) throw new Error("Expected typed array instance to match Float64Array");
    if (!isArrayOfType([0, 255], Uint8Array)) throw new Error("Expected numbers to match Uint8Array constructor");
    if (!isArrayOfType([10n, 20n], BigInt64Array)) throw new Error("Expected numbers to match BigInt64Array constructor");

    // 6. Non-Array / Scalar Inputs Guard
    if (isArrayOfType(42, "number")) throw new Error("Expected scalar number to fail isArrayOfType");
    if (isArrayOfType("hello", "string")) throw new Error("Expected string primitive to fail isArrayOfType");
    if (isArrayOfType(null, "null")) throw new Error("Expected null scalar to fail isArrayOfType");
    if (isArrayOfType(undefined, "undefined")) throw new Error("Expected undefined scalar to fail isArrayOfType");
    if (isArrayOfType({ length: 2, 0: "a", 1: "b" }, "string")) throw new Error("Expected array-like plain object to fail isArrayOfType");

    // 7. Mode: "some" vs "every"
    if (!isArrayOfType([1, "2", "3"], "number", { mode: "some" })) throw new Error("Expected [1, '2', '3'] to have some 'number'");
    if (isArrayOfType(["1", "2", "3"], "number", { mode: "some" })) throw new Error("Expected ['1', '2', '3'] to not have some 'number'");
    if (!isArrayOfType([null, "hello", 123], "number", { mode: "some" })) throw new Error("Expected some number");
    if (!isArrayOfType([null, undefined], "number", { mode: "some", allowNulls: true })) throw new Error("Expected some match with allowNulls");

    // 8. allowNulls: true Edge Cases
    if (!isArrayOfType([1, 2, null, 3], "number", { allowNulls: true })) throw new Error("Expected [1, 2, null, 3] to match 'number' with allowNulls");
    if (!isArrayOfType([1, 2, undefined, 3], "number", { allowNulls: true })) throw new Error("Expected undefined to be allowed under allowNulls (nullish)");
    if (isArrayOfType([1, 2, "not-null-or-number", 3], "number", { allowNulls: true })) throw new Error("Expected invalid non-null item to fail with allowNulls");

    // 9. allowEmpty: true vs false
    if (!isArrayOfType([], "number")) throw new Error("Expected empty array to match by default");
    if (isArrayOfType([], "number", { allowEmpty: false })) throw new Error("Expected empty array to fail with allowEmpty: false");
    if (isArrayOfType([], "number", { allowEmpty: false, mode: "some" })) throw new Error("Expected empty array to fail with allowEmpty: false in some mode");
    if (isArrayOfType([], "number", { allowEmpty: true, mode: "some" })) throw new Error("Expected empty array to return false in some mode even if allowEmpty is true");

    // 10. Native Typed Arrays as Input Source
    if (!isArrayOfType(new Int32Array([1, 2, 3]), "int")) throw new Error("Expected Int32Array to match 'int'");
    if (!isArrayOfType(new Float64Array([1.5, 2.5]), "number")) throw new Error("Expected Float64Array to match 'number'");
    if (!isArrayOfType(new Uint8Array([255, 0]), "int")) throw new Error("Expected Uint8Array to match 'int'");

    // 11. "int", "regexp", "array" special contracts
    if (!isArrayOfType([1, 2, 0, -10], "int")) throw new Error("Expected [1, 2, 0, -10] to be of type 'int'");
    if (isArrayOfType([1, 2.5, 3], "int")) throw new Error("Expected [1, 2.5, 3] to not be of type 'int'");
    if (isArrayOfType([1, NaN, 3], "int")) throw new Error("Expected [1, NaN, 3] to not be 'int'");

    if (!isArrayOfType([/abc/i, new RegExp("xyz")], "regexp")) throw new Error("Expected RegExp array to be of type 'regexp'");
    if (isArrayOfType([/abc/, "not-a-regex"], "regexp")) throw new Error("Expected mixed regex array to not be of type 'regexp'");

    if (!isArrayOfType([[1, 2], ["x", "y"], new Uint8Array([1])], "array")) throw new Error("Expected array of arrays to be of type 'array'");
    if (isArrayOfType([[1, 2], "not-an-array"], "array")) throw new Error("Expected mixed array to not be of type 'array'");

    // 12. Sparse Arrays & Holes
    const sparseArr = new Array(3);
    sparseArr[0] = 10;
    sparseArr[2] = 20;
    // sparseArr[1] is a hole (reads as undefined)
    if (isArrayOfType(sparseArr, "number")) throw new Error("Expected sparse array with hole to fail without allowNulls");
    if (!isArrayOfType(sparseArr, "number", { allowNulls: true })) throw new Error("Expected sparse array with hole to pass with allowNulls");

    console.log("✓ isArrayOfType comprehensive edge case tests passed!");
} catch (err: any) {
    console.error(`❌ isArrayOfType test failed: ${err.message}`);
    process.exit(1);
}
