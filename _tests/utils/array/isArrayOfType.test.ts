declare const process: any;
import { isArrayOfType } from "../../../src/utils/array";

try {
    if (!isArrayOfType([1, 2, 3], "number")) throw new Error("Expected [1, 2, 3] to be of type 'number'");
    if (isArrayOfType([1, 2, null], "number")) throw new Error("Expected [1, 2, null] to not be of type 'number'");
    if (isArrayOfType([1, "2", 3], "number")) throw new Error("Expected [1, '2', 3] to not be of type 'number'");

    if (!isArrayOfType(["a", "b", "c"], "string")) throw new Error("Expected ['a', 'b', 'c'] to be of type 'string'");
    if (isArrayOfType(["a", "b", null], "string")) throw new Error("Expected ['a', 'b', null] to not be of type 'string'");
    if (isArrayOfType(["a", 1, "c"], "string")) throw new Error("Expected ['a', 1, 'c'] to not be of type 'string'");

    if (!isArrayOfType([true, false], "boolean")) throw new Error("Expected [true, false] to be of type 'boolean'");
    if (isArrayOfType([true, false, null], "boolean")) throw new Error("Expected [true, false, null] to not be of type 'boolean'");

    if (!isArrayOfType([new Date()], "date")) throw new Error("Expected Date array to be of type 'date'");
    if (isArrayOfType([new Date(), null], "date")) throw new Error("Expected Date array with null to not be of type 'date'");

    if (!isArrayOfType([{ a: 1 }, { b: 2 }], "object")) throw new Error("Expected Object array to be of type 'object'");
    if (isArrayOfType([{ a: 1 }, null], "object")) throw new Error("Expected Object array with null to not be of type 'object'");

    const isEven = (v: any) => typeof v === "number" && v % 2 === 0;
    if (!isArrayOfType([2, 4, 6], isEven)) throw new Error("Expected [2, 4, 6] to satisfy isEven");
    if (isArrayOfType([2, 5, 6], isEven)) throw new Error("Expected [2, 5, 6] to not satisfy isEven");

    class TestClass { }
    class SubClass extends TestClass { }
    class OtherClass { }
    const obj1 = new TestClass();
    const obj2 = new SubClass();
    const obj3 = new OtherClass();
    if (!isArrayOfType([obj1, obj2], TestClass)) throw new Error("Expected [obj1, obj2] to be of class TestClass");
    if (isArrayOfType([obj1, obj3], TestClass)) throw new Error("Expected [obj1, obj3] to not be of class TestClass");

    if (isArrayOfType(42, "number")) throw new Error("Expected scalar to fail isArrayOfType");

    if (!isArrayOfType([1, "2", "3"], "number", { mode: "some" })) throw new Error("Expected [1, '2', '3'] to have some 'number'");
    if (isArrayOfType(["1", "2", "3"], "number", { mode: "some" })) throw new Error("Expected ['1', '2', '3'] to not have some 'number'");

    if (!isArrayOfType([1, 2, null, 3], "number", { allowNulls: true })) throw new Error("Expected [1, 2, null, 3] to match 'number' with allowNulls");
    if (!isArrayOfType([], "number")) throw new Error("Expected empty array to match by default");
    if (isArrayOfType([], "number", { allowEmpty: false })) throw new Error("Expected empty array to fail with allowEmpty: false");

    // Tests for new types: "int", "regexp", "symbol", "array"
    if (!isArrayOfType([1, 2, 0, -10], "int")) throw new Error("Expected [1, 2, 0, -10] to be of type 'int'");
    if (isArrayOfType([1, 2.5, 3], "int")) throw new Error("Expected [1, 2.5, 3] to not be of type 'int'");

    if (!isArrayOfType([/abc/i, new RegExp("xyz")], "regexp")) throw new Error("Expected RegExp array to be of type 'regexp'");
    if (isArrayOfType([/abc/, "not-a-regex"], "regexp")) throw new Error("Expected mixed regex array to not be of type 'regexp'");

    if (!isArrayOfType([[1, 2], ["x", "y"], new Uint8Array([1])], "array")) throw new Error("Expected array of arrays to be of type 'array'");
    if (isArrayOfType([[1, 2], "not-an-array"], "array")) throw new Error("Expected mixed array to not be of type 'array'");

    console.log("✓ isArrayOfType tests passed!");
} catch (err: any) {
    console.error(`❌ isArrayOfType test failed: ${err.message}`);
    process.exit(1);
}
