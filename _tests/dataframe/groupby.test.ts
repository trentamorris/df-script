import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src/api";

console.log("Running groupby tests...");

// ─── 1. Basic groupby ────────────────────────────────────────────────────────

const df = new DataFrame([
    { dept: "HR", salary: 1000 },
    { dept: "HR", salary: 2000 },
    { dept: "IT", salary: 4000 },
]);

const dfAgg = df.groupby("dept").agg(
    $df.col("salary").mean().alias("avg_salary")
);

if (dfAgg.height !== 2) throw new Error("Groupby aggregation height mismatch");
const collected = dfAgg.to_dicts();

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

const dfNullAgg = dfNull.groupby("cat").agg($df.col("val").sum().alias("total"));
if (dfNullAgg.height !== 2) throw new Error("null key should form its own group, expected 2 groups");

const nullGroup = (dfNullAgg.to_dicts() as any[]).find(r => r.cat === null);
const aGroup    = (dfNullAgg.to_dicts() as any[]).find(r => r.cat === "A");

if (!nullGroup) throw new Error("null group missing from groupby result");
if (nullGroup.total !== 30) throw new Error(`null group sum wrong: expected 30, got ${nullGroup.total}`);
if (!aGroup || aGroup.total !== 5) throw new Error("'A' group wrong");

// ─── 3. null vs empty string — distinct groups ────────────────────────────────
// null → "v:null", "" → "s:" — must not be collapsed into one group.

const dfMixed = new DataFrame([
    { cat: null, val: 1 },
    { cat: "",   val: 2 },
    { cat: "X",  val: 3 },
]);

const dfMixedAgg = dfMixed.groupby("cat").agg($df.col("val").sum().alias("total"));
if (dfMixedAgg.height !== 3) throw new Error("null and empty string must be separate groups, expected 3");

const mixedRows = dfMixedAgg.to_dicts() as any[];
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

const dfStrNullAgg = dfStrNull.groupby("cat").agg($df.col("val").sum().alias("total"));
if (dfStrNullAgg.height !== 2) throw new Error("null and string 'null' must be separate groups");

const strNullRows = dfStrNullAgg.to_dicts() as any[];
const nullGrp    = strNullRows.find(r => r.cat === null);
const strNullGrp = strNullRows.find(r => r.cat === "null");

if (!nullGrp    || nullGrp.total    !== 7) throw new Error("null group total wrong (vs string 'null')");
if (!strNullGrp || strNullGrp.total !== 8) throw new Error("string 'null' group total wrong");

// ─── 5. Multi-key groupby with partial nulls ──────────────────────────────────
// (a=1, b=null) and (a=1, b=2) must be distinct composite groups.

const dfMulti = new DataFrame([
    { a: 1, b: null, val: 10 },
    { a: 1, b: null, val: 20 },
    { a: 1, b: 2,    val: 5  },
]);

const dfMultiAgg = dfMulti.groupby(["a", "b"]).agg($df.col("val").sum().alias("total"));
if (dfMultiAgg.height !== 2) throw new Error("Multi-key: (1,null) and (1,2) should be distinct groups");

const multiRows = dfMultiAgg.to_dicts() as any[];
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

const dfAllNullAgg = dfAllNull.groupby("cat").agg($df.col("val").sum().alias("total"));
if (dfAllNullAgg.height !== 1) throw new Error("All-null key should produce exactly 1 group");
if ((dfAllNullAgg.to_dicts()[0] as any).total !== 6) throw new Error("All-null group sum wrong");

console.log("✓ groupby tests passed!");
