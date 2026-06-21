declare const process: any;
import { isArrayOfType, toValidArray, toValidStringArray, getUniqueArrayStats, joinArray, sortArray, computeMedian, computeQuantile, computeMode } from "../../src/utils/array";
import { toValidNumber, toValidFloat, formatNumber, isValidFloat, toValidBigInt, clamp } from "../../src/utils/number";
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

    // toValidNumber Layout-Agnostic/European tests
    if (toValidNumber("1.234,56") !== 1234.56) throw new Error("Agnostic: '1.234,56' failed");
    if (toValidNumber("1 234,56") !== 1234.56) throw new Error("Agnostic: '1 234,56' failed");
    if (toValidNumber("1234,56") !== 1234.56) throw new Error("Agnostic: '1234,56' failed");
    if (toValidNumber("1,234.56") !== 1234.56) throw new Error("Agnostic: '1,234.56' failed");
    if (toValidNumber("1 234.56") !== 1234.56) throw new Error("Agnostic: '1 234.56' failed");
    if (toValidNumber("1,234,567") !== 1234567) throw new Error("Agnostic: lone repeating commas failed");
    if (toValidNumber("1.234.567") !== 1234567) throw new Error("Agnostic: lone repeating dots failed");

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

    // Non-finite parsing
    if (!Number.isNaN(toValidNumber("NaN", { allowNonFiniteNumbers: true }) as number)) throw new Error("Non-finite: 'NaN' failed");
    if (!Number.isNaN(toValidNumber("-nan", { allowNonFiniteNumbers: true }) as number)) throw new Error("Non-finite: '-nan' failed");
    if (toValidNumber("Infinity", { allowNonFiniteNumbers: true }) !== Infinity) throw new Error("Non-finite: 'Infinity' failed");
    if (toValidNumber("-infinity", { allowNonFiniteNumbers: true }) !== -Infinity) throw new Error("Non-finite: '-infinity' failed");
    if (toValidNumber("NaN") !== null) throw new Error("Non-finite: strict should reject 'NaN'");

    // toValidBigInt tests
    if (toValidBigInt(9223372036854775807n) !== 9223372036854775807n) throw new Error("BigInt: native bigint failed");
    if (toValidBigInt(true) !== 1n) throw new Error("BigInt: boolean true failed");
    if (toValidBigInt("9223372036854775807") !== 9223372036854775807n) throw new Error("BigInt: string parsing precision failed");
    if (toValidBigInt("1.234,56", { truncate: true }) !== 1234n) throw new Error("BigInt: European mixed truncate failed");
    if (toValidBigInt("1.234,56", { truncate: false }) !== null) throw new Error("BigInt: European mixed strict float check failed");
    if (toValidBigInt("1.234,00", { truncate: false }) !== 1234n) throw new Error("BigInt: European mixed trailing zero float check failed");
    if (toValidBigInt("(1,234.00)") !== -1234n) throw new Error("BigInt: accounting layout parsing failed");
    if (toValidBigInt("1_000_000") !== 1000000n) throw new Error("BigInt: underscores failed");
    if (toValidBigInt("1.23e+4") !== 12300n) throw new Error("BigInt: scientific notation conversion failed");

    // toValidBigInt loophole/edge case tests
    if (toValidBigInt("1.2.3") !== null) throw new Error("BigInt loophole: version string should return null");
    if (toValidBigInt("1.2.3", { truncate: true }) !== null) throw new Error("BigInt loophole: version string with truncate should return null");
    if (toValidBigInt("1.invalid_stuff", { truncate: true }) !== null) throw new Error("BigInt loophole: invalid suffix with truncate should return null");
    if (toValidBigInt("1234.56.78", { truncate: true }) !== null) throw new Error("BigInt loophole: multiple dots with truncate should return null");

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

    const { isValidDateObj } = require("../../src/utils/object");
    const { toCanonicalString } = require("../../src/utils/string");
    if (!isValidDateObj(foreignDate)) {
        throw new Error("Expected cross-realm Date to be valid Date object");
    }
    if (toValidNumber(foreignDate) !== 1777000) {
        throw new Error("Expected toValidNumber to coerce cross-realm Date to epoch");
    }
    if (toCanonicalString(foreignDate) !== "d:1777000") {
        throw new Error("Expected toCanonicalString to format cross-realm Date");
    }
    if (toCanonicalString(foreignSet) !== "set:[number:1,number:2]") {
        throw new Error("Expected toCanonicalString to format cross-realm Set");
    }
    if (toCanonicalString(foreignMap) !== "map:{s:x:number:1}") {
        throw new Error("Expected toCanonicalString to format cross-realm Map");
    }
    if (toCanonicalString(foreignRegExp) !== "r:/abc/g") {
        throw new Error("Expected toCanonicalString to format cross-realm RegExp");
    }

    const { createSafeJsonReplacer } = require("../../src/utils/json");
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
    const {
        isObj: oIsObj,
        isRegExp: oIsRegExp,
        isSet: oIsSet,
        isMap: oIsMap,
        isValidDateObj: oIsValidDateObj
    } = require("../../src/utils/object");

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



    console.log("🎉 ALL UTILS TYPES TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("❌ UTILS TYPES TESTS FAILED:", err);
    process.exit(1);
}
