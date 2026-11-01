export {};
declare const process: any;

import { $df } from "../../src";
import {
    DFScriptError,
    DataFrameError,
    ColumnNotFoundError,
    SchemaError,
    ComputeError,
    ShapeError,
    InvalidArgumentError,
    IOStreamError
} from "../../src/exceptions";

console.log("Running exceptions/exceptions.test.ts...");

// 1. Direct instantiation, name property, and prototype chain
const baseErr = new DFScriptError("base message");
if (!(baseErr instanceof Error) || !(baseErr instanceof DFScriptError)) {
    throw new Error("DFScriptError prototype chain failed");
}
if (baseErr.name !== "DFScriptError" || baseErr.message !== "base message") {
    throw new Error("DFScriptError name or message mismatch");
}
if (typeof baseErr.stack !== "string") {
    throw new Error("Expected DFScriptError stack trace");
}

const dfErr = new DataFrameError("df message");
if (!(dfErr instanceof Error) || !(dfErr instanceof DFScriptError) || !(dfErr instanceof DataFrameError)) {
    throw new Error("DataFrameError prototype chain failed");
}
if (dfErr.name !== "DataFrameError" || dfErr.message !== "df message") {
    throw new Error("DataFrameError name or message mismatch");
}

const colDefaultErr = new ColumnNotFoundError("price");
if (!(colDefaultErr instanceof Error) || !(colDefaultErr instanceof DFScriptError) || !(colDefaultErr instanceof DataFrameError) || !(colDefaultErr instanceof ColumnNotFoundError)) {
    throw new Error("ColumnNotFoundError prototype chain failed");
}
if (colDefaultErr.name !== "ColumnNotFoundError" || colDefaultErr.message !== 'Column "price" does not exist in the DataFrame.') {
    throw new Error(`ColumnNotFoundError default message mismatch: ${colDefaultErr.message}`);
}

const colCustomErr = new ColumnNotFoundError("price", "Custom missing column error");
if (colCustomErr.message !== "Custom missing column error") {
    throw new Error(`ColumnNotFoundError custom message mismatch: ${colCustomErr.message}`);
}

const otherErrorClasses = [
    { Cls: SchemaError, name: "SchemaError" },
    { Cls: ComputeError, name: "ComputeError" },
    { Cls: ShapeError, name: "ShapeError" },
    { Cls: InvalidArgumentError, name: "InvalidArgumentError" },
    { Cls: IOStreamError, name: "IOStreamError" }
];

for (const { Cls, name } of otherErrorClasses) {
    const inst = new Cls(`${name} msg`);
    if (!(inst instanceof Error) || !(inst instanceof DFScriptError) || !(inst instanceof Cls)) {
        throw new Error(`${name} prototype chain failed`);
    }
    if (inst.name !== name || inst.message !== `${name} msg`) {
        throw new Error(`${name} properties failed`);
    }
}

// 2. Integration checks with DataFrame and ColumnExpr operations
try {
    const df = $df.data([{ a: 1 }]);
    df.toArray("non_existent" as any);
    throw new Error("Expected ColumnNotFoundError but no error was thrown");
} catch (err: any) {
    if (!(err instanceof ColumnNotFoundError) || !(err instanceof DFScriptError) || !(err instanceof Error)) {
        throw new Error(`Expected ColumnNotFoundError, got: ${err}`);
    }
}

try {
    const df = $df.data([{ a: [1, 2, 3] }]);
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

console.log("✓ exceptions/exceptions.test.ts passed!");

