declare const process: any;
import { $df } from "../../../../src/index";
import { DataTypeRegistry } from "../../../../src/datatypes";

console.log("Running StringExpr.join tests...");


const df = $df.data({
    tags: [["a", "b", "c"], ["x", "y"], [], ["foo", null, "bar"], null]
});

const res = df.select([
    $df.col("tags").str.join("-").alias("dash"),
    $df.col("tags").str.join().alias("def"),
    $df.col("tags").str.join("-", { ignoreNulls: true }).alias("ign_null")
]).toDicts() as any[];

if (res[0].dash !== "a-b-c" || res[0].def !== "abc") throw new Error("join row 0 failed");
if (res[1].dash !== "x-y") throw new Error("join row 1 failed");
if (res[2].dash !== "") throw new Error("join empty failed");
if (res[3].ign_null !== "foo-bar") throw new Error("join ignore nulls failed");
if (res[4].dash !== null) throw new Error("join null failed");

const dfTyped = $df.data({
    tags: [new Int32Array([1, 2, 3]), new Uint8Array([]), null]
}, {
    tags: DataTypeRegistry.Array(DataTypeRegistry.Int32)
});

const resTyped = dfTyped.select([
    $df.col("tags").str.join(",").alias("joined")
]).toDicts() as any[];

if (resTyped[0].joined !== "1,2,3") throw new Error("join TypedArray failed");
if (resTyped[1].joined !== "") throw new Error("join empty TypedArray failed");
if (resTyped[2].joined !== null) throw new Error("join null TypedArray failed");

// Test direct non-array value passed to join: isArrayOrTypedArray will return false and result in null
const nonArrayExpr = $df.lit("scalar_string" as any).str.join("-");
const resDirect = nonArrayExpr.evaluate({}, 1);
if (resDirect[0] !== null) throw new Error("join non-array scalar should evaluate to null");

console.log("✓ StringExpr.join tests passed!");
