declare const process: any;
declare const require: any;
import { isArrayOfType, toValidArray, toArrayOfType, getUniqueArrayStats, joinArray, sortArray, computeMedian, computeQuantile, computeMode } from "../../src/utils/array";

import { toValidNumber, toValidFloat, formatNumber, isValidFloat, toValidBigInt, isValidBigInt, clamp, roundToScale } from "../../src/utils/number";
import { isValidDateObj, isObj, isRegExp, isSet, isMap, unboxPrimitiveObj } from "../../src/utils/object";
import { toCanonicalString } from "../../src/utils/string";
import { createSafeJsonReplacer } from "../../src/utils/json";
import { ComputeError } from "../../src/exceptions";
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
    class TestClass { }
    class SubClass extends TestClass { }
    class OtherClass { }
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

    // toArrayOfType tests
    const strArr1 = toArrayOfType<string>(null, "string");
    if (!Array.isArray(strArr1) || strArr1.length !== 0) throw new Error("Expected toArrayOfType(null, 'string') to return []");

    const strArr2 = toArrayOfType<string>([1, "hello", null, undefined], "string");
    if (strArr2.length !== 4 || strArr2[0] !== "1" || strArr2[1] !== "hello" || strArr2[2] !== "null" || strArr2[3] !== "undefined") {
        throw new Error("Expected elements to be converted to strings");
    }

    const numArr = toArrayOfType<number>(["10", 20, "30"], "number");
    if (numArr.length !== 3 || numArr[0] !== 10 || numArr[1] !== 20 || numArr[2] !== 30) {
        throw new Error("Expected elements to be converted to numbers");
    }

    const boolArr = toArrayOfType<boolean>([1, 0, ""], "boolean");
    if (boolArr.length !== 3 || boolArr[0] !== true || boolArr[1] !== false || boolArr[2] !== false) {
        throw new Error("Expected elements to be converted to booleans");
    }

    const nullPreserved = toArrayOfType<string | null>([10, null, 20], "string", { allowNulls: true });
    if (nullPreserved.length !== 3 || nullPreserved[0] !== "10" || nullPreserved[1] !== null || nullPreserved[2] !== "20") {
        throw new Error("Expected null to be preserved when allowNulls is true");
    }

    const dateArr = toArrayOfType<Date>(["2025-01-01"], "date");
    if (dateArr.length !== 1 || !(dateArr[0] instanceof Date)) {
        throw new Error("Expected string date to be coerced to Date instance");
    }

    // Edge case test: custom predicate function with toArrayOfType
    const evenNums = toArrayOfType<number>([2, 4, 6], isEven);
    if (evenNums.length !== 3 || evenNums[0] !== 2 || evenNums[1] !== 4 || evenNums[2] !== 6) {
        throw new Error("Expected toArrayOfType with custom predicate function to preserve matching elements");
    }

    const customFnArr = toArrayOfType<number>([1, 2, 3], (v) => (v as number) * 2);
    if (customFnArr.length !== 3 || customFnArr[0] !== 2 || customFnArr[1] !== 4 || customFnArr[2] !== 6) {
        throw new Error("Expected custom transform function to be applied");
    }

    // Additional robust checks for isArrayOfType and toArrayOfType
    if (!isArrayOfType([10n, 20n], "bigint")) throw new Error("isArrayOfType: bigint failed");
    if (isArrayOfType([10n, "abc"], "bigint")) throw new Error("isArrayOfType: mixed bigint string failed");
    const coercedBigInts = toArrayOfType<bigint>(["100", 200n], "bigint");
    if (coercedBigInts[0] !== 100n || coercedBigInts[1] !== 200n) throw new Error("toArrayOfType: bigint coercion failed");

    try {
        toArrayOfType(["hello"], "object", { mode: "every" });
        throw new Error("toArrayOfType: string to object should throw in mode 'every'");
    } catch (e: any) {
        if (!(e instanceof ComputeError)) throw e;
    }

    const filteredObjs = toArrayOfType<Record<string, any>>(["hello", { a: 1 }], "object", { mode: "some" });
    if (filteredObjs.length !== 1 || filteredObjs[0].a !== 1) throw new Error("toArrayOfType: object filtering in mode 'some' failed");

    const int32Arr = new Int32Array([10, 20, 30]);
    if (!isArrayOfType(int32Arr, "number")) throw new Error("isArrayOfType: Int32Array failed");
    const coercedFromTyped = toArrayOfType<number>(int32Arr, "number");
    if (coercedFromTyped.length !== 3 || coercedFromTyped[1] !== 20) throw new Error("toArrayOfType: Int32Array failed");

    try {
        toArrayOfType(["abc", "def"], "number", { mode: "some" });
        throw new Error("toArrayOfType: mode 'some' with 0 matches should throw");
    } catch (e: any) {
        if (!(e instanceof ComputeError)) throw e;
    }

    // Additional Edge Cases: nullish, plainObject, scalar wrapping, and allowEmpty: false
    if (!isArrayOfType([null, undefined], "nullish")) throw new Error("isArrayOfType: nullish failed");
    if (isArrayOfType([null, 123], "nullish")) throw new Error("isArrayOfType: mixed nullish failed");
    const nullishArr = toArrayOfType([null, undefined], "nullish");
    if (nullishArr.length !== 2 || nullishArr[0] !== null || nullishArr[1] !== null) throw new Error("toArrayOfType: nullish failed");

    if (!isArrayOfType([{ a: 1 }, { b: 2 }], "plainObject")) throw new Error("isArrayOfType: plainObject failed");
    if (isArrayOfType([new Date()], "plainObject")) throw new Error("isArrayOfType: Date instance should not be plainObject");

    if (!isArrayOfType([undefined], "undefined")) throw new Error("isArrayOfType: undefined failed");
    const undefArr = toArrayOfType([undefined], "undefined");
    if (undefArr.length !== 1 || undefArr[0] !== undefined) throw new Error("toArrayOfType: undefined failed");

    const scalarWrapped = toArrayOfType(42, "number");
    if (scalarWrapped.length !== 1 || scalarWrapped[0] !== 42) throw new Error("toArrayOfType: scalar wrapping failed");

    try {
        toArrayOfType([], "number", { allowEmpty: false });
        throw new Error("toArrayOfType: allowEmpty: false should throw on empty array");
    } catch (e: any) {
        if (!(e instanceof ComputeError)) throw e;
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

    // toValidNumber Layout-Agnostic/European tests
    if (toValidNumber("1.234,56") !== 1234.56) throw new Error("Agnostic: '1.234,56' failed");
    if (toValidNumber("1 234,56") !== 1234.56) throw new Error("Agnostic: '1 234,56' failed");
    if (toValidNumber("1234,56") !== 1234.56) throw new Error("Agnostic: '1234,56' failed");
    if (toValidNumber("1,234.56") !== 1234.56) throw new Error("Agnostic: '1,234.56' failed");
    if (toValidNumber("1 234.56") !== 1234.56) throw new Error("Agnostic: '1 234.56' failed");
    if (toValidNumber("1,234,567") !== 1234567) throw new Error("Agnostic: lone repeating commas failed");
    if (toValidNumber("1.234.567") !== 1234567) throw new Error("Agnostic: lone repeating dots failed");

    // Agnostic: single dot decimals
    if (toValidNumber("1.234") !== 1.234) throw new Error("Agnostic: single dot '1.234' failed");
    if (toValidNumber("0.123") !== 0.123) throw new Error("Agnostic: single dot '0.123' failed");
    if (toValidNumber("1234.567") !== 1234.567) throw new Error("Agnostic: single dot '1234.567' failed");

    // standard decimal variations and signs (Prefixes)
    if (toValidNumber(".123") !== 0.123) throw new Error("Decimal: '.123' failed");
    if (toValidNumber("-.123") !== -0.123) throw new Error("Decimal: '-.123' failed");
    if (toValidNumber("+.123") !== 0.123) throw new Error("Decimal: '+.123' failed");

    // Scientific notation tests
    if (toValidNumber("1.23e+4") !== 12300) throw new Error("Scientific: '1.23e+4' failed");
    if (toValidNumber("1.23E4") !== 12300) throw new Error("Scientific: '1.23E4' failed");
    if (toValidNumber("1e5") !== 100000) throw new Error("Scientific: '1e5' failed");
    if (toValidNumber("1.5e-3") !== 0.0015) throw new Error("Scientific: '1.5e-3' failed");
    if (toValidNumber("+1.5e-3") !== 0.0015) throw new Error("Scientific: '+1.5e-3' failed");
    if (toValidNumber("-1.5e-3") !== -0.0015) throw new Error("Scientific: '-1.5e-3' failed");
    if (toValidNumber("1,23e+4") !== 12300) throw new Error("Scientific: European decimal comma failed");
    if (toValidNumber("1.234,56e+3") !== 1234560) throw new Error("Scientific: Mixed European failed");
    if (toValidNumber("1,234.56e+3") !== 1234560) throw new Error("Scientific: Mixed English failed");
    if (toValidNumber("1e+4.5") !== null) throw new Error("Scientific: decimal exponent should be rejected");

    // Accounting format negative checks
    if (toValidNumber("(123.45)") !== -123.45) throw new Error("Accounting: '(123.45)' failed");
    if (toValidNumber("(1,234.56)") !== -1234.56) throw new Error("Accounting: '(1,234.56)' failed");
    if (toValidNumber("( 100 )") !== -100) throw new Error("Accounting: space handling failed");

    // Underscores and Spaces (strict vs non-strict)
    if (toValidNumber("1_000_000") !== 1000000) throw new Error("Underscore: default failed");
    if (toValidNumber("1_000_000", { strictNumericString: true }) !== null) throw new Error("Underscore: strict failed");
    if (toValidNumber("1 000 000") !== 1000000) throw new Error("Spaces: default failed");
    if (toValidNumber("1 000 000", { strictNumericString: true }) !== null) throw new Error("Spaces: strict failed");

    // Hex / Octal / Binary injection rejection
    if (toValidNumber("0x1a") !== null) throw new Error("Hex injection failed");
    if (toValidNumber("0b101") !== null) throw new Error("Binary injection failed");
    if (toValidNumber("0o75") !== null) throw new Error("Octal injection failed");

    // False positive checking (IPs, versions, malformed structures)
    if (toValidNumber("192.168.1.1") !== null) throw new Error("Rejection: IP address failed");
    if (toValidNumber("1.2.3") !== null) throw new Error("Rejection: version string failed");
    if (toValidNumber("1.2.3.4") !== null) throw new Error("Rejection: version string 4-part failed");
    if (toValidNumber("1.2.3,45") !== null) throw new Error("Rejection: malformed mixed layout failed");
    if (toValidNumber("1.234.56") !== null) throw new Error("Rejection: invalid group length failed");
    if (toValidNumber("9999.123.456") !== null) throw new Error("Rejection: 9999.123.456 should be null");
    if (toValidNumber("1234,567.89") !== null) throw new Error("Rejection: 1234,567.89 should be null");
    if (toValidNumber("12345.678") !== 12345.678) throw new Error("Acceptance: 12345.678 should be 12345.678");
    if (toValidNumber("12345,678") !== null) throw new Error("Rejection: 12345,678 should be null");
    if (toValidNumber("1,234.567") !== 1234.567) throw new Error("Acceptance: 1,234.567 should be 1234.567");
    if (toValidNumber(".123.456") !== null) throw new Error("Rejection: leading dot version should be null");
    if (toValidNumber(",123") !== null) throw new Error("Rejection: ,123 should be null");
    if (toValidNumber("-,123") !== null) throw new Error("Rejection: -,123 should be null");
    if (toValidNumber("+,123") !== null) throw new Error("Rejection: +,123 should be null");
    if (toValidNumber(".123") !== 0.123) throw new Error("Acceptance: .123 should be 0.123");
    if (toValidNumber("-.123") !== -0.123) throw new Error("Acceptance: -.123 should be -0.123");
    if (toValidNumber("+.123") !== 0.123) throw new Error("Acceptance: +.123 should be 0.123");

    // Non-finite parsing
    if (!Number.isNaN(toValidNumber("NaN", { allowNonFiniteNumbers: true }) as number)) throw new Error("Non-finite: 'NaN' failed");
    if (!Number.isNaN(toValidNumber("-nan", { allowNonFiniteNumbers: true }) as number)) throw new Error("Non-finite: '-nan' failed");
    if (!Number.isNaN(toValidNumber("+nan", { allowNonFiniteNumbers: true }) as number)) throw new Error("Non-finite: '+nan' failed");
    if (toValidNumber("Infinity", { allowNonFiniteNumbers: true }) !== Infinity) throw new Error("Non-finite: 'Infinity' failed");
    if (toValidNumber("-infinity", { allowNonFiniteNumbers: true }) !== -Infinity) throw new Error("Non-finite: '-infinity' failed");
    if (toValidNumber("NaN") !== null) throw new Error("Non-finite: strict should reject 'NaN'");

    // roundToScale negative scale tests
    if (roundToScale(1234, -1) !== 1230) throw new Error("roundToScale negative scale -1 failed");
    if (roundToScale(1234, -2) !== 1200) throw new Error("roundToScale negative scale -2 failed");
    if (roundToScale(1.005, 2) !== 1.01) throw new Error("roundToScale positive scale failed");



    // Trailing sign tests
    if (toValidNumber("123.45-") !== -123.45) throw new Error("Trailing minus sign parsing failed");
    if (toValidNumber("1,234.50-") !== -1234.5) throw new Error("Trailing minus with grouped commas failed");
    if (toValidNumber("123.45+") !== 123.45) throw new Error("Trailing plus sign parsing failed");



    // toValidFloat scientific default tests
    if (toValidFloat("1.23e+4") !== 12300) throw new Error("toValidFloat scientific notation default failed");

    // toValidBigInt tests
    if (toValidBigInt(9223372036854775807n) !== 9223372036854775807n) throw new Error("BigInt: native bigint failed");
    if (toValidBigInt(true) !== 1n) throw new Error("BigInt: boolean true failed");
    if (toValidBigInt("9223372036854775807") !== 9223372036854775807n) throw new Error("BigInt: string parsing precision failed");
    if (toValidBigInt("1.234,56", { truncate: true }) !== 1234n) throw new Error("BigInt: European mixed truncate failed");
    if (toValidBigInt("1.234,56", { truncate: false }) !== null) throw new Error("BigInt: European mixed strict float check failed");
    if (toValidBigInt("1.234,00", { truncate: false }) !== 1234n) throw new Error("BigInt: European mixed trailing zero float check failed");
    if (toValidBigInt("(1,234.00)") !== -1234n) throw new Error("BigInt: accounting layout parsing failed");
    if (toValidBigInt("1_000_000") !== 1000000n) throw new Error("BigInt: underscores failed");
    // ==========================================
    // 1. SCIENTIFIC NOTATION & PRECISION LOSS
    // ==========================================
    if (toValidBigInt("1.234567890123456789e18", { truncate: true }) !== 1234567890123456789n) {
        throw new Error("Edge Case: Precision lost in scientific notation parsing");
    }
    if (toValidBigInt("1e21", { range: { min: 0n, max: 10n ** 30n } }) !== 1000000000000000000000n) {
        throw new Error("Edge Case: Large valid scientific notation failed");
    }
    if (toValidBigInt("1.2345e2") !== null) {
        throw new Error("Edge Case: Scientific notation with decimal remainder failed (should require truncate: true)");
    }
    if (toValidBigInt("1.2345e2", { truncate: true }) !== 123n) {
        throw new Error("Edge Case: Scientific notation truncation failed");
    }
    if (toValidBigInt("1e-2") !== null) {
        throw new Error("Edge Case: Negative exponent without truncate should return null");
    }
    if (toValidBigInt("1e-2", { truncate: true }) !== 0n) {
        throw new Error("Edge Case: Negative exponent with truncate should yield 0n");
    }
    if (toValidBigInt("1e+100000") !== null) {
        throw new Error("Edge Case: Extreme exponent causing Infinity/Overflow should return null");
    }

    // Negative mantissa & leading zero scientific notation tests
    if (toValidBigInt("-0.5e2") !== -50n) {
        throw new Error("Edge Case: Negative mantissa '-0.5e2' failed");
    }
    if (toValidBigInt("-0.005e5") !== -500n) {
        throw new Error("Edge Case: Negative mantissa with leading zeros '-0.005e5' failed");
    }
    if (toValidBigInt("-1.2e-1") !== null) {
        throw new Error("Edge Case: Negative scientific '-1.2e-1' without truncate should return null");
    }
    if (toValidBigInt("-1.2e-1", { truncate: true }) !== 0n) {
        throw new Error("Edge Case: Negative scientific '-1.2e-1' with truncate should return 0n");
    }

    // ==========================================
    // 2. MALFORMED STRINGS & SYMBOL SUFFIXES
    // ==========================================
    if (toValidBigInt("10n") !== null) {
        throw new Error("Edge Case: BigInt literal suffix 'n' in string should be invalid");
    }
    if (toValidBigInt(".") !== null || toValidBigInt(".", { truncate: true }) !== null) {
        throw new Error("Edge Case: Lone dot should return null");
    }
    if (toValidBigInt("-.") !== null || toValidBigInt("-.", { truncate: true }) !== null) {
        throw new Error("Edge Case: Negative lone dot should return null");
    }
    if (toValidBigInt("10.") !== 10n) {
        throw new Error("Edge Case: Trailing dot '10.' should parse correctly as 10n");
    }
    if (toValidBigInt(".5", { truncate: true }) !== 0n) {
        throw new Error("Edge Case: Leading dot '.5' with truncate should yield 0n");
    }
    if (toValidBigInt("0x10") !== null) {
        throw new Error("Edge Case: Hexadecimal string should return null (if strict decimal required)");
    }

    // ==========================================
    // 3. NUMERIC TYPE TRAPS
    // ==========================================
    if (toValidBigInt(NaN) !== null) throw new Error("Edge Case: NaN should return null");
    if (toValidBigInt(Infinity) !== null) throw new Error("Edge Case: Infinity should return null");
    if (toValidBigInt(-Infinity) !== null) throw new Error("Edge Case: -Infinity should return null");
    if (toValidBigInt(10.5) !== null) throw new Error("Edge Case: Float number without truncate should return null");
    if (toValidBigInt(10.5, { truncate: true }) !== 10n) throw new Error("Edge Case: Float number with truncate failed");

    // ==========================================
    // 4. BOUNDARY & RANGE TESTS
    // ==========================================
    const INT64_MIN_TEST = -9223372036854775808n;
    const INT64_MAX_TEST = 9223372036854775807n;

    if (toValidBigInt(INT64_MAX_TEST, { range: "Int64" }) !== INT64_MAX_TEST) {
        throw new Error("Boundary: Int64 MAX exact match failed");
    }
    if (toValidBigInt(INT64_MIN_TEST, { range: "Int64" }) !== INT64_MIN_TEST) {
        throw new Error("Boundary: Int64 MIN exact match failed");
    }
    if (toValidBigInt(50n, { range: { min: 0n, max: 100n } }) !== 50n) {
        throw new Error("Boundary: Custom range object failed");
    }

    // ==========================================
    // 5. OBJECT & UNBOXING SIDE EFFECTS
    // ==========================================
    if (toValidBigInt(Symbol("10")) !== null) {
        throw new Error("Type: Symbol input should safely return null without throwing");
    }
    const poisonObject = {
        toString() { throw new Error("Poisoned object"); },
        valueOf() { throw new Error("Poisoned object"); }
    };
    if (toValidBigInt(poisonObject) !== null) {
        throw new Error("Edge Case: Unsafe object unboxing did not return null");
    }

    // ==========================================
    // 6. ISVALIDBIGINT EXHAUSTIVE EDGE CASES
    // ==========================================
    // Basic primitives & types
    if (!isValidBigInt(0n)) throw new Error("isValidBigInt: 0n failed");
    if (!isValidBigInt(-0n)) throw new Error("isValidBigInt: -0n failed");
    if (!isValidBigInt(10n)) throw new Error("isValidBigInt: primitive bigint failed");
    if (!isValidBigInt(-9223372036854775808n)) throw new Error("isValidBigInt: Int64 MIN failed");
    if (!isValidBigInt(9223372036854775807n)) throw new Error("isValidBigInt: Int64 MAX failed");
    
    // Non-bigint primitives
    if (isValidBigInt(0)) throw new Error("isValidBigInt: 0 should return false");
    if (isValidBigInt(10)) throw new Error("isValidBigInt: primitive number should return false");
    if (isValidBigInt(NaN)) throw new Error("isValidBigInt: NaN should return false");
    if (isValidBigInt(Infinity)) throw new Error("isValidBigInt: Infinity should return false");
    if (isValidBigInt(-Infinity)) throw new Error("isValidBigInt: -Infinity should return false");
    if (isValidBigInt("10")) throw new Error("isValidBigInt: string should return false");
    if (isValidBigInt("10n")) throw new Error("isValidBigInt: string with 'n' should return false");
    if (isValidBigInt(true)) throw new Error("isValidBigInt: boolean true should return false");
    if (isValidBigInt(false)) throw new Error("isValidBigInt: boolean false should return false");
    if (isValidBigInt(null)) throw new Error("isValidBigInt: null should return false");
    if (isValidBigInt(undefined)) throw new Error("isValidBigInt: undefined should return false");
    if (isValidBigInt(Symbol("10"))) throw new Error("isValidBigInt: Symbol should return false");
    if (isValidBigInt(() => 10n)) throw new Error("isValidBigInt: function should return false");
    
    // Object wrappers & Proxy objects
    if (!isValidBigInt(Object(10n))) throw new Error("isValidBigInt: BigInt object wrapper failed");
    if (!isValidBigInt(Object(0n))) throw new Error("isValidBigInt: Object(0n) failed");
    if (isValidBigInt(Object(10))) throw new Error("isValidBigInt: Number object wrapper should return false");
    if (isValidBigInt(Object("10"))) throw new Error("isValidBigInt: String object wrapper should return false");
    if (isValidBigInt(Object(true))) throw new Error("isValidBigInt: Boolean object wrapper should return false");
    if (isValidBigInt({ [Symbol.toPrimitive]: () => 10n })) throw new Error("isValidBigInt: object with toPrimitive returning bigint should return false");
    if (!isValidBigInt({ valueOf: () => 10n })) throw new Error("isValidBigInt: object with valueOf returning bigint failed to unbox to bigint");
    if (isValidBigInt(new Proxy(Object(10n), {}))) throw new Error("isValidBigInt: Proxy wrapped BigInt object fails native slot check and should return false");
    if (isValidBigInt(poisonObject)) throw new Error("isValidBigInt: poisoned object throwing in valueOf should return false");

    // Int64 boundaries & off-by-one checks
    if (isValidBigInt(9223372036854775808n, { range: "Int64" })) throw new Error("isValidBigInt: Int64 MAX + 1 should return false");
    if (isValidBigInt(-9223372036854775809n, { range: "Int64" })) throw new Error("isValidBigInt: Int64 MIN - 1 should return false");
    
    // UInt64 boundaries & off-by-one checks
    if (!isValidBigInt(0n, { range: "UInt64" })) throw new Error("isValidBigInt: UInt64 MIN (0n) failed");
    if (!isValidBigInt(18446744073709551615n, { range: "UInt64" })) throw new Error("isValidBigInt: UInt64 MAX failed");
    if (isValidBigInt(-1n, { range: "UInt64" })) throw new Error("isValidBigInt: UInt64 -1n should return false");
    if (isValidBigInt(18446744073709551616n, { range: "UInt64" })) throw new Error("isValidBigInt: UInt64 MAX + 1 should return false");
    
    // Custom range objects (narrow, wide, negative, single-point)
    if (!isValidBigInt(5n, { range: { min: 0n, max: 10n } })) throw new Error("isValidBigInt: custom range inside bounds failed");
    if (isValidBigInt(-1n, { range: { min: 0n, max: 10n } })) throw new Error("isValidBigInt: custom range below min failed");
    if (isValidBigInt(11n, { range: { min: 0n, max: 10n } })) throw new Error("isValidBigInt: custom range above max failed");
    if (!isValidBigInt(7n, { range: { min: 7n, max: 7n } })) throw new Error("isValidBigInt: custom single-point range exact match failed");
    if (isValidBigInt(6n, { range: { min: 7n, max: 7n } })) throw new Error("isValidBigInt: custom single-point range mismatch failed");
    if (!isValidBigInt(-500n, { range: { min: -1000n, max: -100n } })) throw new Error("isValidBigInt: custom negative range failed");

    // ==========================================
    // 7. TOVALIDBIGINT EXHAUSTIVE EDGE CASES
    // ==========================================
    // Primitives & Type Conversions
    if (toValidBigInt(0n) !== 0n) throw new Error("toValidBigInt: 0n failed");
    if (toValidBigInt(-0n) !== 0n) throw new Error("toValidBigInt: -0n failed");
    if (toValidBigInt(true) !== 1n) throw new Error("toValidBigInt: boolean true failed");
    if (toValidBigInt(false) !== 0n) throw new Error("toValidBigInt: boolean false failed");
    if (toValidBigInt(null) !== null) throw new Error("toValidBigInt: null should return null");
    if (toValidBigInt(undefined) !== null) throw new Error("toValidBigInt: undefined should return null");
    if (toValidBigInt(Symbol("10")) !== null) throw new Error("toValidBigInt: Symbol should return null");

    // Number Inputs & Truncation Semantics
    if (toValidBigInt(0) !== 0n) throw new Error("toValidBigInt: 0 failed");
    if (toValidBigInt(42) !== 42n) throw new Error("toValidBigInt: integer number failed");
    if (toValidBigInt(-42) !== -42n) throw new Error("toValidBigInt: negative integer number failed");
    if (toValidBigInt(42.0) !== 42n) throw new Error("toValidBigInt: float with zero decimal failed");
    if (toValidBigInt(42.99) !== null) throw new Error("toValidBigInt: float without truncate should return null");
    if (toValidBigInt(42.99, { truncate: true }) !== 42n) throw new Error("toValidBigInt: positive float truncation failed");
    if (toValidBigInt(-42.99, { truncate: true }) !== -42n) throw new Error("toValidBigInt: negative float truncation failed");
    if (toValidBigInt(NaN) !== null) throw new Error("toValidBigInt: NaN should return null");
    if (toValidBigInt(Infinity) !== null) throw new Error("toValidBigInt: Infinity should return null");
    if (toValidBigInt(-Infinity) !== null) throw new Error("toValidBigInt: -Infinity should return null");

    // String Parsing Edge Cases & Formatting
    if (toValidBigInt("0") !== 0n) throw new Error("toValidBigInt: '0' string failed");
    if (toValidBigInt("-0") !== 0n) throw new Error("toValidBigInt: '-0' string failed");
    if (toValidBigInt("+42") !== 42n) throw new Error("toValidBigInt: '+42' string failed");
    if (toValidBigInt("0000042") !== 42n) throw new Error("toValidBigInt: string with leading zeros failed");
    if (toValidBigInt("-0000042") !== -42n) throw new Error("toValidBigInt: negative string with leading zeros failed");
    if (toValidBigInt("1,234,567") !== 1234567n) throw new Error("toValidBigInt: grouped comma string failed");
    if (toValidBigInt("1.234.567") !== 1234567n) throw new Error("toValidBigInt: European grouped dot string failed");
    if (toValidBigInt("1.234,56", { truncate: true }) !== 1234n) throw new Error("toValidBigInt: European decimal comma truncation failed");
    if (toValidBigInt("1.234,56", { truncate: false }) !== null) throw new Error("toValidBigInt: European decimal comma without truncate should return null");
    if (toValidBigInt("1.234,00", { truncate: false }) !== 1234n) throw new Error("toValidBigInt: European decimal comma trailing zero float check failed");
    if (toValidBigInt("(1,234)") !== -1234n) throw new Error("toValidBigInt: accounting layout parsing failed");
    if (toValidBigInt("( 1,234.50 )", { truncate: true }) !== -1234n) throw new Error("toValidBigInt: accounting decimal float truncation failed");
    if (toValidBigInt("123.45-", { truncate: true }) !== -123n) throw new Error("toValidBigInt: trailing minus sign float truncation failed");
    if (toValidBigInt("1_000_000") !== 1000000n) throw new Error("toValidBigInt: underscores failed");

    // Invalid String Syntax Rejections
    if (toValidBigInt("") !== null) throw new Error("toValidBigInt: empty string should return null");
    if (toValidBigInt("   ") !== null) throw new Error("toValidBigInt: whitespace string should return null");
    if (toValidBigInt("10n") !== null) throw new Error("toValidBigInt: BigInt suffix 'n' should return null");
    if (toValidBigInt("0x10") !== null) throw new Error("toValidBigInt: hex string should return null");
    if (toValidBigInt("0b10") !== null) throw new Error("toValidBigInt: binary string should return null");
    if (toValidBigInt("0o10") !== null) throw new Error("toValidBigInt: octal string should return null");
    if (toValidBigInt("abc") !== null) throw new Error("toValidBigInt: non-numeric string should return null");
    if (toValidBigInt("1.2.3") !== null) throw new Error("toValidBigInt: version string should return null");
    if (toValidBigInt(".") !== null) throw new Error("toValidBigInt: lone dot should return null");
    if (toValidBigInt("-.") !== null) throw new Error("toValidBigInt: lone negative dot should return null");

    // Scientific Notation & Extreme Powers
    if (toValidBigInt("1e3") !== 1000n) throw new Error("toValidBigInt: simple scientific '1e3' failed");
    if (toValidBigInt("-1.5e3") !== -1500n) throw new Error("toValidBigInt: negative scientific '-1.5e3' failed");
    if (toValidBigInt("1.234567890123456789e18") !== 1234567890123456789n) throw new Error("toValidBigInt: scientific notation precision loss prevention failed");
    if (toValidBigInt("1.2345e2") !== null) throw new Error("toValidBigInt: scientific notation fractional remainder without truncate should return null");
    if (toValidBigInt("1.2345e2", { truncate: true }) !== 123n) throw new Error("toValidBigInt: scientific notation fractional remainder truncation failed");
    if (toValidBigInt("1e-2") !== null) throw new Error("toValidBigInt: negative scientific exponent without truncate should return null");
    if (toValidBigInt("1e-2", { truncate: true }) !== 0n) throw new Error("toValidBigInt: negative scientific exponent truncation failed");
    if (toValidBigInt("-1.2e-1", { truncate: true }) !== 0n) throw new Error("toValidBigInt: negative mantissa negative exponent truncation failed");
    if (toValidBigInt("1e+100001") !== null) throw new Error("toValidBigInt: extreme exponent (>100000) should return null");
    if (toValidBigInt("1e-100001") !== null) throw new Error("toValidBigInt: extreme negative exponent (<-100000) should return null");

    // Object Unboxing & Custom Objects
    if (toValidBigInt(Object(100n)) !== 100n) throw new Error("toValidBigInt: BigInt object wrapper failed");
    if (toValidBigInt(Object("100")) !== 100n) throw new Error("toValidBigInt: String object wrapper failed");
    if (toValidBigInt(Object(42.5), { truncate: true }) !== 42n) throw new Error("toValidBigInt: Number object wrapper float truncation failed");
    if (toValidBigInt({ valueOf: () => "999" }) !== 999n) throw new Error("toValidBigInt: custom object valueOf string unboxing failed");
    if (toValidBigInt(poisonObject) !== null) throw new Error("toValidBigInt: poisoned object throwing in valueOf should return null");

    // Int64, UInt64 & Custom Ranges
    if (toValidBigInt(9223372036854775807n, { range: "Int64" }) !== 9223372036854775807n) throw new Error("toValidBigInt: Int64 MAX failed");
    if (toValidBigInt(-9223372036854775808n, { range: "Int64" }) !== -9223372036854775808n) throw new Error("toValidBigInt: Int64 MIN failed");
    if (toValidBigInt(9223372036854775808n, { range: "Int64" }) !== null) throw new Error("toValidBigInt: Int64 MAX + 1 out of bounds should return null");
    if (toValidBigInt(-9223372036854775809n, { range: "Int64" }) !== null) throw new Error("toValidBigInt: Int64 MIN - 1 out of bounds should return null");
    if (toValidBigInt(18446744073709551615n, { range: "UInt64" }) !== 18446744073709551615n) throw new Error("toValidBigInt: UInt64 MAX failed");
    if (toValidBigInt(-1n, { range: "UInt64" }) !== null) throw new Error("toValidBigInt: UInt64 negative rejection failed");
    if (toValidBigInt(50n, { range: { min: 0n, max: 100n } }) !== 50n) throw new Error("toValidBigInt: custom range within bounds failed");
    if (toValidBigInt(150n, { range: { min: 0n, max: 100n } }) !== null) throw new Error("toValidBigInt: custom range upper bound exceeded should return null");

    // Additional BigInt Edge Case Tests
    if (toValidBigInt("1.25e1", { truncate: false }) !== null) throw new Error("toValidBigInt: fractional scientific without truncate failed");
    if (toValidBigInt("1.25e1", { truncate: true }) !== 12n) throw new Error("toValidBigInt: fractional scientific with truncate failed");
    if (toValidBigInt("-129", { range: { min: -128n, max: 127n } }) !== null) throw new Error("toValidBigInt: custom min exceeded should return null");
    if (toValidBigInt("128", { range: { min: -128n, max: 127n } }) !== null) throw new Error("toValidBigInt: custom max exceeded should return null");

    // Clamp tests
    if (clamp(5, { min: 1, max: 10 }) !== 5) throw new Error("Clamp: basic clamp in-bounds failed");
    if (clamp(0, { min: 1, max: 10 }) !== 1) throw new Error("Clamp: basic clamp lower bound failed");
    if (clamp(15, { min: 1, max: 10 }) !== 10) throw new Error("Clamp: basic clamp upper bound failed");
    if (clamp(5, { min: 10, max: 1 }) !== 10) throw new Error("Clamp: invalid bounds (min > max) should return min");
    if (clamp(NaN, { min: 1, max: 10 }) !== 1) throw new Error("Clamp: NaN with min should return min");
    if (clamp(Infinity, { min: 1, max: 10 }) !== 10) throw new Error("Clamp: Infinity with max should return max");
    if (clamp(-Infinity, { min: 1, max: 10 }) !== 1) throw new Error("Clamp: -Infinity with min should return min");
    if (clamp(5) !== 5) throw new Error("Clamp: no options failed");
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


    // Cross-realm robust validation checks
    const vm = require("vm");
    const otherRealm = vm.createContext();
    const foreignDate = vm.runInContext("new Date(1777000)", otherRealm);
    const foreignSet = vm.runInContext("new Set([1, 2])", otherRealm);
    const foreignMap = vm.runInContext("new Map([['x', 1]])", otherRealm);
    const foreignRegExp = vm.runInContext("/abc/g", otherRealm);
    const foreignString = vm.runInContext("new String('hello')", otherRealm);

    if (!isValidDateObj(foreignDate)) {
        throw new Error("Expected cross-realm Date to be valid Date object");
    }
    if (toValidNumber(foreignDate) !== 1777000) {
        throw new Error("Expected toValidNumber to coerce cross-realm Date to epoch");
    }
    if (toCanonicalString(foreignDate) !== "d:1777000") {
        throw new Error("Expected toCanonicalString to format cross-realm Date");
    }
    if (toCanonicalString(foreignSet) !== "set:[number:1\x01number:2]") {
        throw new Error("Expected toCanonicalString to format cross-realm Set");
    }
    if (toCanonicalString(foreignMap) !== "map:{s:1:x\x00number:1}") {
        throw new Error("Expected toCanonicalString to format cross-realm Map");
    }
    if (toCanonicalString(foreignRegExp) !== "r:6:/abc/g") {
        throw new Error("Expected toCanonicalString to format cross-realm RegExp");
    }
    if (typeof toCanonicalString(foreignString) !== "string") {
        throw new Error("Expected toCanonicalString to handle cross-realm String object");
    }

    const replacer = createSafeJsonReplacer();
    const serializedDate = replacer.call(null, "date", foreignDate);
    if (serializedDate !== "1970-01-01T00:29:37.000Z") {
        throw new Error("Expected cross-realm Date serialization to format to ISO string: " + serializedDate);
    }
    const serializedSet = replacer.call(null, "set", foreignSet);
    if (!Array.isArray(serializedSet) || serializedSet[0] !== 1 || serializedSet[1] !== 2) {
        throw new Error("Expected cross-realm Set serialization to format to Array");
    }
    const serializedMap = replacer.call(null, "map", foreignMap);
    if (!Array.isArray(serializedMap) || serializedMap[0][0] !== "x" || serializedMap[0][1] !== 1) {
        throw new Error("Expected cross-realm Map serialization to format to entries Array");
    }

    const circ = vm.runInContext("const o = {}; o.self = o; o", otherRealm);
    const serializedCirc = JSON.stringify(circ, createSafeJsonReplacer({ handleCircular: true }));
    if (serializedCirc !== '{"self":"[Circular]"}') {
        throw new Error("Expected circular serialization to succeed cross-realm: " + serializedCirc);
    }

    // Extra validation for object/guard robust type checking (fixing spoofing and Map/Set issues)
    const oIsObj = isObj;
    const oIsRegExp = isRegExp;
    const oIsSet = isSet;
    const oIsMap = isMap;
    const oIsValidDateObj = isValidDateObj;

    // 1. isObj returns true for all non-null non-array objects (original design)
    const spoofedDate = {
        [Symbol.toStringTag]: "Date",
        valueOf() { throw new Error("lol"); }
    };
    const spoofedRegExp = {
        [Symbol.toStringTag]: "RegExp",
        get source() { throw new Error("lol"); }
    };
    const spoofedSet = {
        [Symbol.toStringTag]: "Set",
        get size() { throw new Error("lol"); }
    };
    const spoofedMap = {
        [Symbol.toStringTag]: "Map",
        get size() { throw new Error("lol"); }
    };

    if (!oIsObj({})) throw new Error("isObj should return true for {}");
    if (!oIsObj(new Date())) throw new Error("isObj should return true for Date");
    if (!oIsObj(new Set())) throw new Error("isObj should return true for Set");
    if (!oIsObj(new Map())) throw new Error("isObj should return true for Map");
    if (!oIsObj(/abc/)) throw new Error("isObj should return true for RegExp");
    if (!oIsObj(spoofedDate)) throw new Error("isObj should return true for spoofed Date");

    // 2. Specific type guards reject spoofed versions and wrong types
    if (oIsValidDateObj(spoofedDate)) throw new Error("isValidDateObj should return false for spoofed Date");
    if (!oIsValidDateObj(new Date())) throw new Error("isValidDateObj should return true for Date");

    if (oIsRegExp(spoofedRegExp)) throw new Error("isRegExp should return false for spoofed RegExp");
    if (!oIsRegExp(/abc/)) throw new Error("isRegExp should return true for RegExp");
    if (oIsRegExp({})) throw new Error("isRegExp should return false for plain object");

    if (oIsSet(spoofedSet)) throw new Error("isSet should return false for spoofed Set");
    if (!oIsSet(new Set())) throw new Error("isSet should return true for Set");
    if (oIsSet(new Map())) throw new Error("isSet should return false for Map");

    if (oIsMap(spoofedMap)) throw new Error("isMap should return false for spoofed Map");
    if (!oIsMap(new Map())) throw new Error("isMap should return true for Map");
    if (oIsMap(new Set())) throw new Error("isMap should return false for Set");

    // 3. Cross-realm compatibility for Date, Set, Map, and RegExp
    if (!oIsValidDateObj(foreignDate)) throw new Error("isValidDateObj should return true for cross-realm Date");
    if (!oIsSet(foreignSet)) throw new Error("isSet should return true for cross-realm Set");
    if (!oIsMap(foreignMap)) throw new Error("isMap should return true for cross-realm Map");
    if (!oIsRegExp(foreignRegExp)) throw new Error("isRegExp should return true for cross-realm RegExp");
    // Custom valueOf unboxing tests
    const testUnbox = unboxPrimitiveObj;
    class CustomVal {
        private val: number | string;
        constructor(val: number | string) { this.val = val; }
        valueOf() { return this.val; }
    }
    if (testUnbox(new CustomVal(123)) !== 123) throw new Error("unboxPrimitiveObj custom number valueOf failed");
    if (testUnbox(new CustomVal("hello")) !== "hello") throw new Error("unboxPrimitiveObj custom string valueOf failed");

    // Check that we don't unbox objects returning objects from valueOf
    class BadCustom {
        valueOf() { return { x: 1 }; }
    }
    const badObj = new BadCustom();
    if (testUnbox(badObj) !== badObj) throw new Error("unboxPrimitiveObj bad custom valueOf should return object itself");

    console.log("🎉 ALL UTILS TYPES TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("❌ UTILS TYPES TESTS FAILED:", err);
    process.exit(1);
}
