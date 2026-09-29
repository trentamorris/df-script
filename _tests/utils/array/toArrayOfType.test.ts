declare const process: any;
import { toArrayOfType } from "../../../src/utils/array";
import { ComputeError } from "../../../src/exceptions";

try {
    // 1. Basic Type Coercion - String
    const strArr1 = toArrayOfType<string>(null, "string");
    if (!Array.isArray(strArr1) || strArr1.length !== 0) throw new Error("null toArrayOfType failed");

    const strArr2 = toArrayOfType<string>([1, "hello", null, undefined], "string");
    if (strArr2.length !== 4 || strArr2[0] !== "1" || strArr2[1] !== "hello" || strArr2[2] !== "null" || strArr2[3] !== "undefined") {
        throw new Error("string conversion failed");
    }

    // 2. Number Coercion
    const numArr = toArrayOfType<number>(["10", 20, "30.5"], "number");
    if (numArr.length !== 3 || numArr[0] !== 10 || numArr[1] !== 20 || numArr[2] !== 30.5) {
        throw new Error("number conversion failed");
    }

    // 3. Boolean Coercion
    const boolArr = toArrayOfType<boolean>([1, 0, "", "non-empty"], "boolean");
    if (boolArr.length !== 4 || boolArr[0] !== true || boolArr[1] !== false || boolArr[2] !== false || boolArr[3] !== true) {
        throw new Error("boolean conversion failed");
    }

    // 4. Int Coercion
    const intArr = toArrayOfType<number>([1, 2.8, "3", "4.99"], "int");
    if (intArr.length !== 4 || intArr[0] !== 1 || intArr[1] !== 2 || intArr[2] !== 3 || intArr[3] !== 4) {
        throw new Error("int conversion failed");
    }

    // 5. BigInt Coercion
    const bigIntArr = toArrayOfType<bigint>([10, "20", 30n], "bigint");
    if (bigIntArr.length !== 3 || bigIntArr[0] !== 10n || bigIntArr[1] !== 20n || bigIntArr[2] !== 30n) {
        throw new Error("bigint conversion failed");
    }

    // 6. Date Coercion
    const dateArr = toArrayOfType<Date>(["2025-01-01T00:00:00Z", new Date("2026-01-01T00:00:00Z")], "date");
    if (dateArr.length !== 2 || !(dateArr[0] instanceof Date) || !(dateArr[1] instanceof Date)) {
        throw new Error("date conversion failed");
    }

    // 7. RegExp Coercion (direct RegExp and string patterns)
    const reg1 = /foo/i;
    const regArr = toArrayOfType<RegExp>([reg1, "^test.*$"], "regexp");
    if (regArr.length !== 2 || regArr[0] !== reg1 || !(regArr[1] instanceof RegExp) || regArr[1].source !== "^test.*$") {
        throw new Error("regexp conversion failed");
    }

    // 8. Array Coercion
    const nestedArr = toArrayOfType<any[]>([[1, 2], new Uint8Array([3, 4])], "array");
    if (nestedArr.length !== 2 || nestedArr[0][0] !== 1 || nestedArr[1][0] !== 3) {
        throw new Error("nested array conversion failed");
    }

    // 9. PlainObject and Object Coercion
    const plainObjs = toArrayOfType([{ a: 1 }, { b: 2 }], "plainObject");
    if (plainObjs.length !== 2 || (plainObjs[0] as any).a !== 1) {
        throw new Error("plainObject conversion failed");
    }

    // 10. allowNulls: true vs coerce interaction:
    // When allowNulls is true, nullish elements are preserved as null without being coerced into string 'null', 0, or false!
    const nullPreservedStr = toArrayOfType<string | null>([10, null, 20, undefined], "string", { allowNulls: true });
    if (nullPreservedStr.length !== 4 || nullPreservedStr[0] !== "10" || nullPreservedStr[1] !== null || nullPreservedStr[2] !== "20" || nullPreservedStr[3] !== undefined) {
        throw new Error("allowNulls preservation failed with string target");
    }

    const nullPreservedNum = toArrayOfType<number | null>([10, null, "30"], "number", { allowNulls: true });
    if (nullPreservedNum.length !== 3 || nullPreservedNum[0] !== 10 || nullPreservedNum[1] !== null || nullPreservedNum[2] !== 30) {
        throw new Error("allowNulls preservation failed with number target");
    }

    // When allowNulls is false, coerce applies:
    const nullCoercedStr = toArrayOfType<string>([null], "string", { allowNulls: false });
    if (nullCoercedStr.length !== 1 || nullCoercedStr[0] !== "null") {
        throw new Error("allowNulls: false should coerce null into 'null'");
    }

    // 11. Custom Coerce Function + allowNulls Interaction
    // When allowNulls is true, custom coerce does NOT get called on null/undefined
    let customCoerceCallCount = 0;
    const customCoerceWithNulls = toArrayOfType([1, null, 2, undefined], "number", {
        allowNulls: true,
        coerce: (v) => {
            customCoerceCallCount++;
            return Number(v) * 10;
        }
    });
    if (customCoerceCallCount !== 2) throw new Error(`Expected coerce to be called only for non-null items, got ${customCoerceCallCount}`);
    if (customCoerceWithNulls[0] !== 10 || customCoerceWithNulls[1] !== null || customCoerceWithNulls[2] !== 20 || customCoerceWithNulls[3] !== undefined) {
        throw new Error("custom coerce with allowNulls failed to preserve nulls");
    }

    // 12. Typed Array Constructors as Targets (Float64Array, Float32Array, Int32Array, Uint8Array)
    const f64 = toArrayOfType(["10.5", 20, "30.25"], Float64Array) as unknown as Float64Array;
    if (!(f64 instanceof Float64Array) || f64.length !== 3 || f64[0] !== 10.5 || f64[1] !== 20 || f64[2] !== 30.25) {
        throw new Error("Float64Array conversion failed");
    }

    const i32 = toArrayOfType([10.9, "-20", 30], Int32Array) as unknown as Int32Array;
    if (!(i32 instanceof Int32Array) || i32.length !== 3 || i32[0] !== 10 || i32[1] !== -20 || i32[2] !== 30) {
        throw new Error("Int32Array conversion failed");
    }

    const u8 = toArrayOfType([0, 255, 256], Uint8Array) as unknown as Uint8Array;
    if (!(u8 instanceof Uint8Array) || u8.length !== 3 || u8[0] !== 0 || u8[1] !== 255 || u8[2] !== 0) {
        // Uint8Array wraps 256 to 0
        throw new Error("Uint8Array conversion failed");
    }

    // TypedArray with Custom Coerce (e.g. replacing null/invalid with NaN)
    const f64Custom = toArrayOfType([1, null, "invalid", 4], Float64Array, {
        coerce: (v) => {
            const n = Number(v);
            return isNaN(n) ? NaN : n;
        }
    }) as unknown as Float64Array;
    if (!(f64Custom instanceof Float64Array) || f64Custom.length !== 4 || f64Custom[0] !== 1 || !Number.isNaN(f64Custom[2]) || f64Custom[3] !== 4) {
        throw new Error("Float64Array with custom coerce failed");
    }

    // 13. Empty Array Handling & allowEmpty Flag
    const emptyDefault = toArrayOfType([], "number");
    if (!Array.isArray(emptyDefault) || emptyDefault.length !== 0) throw new Error("empty array default failed");

    const emptyTypedArray = toArrayOfType([], Float64Array) as unknown as Float64Array;
    if (!(emptyTypedArray instanceof Float64Array) || emptyTypedArray.length !== 0) throw new Error("empty Float64Array failed");

    let threwOnEmpty = false;
    try {
        toArrayOfType([], "number", { allowEmpty: false });
    } catch (e: any) {
        if (e instanceof ComputeError) threwOnEmpty = true;
    }
    if (!threwOnEmpty) throw new Error("Expected allowEmpty: false to throw on empty array");

    // 14. Error Handling on Conversion Failure (mode: "every")
    let threwOnInvalid = false;
    try {
        toArrayOfType([1, 2, "not-a-number"], "number");
    } catch (e: any) {
        if (e instanceof ComputeError) threwOnInvalid = true;
    }
    // "not-a-number" fails isValidNumber check since toValidNumber("not-a-number") is NaN
    if (!threwOnInvalid) throw new Error("Expected invalid item to throw in mode 'every'");

    // 15. Mode: "some" filtering
    const partialConverted = toArrayOfType([10, "not-a-number", 20, "bad"], "number", { mode: "some" });
    if (partialConverted.length !== 2 || partialConverted[0] !== 10 || partialConverted[1] !== 20) {
        throw new Error(`mode: 'some' failed, expected [10, 20], got ${JSON.stringify(partialConverted)}`);
    }

    let threwOnZeroMatchesSome = false;
    try {
        toArrayOfType(["bad1", "bad2"], "number", { mode: "some" });
    } catch (e: any) {
        if (e instanceof ComputeError) threwOnZeroMatchesSome = true;
    }
    if (!threwOnZeroMatchesSome) throw new Error("Expected mode: 'some' to throw when 0 items convert");

    // 16. Custom Class Target Instance Coercion
    class CustomEntity {
        constructor(public id: number) { }
    }
    class SubEntity extends CustomEntity { }
    const ent1 = new CustomEntity(1);
    const ent2 = new SubEntity(2);
    const coercedClass = toArrayOfType([ent1, ent2], CustomEntity);
    if (coercedClass.length !== 2 || coercedClass[0] !== ent1 || coercedClass[1] !== ent2) {
        throw new Error("Custom class and subclass instance coercion failed");
    }

    // Class coercion rejection in mode: 'every'
    let threwOnInvalidClassItem = false;
    try {
        toArrayOfType([ent1, { id: 1 }], CustomEntity);
    } catch (e: any) {
        if (e instanceof ComputeError) threwOnInvalidClassItem = true;
    }
    if (!threwOnInvalidClassItem) throw new Error("Expected invalid class instance to throw in mode 'every'");

    // Class coercion filtering in mode: 'some'
    const partialClass = toArrayOfType([ent1, { id: 99 }, ent2], CustomEntity, { mode: "some" });
    if (partialClass.length !== 2 || partialClass[0] !== ent1 || partialClass[1] !== ent2) {
        throw new Error("Expected mode: 'some' to filter non-instance items for class target");
    }

    // Function Predicate as type target
    const isPositive = (v: any) => typeof v === "number" && v > 0;
    const positiveOnly = toArrayOfType([10, -5, 20], isPositive, { mode: "some" });
    if (positiveOnly.length !== 2 || positiveOnly[0] !== 10 || positiveOnly[1] !== 20) {
        throw new Error("Expected function predicate to filter in mode: 'some'");
    }

    // Function Transformer as type target
    const doubler = (v: any) => typeof v === "number" ? v * 2 : null;
    const doubled = toArrayOfType([2, 4, 6], doubler);
    if (doubled.length !== 3 || doubled[0] !== 4 || doubled[1] !== 8 || doubled[2] !== 12) {
        throw new Error("Expected function transformer to double values");
    }

    // 17. Scalar Value Wrapping
    const scalarNum = toArrayOfType(42, "number");
    if (scalarNum.length !== 1 || scalarNum[0] !== 42) throw new Error("Scalar number wrapping failed");

    const scalarStr = toArrayOfType("hello", "string");
    if (scalarStr.length !== 1 || scalarStr[0] !== "hello") throw new Error("Scalar string wrapping failed");

    // 18. Sparse Array / Holes Handling
    const sparse = new Array(3);
    sparse[0] = "1";
    sparse[2] = "3";
    const convertedSparse = toArrayOfType(sparse, "number", { allowNulls: true });
    if (convertedSparse.length !== 3 || convertedSparse[0] !== 1 || convertedSparse[1] !== undefined || convertedSparse[2] !== 3) {
        throw new Error("Sparse array with allowNulls failed");
    }

    console.log("✓ toArrayOfType comprehensive edge case tests passed!");
} catch (err: any) {
    console.error(`❌ toArrayOfType test failed: ${err.message}`);
    process.exit(1);
}
