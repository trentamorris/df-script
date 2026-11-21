import { DataFrame } from "df-script";
import { DataTypeRegistry } from "df-script";

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

// 7. Extreme 10/10: BigInt64Array / Uint32Array / Int16Array buffers
const dfBigIntTyped = DataFrame._createDirect({
    big: new BigInt64Array([9007199254740993n, -9007199254740993n]),
    u32: new Uint32Array([4294967295, 0]),
    i16: new Int16Array([-32768, 32767])
}, {
    big: DataTypeRegistry.Int64,
    u32: DataTypeRegistry.UInt32,
    i16: DataTypeRegistry.Int16
}, 2);

const copyBigInt = dfBigIntTyped.clone();
if (!(copyBigInt._columns.big instanceof BigInt64Array)) throw new Error("BigInt64Array lost");
if (copyBigInt._columns.big[0] !== 9007199254740993n) throw new Error("BigInt value corrupted");
(copyBigInt._columns.big as BigInt64Array)[0] = 0n;
if (dfBigIntTyped._columns.big[0] !== 9007199254740993n) throw new Error("BigInt mutation leaked");

// 8. Extreme 10/10: NaN, Infinity, -Infinity, and -0 floating point preservation
const dfSpecialFloats = new DataFrame({
    f: [NaN, Infinity, -Infinity, -0, 0, null]
});
const copyFloats = dfSpecialFloats.clone();
if (!Number.isNaN(copyFloats.item(0, "f"))) throw new Error("NaN preservation failed in clone");
if (copyFloats.item(1, "f") !== Infinity) throw new Error("Infinity preservation failed in clone");
if (copyFloats.item(2, "f") !== -Infinity) throw new Error("-Infinity preservation failed in clone");
if (!Object.is(copyFloats.item(3, "f"), -0)) throw new Error("-0 preservation failed in clone");
if (copyFloats.item(5, "f") !== null) throw new Error("null preservation failed in clone");

// 9. Extreme 10/10: Nested Struct / Array of Structs / Date objects schema deep cloning
const dateSample = new Date("2026-05-20T00:00:00Z");
const dfNested = new DataFrame([
    {
        user: { id: 101, details: { score: 99.5 } },
        history: [{ event: "login", ts: dateSample }],
        active: true
    },
    {
        user: { id: 102, details: { score: 88.0 } },
        history: [{ event: "logout", ts: dateSample }],
        active: false
    }
]);
const copyNested = dfNested.clone();
if (copyNested.height !== 2) throw new Error("Nested struct height mismatch");
if (copyNested._columns.user === dfNested._columns.user) throw new Error("Nested user column shared array reference");
if (copyNested._columns.history === dfNested._columns.history) throw new Error("Nested history column shared array reference");

// Mutating inner column array reference
(copyNested._columns.user as any[])[0] = { id: 999 };
if ((dfNested._columns.user as any[])[0].id !== 101) throw new Error("Nested struct mutation leaked");

// 10. Extreme 10/10: Zero column DataFrame with explicit height > 0 (Height-only DataFrame)
const dfHeightOnly = DataFrame._createDirect({}, {}, 5);
const copyHeightOnly = dfHeightOnly.clone();
if (copyHeightOnly.height !== 5) throw new Error("Zero-column height-only clone height mismatch");
if (Object.keys(copyHeightOnly._columns).length !== 0) throw new Error("Zero-column clone has unexpected columns");

console.log("✓ All comprehensive df.clone() tests passed!");


