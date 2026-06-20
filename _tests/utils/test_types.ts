declare const process: any;
import { isArrayOfType, toValidArray, toValidStringArray, getUniqueArrayStats, joinArray, sortArray, computeMedian, computeQuantile, computeMode } from "../../src/utils/array";
import { toValidNumber, toValidFloat, formatNumber, isValidFloat } from "../../src/utils/number";
import { isScalar } from "../../src/utils/guards";
import { $df } from "../../src/index";


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

    // Test getUniqueArrayStats


    // Non-strict uniqueness and frequencies test
    const stats1 = getUniqueArrayStats([1, 2, 2, 3, 3, 3]);
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
    const stats2 = getUniqueArrayStats([objA, objB, objC], { strict: true });
    // Since strict: true and no custom keySelector is provided, it uses toCanonicalString.
    // { id: 1 } and { id: 1 } serialize to the same string, so they should group together.
    if (stats2.count !== 2) throw new Error("Expected strict count to be 2");
    if (stats2.values.length !== 2) throw new Error("Expected strict 2 unique values");
    if (!stats2.frequencies) throw new Error("Expected strict frequencies map to be populated");
    if (stats2.frequencies.get(objA) !== 2) throw new Error("Expected strict freq of objA to be 2");
    if (stats2.frequencies.get(objC) !== 1) throw new Error("Expected strict freq of objC to be 1");

    // Custom keySelector test
    const stats3 = getUniqueArrayStats(
        [{ name: "apple" }, { name: "banana" }, { name: "apple" }],
        { strict: true, keySelector: (x: any) => x.name }
    );
    if (stats3.count !== 2) throw new Error("Expected custom selector count to be 2");

    // Test joinArray


    // 1. Basic join with default separator
    if (joinArray([1, 2, 3]) !== "1,2,3") throw new Error("Expected '1,2,3'");
    
    // 2. Custom separator
    if (joinArray(["a", "b", "c"], " - ") !== "a - b - c") throw new Error("Expected 'a - b - c'");

    // 3. Nulls handled as empty strings by default (ignoreNulls: false)
    if (joinArray([1, null, 2, undefined, 3], "-") !== "1--2--3") throw new Error("Expected '1--2--3'");

    // 4. Nulls ignored completely (ignoreNulls: true)
    if (joinArray([1, null, 2, undefined, 3], "-", { ignoreNulls: true }) !== "1-2-3") throw new Error("Expected '1-2-3'");

    // 5. Custom nullValue
    if (joinArray([1, null, 2, undefined, 3], "-", { nullValue: "NULL" }) !== "1-NULL-2-NULL-3") throw new Error("Expected '1-NULL-2-NULL-3'");

    // 6. Prefix and suffix
    if (joinArray([1, 2, 3], ",", { prefix: "[", suffix: "]" }) !== "[1,2,3]") throw new Error("Expected '[1,2,3]'");

    // 7. Limit truncation
    if (joinArray([1, 2, 3, 4], ",", { limit: 2 }) !== "1,2...") throw new Error("Expected '1,2...'");
    if (joinArray([1, 2, 3, 4], ",", { limit: 2, truncationMarker: " (truncated)" }) !== "1,2 (truncated)") throw new Error("Expected '1,2 (truncated)'");
    if (joinArray([1, 2, 3], ",", { limit: 5 }) !== "1,2,3") throw new Error("Expected '1,2,3' when limit is greater than length");
    if (joinArray([1, 2, 3], ",", { limit: 0 }) !== "...") throw new Error("Expected '...' when limit is 0");

    // 8. Custom valueFormatter
    if (joinArray([1, 2, 3], ",", { valueFormatter: (x) => `v${x}` }) !== "v1,v2,v3") throw new Error("Expected 'v1,v2,v3'");
    if (joinArray([1, 2, 3], ",", { valueFormatter: (x, i) => `${x}:${i}` }) !== "1:0,2:1,3:2") throw new Error("Expected '1:0,2:1,3:2'");

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
    if (toValidFloat("12.3", { floatPrecision: "Float32" }) !== Math.fround(12.3)) throw new Error("toValidFloat precision option failed");
    if (toValidFloat("Infinity", { allowNonFiniteNumbers: false }) !== null) throw new Error("toValidFloat allowNonFiniteNumbers: false failed");

    // 10. Test dynamic schema type inference
    const testSchema = {
        id: $df.DataType.Int32,
        name: $df.DataType.Utf8,
        active: $df.DataType.Boolean,
        tags: $df.DataType.Array($df.DataType.Utf8),
        info: $df.DataType.Struct({
            val: $df.DataType.Int32
        })
    };
    const inferredSchemaDf = $df.data([], testSchema);
    type ExpectedRow = {
        id: number | null;
        name: string | null;
        active: boolean | null;
        tags: (string | null)[] | null;
        info: { val: number | null } | null;
    };
    const rows: ExpectedRow[] = inferredSchemaDf.to_dicts();
    if (!Array.isArray(rows)) throw new Error("Expected rows to be an array");

    // Test sortArray and stats functions
    // 1. sortArray numeric array with nulls
    const sortedNumAsc = sortArray([3, null, 1, 4, undefined, 2]);
    if (sortedNumAsc[0] !== 1 || sortedNumAsc[1] !== 2 || sortedNumAsc[2] !== 3 || sortedNumAsc[3] !== 4 || sortedNumAsc[4] !== null || sortedNumAsc[5] !== undefined) {
        throw new Error("sortArray numeric ascending failed: " + JSON.stringify(sortedNumAsc));
    }
    const sortedNumDesc = sortArray([3, null, 1, 4, undefined, 2], { descending: true });
    if (sortedNumDesc[0] !== 4 || sortedNumDesc[1] !== 3 || sortedNumDesc[2] !== 2 || sortedNumDesc[3] !== 1 || sortedNumDesc[4] !== null || sortedNumDesc[5] !== undefined) {
        throw new Error("sortArray numeric descending failed: " + JSON.stringify(sortedNumDesc));
    }

    // 2. sortArray string array with nulls
    const sortedStrAsc = sortArray(["banana", null, "apple", "cherry", undefined]);
    if (sortedStrAsc[0] !== "apple" || sortedStrAsc[1] !== "banana" || sortedStrAsc[2] !== "cherry" || sortedStrAsc[3] !== null || sortedStrAsc[4] !== undefined) {
        throw new Error("sortArray string ascending failed: " + JSON.stringify(sortedStrAsc));
    }
    const sortedStrDesc = sortArray(["banana", null, "apple", "cherry", undefined], { descending: true });
    if (sortedStrDesc[0] !== "cherry" || sortedStrDesc[1] !== "banana" || sortedStrDesc[2] !== "apple" || sortedStrDesc[3] !== null || sortedStrDesc[4] !== undefined) {
        throw new Error("sortArray string descending failed: " + JSON.stringify(sortedStrDesc));
    }


    // 3. sortArray TypedArray
    const sortedTyped = sortArray(new Int32Array([10, -5, 20]));
    if (sortedTyped[0] !== -5 || sortedTyped[1] !== 10 || sortedTyped[2] !== 20) {
        throw new Error("sortArray TypedArray failed: " + JSON.stringify(sortedTyped));
    }
    const sortedTypedDesc = sortArray(new Int32Array([10, -5, 20]), { descending: true });
    if (sortedTypedDesc[0] !== 20 || sortedTypedDesc[1] !== 10 || sortedTypedDesc[2] !== -5) {
        throw new Error("sortArray TypedArray descending failed: " + JSON.stringify(sortedTypedDesc));
    }

    // 4. stats functions
    const medianVal = computeMedian([1, 5, 2, 4, 3]);
    if (medianVal !== 3) throw new Error("computeMedian odd length failed: " + medianVal);
    const medianValEven = computeMedian([1, 5, 2, 4, 3, 6]);
    if (medianValEven !== 3.5) throw new Error("computeMedian even length failed: " + medianValEven);

    const quantileVal = computeQuantile([1, 2, 3, 4, 5], 0.25);
    if (quantileVal !== 2) throw new Error("computeQuantile failed: " + quantileVal);

    const modeVal = computeMode(["apple", "banana", "apple", "cherry"]);
    if (modeVal?.length !== 1 || modeVal[0] !== "apple") throw new Error("computeMode failed: " + JSON.stringify(modeVal));

    // strictNumericString tests
    if (toValidNumber("1_2_3", { strictNumericString: true }) !== null) {
        throw new Error("Expected strictNumericString option to reject '1_2_3'");
    }
    if (toValidNumber("1_2_3") !== 123) {
        throw new Error("Expected toValidNumber to clean '1_2_3' to 123 by default");
    }

    // formatNonFinite tests
    const f1 = formatNumber({ fallback: "INVALID_VAL", formatNonFinite: true });
    if (f1(Infinity) !== "INVALID_VAL") {
        throw new Error("Expected formatNonFinite to return fallback for Infinity");
    }
    const f2 = formatNumber({ fallback: "INVALID_VAL" });
    if (f2(Infinity) !== "Infinity") {
        throw new Error("Expected formatNumber to format Infinity as string by default");
    }

    // Float32 range/Infinity tests
    if (isValidFloat(1e50, { floatPrecision: "Float32" }) !== false) {
        throw new Error("Expected Float32 range overflow (Infinity) to be rejected by isValidFloat");
    }
    if (isValidFloat(1e30, { floatPrecision: "Float32" }) !== true) {
        throw new Error("Expected representable Float32 to be accepted by isValidFloat");
    }

    // Test isScalar
    if (!isScalar("hello")) throw new Error("Expected string to be scalar");
    if (!isScalar(42)) throw new Error("Expected number to be scalar");
    if (!isScalar(true)) throw new Error("Expected boolean to be scalar");
    if (!isScalar(10n)) throw new Error("Expected bigint to be scalar");
    if (!isScalar(new Date())) throw new Error("Expected valid Date object to be scalar");
    if (!isScalar(new Uint8Array([1, 2]))) throw new Error("Expected Uint8Array to be scalar");

    // Test NaN and non-finite numbers
    if (isScalar(NaN)) throw new Error("Expected NaN to not be scalar");
    if (!isScalar(Infinity)) throw new Error("Expected Infinity to be scalar");

    // Test cross-realm robust Uint8Array & Date
    const vm = require("vm");
    const crossRealmUint8 = vm.runInNewContext("new Uint8Array([1, 2])");
    if (!isScalar(crossRealmUint8)) throw new Error("Expected cross-realm Uint8Array to be scalar");
    const crossRealmDate = vm.runInNewContext("new Date()");
    if (!isScalar(crossRealmDate)) throw new Error("Expected cross-realm Date to be scalar");
    const crossRealmInvalidDate = vm.runInNewContext("new Date('invalid')");
    if (isScalar(crossRealmInvalidDate)) throw new Error("Expected cross-realm invalid Date to not be scalar");

    // Test boxed primitive wrappers
    if (!isScalar(new String("boxed string"))) throw new Error("Expected boxed String to be scalar");
    if (!isScalar(new Number(42))) throw new Error("Expected boxed Number to be scalar");
    if (!isScalar(new Boolean(true))) throw new Error("Expected boxed Boolean to be scalar");
    if (isScalar(new Number(NaN))) throw new Error("Expected boxed NaN to not be scalar");

    if (isScalar(null)) throw new Error("Expected null to not be scalar");
    if (isScalar(undefined)) throw new Error("Expected undefined to not be scalar");
    if (isScalar(new Date("invalid"))) throw new Error("Expected invalid Date object to not be scalar");
    if (isScalar([1, 2, 3])) throw new Error("Expected array to not be scalar");
    if (isScalar({ a: 1 })) throw new Error("Expected object to not be scalar");
    if (isScalar(new Int16Array([1, 2]))) throw new Error("Expected Int16Array to not be scalar");

    console.log("🎉 ALL UTILS TYPES TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("❌ UTILS TYPES TESTS FAILED:", err);
    process.exit(1);
}
