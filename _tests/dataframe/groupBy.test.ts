import { DataFrame } from "df-script";
import { $df } from "df-script";

console.log("Running groupBy tests...");

// ─── 1. Basic groupBy ────────────────────────────────────────────────────────

const df = new DataFrame([
    { dept: "HR", salary: 1000 },
    { dept: "HR", salary: 2000 },
    { dept: "IT", salary: 4000 },
]);

const dfAgg = df.groupBy("dept").agg(
    $df.col("salary").mean().alias("avg_salary")
);

if (dfAgg.height !== 2) throw new Error("groupBy aggregation height mismatch");
const collected = dfAgg.toDicts();

const hrRow = collected.find(r => r.dept === "HR");
const itRow = collected.find(r => r.dept === "IT");

if (!hrRow || hrRow.avg_salary !== 1500) throw new Error("HR average salary mismatch");
if (!itRow || itRow.avg_salary !== 4000) throw new Error("IT average salary mismatch");

// ─── 2. null key forms its own distinct group ─────────────────────────────────
// Previously null hashed to "" which could collide with other values.
// Now null → "v:null" — a distinct group from all non-null values.

const dfNull = new DataFrame([
    { cat: null, val: 10 },
    { cat: null, val: 20 },
    { cat: "A",  val: 5  },
]);

const dfNullAgg = dfNull.groupBy("cat").agg($df.col("val").sum().alias("total"));
if (dfNullAgg.height !== 2) throw new Error("null key should form its own group, expected 2 groups");

const nullGroup = (dfNullAgg.toDicts() as any[]).find(r => r.cat === null);
const aGroup    = (dfNullAgg.toDicts() as any[]).find(r => r.cat === "A");

if (!nullGroup) throw new Error("null group missing from groupBy result");
if (nullGroup.total !== 30) throw new Error(`null group sum wrong: expected 30, got ${nullGroup.total}`);
if (!aGroup || aGroup.total !== 5) throw new Error("'A' group wrong");

// ─── 3. null vs empty string — distinct groups ────────────────────────────────
// null → "v:null", "" → "s:" — must not be collapsed into one group.

const dfMixed = new DataFrame([
    { cat: null, val: 1 },
    { cat: "",   val: 2 },
    { cat: "X",  val: 3 },
]);

const dfMixedAgg = dfMixed.groupBy("cat").agg($df.col("val").sum().alias("total"));
if (dfMixedAgg.height !== 3) throw new Error("null and empty string must be separate groups, expected 3");

const mixedRows = dfMixedAgg.toDicts() as any[];
const byKey: Record<string, any> = {};
for (const r of mixedRows) byKey[r.cat ?? "__null__"] = r;

if (byKey["__null__"]?.total !== 1) throw new Error("null group total wrong");
if (byKey[""]?.total !== 2)         throw new Error("empty-string group total wrong");
if (byKey["X"]?.total !== 3)        throw new Error("'X' group total wrong");

// ─── 4. null vs string "null" — distinct groups ───────────────────────────────
// null → "v:null", "null" (the string) → "s:null" — must not collide.

const dfStrNull = new DataFrame([
    { cat: null,   val: 7 },
    { cat: "null", val: 8 },
]);

const dfStrNullAgg = dfStrNull.groupBy("cat").agg($df.col("val").sum().alias("total"));
if (dfStrNullAgg.height !== 2) throw new Error("null and string 'null' must be separate groups");

const strNullRows = dfStrNullAgg.toDicts() as any[];
const nullGrp    = strNullRows.find(r => r.cat === null);
const strNullGrp = strNullRows.find(r => r.cat === "null");

if (!nullGrp    || nullGrp.total    !== 7) throw new Error("null group total wrong (vs string 'null')");
if (!strNullGrp || strNullGrp.total !== 8) throw new Error("string 'null' group total wrong");

// ─── 5. Multi-key groupBy with partial nulls ──────────────────────────────────
// (a=1, b=null) and (a=1, b=2) must be distinct composite groups.

const dfMulti = new DataFrame([
    { a: 1, b: null, val: 10 },
    { a: 1, b: null, val: 20 },
    { a: 1, b: 2,    val: 5  },
]);

const dfMultiAgg = dfMulti.groupBy(["a", "b"]).agg($df.col("val").sum().alias("total"));
if (dfMultiAgg.height !== 2) throw new Error("Multi-key: (1,null) and (1,2) should be distinct groups");

const multiRows = dfMultiAgg.toDicts() as any[];
const nullPair  = multiRows.find(r => r.a === 1 && r.b === null);
const twoPair   = multiRows.find(r => r.a === 1 && r.b === 2);

if (!nullPair || nullPair.total !== 30) throw new Error("Multi-key null group total wrong");
if (!twoPair  || twoPair.total  !== 5 ) throw new Error("Multi-key (1,2) group total wrong");

// ─── 6. All-null key column — one group ──────────────────────────────────────

const dfAllNull = new DataFrame([
    { cat: null, val: 1 },
    { cat: null, val: 2 },
    { cat: null, val: 3 },
]);

const dfAllNullAgg = dfAllNull.groupBy("cat").agg($df.col("val").sum().alias("total"));
if (dfAllNullAgg.height !== 1) throw new Error("All-null key should produce exactly 1 group");
// ─── 7. NaN key forms its own group (NaN == NaN in group hashing, distinct from null) ────

const dfNaNKey = new DataFrame([
    { cat: NaN, val: 10 },
    { cat: NaN, val: 20 },
    { cat: null, val: 30 },
    { cat: 1, val: 40 },
]);

const dfNaNKeyAgg = dfNaNKey.groupBy("cat").agg($df.col("val").sum().alias("total"));
if (dfNaNKeyAgg.height !== 3) throw new Error("NaN, null, and number should form 3 distinct groups, got " + dfNaNKeyAgg.height);

const nanRows = dfNaNKeyAgg.toDicts() as any[];
const nanGroup = nanRows.find(r => typeof r.cat === "number" && Number.isNaN(r.cat));
const nullGrp7 = nanRows.find(r => r.cat === null);
const oneGrp = nanRows.find(r => r.cat === 1);

if (!nanGroup || nanGroup.total !== 30) throw new Error("NaN group total wrong: " + nanGroup?.total);
if (!nullGrp7 || nullGrp7.total !== 30) throw new Error("null group total wrong: " + nullGrp7?.total);
if (!oneGrp || oneGrp.total !== 40) throw new Error("one group total wrong: " + oneGrp?.total);

// ─── 8. Edge Cases for groupBy key input variations ───────────────────────────
// 8a. Array of keys vs single key string equivalence
const dfKeysTest = new DataFrame([
    { a: "x", b: 1, val: 10 },
    { a: "x", b: 1, val: 20 },
    { a: "y", b: 2, val: 30 },
]);
const aggSingle = dfKeysTest.groupBy("a").agg($df.col("val").sum().alias("s"));
const aggArray = dfKeysTest.groupBy(["a"]).agg($df.col("val").sum().alias("s"));
if (aggSingle.height !== aggArray.height || aggSingle.height !== 2) {
    throw new Error("Single string vs array key mismatch in groupBy");
}

// 8b. Empty keys array []
const aggEmptyKeys = dfKeysTest.groupBy([]).agg($df.col("val").sum().alias("s"));
if (aggEmptyKeys.height !== 1 || (aggEmptyKeys.toDicts()[0] as any).s !== 60) {
    throw new Error("Empty keys array [] in groupBy should group all rows into 1 global group");
}

// 8c. Non-existent column in groupBy throws ColumnNotFoundError
let threwNonExistent = false;
try {
    dfKeysTest.groupBy("non_existent_column" as any);
} catch (e: any) {
    if (e.name === "ColumnNotFoundError") threwNonExistent = true;
}
if (!threwNonExistent) throw new Error("groupBy with non-existent column must throw ColumnNotFoundError");

// ─── 9. Comprehensive Data Types as Grouping Keys ─────────────────────────────
// 9a. Boolean keys (true vs false)
const dfBool = new DataFrame([
    { flag: true, val: 1 },
    { flag: true, val: 2 },
    { flag: false, val: 3 },
]);
const dfBoolAgg = dfBool.groupBy("flag").agg($df.col("val").sum().alias("s"));
if (dfBoolAgg.height !== 2) throw new Error("boolean true and false should form 2 groups, got " + dfBoolAgg.height);
const boolRows = dfBoolAgg.toDicts() as any[];
if (boolRows.find(r => r.flag === true)?.s !== 3) throw new Error("boolean true group sum mismatch");
if (boolRows.find(r => r.flag === false)?.s !== 3) throw new Error("boolean false group sum mismatch");

// 9b. BigInt keys vs Number keys in an Object-typed column
const dfBigInt = new DataFrame(
    [
        { id: 100n, val: 10 },
        { id: 100n, val: 20 },
        { id: 100, val: 30 },
    ],
    { id: $df.Object, val: $df.Int32 }
);
const dfBigIntAgg = dfBigInt.groupBy("id").agg($df.col("val").sum().alias("s"));
if (dfBigIntAgg.height !== 2) throw new Error("BigInt 100n and Number 100 must be separate groups");
const biRows = dfBigIntAgg.toDicts() as any[];
if (biRows.find(r => typeof r.id === "bigint")?.s !== 30) throw new Error("BigInt 100n group sum mismatch");
if (biRows.find(r => typeof r.id === "number")?.s !== 30) throw new Error("Number 100 group sum mismatch");

// 9c. Date keys (identical timestamps vs different timestamps)
const d1 = new Date(1700000000000);
const d2 = new Date(1700000000000);
const d3 = new Date(1700000001000);
const dfDate = new DataFrame([
    { d: d1, val: 1 },
    { d: d2, val: 2 },
    { d: d3, val: 4 },
]);
const dfDateAgg = dfDate.groupBy("d").agg($df.col("val").sum().alias("s"));
if (dfDateAgg.height !== 2) throw new Error("Dates with same epoch time must group together");
const dateRows = dfDateAgg.toDicts() as any[];
const grp1 = dateRows.find(r => (r.d as Date).getTime() === 1700000000000);
const grp2 = dateRows.find(r => (r.d as Date).getTime() === 1700000001000);
if (!grp1 || grp1.s !== 3) throw new Error("Date epoch 1700000000000 sum mismatch");
if (!grp2 || grp2.s !== 4) throw new Error("Date epoch 1700000001000 sum mismatch");

// 9d. Null key group vs string "null" vs empty string ""
const dfNullUndef = new DataFrame({
    k: [null, null, "null", ""],
    val: [10, 20, 30, 40]
});
const dfNullUndefAgg = dfNullUndef.groupBy("k").agg($df.col("val").sum().alias("s"));
if (dfNullUndefAgg.height !== 3) throw new Error("null, 'null', and '' must form 3 distinct groups, got " + dfNullUndefAgg.height);
const nuRows = dfNullUndefAgg.toDicts() as any[];
if (nuRows.find(r => r.k === null)?.s !== 30) throw new Error("null group sum mismatch");
if (nuRows.find(r => r.k === "null")?.s !== 30) throw new Error("'null' group sum mismatch");
if (nuRows.find(r => r.k === "")?.s !== 40) throw new Error("'' group sum mismatch");

// 9e. Multi-key with various mixed primitive types in an Object column
const dfMultiMixed = new DataFrame(
    [
        { a: "A", b: 1, val: 10 },
        { a: "A", b: "1", val: 20 },
        { a: "A", b: 1, val: 30 },
    ],
    { a: $df.Utf8, b: $df.Object, val: $df.Int32 }
);
const dfMultiMixedAgg = dfMultiMixed.groupBy(["a", "b"]).agg($df.col("val").sum().alias("s"));
if (dfMultiMixedAgg.height !== 2) throw new Error("Multi-key (A, 1) and (A, '1') must be distinct groups");
const mmRows = dfMultiMixedAgg.toDicts() as any[];
if (mmRows.find(r => r.a === "A" && r.b === 1)?.s !== 40) throw new Error("Multi-key (A, 1) sum mismatch");
if (mmRows.find(r => r.a === "A" && r.b === "1")?.s !== 20) throw new Error("Multi-key (A, '1') sum mismatch");

// ─── 10. 10/10 Incredibly Complex Edge Cases ───────────────────────────────────

// 10a. Multi-Column with Special Unicode, Emoji, RTL text, and Null Byte Characters
const dfUnicode = new DataFrame([
    { lang: "English", tag: "alpha", val: 1 },
    { lang: "English", tag: "alpha\x00beta", val: 2 },      // embedded null byte
    { lang: "English", tag: "alpha\x00beta", val: 3 },      // embedded null byte duplicate
    { lang: "العربية", tag: "مرحبا", val: 10 },              // RTL Arabic
    { lang: "العربية", tag: "مرحبا", val: 20 },
    { lang: "🚀🔥", tag: "✨🌈", val: 100 },                  // Multi-codepoint surrogate pair emojis
    { lang: "🚀🔥", tag: "✨🌈", val: 200 },
    { lang: "Z\u200Bw\u200Bs", tag: "zero\u200Bwidth", val: 50 }, // Zero-width spaces
]);
const dfUnicodeAgg = dfUnicode.groupBy(["lang", "tag"]).agg($df.col("val").sum().alias("s"));
if (dfUnicodeAgg.height !== 5) throw new Error("Unicode & Special Char groupBy height mismatch, expected 5 got " + dfUnicodeAgg.height);
const unicodeRows = dfUnicodeAgg.toDicts() as any[];
if (unicodeRows.find(r => r.tag === "alpha\x00beta")?.s !== 5) throw new Error("Null-byte key sum mismatch");
if (unicodeRows.find(r => r.lang === "العربية")?.s !== 30) throw new Error("Arabic RTL key sum mismatch");
if (unicodeRows.find(r => r.lang === "🚀🔥")?.s !== 300) throw new Error("Surrogate pair emoji sum mismatch");
if (unicodeRows.find(r => r.lang === "Z\u200Bw\u200Bs")?.s !== 50) throw new Error("Zero-width space key sum mismatch");

// 10b. Symbol and RegExp objects as Grouping Keys in Object Columns
const symA = Symbol("keyA");
const symB = Symbol("keyB");
const rxA = /foo/g;
const rxB = /foo/i; // Different flags
const dfSymbols = new DataFrame(
    [
        { key: symA, val: 10 },
        { key: symA, val: 20 },
        { key: symB, val: 30 },
        { key: rxA, val: 40 },
        { key: rxA, val: 50 },
        { key: rxB, val: 60 },
    ],
    { key: $df.Object, val: $df.Int32 }
);
const dfSymbolsAgg = dfSymbols.groupBy("key").agg($df.col("val").sum().alias("s"));
if (dfSymbolsAgg.height !== 4) throw new Error("Symbols & RegExp keys height mismatch, expected 4 got " + dfSymbolsAgg.height);
const symRows = dfSymbolsAgg.toDicts() as any[];
if (symRows.find(r => r.key === symA)?.s !== 30) throw new Error("symA sum mismatch");
if (symRows.find(r => r.key === symB)?.s !== 30) throw new Error("symB sum mismatch");
if (symRows.find(r => r.key === rxA)?.s !== 90) throw new Error("rxA sum mismatch");
if (symRows.find(r => r.key === rxB)?.s !== 60) throw new Error("rxB sum mismatch");

// 10c. Nested Complex Objects and Key Ordering Invariance
const dfNested = new DataFrame(
    [
        { obj: { x: 1, y: [10, 20] }, val: 5 },
        { obj: { y: [10, 20], x: 1 }, val: 15 }, // swapped key order: must canonicalize identically
        { obj: { x: 1, y: [20, 10] }, val: 25 }, // swapped inner array elements: must be distinct
    ],
    { obj: $df.Object, val: $df.Int32 }
);
const dfNestedAgg = dfNested.groupBy("obj").agg($df.col("val").sum().alias("s"));
if (dfNestedAgg.height !== 2) throw new Error("Nested object key sorting invariance failed, expected 2 got " + dfNestedAgg.height);
const nestedRows = dfNestedAgg.toDicts() as any[];
const mergedGroup = nestedRows.find(r => r.obj.y[0] === 10);
const distinctGroup = nestedRows.find(r => r.obj.y[0] === 20);
if (!mergedGroup || mergedGroup.s !== 20) throw new Error("Nested objects with swapped key order failed to merge");
if (!distinctGroup || distinctGroup.s !== 25) throw new Error("Distinct nested arrays failed to separate");

// 10d. Objects with custom toJSON() implementations
const objWithJson1 = { id: 42, toJSON: () => "canonical-42" };
const objWithJson2 = { id: 999, toJSON: () => "canonical-42" }; // toJSON returns same canonical representation
const objWithJson3 = { id: 999, toJSON: () => "canonical-999" };
const dfJsonObj = new DataFrame(
    [
        { item: objWithJson1, val: 100 },
        { item: objWithJson2, val: 200 },
        { item: objWithJson3, val: 300 },
    ],
    { item: $df.Object, val: $df.Int32 }
);
const dfJsonObjAgg = dfJsonObj.groupBy("item").agg($df.col("val").sum().alias("s"));
if (dfJsonObjAgg.height !== 2) throw new Error("Custom toJSON() serialization in groupBy failed, expected 2 got " + dfJsonObjAgg.height);
const jsonRows = dfJsonObjAgg.toDicts() as any[];
const jsonMerged = jsonRows.find(r => r.item.toJSON() === "canonical-42");
if (!jsonMerged || jsonMerged.s !== 300) throw new Error("Custom toJSON group sum mismatch");

// 10e. Empty DataFrames with and without schema
const emptyDf = new DataFrame([], { a: $df.Utf8, b: $df.Int32 });
const emptyAgg = emptyDf.groupBy("a").agg($df.col("b").sum().alias("s"));
if (emptyAgg.height !== 0 || emptyAgg.width !== 2) throw new Error("Grouping empty DataFrame failed");

// 10f. Single Row DataFrame
const singleRowDf = new DataFrame([{ a: "solo", val: 42 }]);
const singleRowAgg = singleRowDf.groupBy("a").agg(
    $df.col("val").sum().alias("s"),
    $df.col("val").mean().alias("m"),
    $df.col("val").min().alias("min"),
    $df.col("val").max().alias("max")
);
if (singleRowAgg.height !== 1) throw new Error("Single row groupBy height mismatch");
const solo = singleRowAgg.toDicts()[0] as any;
if (solo.s !== 42 || solo.m !== 42 || solo.min !== 42 || solo.max !== 42) throw new Error("Single row multi-agg mismatch");

// 10g. Massive Cardinality (every single row is its own group)
const N = 10_000;
const uniqueKeys = new Array(N);
const uniqueVals = new Array(N);
for (let i = 0; i < N; i++) {
    uniqueKeys[i] = `key_${i}`;
    uniqueVals[i] = i;
}
const dfHighCard = new DataFrame({ k: uniqueKeys, v: uniqueVals });
const dfHighCardAgg = dfHighCard.groupBy("k").agg($df.col("v").sum().alias("s"));
if (dfHighCardAgg.height !== N) throw new Error(`High cardinality groupBy height mismatch: expected ${N}, got ${dfHighCardAgg.height}`);

// 10h. 100% Identical Rows (all rows collapse into a single group)
const identicalKeys = new Array(N).fill("single_partition");
const dfIdentical = new DataFrame({ k: identicalKeys, v: uniqueVals });
const dfIdenticalAgg = dfIdentical.groupBy("k").agg($df.col("v").count().alias("cnt"), $df.col("v").sum().alias("total"));
if (dfIdenticalAgg.height !== 1) throw new Error("Identical keys failed to collapse into 1 group");
const idenRow = dfIdenticalAgg.toDicts()[0] as any;
if (idenRow.cnt !== N || idenRow.total !== (N * (N - 1)) / 2) throw new Error("Identical group count or sum mismatch");

// 11. Computed Expression Grouping Keys: Output Naming & Aliasing
const dfExprBase = new DataFrame({
    dept: ["eng", "eng", "sales", "sales"],
    name: ["alice", "ALICE", "bob", "BOB"],
    salary: [1000, 1500, 2000, 2500],
    a: [1, 1, 2, 2],
    b: [10, 10, 20, 20],
    hireDate: [new Date("2022-01-10"), new Date("2022-05-20"), new Date("2023-03-15"), null],
    primary: [null, "p2", null, "p4"],
    fallback: ["f1", "f2", null, "f4"],
    group_x: [1, 1, 2, 2],
    group_y: ["a", "a", "b", "b"],
});

// 11a. Explicit .alias() naming
const resAlias = dfExprBase.groupBy($df.col("salary").div(1000).floor().alias("salary_k")).agg($df.col("salary").sum().alias("s"));
if (!resAlias.columns.includes("salary_k") || resAlias.height !== 2) throw new Error("11a: explicit alias failed");

// 11b. Unaliased single-column expression inherits root column name
const resUnaliased = dfExprBase.groupBy($df.col("name").str.toUpperCase()).agg($df.col("salary").sum().alias("s"));
if (!resUnaliased.columns.includes("name") || resUnaliased.height !== 2) throw new Error("11b: unaliased single-col expr failed");

// 11c. Duplicate unaliased binary expressions on same left operand throw duplicate-column error
let threwDup = false;
try {
    dfExprBase.groupBy([$df.col("a").add(1), $df.col("a").mul(2)]);
} catch {
    threwDup = true;
}
if (!threwDup) throw new Error("11c: expected duplicate-column error for two unaliased exprs on 'a'");

let threwDupStr = false;
try {
    dfExprBase.groupBy(["dept", "dept"]);
} catch {
    threwDupStr = true;
}
if (!threwDupStr) throw new Error("11c: expected duplicate-column error for ['dept', 'dept']");

let threwDupStrExpr = false;
try {
    dfExprBase.groupBy(["dept", $df.col("dept")]);
} catch {
    threwDupStrExpr = true;
}
if (!threwDupStrExpr) throw new Error("11c: expected duplicate-column error for ['dept', col('dept')]");

// 11d. Literal expression as grouping key
const resLit = dfExprBase.groupBy($df.lit("constant")).agg($df.col("salary").sum().alias("s"));
if (resLit.height !== 1 || resLit.item(0, "s") !== 7000) throw new Error("11d: literal groupBy failed");

// 12. Mixed Keys & Collision Semantics
// 12a. Mix of string and ColumnExpr preserves input order
const resMixed = dfExprBase.groupBy(["dept", $df.col("hireDate").dt.year().alias("year")]).agg($df.col("salary").sum().alias("s"));
if (resMixed.columns[0] !== "dept" || resMixed.columns[1] !== "year") throw new Error("12a: mixed key order mismatch");

// 12b. Computed key aliasing existing column ("dept") overwrites with computed values
const resOverwrite = dfExprBase.groupBy($df.col("salary").gt(1800).alias("dept")).agg($df.col("salary").mean().alias("m"));
const overwriteVals = resOverwrite.toArray("dept");
if (!overwriteVals.every(v => typeof v === "boolean")) throw new Error("12b: computed alias 'dept' did not overwrite original");

// 12c. Synthesized key referenced inside .agg() vs original column
const resSynthAgg = dfExprBase.groupBy($df.col("a").mul(2).alias("a2")).agg($df.col("a").sum().alias("orig_sum"), $df.col("a2").count().alias("synth_cnt"));
if (resSynthAgg.height !== 2 || resSynthAgg.item(0, "orig_sum") !== 2) throw new Error("12c: synthesized key agg failed");

// 13. Multi-Column Selector Expressions
const resMultiArr = dfExprBase.groupBy($df.col(["a", "b"])).agg($df.col("salary").sum().alias("s"));
if (resMultiArr.height !== 2 || resMultiArr.columns[0] !== "a" || resMultiArr.columns[1] !== "b") throw new Error("13a: array selector failed");

const resMultiRx = dfExprBase.groupBy($df.col(/^group_/)).agg($df.col("salary").sum().alias("s"));
if (resMultiRx.height !== 2 || !resMultiRx.columns.includes("group_x") || !resMultiRx.columns.includes("group_y")) throw new Error("13b: regex selector failed");

const resMultiType = dfExprBase.groupBy($df.col($df.Utf8)).agg($df.col("salary").sum().alias("s"));
if (resMultiType.height !== 4) throw new Error("13c: DataType selector failed");

const resZeroMatch = dfExprBase.groupBy($df.col(/^nonexistent_/)).agg($df.col("salary").sum().alias("s"));
if (resZeroMatch.height !== 1 || resZeroMatch.item(0, "s") !== 7000) throw new Error("13d: zero-match selector should collapse to 1 global group");

// 14. Expression Types & Rejections
// 14a. Temporal bucketing with null propagation
const resDt = dfExprBase.groupBy($df.col("hireDate").dt.year().alias("yr")).agg($df.col("salary").sum().alias("s"));
if (resDt.height !== 3) throw new Error("14a: temporal bucketing height mismatch");

// 14b. Conditional when/then/otherwise
const resWhen = dfExprBase.groupBy($df.when($df.col("salary").gt(1800)).then("high").otherwise("low").alias("tier")).agg($df.col("salary").count().alias("c"));
if (resWhen.height !== 2) throw new Error("14b: when/then/otherwise groupBy failed");

// 14c. Horizontal coalesce
const resCoalesce = dfExprBase.groupBy($df.coalesce($df.col("primary"), $df.col("fallback")).alias("key")).agg($df.col("salary").sum().alias("s"));
if (resCoalesce.height !== 4) throw new Error("14c: coalesce groupBy failed");

// 14d. Reject agg / window expressions in groupBy
let threwAgg = false;
try { dfExprBase.groupBy($df.col("salary").sum()); } catch { threwAgg = true; }
if (!threwAgg) throw new Error("14d: expected error for agg expression in groupBy");

let threwWin = false;
try { dfExprBase.groupBy($df.col("salary").rank().over("dept")); } catch { threwWin = true; }
if (!threwWin) throw new Error("14d: expected error for window expression in groupBy");

// 15. Empty DataFrame (schema-less and with schema + computed key)
const emptyNoSchemaAgg = new DataFrame([]).groupBy([]).agg($df.lit(1).count().alias("cnt"));
if (emptyNoSchemaAgg.height !== 0) throw new Error("15: empty schema-less DataFrame groupBy([]) failed");

const emptyExprDf = new DataFrame({ a: [] as string[], b: [] as number[] }, { a: $df.Utf8, b: $df.Int32 });
const resEmpty = emptyExprDf.groupBy($df.col("a").str.toLowerCase().alias("a_lower")).agg($df.col("b").sum().alias("b_sum"));
if (resEmpty.height !== 0 || !resEmpty.columns.includes("a_lower")) throw new Error("15: empty DataFrame computed groupBy failed");

// 16. Adversarial & Extreme Robustness Edge Cases
// 16a. Prototype-polluting string keys
const dfProtoStrings = new DataFrame([
    { k: "__proto__", val: 1 },
    { k: "__proto__", val: 2 },
    { k: "constructor", val: 3 },
    { k: "toString", val: 4 },
    { k: "valueOf", val: 5 },
    { k: "hasOwnProperty", val: 6 },
]);
const protoStrAgg = dfProtoStrings.groupBy("k").agg($df.col("val").sum().alias("s"));
if (protoStrAgg.height !== 5) throw new Error(`16a: Prototype string keys collided, got ${protoStrAgg.height}`);
if ((protoStrAgg.toDicts() as any[]).find(r => r.k === "__proto__")?.s !== 3) throw new Error("16a: __proto__ group sum mismatch");

// 16b. Null-prototype objects (Object.create(null))
const nullProto1 = Object.assign(Object.create(null), { a: 1, b: 2 });
const nullProto2 = Object.assign(Object.create(null), { b: 2, a: 1 });
const nullProto3 = Object.assign(Object.create(null), { a: 1, b: 3 });
const dfNullProto = new DataFrame(
    [
        { obj: nullProto1, val: 10 },
        { obj: nullProto2, val: 20 },
        { obj: nullProto3, val: 30 },
    ],
    { obj: $df.Object, val: $df.Int32 }
);
if (dfNullProto.groupBy("obj").agg($df.col("val").sum().alias("s")).height !== 2) {
    throw new Error("16b: Object.create(null) grouping failed");
}

// 16c. Signed zero (-0 vs +0), Infinity, -Infinity, and NaN
const dfSpecialNums = new DataFrame({
    n: [-0, +0, Infinity, -Infinity, NaN, NaN],
    val: [1, 2, 10, 20, 100, 200],
});
const specialNumAgg = dfSpecialNums.groupBy("n").agg($df.col("val").sum().alias("s"));
if (specialNumAgg.height !== 4) throw new Error(`16c: Expected 4 groups, got ${specialNumAgg.height}`);
const snRows = specialNumAgg.toDicts() as any[];
if (snRows.find(r => r.n === 0)?.s !== 3) throw new Error("16c: -0/+0 merge mismatch");
if (snRows.find(r => Number.isNaN(r.n))?.s !== 300) throw new Error("16c: NaN sum mismatch");

// 16d. BigInt inside nested objects
const dfNestedBigInt = new DataFrame(
    [
        { meta: { id: 9007199254740993n, tag: "a" }, val: 5 },
        { meta: { tag: "a", id: 9007199254740993n }, val: 15 },
        { meta: { id: 9007199254740994n, tag: "a" }, val: 25 },
    ],
    { meta: $df.Object, val: $df.Int32 }
);
if (dfNestedBigInt.groupBy("meta").agg($df.col("val").sum().alias("s")).height !== 2) {
    throw new Error("16d: Nested BigInt object canonicalization failed");
}

// 16e. Binary (Uint8Array) equality in Object column
const dfBinaryKeys = new DataFrame(
    [
        { bin: new Uint8Array([1, 2, 3]), val: 10 },
        { bin: new Uint8Array([1, 2, 3]), val: 20 },
        { bin: new Uint8Array([1, 2, 4]), val: 30 },
    ],
    { bin: $df.Object, val: $df.Int32 }
);
if (dfBinaryKeys.groupBy("bin").agg($df.col("val").sum().alias("s")).height !== 2) {
    throw new Error("16e: Identical Uint8Array keys failed to merge");
}

// 16f. $df.exclude(...) selector as grouping keys
const dfExcludeGroup = new DataFrame({
    region: ["North", "North", "South"],
    tier: ["Gold", "Gold", "Silver"],
    revenue: [100, 250, 400],
});
const excludeAgg = dfExcludeGroup.groupBy($df.exclude("revenue")).agg($df.col("revenue").sum().alias("total_rev"));
if (excludeAgg.height !== 2 || (excludeAgg.toDicts()[0] as any).total_rev !== 350) {
    throw new Error("16f: $df.all().exclude() groupBy failed");
}

// 16g. Parallel materialization: computed key shadowing "a" while sibling key reads original "a"
const dfShadow = new DataFrame({ a: [1, 2, 3], val: [10, 20, 30] });
const shadowAgg = dfShadow
    .groupBy([$df.col("a").gt(1).alias("a"), $df.col("a").mul(10).alias("a10")])
    .agg($df.col("val").sum().alias("s"));
if (shadowAgg.height !== 3 || (shadowAgg.toDicts() as any[]).find(r => r.a10 === 30)?.s !== 30) {
    throw new Error("16g: Parallel key materialization corrupted sibling input");
}

// 16h. First-seen group order preservation
const dfOrder = new DataFrame([
    { k: "Z", val: 1 },
    { k: null, val: 2 },
    { k: "A", val: 3 },
    { k: "Z", val: 4 },
    { k: null, val: 5 },
]);
const orderKeys = dfOrder.groupBy("k").agg($df.col("val").sum().alias("s")).toDicts().map((r: any) => r.k);
if (orderKeys[0] !== "Z" || orderKeys[1] !== null || orderKeys[2] !== "A") {
    throw new Error(`16h: First-seen group order not preserved: ${JSON.stringify(orderKeys)}`);
}

console.log("✓ groupBy tests passed!");

