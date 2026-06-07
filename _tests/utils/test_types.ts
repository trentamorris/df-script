declare const process: any;
import { isArrayOfType, toValidArray, toValidStringArray, getUniqueListStats, joinList } from "../../src/utils/list";
import { toValidNumber, toValidFloat } from "../../src/utils/number";


console.log("=========================================");
console.log("STARTING UTILS TYPES TESTS...");
console.log("=========================================");

try {
    // Test numbers
    if (!isArrayOfType([1, 2, 3], "number")) throw new Error("Expected [1, 2, 3] to be of type 'number'");
    if (isArrayOfType([1, 2, null], "number")) throw new Error("Expected [1, 2, null] to not be of type 'number'");
    if (isArrayOfType([1, "2", 3], "number")) throw new Error("Expected [1, '2', 3] to not be of type 'number'");

    // Test strings
    if (!isArrayOfType(["a", "b", "c"], "string")) throw new Error("Expected ['a', 'b', 'c'] to be of type 'string'");
    if (isArrayOfType(["a", "b", null], "string")) throw new Error("Expected ['a', 'b', null] to not be of type 'string'");
    if (isArrayOfType(["a", 1, "c"], "string")) throw new Error("Expected ['a', 1, 'c'] to not be of type 'string'");

    // Test booleans
    if (!isArrayOfType([true, false], "boolean")) throw new Error("Expected [true, false] to be of type 'boolean'");
    if (isArrayOfType([true, false, null], "boolean")) throw new Error("Expected [true, false, null] to not be of type 'boolean'");
    if (isArrayOfType([true, 0], "boolean")) throw new Error("Expected [true, 0] to not be of type 'boolean'");

    // Test dates
    if (!isArrayOfType([new Date()], "date")) throw new Error("Expected Date array to be of type 'date'");
    if (isArrayOfType([new Date(), null], "date")) throw new Error("Expected Date array with null to not be of type 'date'");
    if (isArrayOfType([new Date(), "invalid"], "date")) throw new Error("Expected mixed Date/string array to not be of type 'date'");

    // Test objects
    if (!isArrayOfType([{ a: 1 }, { b: 2 }], "object")) throw new Error("Expected Object array to be of type 'object'");
    if (isArrayOfType([{ a: 1 }, null], "object")) throw new Error("Expected Object array with null to not be of type 'object'");
    if (isArrayOfType([{ a: 1 }, 123], "object")) throw new Error("Expected mixed Object/number array to not be of type 'object'");

    // Test custom predicate
    const isEven = (v: any) => typeof v === "number" && v % 2 === 0;
    if (!isArrayOfType([2, 4, 6], isEven)) throw new Error("Expected [2, 4, 6] to satisfy isEven");
    if (isArrayOfType([2, 5, 6], isEven)) throw new Error("Expected [2, 5, 6] to not satisfy isEven");

    function isEvenFunc(v: any) { return typeof v === "number" && v % 2 === 0; }
    if (!isArrayOfType([2, 4, 6], isEvenFunc)) throw new Error("Expected [2, 4, 6] to satisfy isEvenFunc");

    // Test constructor / class support
    class TestClass {}
    class SubClass extends TestClass {}
    class OtherClass {}
    const obj1 = new TestClass();
    const obj2 = new SubClass();
    const obj3 = new OtherClass();
    if (!isArrayOfType([obj1, obj2], TestClass)) throw new Error("Expected [obj1, obj2] to be of class TestClass");
    if (isArrayOfType([obj1, obj3], TestClass)) throw new Error("Expected [obj1, obj3] to not be of class TestClass");

    // Test invalid array input
    if (isArrayOfType(42, "number")) throw new Error("Expected scalar to fail isArrayOfType");

    // Test mode: "some"
    if (!isArrayOfType([1, "2", "3"], "number", { mode: "some" })) throw new Error("Expected [1, '2', '3'] to have some 'number'");
    if (isArrayOfType(["1", "2", "3"], "number", { mode: "some" })) throw new Error("Expected ['1', '2', '3'] to not have some 'number'");
    if (isArrayOfType([null, null], "number", { mode: "some" })) throw new Error("Expected [null, null] to not have some 'number'");
    if (!isArrayOfType([null, 42], "number", { mode: "some" })) throw new Error("Expected [null, 42] to have some 'number'");

    // Test mode: "some" with custom predicate
    if (!isArrayOfType([1, 5, 6], isEven, { mode: "some" })) throw new Error("Expected [1, 5, 6] to have some even number");
    if (isArrayOfType([1, 5, 7], isEven, { mode: "some" })) throw new Error("Expected [1, 5, 7] to not have some even number");

    // Test options.allowNulls: true
    if (!isArrayOfType([1, 2, null, 3], "number", { allowNulls: true })) throw new Error("Expected [1, 2, null, 3] to match 'number' with allowNulls");
    if (!isArrayOfType(["a", null, "b"], "string", { allowNulls: true })) throw new Error("Expected ['a', null, 'b'] to match 'string' with allowNulls");
    if (!isArrayOfType([true, null, false], "boolean", { allowNulls: true })) throw new Error("Expected [true, null, false] to match 'boolean' with allowNulls");

    // Test options.allowEmpty
    if (!isArrayOfType([], "number")) throw new Error("Expected empty array to match by default");
    if (isArrayOfType([], "number", { allowEmpty: false })) throw new Error("Expected empty array to fail with allowEmpty: false");
    if (isArrayOfType([], "number", { mode: "some", allowEmpty: true })) throw new Error("Expected empty array to still fail 'some' even with allowEmpty: true");

    // Test toValidArray & toValidStringArray

    
    // toValidArray tests
    const arrNull = toValidArray(null);
    if (!Array.isArray(arrNull) || arrNull.length !== 0) throw new Error("Expected null to return empty array");
    
    const arrUndef = toValidArray(undefined);
    if (!Array.isArray(arrUndef) || arrUndef.length !== 0) throw new Error("Expected undefined to return empty array");
    
    const inputArr = [1, 2, 3];
    const arrCopied = toValidArray(inputArr);
    if (arrCopied === inputArr) throw new Error("Expected array input to return a new shallow copy reference");
    if (arrCopied.length !== 3 || arrCopied[0] !== 1 || arrCopied[1] !== 2 || arrCopied[2] !== 3) {
        throw new Error("Expected shallow copy to contain same elements");
    }
    
    const typedArr = new Int32Array([10, 20]);
    const arrFromTyped = toValidArray(typedArr as any);
    if (!Array.isArray(arrFromTyped) || arrFromTyped[0] !== 10 || arrFromTyped[1] !== 20) {
        throw new Error("Expected typed array to be converted to standard array");
    }
    
    const scalarVal = 42;
    const arrScalar = toValidArray(scalarVal);
    if (!Array.isArray(arrScalar) || arrScalar.length !== 1 || arrScalar[0] !== 42) {
        throw new Error("Expected scalar to be wrapped in a single-element array");
    }

    // toValidStringArray tests
    const strArr1 = toValidStringArray(null);
    if (!Array.isArray(strArr1) || strArr1.length !== 0) throw new Error("Expected toValidStringArray(null) to return []");

    const strArr2 = toValidStringArray([1, "hello", null, undefined]);
    if (strArr2.length !== 4 || strArr2[0] !== "1" || strArr2[1] !== "hello" || strArr2[2] !== "null" || strArr2[3] !== "undefined") {
        throw new Error("Expected elements to be converted to strings");
    }

    // Test getUniqueListStats


    // Non-strict uniqueness and frequencies test
    const stats1 = getUniqueListStats([1, 2, 2, 3, 3, 3]);
    if (stats1.count !== 3) throw new Error("Expected count to be 3");
    if (stats1.values.length !== 3) throw new Error("Expected 3 unique values");
    if (!stats1.frequencies) throw new Error("Expected frequencies map to be populated");
    if (stats1.frequencies.get(1) !== 1) throw new Error("Expected freq of 1 to be 1");
    if (stats1.frequencies.get(2) !== 2) throw new Error("Expected freq of 2 to be 2");
    if (stats1.frequencies.get(3) !== 3) throw new Error("Expected freq of 3 to be 3");

    // Strict uniqueness and frequencies test with objects and nested structures
    const objA = { id: 1 };
    const objB = { id: 1 };
    const objC = { id: 2 };
    const stats2 = getUniqueListStats([objA, objB, objC], { strict: true });
    // Since strict: true and no custom keySelector is provided, it uses toCanonicalString.
    // { id: 1 } and { id: 1 } serialize to the same string, so they should group together.
    if (stats2.count !== 2) throw new Error("Expected strict count to be 2");
    if (stats2.values.length !== 2) throw new Error("Expected strict 2 unique values");
    if (!stats2.frequencies) throw new Error("Expected strict frequencies map to be populated");
    if (stats2.frequencies.get(objA) !== 2) throw new Error("Expected strict freq of objA to be 2");
    if (stats2.frequencies.get(objC) !== 1) throw new Error("Expected strict freq of objC to be 1");

    // Custom keySelector test
    const stats3 = getUniqueListStats(
        [{ name: "apple" }, { name: "banana" }, { name: "apple" }],
        { strict: true, keySelector: (x: any) => x.name }
    );
    if (stats3.count !== 2) throw new Error("Expected custom selector count to be 2");

    // Test joinList


    // 1. Basic join with default separator
    if (joinList([1, 2, 3]) !== "1,2,3") throw new Error("Expected '1,2,3'");
    
    // 2. Custom separator
    if (joinList(["a", "b", "c"], " - ") !== "a - b - c") throw new Error("Expected 'a - b - c'");

    // 3. Nulls handled as empty strings by default (ignoreNulls: false)
    if (joinList([1, null, 2, undefined, 3], "-") !== "1--2--3") throw new Error("Expected '1--2--3'");

    // 4. Nulls ignored completely (ignoreNulls: true)
    if (joinList([1, null, 2, undefined, 3], "-", { ignoreNulls: true }) !== "1-2-3") throw new Error("Expected '1-2-3'");

    // 5. Custom nullValue
    if (joinList([1, null, 2, undefined, 3], "-", { nullValue: "NULL" }) !== "1-NULL-2-NULL-3") throw new Error("Expected '1-NULL-2-NULL-3'");

    // 6. Prefix and suffix
    if (joinList([1, 2, 3], ",", { prefix: "[", suffix: "]" }) !== "[1,2,3]") throw new Error("Expected '[1,2,3]'");

    // 7. Limit truncation
    if (joinList([1, 2, 3, 4], ",", { limit: 2 }) !== "1,2...") throw new Error("Expected '1,2...'");
    if (joinList([1, 2, 3, 4], ",", { limit: 2, truncationMarker: " (truncated)" }) !== "1,2 (truncated)") throw new Error("Expected '1,2 (truncated)'");
    if (joinList([1, 2, 3], ",", { limit: 5 }) !== "1,2,3") throw new Error("Expected '1,2,3' when limit is greater than length");
    if (joinList([1, 2, 3], ",", { limit: 0 }) !== "...") throw new Error("Expected '...' when limit is 0");

    // 8. Custom valueFormatter
    if (joinList([1, 2, 3], ",", { valueFormatter: (x) => `v${x}` }) !== "v1,v2,v3") throw new Error("Expected 'v1,v2,v3'");
    if (joinList([1, 2, 3], ",", { valueFormatter: (x, i) => `${x}:${i}` }) !== "1:0,2:1,3:2") throw new Error("Expected '1:0,2:1,3:2'");

    // 9. toValidNumber and toValidFloat tests


    // toValidNumber checks
    if (toValidNumber(12.3) !== 12.3) throw new Error("toValidNumber(12.3) failed");
    if (toValidNumber(true) !== 1) throw new Error("toValidNumber(true) failed");
    if (toValidNumber(10n) !== 10) throw new Error("toValidNumber(10n) failed");
    if (toValidNumber(new Date(1000)) !== 1000) throw new Error("toValidNumber(Date) failed");
    if (toValidNumber("12.3") !== 12.3) throw new Error("toValidNumber('12.3') failed");
    if (toValidNumber("NaN") !== null) throw new Error("toValidNumber('NaN') should be null");
    if (toValidNumber("Infinity") !== null) throw new Error("toValidNumber('Infinity') should be null");
    if (toValidNumber(Infinity) !== null) throw new Error("toValidNumber(Infinity) should be null");
    if (toValidNumber(NaN) !== null) throw new Error("toValidNumber(NaN) should be null");

    // toValidFloat checks
    if (toValidFloat(12.3) !== 12.3) throw new Error("toValidFloat(12.3) failed");
    if (toValidFloat(true) !== 1) throw new Error("toValidFloat(true) failed");
    if (toValidFloat(10n) !== 10) throw new Error("toValidFloat(10n) failed");
    if (toValidFloat(new Date(1000)) !== 1000) throw new Error("toValidFloat(Date) failed");
    if (toValidFloat("12.3") !== 12.3) throw new Error("toValidFloat('12.3') failed");
    if (toValidFloat("Infinity") !== Infinity) throw new Error("toValidFloat('Infinity') failed");
    if (toValidFloat("-Infinity") !== -Infinity) throw new Error("toValidFloat('-Infinity') failed");
    if (toValidFloat(Infinity) !== Infinity) throw new Error("toValidFloat(Infinity) failed");
    if (!Number.isNaN(toValidFloat("NaN") as number)) throw new Error("toValidFloat('NaN') should return NaN");
    if (!Number.isNaN(toValidFloat(NaN) as number)) throw new Error("toValidFloat(NaN) should return NaN");
    if (toValidFloat("invalid") !== null) throw new Error("toValidFloat('invalid') should return null");

    // toValidFloat options checks
    if (toValidFloat("12.3", { precision: "Float32" }) !== Math.fround(12.3)) throw new Error("toValidFloat precision option failed");
    if (toValidFloat("Infinity", { allowNonFiniteNumbers: false }) !== null) throw new Error("toValidFloat allowNonFiniteNumbers: false failed");

    console.log("🎉 ALL UTILS TYPES TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("❌ UTILS TYPES TESTS FAILED:", err);
    process.exit(1);
}
