import { $tbl } from "../../src"
import { DFScriptError, ColumnNotFoundError, ComputeError } from "../../src/exceptions"

// Verify exceptions are thrown and inherit correctly
try {
    const df = $tbl.data([{ a: 1 }]);
    df.to_list("non_existent" as any);
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
    const df = $tbl.data([{ a: [1, 2, 3] }]);
    // Use .list.get(5, false) which throws OOB
    df.select($tbl.col("a").list.get(5, false)).to_dicts();
    throw new Error("Expected ComputeError but no error was thrown");
} catch (err: any) {
    if (!(err instanceof ComputeError)) {
        throw new Error(`Expected ComputeError, got: ${err}`);
    }
}

try {
    const df = $tbl.data([{ a: 1 }]);
    df.select($tbl.col("a").quantile(1.5)).to_dicts();
    throw new Error("Expected ComputeError but no error was thrown");
} catch (err: any) {
    if (!(err instanceof ComputeError)) {
        throw new Error(`Expected ComputeError, got: ${err}`);
    }
}

console.log("✓ Custom exceptions testing passed!");
