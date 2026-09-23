declare const process: any;
import { toValidArray } from "../../../src/utils/array";

try {
    const arrNull = toValidArray(null);
    if (!Array.isArray(arrNull) || arrNull.length !== 0) throw new Error("null failed");
    const arrUndef = toValidArray(undefined);
    if (!Array.isArray(arrUndef) || arrUndef.length !== 0) throw new Error("undefined failed");

    const inputArr = [1, 2, 3];
    const arrCopied = toValidArray(inputArr);
    if (arrCopied === inputArr) throw new Error("shallow copy failed");
    if (arrCopied.length !== 3 || arrCopied[0] !== 1 || arrCopied[1] !== 2 || arrCopied[2] !== 3) {
        throw new Error("copied elements mismatch");
    }

    const typedArr = new Int32Array([10, 20]);
    const arrFromTyped = toValidArray(typedArr as any);
    if (!Array.isArray(arrFromTyped) || arrFromTyped[0] !== 10 || arrFromTyped[1] !== 20) {
        throw new Error("typed array conversion failed");
    }

    const arrScalar = toValidArray(42);
    if (!Array.isArray(arrScalar) || arrScalar.length !== 1 || arrScalar[0] !== 42) {
        throw new Error("scalar wrapping failed");
    }

    // clone: false test
    const arrZeroCopy = toValidArray(inputArr, { clone: false });
    if (arrZeroCopy !== inputArr) throw new Error("clone: false failed");

    // wrapNull: true test
    const arrWrapNull = toValidArray(null, { wrapNull: true });
    if (!Array.isArray(arrWrapNull) || arrWrapNull.length !== 1 || arrWrapNull[0] !== null) {
        throw new Error("wrapNull with null failed");
    }
    const arrWrapUndef = toValidArray(undefined, { wrapNull: true });
    if (!Array.isArray(arrWrapUndef) || arrWrapUndef.length !== 1 || arrWrapUndef[0] !== undefined) {
        throw new Error("wrapNull with undefined failed");
    }

    // 10/10 Complex Edge Cases

    // 1. Sparse Arrays (holes in array)
    const sparseArr = new Array(3);
    sparseArr[1] = "present";
    const arrSparseCopied = toValidArray(sparseArr);
    if (arrSparseCopied.length !== 3 || arrSparseCopied[0] !== undefined || arrSparseCopied[1] !== "present") {
        throw new Error("sparse array clone failed");
    }
    const arrSparseNoClone = toValidArray(sparseArr, { clone: false });
    if (arrSparseNoClone !== sparseArr) throw new Error("sparse array zero-copy failed");

    // 2. BigInt Typed Arrays (BigInt64Array / BigUint64Array)
    const bigIntArr = new BigInt64Array([100n, -200n]);
    const arrFromBigIntTyped = toValidArray(bigIntArr as any);
    if (!Array.isArray(arrFromBigIntTyped) || arrFromBigIntTyped.length !== 2 || arrFromBigIntTyped[0] !== 100n || arrFromBigIntTyped[1] !== -200n) {
        throw new Error("BigInt typed array conversion failed");
    }

    // 3. Subarray / Offset-backed Typed Arrays (byteOffset > 0, partial view)
    const buffer = new ArrayBuffer(16);
    const fullIntView = new Int32Array(buffer);
    fullIntView.set([11, 22, 33, 44]);
    const subTypedView = new Int32Array(buffer, 8, 2); // slice view: [33, 44]
    const arrFromSubTyped = toValidArray(subTypedView as any);
    if (arrFromSubTyped.length !== 2 || arrFromSubTyped[0] !== 33 || arrFromSubTyped[1] !== 44) {
        throw new Error("offset-backed typed array conversion failed");
    }

    // 4. Zero-length Typed Arrays
    const emptyTyped = new Float64Array(0);
    const arrEmptyTyped = toValidArray(emptyTyped as any);
    if (!Array.isArray(arrEmptyTyped) || arrEmptyTyped.length !== 0) {
        throw new Error("empty typed array conversion failed");
    }

    // 5. Array-like Objects (arguments, NodeList mockup, custom object with length)
    // Non-array array-likes without Array.isArray or typed array should be treated as scalar values
    const arrayLike = { 0: "a", 1: "b", length: 2 };
    const arrFromArrayLike = toValidArray(arrayLike);
    if (arrFromArrayLike.length !== 1 || arrFromArrayLike[0] !== arrayLike) {
        throw new Error("plain array-like object should be wrapped as a single element scalar");
    }

    // 6. DataView (ArrayBuffer view, but NOT a TypedArray)
    const dataView = new DataView(buffer);
    const arrFromDataView = toValidArray(dataView as any);
    if (arrFromDataView.length !== 1 || arrFromDataView[0] !== dataView) {
        throw new Error("DataView should be wrapped as scalar, not converted via Array.from");
    }

    // 7. Falsy and Special Scalars
    const falsyValues: any[] = [0, -0, false, "", NaN, 0n, Symbol.for("test")];
    for (let i = 0; i < falsyValues.length; i++) {
        const val = falsyValues[i];
        const res = toValidArray(val);
        if (!Array.isArray(res) || res.length !== 1) {
            throw new Error(`falsy value at index ${i} failed to wrap`);
        }
        if (Number.isNaN(val)) {
            if (!Number.isNaN(res[0])) throw new Error("NaN scalar failed");
        } else if (Object.is(val, -0)) {
            if (!Object.is(res[0], -0)) throw new Error("-0 scalar failed");
        } else if (res[0] !== val) {
            throw new Error(`falsy value ${String(val)} mismatch`);
        }
    }

    // 8. Functions, Regexes, Dates, and Class Instances
    const fn = () => 42;
    const regex = /pattern/gi;
    const date = new Date(1700000000000);
    class DummyClass { x = 1; }
    const classInst = new DummyClass();

    if (toValidArray(fn)[0] !== fn) throw new Error("function wrap failed");
    if (toValidArray(regex)[0] !== regex) throw new Error("regex wrap failed");
    if (toValidArray(date)[0] !== date) throw new Error("date wrap failed");
    if (toValidArray(classInst)[0] !== classInst) throw new Error("class instance wrap failed");

    // 9. Nested Arrays
    const nested = [[1, 2], [3, 4]];
    const arrNested = toValidArray(nested);
    if (arrNested === nested) throw new Error("nested array outer shallow clone failed");
    if (arrNested[0] !== nested[0] || arrNested[1] !== nested[1]) {
        throw new Error("nested array should retain inner array references (shallow)");
    }
    const arrNestedNoClone = toValidArray(nested, { clone: false });
    if (arrNestedNoClone !== nested) throw new Error("nested array clone: false failed");

    // 10. Frozen & Sealed Arrays
    const frozenArr = Object.freeze(["x", "y"]);
    const arrFromFrozen = toValidArray(frozenArr);
    if (Object.isFrozen(arrFromFrozen)) {
        throw new Error("shallow copy of frozen array should produce a mutable new array");
    }
    arrFromFrozen.push("z"); // Should not throw
    const arrFromFrozenNoClone = toValidArray(frozenArr, { clone: false });
    if (arrFromFrozenNoClone !== frozenArr || !Object.isFrozen(arrFromFrozenNoClone)) {
        throw new Error("clone: false on frozen array should preserve original frozen reference");
    }

    // 11. Empty Arrays
    const emptyArr: any[] = [];
    const arrEmptyCopied = toValidArray(emptyArr);
    if (arrEmptyCopied === emptyArr) throw new Error("empty array shallow clone failed");
    if (arrEmptyCopied.length !== 0) throw new Error("empty array length mismatch");
    const arrEmptyNoClone = toValidArray(emptyArr, { clone: false });
    if (arrEmptyNoClone !== emptyArr) throw new Error("empty array clone: false failed");

    console.log("✓ toValidArray tests passed!");
} catch (err: any) {
    console.error(`❌ toValidArray test failed: ${err.message}`);
    process.exit(1);
}
