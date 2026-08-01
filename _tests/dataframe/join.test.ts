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

// ─── 25. Heterogeneous Key Joins (leftOn & rightOn) ───────────────────────────

const leftHet = new DataFrame([
    { user_id: 101, name: "Alice" },
    { user_id: 102, name: "Bob" },
    { user_id: 103, name: "Charlie" },
]);

const rightHet = new DataFrame([
    { id: 101, score: 95 },
    { id: 102, score: 88 },
    { id: 104, score: 72 },
]);

// 25a. Heterogeneous Inner Join
const hetInner = leftHet.join({ other: rightHet, leftOn: "user_id", rightOn: "id", how: "inner" });
if (hetInner.height !== 2) throw new Error("Heterogeneous inner join height mismatch");
const hetInnerDicts = hetInner.to_dicts() as any[];
if (hetInnerDicts[0].user_id !== 101 || hetInnerDicts[0].score !== 95 || "id" in hetInnerDicts[0]) {
    throw new Error("Heterogeneous inner join values or coalesced column mismatch");
}

// 25b. Heterogeneous Left Join
const hetLeft = leftHet.join({ other: rightHet, leftOn: "user_id", rightOn: "id", how: "left" });
if (hetLeft.height !== 3) throw new Error("Heterogeneous left join height mismatch");
const hetLeftDicts = hetLeft.to_dicts() as any[];
if (hetLeftDicts[2].user_id !== 103 || hetLeftDicts[2].score !== null) {
    throw new Error("Heterogeneous left join null handling mismatch");
}

// 25c. Heterogeneous Right Join (Key Coalescing into leftOn column)
const hetRight = leftHet.join({ other: rightHet, leftOn: "user_id", rightOn: "id", how: "right" });
if (hetRight.height !== 3) throw new Error("Heterogeneous right join height mismatch");
const hetRightDicts = hetRight.to_dicts() as any[];
const row104 = hetRightDicts.find((r: any) => r.user_id === 104);
if (!row104 || row104.score !== 72 || row104.name !== null) {
    throw new Error("Heterogeneous right join key coalescing failed for user_id 104");
}

// 25d. Heterogeneous Semi Join
const hetSemi = leftHet.join({ other: rightHet, leftOn: "user_id", rightOn: "id", how: "semi" });
if (hetSemi.height !== 2) throw new Error("Heterogeneous semi join height mismatch");
const hetSemiDicts = hetSemi.to_dicts() as any[];
if (hetSemiDicts[0].user_id !== 101 || "score" in hetSemiDicts[0]) {
    throw new Error("Heterogeneous semi join column mismatch");
}

// 25e. Heterogeneous Anti Join
const hetAnti = leftHet.join({ other: rightHet, leftOn: "user_id", rightOn: "id", how: "anti" });
if (hetAnti.height !== 1) throw new Error("Heterogeneous anti join height mismatch");
if (hetAnti.to_dicts()[0].user_id !== 103) {
    throw new Error("Heterogeneous anti join result mismatch");
}

// 25f. Heterogeneous Key Validation Errors
let caughtOnlyLeftOn = false;
try {
    leftHet.join({ other: rightHet, leftOn: "user_id" as any });
} catch (e: any) {
    caughtOnlyLeftOn = e.message.includes('requires both "leftOn" and "rightOn"');
}
if (!caughtOnlyLeftOn) throw new Error("Expected specifying only leftOn to throw InvalidArgumentError");

let caughtMismatchedLen = false;
try {
    leftHet.join({ other: rightHet, leftOn: ["user_id"], rightOn: ["id", "score" as any] });
} catch (e: any) {
    caughtMismatchedLen = e.message.includes('must match "rightOn" length');
}
let caughtBothOnAndLeftOn = false;
try {
    leftHet.join({ other: rightHet, on: "user_id" as any, leftOn: "user_id", rightOn: "id" });
} catch (e: any) {
    caughtBothOnAndLeftOn = e.message.includes('Cannot specify both "on" and "leftOn"/"rightOn"');
}
if (!caughtBothOnAndLeftOn) throw new Error("Expected specifying both 'on' and 'leftOn' to throw InvalidArgumentError");

// ─── 26. Heterogeneous Composite Multi-Keys ───────────────────────────────────

const leftMulti = new DataFrame([
    { tenant: "A", user_id: 1, val: "L1" },
    { tenant: "A", user_id: 2, val: "L2" },
    { tenant: "B", user_id: 1, val: "L3" },
]);

const rightMulti = new DataFrame([
    { t_id: "A", u_id: 1, rval: "R1" },
    { t_id: "B", u_id: 1, rval: "R3" },
    { t_id: "B", u_id: 2, rval: "R4" },
]);

// 26a. Multi-key Inner Join
const multiInner = leftMulti.join({
    other: rightMulti,
    leftOn: ["tenant", "user_id"],
    rightOn: ["t_id", "u_id"],
    how: "inner",
});
if (multiInner.height !== 2) throw new Error("Composite multi-key inner join height mismatch");
const multiInnerDicts = multiInner.to_dicts() as any[];
if (multiInnerDicts[0].tenant !== "A" || multiInnerDicts[0].user_id !== 1 || multiInnerDicts[0].rval !== "R1") {
    throw new Error("Composite multi-key inner join values mismatch");
}

// 26b. Multi-key Outer Join (Key Coalescing on multiple key columns)
const multiOuter = leftMulti.join({
    other: rightMulti,
    leftOn: ["tenant", "user_id"],
    rightOn: ["t_id", "u_id"],
    how: "outer",
});
if (multiOuter.height !== 4) throw new Error("Composite multi-key outer join height mismatch");
const multiOuterDicts = multiOuter.to_dicts() as any[];
const unmappedRightRow = multiOuterDicts.find((r: any) => r.rval === "R4");
if (!unmappedRightRow || unmappedRightRow.tenant !== "B" || unmappedRightRow.user_id !== 2 || unmappedRightRow.val !== null) {
    throw new Error("Composite multi-key outer join coalescing failed for unmatched right row");
}

// ─── 27. Zero-Height (Empty DataFrames) Edge Cases ────────────────────────────

const emptyLeft = (DataFrame as any)._createDirect({ id: [], val: [] }, {}, 0);
const popRight = new DataFrame([{ id: 1, rval: "R1" }, { id: 2, rval: "R2" }]);

// 27a. Empty Left + Populated Right (Inner, Left, Right, Outer)
const emptyLeftInner = emptyLeft.join({ other: popRight, on: "id", how: "inner" });
if (emptyLeftInner.height !== 0) throw new Error("Empty left inner join height should be 0");

const emptyLeftLeft = emptyLeft.join({ other: popRight, on: "id", how: "left" });
if (emptyLeftLeft.height !== 0) throw new Error("Empty left left join height should be 0");

const emptyLeftRight = emptyLeft.join({ other: popRight, on: "id", how: "right" });
if (emptyLeftRight.height !== 2) throw new Error("Empty left right join height should match right DF height");
if (emptyLeftRight.to_dicts()[0].rval !== "R1" || emptyLeftRight.to_dicts()[0].val !== null) {
    throw new Error("Empty left right join values mismatch");
}

const emptyLeftOuter = emptyLeft.join({ other: popRight, on: "id", how: "outer" });
if (emptyLeftOuter.height !== 2) throw new Error("Empty left outer join height should match right DF height");

const emptyLeftSemi = emptyLeft.join({ other: popRight, on: "id", how: "semi" });
if (emptyLeftSemi.height !== 0) throw new Error("Empty left semi join height should be 0");

const emptyLeftAnti = emptyLeft.join({ other: popRight, on: "id", how: "anti" });
if (emptyLeftAnti.height !== 0) throw new Error("Empty left anti join height should be 0");

// 27b. Populated Left + Empty Right
const emptyRightLeft = popRight.join({ other: emptyLeft, on: "id", how: "left" });
if (emptyRightLeft.height !== 2) throw new Error("Populated left + empty right left join height mismatch");

const emptyRightInner = popRight.join({ other: emptyLeft, on: "id", how: "inner" });
if (emptyRightInner.height !== 0) throw new Error("Populated left + empty right inner join height should be 0");

// 27c. Both Left and Right Empty
const emptyBothInner = emptyLeft.join({ other: emptyLeft, on: "id", how: "inner" });
if (emptyBothInner.height !== 0) throw new Error("Empty both inner join height should be 0");

// ─── 28. join_nulls with Heterogeneous Keys ───────────────────────────────────

const nullHetL = new DataFrame([{ k_left: null, val: "L_null" }, { k_left: 1, val: "L_1" }]);
const nullHetR = new DataFrame([{ k_right: null, rval: "R_null" }, { k_right: 1, rval: "R_1" }]);

// 28a. join_nulls: false (default)
const nullHetFalse = nullHetL.join({ other: nullHetR, leftOn: "k_left", rightOn: "k_right", join_nulls: false });
if (nullHetFalse.height !== 1) throw new Error("Heterogeneous join_nulls:false should exclude null key matches");
if (nullHetFalse.to_dicts()[0].val !== "L_1") throw new Error("Heterogeneous join_nulls:false row mismatch");

// 28b. join_nulls: true
const nullHetTrue = nullHetL.join({ other: nullHetR, leftOn: "k_left", rightOn: "k_right", join_nulls: true });
if (nullHetTrue.height !== 2) throw new Error("Heterogeneous join_nulls:true should include null key matches");

// ─── 29. Heterogeneous Joins Overlapping Payload Names & Custom Suffixes ──────

const overlapL = new DataFrame([{ user_id: 1, name: "Alice", category: "VIP" }]);
const overlapR = new DataFrame([{ id: 1, name: "Bob", category: "Standard" }]);

const suffixedHet = overlapL.join({
    other: overlapR,
    leftOn: "user_id",
    rightOn: "id",
    suffixes: ["_left", "_right"],
});
const suffixedHetDict = suffixedHet.to_dicts()[0] as any;
if (!("name_left" in suffixedHetDict) || !("name_right" in suffixedHetDict) || !("category_left" in suffixedHetDict) || !("category_right" in suffixedHetDict)) {
    throw new Error("Heterogeneous join suffix resolution failed for overlapping payload columns");
}
if (suffixedHetDict.name_left !== "Alice" || suffixedHetDict.name_right !== "Bob") {
    throw new Error("Heterogeneous join suffix values corrupt");
}

// ─── 30. Additional Validation Error Checks for leftOn & rightOn ──────────────

let caughtEmptyLeftOn = false;
try {
    leftHet.join({ other: rightHet, leftOn: [], rightOn: [] });
} catch (e: any) {
    caughtEmptyLeftOn = e.message.includes("requires non-empty key arrays");
}
if (!caughtEmptyLeftOn) throw new Error("Expected empty arrays in leftOn/rightOn to throw InvalidArgumentError");

let caughtMissingLeftKeyHet = false;
try {
    leftHet.join({ other: rightHet, leftOn: "nonexistent_left", rightOn: "id" });
} catch (e: any) {
    caughtMissingLeftKeyHet = e.message.includes('Join key "nonexistent_left"');
}
if (!caughtMissingLeftKeyHet) throw new Error("Expected missing left key in leftOn to throw ColumnNotFoundError");

let caughtMissingRightKeyHet = false;
try {
    leftHet.join({ other: rightHet, leftOn: "user_id", rightOn: "nonexistent_right" });
} catch (e: any) {
    caughtMissingRightKeyHet = e.message.includes('Join key "nonexistent_right"');
}
if (!caughtMissingRightKeyHet) throw new Error("Expected missing right key in rightOn to throw ColumnNotFoundError");

console.log("✓ join tests passed!");
