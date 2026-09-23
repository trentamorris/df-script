import { DataFrame } from "../../src/dataframe";

console.log("Running pivot tests...");

// ─── 1. Basic pivot ───────────────────────────────────────────────────────────

const df = new DataFrame([
    { year: 2020, month: "Jan", sales: 100 },
    { year: 2020, month: "Feb", sales: 150 },
    { year: 2021, month: "Jan", sales: 200 },
    { year: 2021, month: "Feb", sales: 250 },
]);

const dfPivoted = df.pivot({ index: "year", columns: "month", values: "sales" });

if (dfPivoted.height !== 2) throw new Error(`Expected height 2, got ${dfPivoted.height}`);

const collected = dfPivoted.toDicts();
const y2020 = collected.find(r => r.year === 2020);
const y2021 = collected.find(r => r.year === 2021);

if (!y2020 || y2020.Jan !== 100 || y2020.Feb !== 150) throw new Error("2020 pivoted values mismatch");
if (!y2021 || y2021.Jan !== 200 || y2021.Feb !== 250) throw new Error("2021 pivoted values mismatch");

// ─── 2. null index key — forms its own distinct row ──────────────────────────
// Previously null hashed to "" which could merge it with other rows.
// Now null → "v:null" so it is correctly isolated as its own pivot row.

const dfNullIdx = new DataFrame([
    { grp: null, col: "A", val: 10 },
    { grp: null, col: "B", val: 20 },
    { grp: "X",  col: "A", val: 30 },
    { grp: "X",  col: "B", val: 40 },
]);

const dfNullPivot = dfNullIdx.pivot({ index: "grp", columns: "col", values: "val" });
if (dfNullPivot.height !== 2) throw new Error(`null index: expected 2 rows, got ${dfNullPivot.height}`);

const pivotRows = dfNullPivot.toDicts() as any[];
const nullRow = pivotRows.find(r => r.grp === null);
const xRow    = pivotRows.find(r => r.grp === "X");

if (!nullRow) throw new Error("null index row missing from pivot result");
if (nullRow.A !== 10 || nullRow.B !== 20) throw new Error("null index row values wrong");
if (!xRow || xRow.A !== 30 || xRow.B !== 40) throw new Error("'X' index row values wrong");

// ─── 3. null vs empty string index — distinct rows ────────────────────────────
// null → "v:null", "" → "s:" — must produce separate index rows.

const dfMixedIdx = new DataFrame([
    { grp: null, col: "A", val: 1 },
    { grp: "",   col: "A", val: 2 },
]);

const dfMixedPivot = dfMixedIdx.pivot({ index: "grp", columns: "col", values: "val" });
if (dfMixedPivot.height !== 2) throw new Error("null and empty string index must be separate pivot rows");

const mixedRows = dfMixedPivot.toDicts() as any[];
const mNullRow  = mixedRows.find(r => r.grp === null);
const mEmptyRow = mixedRows.find(r => r.grp === "");

if (!mNullRow  || mNullRow.A  !== 1) throw new Error("null index pivot value wrong");
if (!mEmptyRow || mEmptyRow.A !== 2) throw new Error("empty-string index pivot value wrong");

// ─── 4. null vs string "null" index — distinct rows ──────────────────────────
// null → "v:null", "null" (string) → "s:null" — must not collide.

const dfStrNull = new DataFrame([
    { grp: null,   col: "A", val: 5 },
    { grp: "null", col: "A", val: 6 },
]);

const dfStrNullPivot = dfStrNull.pivot({ index: "grp", columns: "col", values: "val" });
if (dfStrNullPivot.height !== 2) throw new Error("null and string 'null' index must be separate pivot rows");

const strNullRows   = dfStrNullPivot.toDicts() as any[];
const sNullRow      = strNullRows.find(r => r.grp === null);
const sStrNullRow   = strNullRows.find(r => r.grp === "null");

if (!sNullRow    || sNullRow.A    !== 5) throw new Error("null index pivot value wrong (vs string 'null')");
if (!sStrNullRow || sStrNullRow.A !== 6) throw new Error("string 'null' index pivot value wrong");

// ─── 5. Multi-key index with partial nulls ────────────────────────────────────
// (a=1, b=null) and (a=1, b=2) must be distinct index rows.

const dfMulti = new DataFrame([
    { a: 1, b: null, col: "X", val: 10 },
    { a: 1, b: 2,    col: "X", val: 20 },
]);

const dfMultiPivot = dfMulti.pivot({ index: ["a", "b"], columns: "col", values: "val" });
if (dfMultiPivot.height !== 2) throw new Error("Multi-key: (1,null) and (1,2) should be distinct pivot rows");

const multiRows = dfMultiPivot.toDicts() as any[];
const nullIdx   = multiRows.find(r => r.a === 1 && r.b === null);
const twoIdx    = multiRows.find(r => r.a === 1 && r.b === 2);

if (!nullIdx || nullIdx.X !== 10) throw new Error("Multi-key null index pivot value wrong");
if (!twoIdx  || twoIdx.X  !== 20) throw new Error("Multi-key (1,2) index pivot value wrong");

// ─── 6. Unmatched pivot cells filled with null ────────────────────────────────
// A pivot column that only exists for one index row should be null for others.

const dfSparse = new DataFrame([
    { grp: "A", col: "X", val: 1 },
    { grp: "B", col: "Y", val: 2 },
]);

const dfSparsePivot = dfSparse.pivot({ index: "grp", columns: "col", values: "val" });
if (dfSparsePivot.height !== 2) throw new Error("Sparse pivot height mismatch");

const sparseRows = dfSparsePivot.toDicts() as any[];
const aRow = sparseRows.find(r => r.grp === "A");
const bRow = sparseRows.find(r => r.grp === "B");

if (!aRow || aRow.X !== 1 || aRow.Y !== null) throw new Error("Sparse pivot row A wrong");
if (!bRow || bRow.Y !== 2 || bRow.X !== null) throw new Error("Sparse pivot row B wrong");

// ─── 7. Empty DataFrame pivot ────────────────────────────────────────────────
const dfEmpty = new DataFrame([]);
const dfEmptyPivot = dfEmpty.pivot({ index: "a", columns: "b", values: "c" });
if (dfEmptyPivot.height !== 0 || dfEmptyPivot.width !== 0) {
    throw new Error("7. Empty DataFrame pivot failed");
}

// ─── 8. Numeric and Date pivot column keys ────────────────────────────────────
const dfNumCols = new DataFrame([
    { grp: "item1", quarter: 1, amount: 100 },
    { grp: "item1", quarter: 2, amount: 200 },
    { grp: "item2", quarter: 1, amount: 300 },
]);
const dfNumPivot = dfNumCols.pivot({ index: "grp", columns: "quarter", values: "amount" });
if (dfNumPivot.height !== 2 || !dfNumPivot.columns.includes("1") || !dfNumPivot.columns.includes("2")) {
    throw new Error("8. Numeric column key pivot failed");
}
const numPivDicts = dfNumPivot.toDicts() as any[];
const item2 = numPivDicts.find(r => r.grp === "item2");
if (!item2 || item2["1"] !== 300 || item2["2"] !== null) {
    throw new Error("8. Numeric pivot values mismatch");
}

// ─── 9. Multi-index with 3 columns and Date values ───────────────────────────
const d1 = new Date("2023-01-01");
const d2 = new Date("2023-06-01");
const dfMultiDate = new DataFrame([
    { org: "Acme", region: "US", dept: "HR", eventDate: d1 },
    { org: "Acme", region: "US", dept: "IT", eventDate: d2 },
    { org: "Acme", region: "EU", dept: "HR", eventDate: d2 },
]);
const dfDatePivot = dfMultiDate.pivot({
    index: ["org", "region"],
    columns: "dept",
    values: "eventDate"
});
if (dfDatePivot.height !== 2 || dfDatePivot.width !== 4) {
    throw new Error(`9. Multi-index Date pivot shape mismatch: expected (2, 4), got ${dfDatePivot.shape}`);
}
const dateDicts = dfDatePivot.toDicts() as any[];
const euRow = dateDicts.find(r => r.org === "Acme" && r.region === "EU");
if (!euRow || euRow.HR !== d2 || euRow.IT !== null) {
    throw new Error("9. Date pivot cell values mismatch");
}

console.log("✓ pivot tests passed!");
