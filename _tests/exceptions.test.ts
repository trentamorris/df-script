import { $df } from "../src";
import { DFScriptError, ColumnNotFoundError, ComputeError } from "../src/exceptions";

// Verify exceptions are thrown and inherit correctly
try {
    const df = $df.data([{ a: 1 }]);
    df.toArray("non_existent" as any);
    throw new Error("Expected ColumnNotFoundError but no error was thrown");
} catch (err: any) {
    if (!(err instanceof ColumnNotFoundError)) {
        throw new Error(`Expected ColumnNotFoundError, got: ${err}`);
    }
    if (!(err instanceof DFScriptError)) {
        throw new Error(`Expected err to be instance of DFScriptError`);
    }
    if (!(err instanceof Error)) {
        throw new Error(`Expected err to be instance of Error`);
    }
}

try {
    const df = $df.data([{ a: [1, 2, 3] }]);
    // Use .arr.get(5, false) which throws OOB
    df.select($df.col("a").arr.get(5, false)).toDicts();
    throw new Error("Expected ComputeError but no error was thrown");
} catch (err: any) {
    if (!(err instanceof ComputeError)) {
        throw new Error(`Expected ComputeError, got: ${err}`);
    }
}

try {
    const df = $df.data([{ a: 1 }]);
    df.select($df.col("a").quantile(1.5)).toDicts();
    throw new Error("Expected ComputeError but no error was thrown");
} catch (err: any) {
    if (!(err instanceof ComputeError)) {
        throw new Error(`Expected ComputeError, got: ${err}`);
    }
}

try {
    const df = $df.data([{ a: [1, 2, 3] }]);
    df.select($df.col("a").arr.gatherEvery({ step: 0 })).toDicts();
    throw new Error("Expected Error but no error was thrown");
} catch (err: any) {
    if (!(err instanceof Error) || err.message !== "Step size step cannot be zero") {
        throw new Error(`Expected Step size step cannot be zero Error, got: ${err}`);
    }
}

try {
    const df = $df.data([{ a: [1, 2, 3] }]);
    // Start index 5 is out of bounds for array of length 3
    df.select($df.col("a").arr.gatherEvery({ offsetStart: 5, nullOnOob: false })).toDicts();
    throw new Error("Expected Error but no error was thrown for out-of-bounds start");
} catch (err: any) {
    if (!(err instanceof Error) || !err.message.includes("is out of bounds")) {
        throw new Error(`Expected out of bounds Error, got: ${err}`);
    }
}


// When nullOnOob is true, it should return null without throwing
const df_oob_null = $df.data({ a: [[1, 2, 3]] });
const result_oob_null = df_oob_null.select($df.col("a").arr.gatherEvery({ offsetStart: 5, nullOnOob: true }).alias("sliced")).toDicts();
if (result_oob_null[0].sliced !== null) {
    throw new Error(`Expected sliced result to be null, got ${JSON.stringify(result_oob_null[0].sliced)}`);
}

// Verify assertion utilities in exceptions/utils.ts
import { assertNotNull, assertValidArgument, assertColumnExists } from "../src/exceptions";

// assertNotNull
if (assertNotNull(123) !== 123) throw new Error("assertNotNull return value mismatch");
try {
    assertNotNull(null, "Cannot be null");
    throw new Error("Expected InvalidArgumentError from assertNotNull");
} catch (err: any) {
    if (err.message !== "Cannot be null") throw new Error("assertNotNull message mismatch");
}

// assertValidArgument
assertValidArgument(true, "ok");
try {
    assertValidArgument(false, "Condition failed");
    throw new Error("Expected InvalidArgumentError from assertValidArgument");
} catch (err: any) {
    if (err.message !== "Condition failed") throw new Error("assertValidArgument message mismatch");
}

console.log("✓ Custom exceptions testing passed!");
