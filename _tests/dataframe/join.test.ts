import { DataFrame } from "../../src/dataframe";

console.log("Running join tests...");

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const left = new DataFrame([
    { id: 1, val: "L1" },
    { id: 2, val: "L2" },
]);

const right = new DataFrame([
    { id: 1, rval: "R1" },
    { id: 3, rval: "R3" },
]);

// ─── 1. Inner Join ────────────────────────────────────────────────────────────

const dfInner = left.join({ other: right, on: "id", how: "inner" });
if (dfInner.height !== 1) throw new Error("Inner join height mismatch");
const innerRow = dfInner.to_dicts()[0] as any;
if (innerRow.val !== "L1" || innerRow.rval !== "R1") throw new Error("Inner join values mismatch");

// ─── 2. Left Join ─────────────────────────────────────────────────────────────

const dfLeft = left.join({ other: right, on: "id", how: "left" });
if (dfLeft.height !== 2) throw new Error("Left join height mismatch");
const leftRows = dfLeft.to_dicts() as any[];
if (leftRows[1].val !== "L2" || leftRows[1].rval !== null) throw new Error("Left join values mismatch");

// ─── 3. Right Join ────────────────────────────────────────────────────────────

const dfRight = left.join({ other: right, on: "id", how: "right" });
if (dfRight.height !== 2) throw new Error("Right join height mismatch");
const rightRows = dfRight.to_dicts() as any[];
if (rightRows[1].rval !== "R3" || rightRows[1].val !== null) throw new Error("Right join values mismatch");

// ─── 4. Outer Join ────────────────────────────────────────────────────────────

const dfOuter = left.join({ other: right, on: "id", how: "outer" });
if (dfOuter.height !== 3) throw new Error("Outer join height mismatch");

// ─── 5. Semi Join ─────────────────────────────────────────────────────────────

const dfSemi = left.join({ other: right, on: "id", how: "semi" });
if (dfSemi.height !== 1) throw new Error("Semi join height mismatch");
const semiRow = dfSemi.to_dicts()[0] as any;
if (semiRow.id !== 1 || semiRow.val !== "L1" || "rval" in semiRow) throw new Error("Semi join values/columns mismatch");

// ─── 6. Anti Join ─────────────────────────────────────────────────────────────

const dfAnti = left.join({ other: right, on: "id", how: "anti" });
if (dfAnti.height !== 1) throw new Error("Anti join height mismatch");
const antiRow = dfAnti.to_dicts()[0] as any;
if (antiRow.id !== 2 || antiRow.val !== "L2" || "rval" in antiRow) throw new Error("Anti join values/columns mismatch");

// ─── 7. Suffix Collision Protection ───────────────────────────────────────────

const dfA = new DataFrame([{ id: 1, val: "A_val" }]);
const dfB = new DataFrame([{ id: 1, val: "B_val", val_right: "B_existing_val_right" }]);
const dfSuffixed = dfA.join({ other: dfB, on: "id" });
const suffixedDict = dfSuffixed.to_dicts()[0] as any;
if (!("val" in suffixedDict) || !("val_right" in suffixedDict) || !("val_right_right" in suffixedDict)) {
    throw new Error("Suffix collision protection failed: missing resolved column name");
}
if (suffixedDict.val !== "A_val" || suffixedDict.val_right !== "B_val" || suffixedDict.val_right_right !== "B_existing_val_right") {
    throw new Error("Suffix collision protection failed: value corruption");
}

// ─── 8. join_nulls: false (default) ──────────────────────────────────────────

const dfNullA = new DataFrame([{ id: null, val: "A" }, { id: 1, val: "B" }]);
const dfNullB = new DataFrame([{ id: null, val: "C" }, { id: 1, val: "D" }]);
const dfNoNullJoin = dfNullA.join({ other: dfNullB, on: "id", join_nulls: false });
if (dfNoNullJoin.height !== 1) throw new Error("Expected join_nulls:false to exclude null key matches");

// ─── 9. join_nulls: true ──────────────────────────────────────────────────────

const dfWithNullJoin = dfNullA.join({ other: dfNullB, on: "id", join_nulls: true });
if (dfWithNullJoin.height !== 2) throw new Error("Expected join_nulls:true to include null key matches");

// ─── 10. null key vs. string "null" — no collision ───────────────────────────
// Previously computeRowHash mapped null → "" which could collide with other values.
// Now toCanonicalString("null") → "s:null" and toCanonicalString(null) → "v:null".

const dfNullStr_L = new DataFrame([{ id: null, v: "left_null" }, { id: "null", v: "left_str_null" }]);
const dfNullStr_R = new DataFrame([{ id: null, rv: "right_null" }, { id: "null", rv: "right_str_null" }]);
const dfNullStrJoin = dfNullStr_L.join({ other: dfNullStr_R, on: "id", how: "inner", join_nulls: true });
if (dfNullStrJoin.height !== 2) throw new Error("null key and string 'null' should not collide");
const nullStrRows = dfNullStrJoin.to_dicts() as any[];
const byV: Record<string, any> = {};
for (const r of nullStrRows) byV[r.v] = r;
if (byV["left_null"]?.rv !== "right_null") throw new Error("null row matched wrong right row");
if (byV["left_str_null"]?.rv !== "right_str_null") throw new Error("string 'null' row matched wrong right row");

// ─── 11. null key vs. empty string — no collision ────────────────────────────
// null → "v:null", "" → "s:" — distinct hashes

const dfEmptyStr_L = new DataFrame([{ id: null, v: "left_null" }, { id: "", v: "left_empty" }]);
const dfEmptyStr_R = new DataFrame([{ id: null, rv: "right_null" }, { id: "", rv: "right_empty" }]);
const dfEmptyJoin = dfEmptyStr_L.join({ other: dfEmptyStr_R, on: "id", how: "inner", join_nulls: true });
if (dfEmptyJoin.height !== 2) throw new Error("null key and empty-string key should not collide");
const emptyRows = dfEmptyJoin.to_dicts() as any[];
const byV2: Record<string, any> = {};
for (const r of emptyRows) byV2[r.v] = r;
if (byV2["left_null"]?.rv !== "right_null") throw new Error("null row matched wrong right row (empty string collision)");
if (byV2["left_empty"]?.rv !== "right_empty") throw new Error("empty-string row matched wrong right row");

// ─── 12. Multi-key join ───────────────────────────────────────────────────────

const ml = new DataFrame([{ a: 1, b: 2, v: "X" }, { a: 1, b: 3, v: "Y" }]);
const mr = new DataFrame([{ a: 1, b: 2, rv: "RX" }, { a: 2, b: 2, rv: "R22" }]);
const dfMultiKey = ml.join({ other: mr, on: ["a", "b"], how: "inner" });
if (dfMultiKey.height !== 1) throw new Error("Multi-key inner join height mismatch");
if ((dfMultiKey.to_dicts()[0] as any).v !== "X") throw new Error("Multi-key inner join value mismatch");

// ─── 13. Multi-key, join_nulls:false — partial null key skipped ──────────────
// Row with a=1, b=null on the right should not match anything; ends up as unmatched outer row

const outerL = new DataFrame([{ a: 1, b: 1, v: "L1" }]);
const outerR = new DataFrame([{ a: 1, b: null, rv: "Rnull" }, { a: 1, b: 1, rv: "R1" }]);
const dfPartialNull = outerL.join({ other: outerR, on: ["a", "b"], how: "outer", join_nulls: false });
// Expected: matched row (1,1) + unmatched right row (1,null)
if (dfPartialNull.height !== 2) throw new Error("Multi-key outer: partial null key right row should be unmatched");
const partialRows = dfPartialNull.to_dicts() as any[];
const matchedRow = partialRows.find((r: any) => r.rv === "R1");
const unmatchedRow = partialRows.find((r: any) => r.rv === "Rnull");
if (!matchedRow) throw new Error("Multi-key outer: matched row (1,1) missing");
if (!unmatchedRow) throw new Error("Multi-key outer: unmatched null-key right row missing");
if (unmatchedRow.v !== null) throw new Error("Multi-key outer: left columns should be null for unmatched right row");

// ─── 14. Semi join — no right-side columns even on multi-key ─────────────────

const semiL = new DataFrame([{ a: 1, b: 2, extra: "keep" }, { a: 9, b: 9, extra: "drop" }]);
const semiR = new DataFrame([{ a: 1, b: 2, rightOnly: "gone" }]);
const dfSemiMulti = semiL.join({ other: semiR, on: ["a", "b"], how: "semi" });
if (dfSemiMulti.height !== 1) throw new Error("Multi-key semi join height mismatch");
const semiMultiRow = dfSemiMulti.to_dicts()[0] as any;
if (semiMultiRow.extra !== "keep") throw new Error("Multi-key semi: left-only column lost");
if ("rightOnly" in semiMultiRow) throw new Error("Multi-key semi: right column leaked into output");

// ─── 15. Anti join — none matched ────────────────────────────────────────────

const antiAll = left.join({
    other: new DataFrame([{ id: 99, rv: "x" }]),
    on: "id",
    how: "anti",
});
if (antiAll.height !== 2) throw new Error("Anti join: all rows should be kept when nothing matches");

// ─── 16. Anti join — all matched ─────────────────────────────────────────────

const antiNone = left.join({ other: left, on: "id", how: "anti" });
if (antiNone.height !== 0) throw new Error("Anti join: no rows should be kept when all match");

// ─── 17. Semi join — duplicate right matches don't inflate height ─────────────
// SQL semi-join returns at most one output row per left row, regardless of how many right rows match

const dupL = new DataFrame([{ id: 1, v: "L" }]);
const dupR = new DataFrame([{ id: 1, rv: "R1" }, { id: 1, rv: "R2" }, { id: 1, rv: "R3" }]);
const dfSemiDup = dupL.join({ other: dupR, on: "id", how: "semi" });
if (dfSemiDup.height !== 1) throw new Error("Semi join must not duplicate left rows for multiple right matches");

// ─── 18. join_nulls:true — semi join matches null keys ───────────────────────

const nullSemiL = new DataFrame([{ id: null, v: "A" }, { id: 1, v: "B" }]);
const nullSemiR = new DataFrame([{ id: null, rv: "X" }]);
const dfNullSemi = nullSemiL.join({ other: nullSemiR, on: "id", how: "semi", join_nulls: true });
if (dfNullSemi.height !== 1) throw new Error("Semi+join_nulls: null key should match");
if ((dfNullSemi.to_dicts()[0] as any).v !== "A") throw new Error("Semi+join_nulls: wrong row matched");

// ─── 19. join_nulls:true — anti join excludes null-matched rows ──────────────

const dfNullAnti = nullSemiL.join({ other: nullSemiR, on: "id", how: "anti", join_nulls: true });
if (dfNullAnti.height !== 1) throw new Error("Anti+join_nulls: null-matched row should be excluded");
if ((dfNullAnti.to_dicts()[0] as any).v !== "B") throw new Error("Anti+join_nulls: wrong row kept");

// ─── 20. Empty DataFrames ─────────────────────────────────────────────────────

const empty = new DataFrame({ id: [] as number[], val: [] as string[] });
const emptyRight = new DataFrame({ id: [] as number[], rval: [] as string[] });

if (left.join({ other: emptyRight, on: "id", how: "inner" }).height !== 0) throw new Error("Inner with empty right should be empty");
if (left.join({ other: emptyRight, on: "id", how: "left" }).height !== 2) throw new Error("Left with empty right should keep left rows");
if (left.join({ other: emptyRight, on: "id", how: "semi" }).height !== 0) throw new Error("Semi with empty right should be empty");
if (left.join({ other: emptyRight, on: "id", how: "anti" }).height !== 2) throw new Error("Anti with empty right should keep all left rows");
if (empty.join({ other: right, on: "id", how: "right" }).height !== 2) throw new Error("Right with empty left should keep right rows");

// ─── 21. Suffix collision fallback counter ────────────────────────────────────

const dfCollL = new DataFrame([{ id: 1, val: "L", val_right: "Existing" }]);
const dfCollR = new DataFrame([{ id: 1, val: "R" }]);
const dfCollRes = dfCollL.join({ other: dfCollR, on: "id", suffixes: ["", "_right"] });
// val in dfCollR collides with val in dfCollL (which claimed base name val).
// Preferred suffix '_right' creates candidate 'val_right', but 'val_right' is already claimed by dfCollL!
// Counter fallback creates 'val_right_1'.
const collDict = dfCollRes.to_dicts()[0] as any;
if (!("val_right_1" in collDict)) throw new Error("Suffix collision resolver failed to create counter suffix val_right_1");
if (collDict.val_right_1 !== "R") throw new Error("Suffix collision value incorrect");

// ─── 22. Cross-type key matching does not crash and produces 0 matches ──────────

const numDF = new DataFrame([{ id: 1, val: "number" }]);
const strDF = new DataFrame([{ id: "1", val: "string" }]);
const crossJoinRes = numDF.join({ other: strDF, on: "id" as any });
if (crossJoinRes.height !== 0) throw new Error("Cross-type join should yield 0 matches due to distinct hash keys");

// ─── 23. Error handling: empty keys & missing column assertions ───────────────

let caughtEmpty = false;
try {
    left.join({ other: right, on: [] });
} catch (e: any) {
    caughtEmpty = e.message.includes('join() requires at least one key column');
}
if (!caughtEmpty) throw new Error("Expected empty 'on' array to throw InvalidArgumentError");

let caughtMissingLeft = false;
try {
    left.join({ other: right, on: "nonexistent" as any });
} catch (e: any) {
    caughtMissingLeft = e.message.includes('Join key "nonexistent"');
}
if (!caughtMissingLeft) throw new Error("Expected missing left key to throw ColumnNotFoundError");

let caughtMissingRight = false;
try {
    left.join({ other: new DataFrame([{ wrong_key: 1 }]), on: "id" as any });
} catch (e: any) {
    caughtMissingRight = e.message.includes('Join key "id"');
}
if (!caughtMissingRight) throw new Error("Expected missing right key to throw ColumnNotFoundError");

// ─── 24. Explicit dual suffixes ["_left", "_right"] ───────────────────────────

const dfDualL = new DataFrame([{ id: 1, val: "left_val" }]);
const dfDualR = new DataFrame([{ id: 1, val: "right_val" }]);
const dualRes = dfDualL.join({ other: dfDualR, on: "id", suffixes: ["_left", "_right"] });
const dualDict = dualRes.to_dicts()[0] as any;
if (!("val_left" in dualDict) || !("val_right" in dualDict)) {
    throw new Error("Explicit dual suffixes ['_left', '_right'] failed to assign val_left and val_right");
}
if (dualDict.val_left !== "left_val" || dualDict.val_right !== "right_val") {
    throw new Error("Explicit dual suffix values incorrect");
}

console.log("✓ join tests passed!");
