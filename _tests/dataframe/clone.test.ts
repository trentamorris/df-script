import { DataFrame } from "../../src/dataframe";
import { DataTypeRegistry } from "../../src/datatypes";

console.log("Running comprehensive df.clone() tests...");

// 1. Standard DataFrame cloning & array reference isolation
const df1 = new DataFrame([
    { a: 1, b: "x" },
    { a: 2, b: "y" },
    { a: 3, b: "z" }
]);

const copy1 = df1.clone();
if (copy1 === df1) throw new Error("clone() returned same DataFrame reference");
if (copy1.height !== df1.height) throw new Error("clone() height mismatch");
if (copy1._columns.a === df1._columns.a) throw new Error("clone() column 'a' shared array reference");
if (copy1._columns.b === df1._columns.b) throw new Error("clone() column 'b' shared array reference");

// Mutating clone array must not affect original
(copy1._columns.a as any)[0] = 999;
if ((df1._columns.a as any)[0] !== 1) throw new Error("Mutation leaked into original DataFrame!");

// 2. TypedArray column cloning
const typedCols = {
    intCol: new Int32Array([10, 20, 30]),
    floatCol: new Float64Array([1.1, 2.2, 3.3])
};
const schema = {
    intCol: DataTypeRegistry.Int32,
    floatCol: DataTypeRegistry.Float64
};

const dfTyped = DataFrame._createDirect(typedCols, schema, 3);
const copyTyped = dfTyped.clone();

if (copyTyped.height !== 3) throw new Error("TypedArray clone height mismatch");
if (!(copyTyped._columns.intCol instanceof Int32Array)) throw new Error("TypedArray Int32Array type lost");
if (!(copyTyped._columns.floatCol instanceof Float64Array)) throw new Error("TypedArray Float64Array type lost");
if (copyTyped._columns.intCol === dfTyped._columns.intCol) throw new Error("Int32Array shared buffer reference");

// Mutating typed array clone
(copyTyped._columns.intCol as Int32Array)[0] = 777;
if ((dfTyped._columns.intCol as Int32Array)[0] !== 10) throw new Error("TypedArray mutation leaked");

// 3. Schema metadata preservation
if (copyTyped.schema.intCol !== DataTypeRegistry.Int32) throw new Error("Schema intCol mismatch");
if (copyTyped.schema.floatCol !== DataTypeRegistry.Float64) throw new Error("Schema floatCol mismatch");

// 4. Empty DataFrame cloning
const emptyDf = new DataFrame([]);
const emptyCopy = emptyDf.clone();
if (emptyCopy.height !== 0) throw new Error("Empty clone height mismatch");
if (Object.keys(emptyCopy._columns).length !== 0) throw new Error("Empty clone column count mismatch");

// 5. Complex/nested objects cloning
const dfComplex = new DataFrame([
    { meta: { id: 1 }, tags: ["a", "b"] },
    { meta: { id: 2 }, tags: ["c"] }
]);
const copyComplex = dfComplex.clone();
if (copyComplex.height !== 2) throw new Error("Complex clone height mismatch");
if (copyComplex._columns.meta === dfComplex._columns.meta) throw new Error("Complex column array shared reference");

console.log("✓ All comprehensive df.clone() tests passed!");
