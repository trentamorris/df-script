declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StructExpr.withFields tests...");

const df = $df.data([
    { s: { a: 1, b: "foo" } },
    { s: { a: 2, b: "bar" } },
    { s: null },
    { s: { a: 3, b: "baz" } }
]);

// 1. withFields with array of aliased expressions
const r4 = df.select([
    $df.col("s").struct.withFields([
        $df.lit(100).alias("c"),
        $df.col("s").struct.a.mul(10).alias("a")
    ]).alias("updated")
]).toDicts() as any[];

if (r4[0].updated.c !== 100 || r4[0].updated.a !== 10 || r4[0].updated.b !== "foo") {
    throw new Error("r4 row 0 mismatch: " + JSON.stringify(r4[0]));
}
if (r4[2].updated !== null) throw new Error("r4 row 2 mismatch");

// 2. withFields with Record object
const r5 = df.select([
    $df.col("s").struct.withFields({
        c: $df.lit(200),
        a: $df.col("s").struct.a.mul(20)
    }).alias("updated")
]).toDicts() as any[];

if (r5[0].updated.c !== 200 || r5[0].updated.a !== 20 || r5[0].updated.b !== "foo") {
    throw new Error("r5 row 0 mismatch: " + JSON.stringify(r5[0]));
}
if (r5[2].updated !== null) throw new Error("r5 row 2 mismatch");

// 3. Error when expression in array lacks alias/name
let threw = false;
try {
    df.select([
        $df.col("s").struct.withFields([$df.lit(42)])
    ]).toDicts();
} catch (e: any) {
    threw = true;
}
if (!threw) throw new Error("Expected withFields to throw when expression lacks alias");

// 4. Empty fields object or array keeps object unchanged
const rEmpty = df.select([
    $df.col("s").struct.withFields({}).alias("updated")
]).toDicts() as any[];
if (rEmpty[0].updated.a !== 1 || rEmpty[0].updated.b !== "foo") {
    throw new Error("Expected object preserved when withFields({}) is called");
}

// 5. Primitive / non-object column values evaluate to null
const dfPrimitives = $df.data([
    { s: 123 },
    { s: "string_val" }
], { s: $df.Object });
const rPrim = dfPrimitives.select([
    $df.col("s").struct.withFields({ x: $df.lit(1) }).alias("updated")
]).toDicts() as any[];
if (rPrim[0].updated !== null || rPrim[1].updated !== null) {
    throw new Error("Expected null for primitives");
}

// 6. withFields overwrites an existing key by name
const rOverwrite = df.select([
    $df.col("s").struct.withFields({ a: $df.lit(999) }).alias("s")
]).toDicts() as any[];
if (rOverwrite[0].s.a !== 999) throw new Error("Expected overwritten a=999");
if (rOverwrite[0].s.b !== "foo") throw new Error("Expected b preserved after overwrite");
if (rOverwrite[2].s !== null) throw new Error("Expected null row preserved on overwrite");

// 7. withFields with a lit(null) — explicitly sets a field to null
const rNullField = df.select([
    $df.col("s").struct.withFields({ a: $df.lit(null) }).alias("s")
]).toDicts() as any[];
if (rNullField[0].s.a !== null) throw new Error("Expected a=null after lit(null)");
if (rNullField[0].s.b !== "foo") throw new Error("Expected b preserved after null field");

// 8. withFields with a row-dependent expression (col referencing another column)
const dfMultiCol = $df.data([
    { s: { x: 1 }, factor: 10 },
    { s: { x: 2 }, factor: 20 },
    { s: null, factor: 30 }
]);
const rMultiCol = dfMultiCol.select([
    $df.col("s").struct.withFields({
        scaled: $df.col("factor").mul($df.col("s").struct.x)
    }).alias("s")
]).toDicts() as any[];
if (rMultiCol[0].s.scaled !== 10) throw new Error("Expected scaled=10");
if (rMultiCol[1].s.scaled !== 40) throw new Error("Expected scaled=40");
if (rMultiCol[2].s !== null) throw new Error("Expected null for null struct");

// 9. withFields with falsy field values (0, false, "")
const dfFalsy = $df.data([{ s: { a: 1 } }]);
const rFalsy = dfFalsy.select([
    $df.col("s").struct.withFields({
        zero: $df.lit(0),
        flag: $df.lit(false),
        empty: $df.lit("")
    }).alias("s")
]).toDicts() as any[];
if (rFalsy[0].s.zero !== 0) throw new Error("Expected zero=0");
if (rFalsy[0].s.flag !== false) throw new Error("Expected flag=false");
if (rFalsy[0].s.empty !== "") throw new Error("Expected empty=''");

// 10. Adding a new nested object field
const rNestedField = df.select([
    $df.col("s").struct.withFields({ meta: $df.lit({ v: 1 }) }).alias("s")
]).toDicts() as any[];
if (typeof rNestedField[0].s.meta !== "object" || rNestedField[0].s.meta.v !== 1) {
    throw new Error("Expected nested meta object");
}

// 11. withFields self-reference: new value reads the pre-mutation field
const dfSelfRef = $df.data([
    { s: { a: 4, b: 1 } },
    { s: { a: 7, b: 2 } }
]);
const rSelfRef = dfSelfRef.select([
    $df.col("s").struct.withFields({
        a: $df.col("s").struct.a.mul(2)
    }).alias("s")
]).toDicts() as any[];
if (rSelfRef[0].s.a !== 8)  throw new Error(`SelfRef: Expected a=8, got ${rSelfRef[0].s.a}`);
if (rSelfRef[1].s.a !== 14) throw new Error(`SelfRef: Expected a=14, got ${rSelfRef[1].s.a}`);
if (rSelfRef[0].s.b !== 1)  throw new Error(`SelfRef: Expected b=1 preserved`);

// 12. withFields adding an array-valued field
const dfArrVal = $df.data([{ s: { x: 1 } }, { s: null }]);
const rArrVal = dfArrVal.select([
    $df.col("s").struct.withFields({ tags: $df.lit([10, 20, 30]) }).alias("s")
]).toDicts() as any[];
if (!Array.isArray(rArrVal[0].s.tags) || rArrVal[0].s.tags[1] !== 20) {
    throw new Error(`ArrVal: Expected tags=[10,20,30], got ${JSON.stringify(rArrVal[0].s.tags)}`);
}
if (rArrVal[1].s !== null) throw new Error(`ArrVal: Expected null row preserved`);

// 13. Double-chained withFields — both chains read original column snapshot
const dfDoubleChain = $df.data([{ s: { a: 1 } }, { s: null }]);
const rDoubleChain = dfDoubleChain.select([
    $df.col("s").struct
        .withFields({ b: $df.col("s").struct.a.add(10) })
        .struct.withFields({ c: $df.col("s").struct.a.add(100) })
        .alias("s")
]).toDicts() as any[];
if (rDoubleChain[0].s.a !== 1)   throw new Error(`DoubleChain: Expected a=1`);
if (rDoubleChain[0].s.b !== 11)  throw new Error(`DoubleChain: Expected b=11, got ${rDoubleChain[0].s.b}`);
if (rDoubleChain[0].s.c !== 101) throw new Error(`DoubleChain: Expected c=101, got ${rDoubleChain[0].s.c}`);
if (rDoubleChain[1].s !== null)  throw new Error(`DoubleChain: Expected null row preserved`);

// 14. Edge case: withFields updating with falsy values (false, 0, "", null)
const dfFalsyUpdates = $df.data([{ s: { active: true, count: 5, str: "initial" } }]);
const rFalsyUpdates = dfFalsyUpdates.select([
    $df.col("s").struct.withFields({
        active: $df.lit(false),
        count: $df.lit(0),
        str: $df.lit(""),
        cleared: $df.lit(null)
    }).alias("s")
]).toDicts() as any[];
if (rFalsyUpdates[0].s.active !== false) throw new Error("Expected active to be false");
if (rFalsyUpdates[0].s.count !== 0) throw new Error("Expected count to be 0");
if (rFalsyUpdates[0].s.str !== "") throw new Error("Expected str to be empty string");
if (rFalsyUpdates[0].s.cleared !== null) throw new Error("Expected cleared to be null");

// 15. Edge case: withFields adding a nested struct
const dfNestedAdd = $df.data([{ s: { id: 10 } }]);
const rNestedAdd = dfNestedAdd.select([
    $df.col("s").struct.withFields({
        meta: $df.struct({ score: $df.lit(99), valid: $df.lit(true) })
    }).alias("s")
]).toDicts() as any[];
if (rNestedAdd[0].s.meta.score !== 99 || rNestedAdd[0].s.meta.valid !== true) {
    throw new Error("Expected nested struct added via withFields");
}

console.log("✓ StructExpr.withFields tests passed!");

