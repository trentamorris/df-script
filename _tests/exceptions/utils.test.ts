export {};
declare const process: any;

import {
    assertColumnExists,
    assertHeight,
    assertNotNull,
    assertValidArgument,
    ColumnNotFoundError,
    ShapeError,
    InvalidArgumentError
} from "../../src/exceptions";

console.log("Running exceptions/utils.test.ts...");

// 1. assertColumnExists
const sampleCols = { a: [1, 2], b: ["x", "y"] };
assertColumnExists("a", sampleCols, "Select column");

try {
    assertColumnExists("missing", sampleCols, "Select column", " in left table.");
    throw new Error("Expected ColumnNotFoundError from assertColumnExists");
} catch (err: any) {
    if (!(err instanceof ColumnNotFoundError)) {
        throw new Error(`Expected ColumnNotFoundError, got ${err}`);
    }
    if (err.message !== 'Select column "missing" does not exist in left table.') {
        throw new Error(`Unexpected assertColumnExists message: ${err.message}`);
    }
}

// 2. assertHeight
if (assertHeight({}) !== 0) {
    throw new Error("Expected assertHeight({}) to return 0");
}
if (assertHeight({}, 5) !== 5) {
    throw new Error("Expected assertHeight({}, 5) to return 5");
}
if (assertHeight({ a: [1, 2, 3], b: new Int32Array([4, 5, 6]) }) !== 3) {
    throw new Error("Expected assertHeight to infer height 3");
}

try {
    assertHeight({ a: [1, 2], b: [1, 2, 3] });
    throw new Error("Expected ShapeError from mismatched column lengths");
} catch (err: any) {
    if (!(err instanceof ShapeError) || !err.message.includes('Column "b" has length 3, but DataFrame height is 2')) {
        throw new Error(`Unexpected assertHeight error: ${err}`);
    }
}

try {
    assertHeight({ a: [1, 2] }, 4);
    throw new Error("Expected ShapeError from explicit height mismatch");
} catch (err: any) {
    if (!(err instanceof ShapeError) || !err.message.includes('Column "a" has length 2, but DataFrame height is 4')) {
        throw new Error(`Unexpected assertHeight explicit error: ${err}`);
    }
}

// 3. assertNotNull
if (assertNotNull(123) !== 123) throw new Error("assertNotNull(123) mismatch");
if (assertNotNull(false) !== false) throw new Error("assertNotNull(false) mismatch");
if (assertNotNull("") !== "") throw new Error("assertNotNull('') mismatch");

try {
    assertNotNull(null, "Cannot be null");
    throw new Error("Expected InvalidArgumentError from assertNotNull(null)");
} catch (err: any) {
    if (!(err instanceof InvalidArgumentError) || err.message !== "Cannot be null") {
        throw new Error(`assertNotNull(null) error mismatch: ${err}`);
    }
}

try {
    assertNotNull(undefined);
    throw new Error("Expected InvalidArgumentError from assertNotNull(undefined)");
} catch (err: any) {
    if (!(err instanceof InvalidArgumentError) || err.message !== "Value cannot be null or undefined") {
        throw new Error(`assertNotNull(undefined) default message mismatch: ${err}`);
    }
}

// 4. assertValidArgument
assertValidArgument(true, "ok");
try {
    assertValidArgument(false, "Condition failed");
    throw new Error("Expected InvalidArgumentError from assertValidArgument");
} catch (err: any) {
    if (!(err instanceof InvalidArgumentError) || err.message !== "Condition failed") {
        throw new Error(`assertValidArgument message mismatch: ${err}`);
    }
}

console.log("✓ exceptions/utils.test.ts passed!");

