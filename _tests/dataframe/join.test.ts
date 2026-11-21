import { DataFrame } from "df-script";

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

const dfInner = left.join(right, { on: "id", how: "inner" });
if (dfInner.height !== 1) throw new Error("Inner join height mismatch");
const innerRow = dfInner.toDicts()[0] as any;
if (innerRow.val !== "L1" || innerRow.rval !== "R1") throw new Error("Inner join values mismatch");

// ─── 2. Left Join ─────────────────────────────────────────────────────────────

const dfLeft = left.join(right, { on: "id", how: "left" });
if (dfLeft.height !== 2) throw new Error("Left join height mismatch");
const leftRows = dfLeft.toDicts() as any[];
if (leftRows[1].val !== "L2" || leftRows[1].rval !== null) throw new Error("Left join values mismatch");

// ─── 3. Right Join ────────────────────────────────────────────────────────────

const dfRight = left.join(right, { on: "id", how: "right" });
if (dfRight.height !== 2) throw new Error("Right join height mismatch");
const rightRows = dfRight.toDicts() as any[];
if (rightRows[1].rval !== "R3" || rightRows[1].val !== null) throw new Error("Right join values mismatch");

// ─── 4. Outer Join ────────────────────────────────────────────────────────────

const dfOuter = left.join(right, { on: "id", how: "outer" });
if (dfOuter.height !== 3) throw new Error("Outer join height mismatch");

// ─── 5. Semi Join ─────────────────────────────────────────────────────────────

const dfSemi = left.join(right, { on: "id", how: "semi" });
if (dfSemi.height !== 1) throw new Error("Semi join height mismatch");
const semiRow = dfSemi.toDicts()[0] as any;
if (semiRow.id !== 1 || semiRow.val !== "L1" || "rval" in semiRow) throw new Error("Semi join values/columns mismatch");

// ─── 6. Anti Join ─────────────────────────────────────────────────────────────

const dfAnti = left.join(right, { on: "id", how: "anti" });
if (dfAnti.height !== 1) throw new Error("Anti join height mismatch");
const antiRow = dfAnti.toDicts()[0] as any;
if (antiRow.id !== 2 || antiRow.val !== "L2" || "rval" in antiRow) throw new Error("Anti join values/columns mismatch");

// ─── 7. Suffix Collision Protection ───────────────────────────────────────────

const dfA = new DataFrame([{ id: 1, val: "A_val" }]);
const dfB = new DataFrame([{ id: 1, val: "B_val", val_right: "B_existing_val_right" }]);
const dfSuffixed = dfA.join(dfB, { on: "id" });
const suffixedDict = dfSuffixed.toDicts()[0] as any;
if (!("val" in suffixedDict) || !("val_right" in suffixedDict) || !("val_right_right" in suffixedDict)) {
    throw new Error("Suffix collision protection failed: missing resolved column name");
}
if (suffixedDict.val !== "A_val" || suffixedDict.val_right !== "B_val" || suffixedDict.val_right_right !== "B_existing_val_right") {
    throw new Error("Suffix collision protection failed: value corruption");
}

// ─── 8. joinNulls: false (default) ──────────────────────────────────────────

const dfNullA = new DataFrame([{ id: null, val: "A" }, { id: 1, val: "B" }]);
const dfNullB = new DataFrame([{ id: null, val: "C" }, { id: 1, val: "D" }]);
const dfNoNullJoin = dfNullA.join(dfNullB, { on: "id", joinNulls: false });
if (dfNoNullJoin.height !== 1) throw new Error("Expected joinNulls:false to exclude null key matches");

// ─── 9. joinNulls: true ──────────────────────────────────────────────────────

const dfWithNullJoin = dfNullA.join(dfNullB, { on: "id", joinNulls: true });
if (dfWithNullJoin.height !== 2) throw new Error("Expected joinNulls:true to include null key matches");

// ─── 10. null key vs. string "null" — no collision ───────────────────────────
// Previously computeRowHash mapped null → "" which could collide with other values.
// Now toCanonicalString("null") → "s:null" and toCanonicalString(null) → "v:null".

const dfNullStr_L = new DataFrame([{ id: null, v: "left_null" }, { id: "null", v: "left_str_null" }]);
const dfNullStr_R = new DataFrame([{ id: null, rv: "right_null" }, { id: "null", rv: "right_str_null" }]);
const dfNullStrJoin = dfNullStr_L.join(dfNullStr_R, { on: "id", how: "inner", joinNulls: true });
if (dfNullStrJoin.height !== 2) throw new Error("null key and string 'null' should not collide");
const nullStrRows = dfNullStrJoin.toDicts() as any[];
const byV: Record<string, any> = {};
for (const r of nullStrRows) byV[r.v] = r;
if (byV["left_null"]?.rv !== "right_null") throw new Error("null row matched wrong right row");
if (byV["left_str_null"]?.rv !== "right_str_null") throw new Error("string 'null' row matched wrong right row");

// ─── 11. null key vs. empty string — no collision ────────────────────────────
// null → "v:null", "" → "s:" — distinct hashes

const dfEmptyStr_L = new DataFrame([{ id: null, v: "left_null" }, { id: "", v: "left_empty" }]);
const dfEmptyStr_R = new DataFrame([{ id: null, rv: "right_null" }, { id: "", rv: "right_empty" }]);
const dfEmptyJoin = dfEmptyStr_L.join(dfEmptyStr_R, { on: "id", how: "inner", joinNulls: true });
if (dfEmptyJoin.height !== 2) throw new Error("null key and empty-string key should not collide");
const emptyRows = dfEmptyJoin.toDicts() as any[];
const byV2: Record<string, any> = {};
for (const r of emptyRows) byV2[r.v] = r;
if (byV2["left_null"]?.rv !== "right_null") throw new Error("null row matched wrong right row (empty string collision)");
if (byV2["left_empty"]?.rv !== "right_empty") throw new Error("empty-string row matched wrong right row");

// ─── 12. Multi-key join ───────────────────────────────────────────────────────

const ml = new DataFrame([{ a: 1, b: 2, v: "X" }, { a: 1, b: 3, v: "Y" }]);
const mr = new DataFrame([{ a: 1, b: 2, rv: "RX" }, { a: 2, b: 2, rv: "R22" }]);
const dfMultiKey = ml.join(mr, { on: ["a", "b"], how: "inner" });
if (dfMultiKey.height !== 1) throw new Error("Multi-key inner join height mismatch");
if ((dfMultiKey.toDicts()[0] as any).v !== "X") throw new Error("Multi-key inner join value mismatch");

// ─── 13. Multi-key, joinNulls:false — partial null key skipped ──────────────
// Row with a=1, b=null on the right should not match anything; ends up as unmatched outer row

const outerL = new DataFrame([{ a: 1, b: 1, v: "L1" }]);
const outerR = new DataFrame([{ a: 1, b: null, rv: "Rnull" }, { a: 1, b: 1, rv: "R1" }]);
const dfPartialNull = outerL.join(outerR, { on: ["a", "b"], how: "outer", joinNulls: false });
// Expected: matched row (1,1) + unmatched right row (1,null)
if (dfPartialNull.height !== 2) throw new Error("Multi-key outer: partial null key right row should be unmatched");
const partialRows = dfPartialNull.toDicts() as any[];
const matchedRow = partialRows.find((r: any) => r.rv === "R1");
const unmatchedRow = partialRows.find((r: any) => r.rv === "Rnull");
if (!matchedRow) throw new Error("Multi-key outer: matched row (1,1) missing");
if (!unmatchedRow) throw new Error("Multi-key outer: unmatched null-key right row missing");
if (unmatchedRow.v !== null) throw new Error("Multi-key outer: left columns should be null for unmatched right row");

// ─── 14. Semi join — no right-side columns even on multi-key ─────────────────

const semiL = new DataFrame([{ a: 1, b: 2, extra: "keep" }, { a: 9, b: 9, extra: "drop" }]);
const semiR = new DataFrame([{ a: 1, b: 2, rightOnly: "gone" }]);
const dfSemiMulti = semiL.join(semiR, { on: ["a", "b"], how: "semi" });
if (dfSemiMulti.height !== 1) throw new Error("Multi-key semi join height mismatch");
const semiMultiRow = dfSemiMulti.toDicts()[0] as any;
if (semiMultiRow.extra !== "keep") throw new Error("Multi-key semi: left-only column lost");
if ("rightOnly" in semiMultiRow) throw new Error("Multi-key semi: right column leaked into output");

// ─── 15. Anti join — none matched ────────────────────────────────────────────

const antiAll = left.join(new DataFrame([{ id: 99, rv: "x" }]), {
    on: "id",
    how: "anti",
});
if (antiAll.height !== 2) throw new Error("Anti join: all rows should be kept when nothing matches");

// ─── 16. Anti join — all matched ─────────────────────────────────────────────

const antiNone = left.join(left, { on: "id", how: "anti" });
if (antiNone.height !== 0) throw new Error("Anti join: no rows should be kept when all match");

// ─── 17. Semi join — duplicate right matches don't inflate height ─────────────
// SQL semi-join returns at most one output row per left row, regardless of how many right rows match

const dupL = new DataFrame([{ id: 1, v: "L" }]);
const dupR = new DataFrame([{ id: 1, rv: "R1" }, { id: 1, rv: "R2" }, { id: 1, rv: "R3" }]);
const dfSemiDup = dupL.join(dupR, { on: "id", how: "semi" });
if (dfSemiDup.height !== 1) throw new Error("Semi join must not duplicate left rows for multiple right matches");

// ─── 18. joinNulls:true — semi join matches null keys ───────────────────────

const nullSemiL = new DataFrame([{ id: null, v: "A" }, { id: 1, v: "B" }]);
const nullSemiR = new DataFrame([{ id: null, rv: "X" }]);
const dfNullSemi = nullSemiL.join(nullSemiR, { on: "id", how: "semi", joinNulls: true });
if (dfNullSemi.height !== 1) throw new Error("Semi+joinNulls: null key should match");
if ((dfNullSemi.toDicts()[0] as any).v !== "A") throw new Error("Semi+joinNulls: wrong row matched");

// ─── 19. joinNulls:true — anti join excludes null-matched rows ──────────────

const dfNullAnti = nullSemiL.join(nullSemiR, { on: "id", how: "anti", joinNulls: true });
if (dfNullAnti.height !== 1) throw new Error("Anti+joinNulls: null-matched row should be excluded");
if ((dfNullAnti.toDicts()[0] as any).v !== "B") throw new Error("Anti+joinNulls: wrong row kept");

// ─── 20. Empty DataFrames ─────────────────────────────────────────────────────

const empty = new DataFrame({ id: [] as number[], val: [] as string[] });
const emptyRight = new DataFrame({ id: [] as number[], rval: [] as string[] });

if (left.join(emptyRight, { on: "id", how: "inner" }).height !== 0) throw new Error("Inner with empty right should be empty");
if (left.join(emptyRight, { on: "id", how: "left" }).height !== 2) throw new Error("Left with empty right should keep left rows");
if (left.join(emptyRight, { on: "id", how: "semi" }).height !== 0) throw new Error("Semi with empty right should be empty");
if (left.join(emptyRight, { on: "id", how: "anti" }).height !== 2) throw new Error("Anti with empty right should keep all left rows");
if (empty.join(right, { on: "id", how: "right" }).height !== 2) throw new Error("Right with empty left should keep right rows");

// ─── 21. Suffix collision fallback counter ────────────────────────────────────

const dfCollL = new DataFrame([{ id: 1, val: "L", val_right: "Existing" }]);
const dfCollR = new DataFrame([{ id: 1, val: "R" }]);
const dfCollRes = dfCollL.join(dfCollR, { on: "id", suffixes: ["", "_right"] });
// val in dfCollR collides with val in dfCollL (which claimed base name val).
// Preferred suffix '_right' creates candidate 'val_right', but 'val_right' is already claimed by dfCollL!
// Counter fallback creates 'val_right_1'.
const collDict = dfCollRes.toDicts()[0] as any;
if (!("val_right_1" in collDict)) throw new Error("Suffix collision resolver failed to create counter suffix val_right_1");
if (collDict.val_right_1 !== "R") throw new Error("Suffix collision value incorrect");

// ─── 22. Cross-type key matching does not crash and produces 0 matches ──────────

const numDF = new DataFrame([{ id: 1, val: "number" }]);
const strDF = new DataFrame([{ id: "1", val: "string" }]);
const crossJoinRes = numDF.join(strDF, { on: "id" as any });
if (crossJoinRes.height !== 0) throw new Error("Cross-type join should yield 0 matches due to distinct hash keys");

// ─── 23. Error handling: empty keys & missing column assertions ───────────────

let caughtEmpty = false;
try {
    left.join(right, { on: [] });
} catch (e: any) {
    caughtEmpty = e.message.includes('join() requires at least one key column');
}
if (!caughtEmpty) throw new Error("Expected empty 'on' array to throw InvalidArgumentError");

let caughtMissingLeft = false;
try {
    left.join(right, { on: "nonexistent" as any });
} catch (e: any) {
    caughtMissingLeft = e.message.includes('Join key "nonexistent"');
}
if (!caughtMissingLeft) throw new Error("Expected missing left key to throw ColumnNotFoundError");

let caughtMissingRight = false;
try {
    left.join(new DataFrame([{ wrong_key: 1 }]), { on: "id" as any });
} catch (e: any) {
    caughtMissingRight = e.message.includes('Join key "id"');
}
if (!caughtMissingRight) throw new Error("Expected missing right key to throw ColumnNotFoundError");

// ─── 24. Explicit dual suffixes ["_left", "_right"] ───────────────────────────

const dfDualL = new DataFrame([{ id: 1, val: "left_val" }]);
const dfDualR = new DataFrame([{ id: 1, val: "right_val" }]);
const dualRes = dfDualL.join(dfDualR, { on: "id", suffixes: ["_left", "_right"] });
const dualDict = dualRes.toDicts()[0] as any;
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
const hetInner = leftHet.join(rightHet, { leftOn: "user_id", rightOn: "id", how: "inner" });
if (hetInner.height !== 2) throw new Error("Heterogeneous inner join height mismatch");
const hetInnerDicts = hetInner.toDicts() as any[];
if (hetInnerDicts[0].user_id !== 101 || hetInnerDicts[0].score !== 95 || "id" in hetInnerDicts[0]) {
    throw new Error("Heterogeneous inner join values or coalesced column mismatch");
}

// 25b. Heterogeneous Left Join
const hetLeft = leftHet.join(rightHet, { leftOn: "user_id", rightOn: "id", how: "left" });
if (hetLeft.height !== 3) throw new Error("Heterogeneous left join height mismatch");
const hetLeftDicts = hetLeft.toDicts() as any[];
if (hetLeftDicts[2].user_id !== 103 || hetLeftDicts[2].score !== null) {
    throw new Error("Heterogeneous left join null handling mismatch");
}

// 25c. Heterogeneous Right Join (Key Coalescing into leftOn column)
const hetRight = leftHet.join(rightHet, { leftOn: "user_id", rightOn: "id", how: "right" });
if (hetRight.height !== 3) throw new Error("Heterogeneous right join height mismatch");
const hetRightDicts = hetRight.toDicts() as any[];
const row104 = hetRightDicts.find((r: any) => r.user_id === 104);
if (!row104 || row104.score !== 72 || row104.name !== null) {
    throw new Error("Heterogeneous right join key coalescing failed for user_id 104");
}

// 25d. Heterogeneous Semi Join
const hetSemi = leftHet.join(rightHet, { leftOn: "user_id", rightOn: "id", how: "semi" });
if (hetSemi.height !== 2) throw new Error("Heterogeneous semi join height mismatch");
const hetSemiDicts = hetSemi.toDicts() as any[];
if (hetSemiDicts[0].user_id !== 101 || "score" in hetSemiDicts[0]) {
    throw new Error("Heterogeneous semi join column mismatch");
}

// 25e. Heterogeneous Anti Join
const hetAnti = leftHet.join(rightHet, { leftOn: "user_id", rightOn: "id", how: "anti" });
if (hetAnti.height !== 1) throw new Error("Heterogeneous anti join height mismatch");
if (hetAnti.toDicts()[0].user_id !== 103) {
    throw new Error("Heterogeneous anti join result mismatch");
}

// 25f. Heterogeneous Key Validation Errors
let caughtOnlyLeftOn = false;
try {
    leftHet.join(rightHet, { leftOn: "user_id" as any });
} catch (e: any) {
    caughtOnlyLeftOn = e.message.includes('requires both "leftOn" and "rightOn"');
}
if (!caughtOnlyLeftOn) throw new Error("Expected specifying only leftOn to throw InvalidArgumentError");

let caughtMismatchedLen = false;
try {
    leftHet.join(rightHet, { leftOn: ["user_id"], rightOn: ["id", "score" as any] });
} catch (e: any) {
    caughtMismatchedLen = e.message.includes('must match "rightOn" length');
}
if (!caughtMismatchedLen) throw new Error("Expected mismatched leftOn/rightOn length to throw InvalidArgumentError");
let caughtBothOnAndLeftOn = false;
try {
    leftHet.join(rightHet, { on: "user_id" as any, leftOn: "user_id", rightOn: "id" });
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
const multiInner = leftMulti.join(rightMulti, { leftOn: ["tenant", "user_id"],
    rightOn: ["t_id", "u_id"],
    how: "inner",
});
if (multiInner.height !== 2) throw new Error("Composite multi-key inner join height mismatch");
const multiInnerDicts = multiInner.toDicts() as any[];
if (multiInnerDicts[0].tenant !== "A" || multiInnerDicts[0].user_id !== 1 || multiInnerDicts[0].rval !== "R1") {
    throw new Error("Composite multi-key inner join values mismatch");
}

// 26b. Multi-key Outer Join (Key Coalescing on multiple key columns)
const multiOuter = leftMulti.join(rightMulti, { leftOn: ["tenant", "user_id"],
    rightOn: ["t_id", "u_id"],
    how: "outer",
    coalesce: true,
});
if (multiOuter.height !== 4) throw new Error("Composite multi-key outer join height mismatch");
const multiOuterDicts = multiOuter.toDicts() as any[];
const unmappedRightRow = multiOuterDicts.find((r: any) => r.rval === "R4");
if (!unmappedRightRow || unmappedRightRow.tenant !== "B" || unmappedRightRow.user_id !== 2 || unmappedRightRow.val !== null) {
    throw new Error("Composite multi-key outer join coalescing failed for unmatched right row");
}

// ─── 27. Zero-Height (Empty DataFrames) Edge Cases ────────────────────────────

const emptyLeft = (DataFrame as any)._createDirect({ id: [], val: [] }, {}, 0);
const popRight = new DataFrame([{ id: 1, rval: "R1" }, { id: 2, rval: "R2" }]);

// 27a. Empty Left + Populated Right (Inner, Left, Right, Outer)
const emptyLeftInner = emptyLeft.join(popRight, { on: "id", how: "inner" });
if (emptyLeftInner.height !== 0) throw new Error("Empty left inner join height should be 0");

const emptyLeftLeft = emptyLeft.join(popRight, { on: "id", how: "left" });
if (emptyLeftLeft.height !== 0) throw new Error("Empty left left join height should be 0");

const emptyLeftRight = emptyLeft.join(popRight, { on: "id", how: "right" });
if (emptyLeftRight.height !== 2) throw new Error("Empty left right join height should match right DF height");
if (emptyLeftRight.toDicts()[0].rval !== "R1" || emptyLeftRight.toDicts()[0].val !== null) {
    throw new Error("Empty left right join values mismatch");
}

const emptyLeftOuter = emptyLeft.join(popRight, { on: "id", how: "outer" });
if (emptyLeftOuter.height !== 2) throw new Error("Empty left outer join height should match right DF height");

const emptyLeftSemi = emptyLeft.join(popRight, { on: "id", how: "semi" });
if (emptyLeftSemi.height !== 0) throw new Error("Empty left semi join height should be 0");

const emptyLeftAnti = emptyLeft.join(popRight, { on: "id", how: "anti" });
if (emptyLeftAnti.height !== 0) throw new Error("Empty left anti join height should be 0");

// 27b. Populated Left + Empty Right
const emptyRightLeft = popRight.join(emptyLeft, { on: "id", how: "left" });
if (emptyRightLeft.height !== 2) throw new Error("Populated left + empty right left join height mismatch");

const emptyRightInner = popRight.join(emptyLeft, { on: "id", how: "inner" });
if (emptyRightInner.height !== 0) throw new Error("Populated left + empty right inner join height should be 0");

// 27c. Both Left and Right Empty
const emptyBothInner = emptyLeft.join(emptyLeft, { on: "id", how: "inner" });
if (emptyBothInner.height !== 0) throw new Error("Empty both inner join height should be 0");

// ─── 28. joinNulls with Heterogeneous Keys ───────────────────────────────────

const nullHetL = new DataFrame([{ k_left: null, val: "L_null" }, { k_left: 1, val: "L_1" }]);
const nullHetR = new DataFrame([{ k_right: null, rval: "R_null" }, { k_right: 1, rval: "R_1" }]);

// 28a. joinNulls: false (default)
const nullHetFalse = nullHetL.join(nullHetR, { leftOn: "k_left", rightOn: "k_right", joinNulls: false });
if (nullHetFalse.height !== 1) throw new Error("Heterogeneous joinNulls:false should exclude null key matches");
if (nullHetFalse.toDicts()[0].val !== "L_1") throw new Error("Heterogeneous joinNulls:false row mismatch");

// 28b. joinNulls: true
const nullHetTrue = nullHetL.join(nullHetR, { leftOn: "k_left", rightOn: "k_right", joinNulls: true });
if (nullHetTrue.height !== 2) throw new Error("Heterogeneous joinNulls:true should include null key matches");

// ─── 29. Heterogeneous Joins Overlapping Payload Names & Custom Suffixes ──────

const overlapL = new DataFrame([{ user_id: 1, name: "Alice", category: "VIP" }]);
const overlapR = new DataFrame([{ id: 1, name: "Bob", category: "Standard" }]);

const suffixedHet = overlapL.join(overlapR, { leftOn: "user_id",
    rightOn: "id",
    suffixes: ["_left", "_right"],
});
const suffixedHetDict = suffixedHet.toDicts()[0] as any;
if (!("name_left" in suffixedHetDict) || !("name_right" in suffixedHetDict) || !("category_left" in suffixedHetDict) || !("category_right" in suffixedHetDict)) {
    throw new Error("Heterogeneous join suffix resolution failed for overlapping payload columns");
}
if (suffixedHetDict.name_left !== "Alice" || suffixedHetDict.name_right !== "Bob") {
    throw new Error("Heterogeneous join suffix values corrupt");
}

// ─── 30. Additional Validation Error Checks for leftOn & rightOn ──────────────

let caughtEmptyLeftOn = false;
try {
    leftHet.join(rightHet, { leftOn: [], rightOn: [] });
} catch (e: any) {
    caughtEmptyLeftOn = e.message.includes("requires non-empty key arrays");
}
if (!caughtEmptyLeftOn) throw new Error("Expected empty arrays in leftOn/rightOn to throw InvalidArgumentError");

let caughtMissingLeftKeyHet = false;
try {
    leftHet.join(rightHet, { leftOn: "nonexistent_left" as any, rightOn: "id" });
} catch (e: any) {
    caughtMissingLeftKeyHet = e.message.includes('Join key "nonexistent_left"');
}
if (!caughtMissingLeftKeyHet) throw new Error("Expected missing left key in leftOn to throw ColumnNotFoundError");

let caughtMissingRightKeyHet = false;
try {
    leftHet.join(rightHet, { leftOn: "user_id", rightOn: "nonexistent_right" as any });
} catch (e: any) {
    caughtMissingRightKeyHet = e.message.includes("in the right DataFrame");
}
if (!caughtMissingRightKeyHet) throw new Error("Expected missing right key in leftOn/rightOn to throw");

// ─── 31. Cross Join (Cartesian Product) ───────────────────────────────────────

const dfCrossL = new DataFrame([
    { color: "red" },
    { color: "blue" },
]);
const dfCrossR = new DataFrame([
    { size: "S" },
    { size: "M" },
    { size: "L" },
]);

const crossRes = dfCrossL.join(dfCrossR, { how: "cross" });
if (crossRes.height !== 6) throw new Error(`Cross join height expected 6, got ${crossRes.height}`);
const crossRows = crossRes.toDicts() as any[];
if (crossRows[0].color !== "red" || crossRows[0].size !== "S") throw new Error("Cross join row 0 mismatch");
if (crossRows[5].color !== "blue" || crossRows[5].size !== "L") throw new Error("Cross join row 5 mismatch");

// Edge case 1: Empty DataFrames (Left or Right empty)
const dfEmpty = new DataFrame<{ color: string }>([]);
const crossEmptyL = dfEmpty.join(dfCrossR, { how: "cross" });
if (crossEmptyL.height !== 0) throw new Error("Expected empty left cross join to return height 0");

const crossEmptyR = dfCrossL.join(dfEmpty as any, { how: "cross" });
if (crossEmptyR.height !== 0) throw new Error("Expected empty right cross join to return height 0");

// Edge case 2: Column collision handling in Cross Join
const dfCollisionL = new DataFrame([
    { id: 1, val: "A" },
    { id: 2, val: "B" },
]);
const dfCollisionR = new DataFrame([
    { id: 10, score: 99 },
    { id: 20, score: 88 },
]);

const crossColl = dfCollisionL.join(dfCollisionR, { how: "cross", suffixes: ["_left", "_right"] });
if (crossColl.height !== 4) throw new Error("Expected cross join collision height 4");
const collCols = Object.keys(crossColl._columns);
if (!collCols.includes("id_left") || !collCols.includes("id_right")) {
    throw new Error(`Expected suffixes on colliding columns, got: ${collCols.join(", ")}`);
}
const collRows = crossColl.toDicts() as any[];
if (collRows[0].id_left !== 1 || collRows[0].id_right !== 10) throw new Error("Cross join collision row 0 mismatch");
if (collRows[3].id_left !== 2 || collRows[3].id_right !== 20) throw new Error("Cross join collision row 3 mismatch");

// Edge case 3: Passing join keys with how: "cross" throws InvalidArgumentError
let caughtKeysInCross = false;
try {
    dfCrossL.join(dfCrossR, { how: "cross", on: "color" as any });
} catch (e: any) {
    caughtKeysInCross = e.message.includes('Cannot specify "on", "leftOn", or "rightOn" when how is "cross"');
}
if (!caughtKeysInCross) throw new Error("Expected keys in cross join to throw");
// Edge case 4: Extreme Cartesian dimensions size guard
import { computeCartesianProduct } from "df-script/utils";
let caughtOverflow = false;
try {
    computeCartesianProduct(50000, 100000);
} catch (e: any) {
    caughtOverflow = e.message.includes("exceeds maximum JavaScript array capacity");
}
if (!caughtOverflow) throw new Error("Expected extreme Cartesian dimensions to throw InvalidArgumentError");

// ─── 32. Join Key Coalescing Tests ───────────────────────────────────────────

const coalesceL = new DataFrame([
    { id: 1, val: "L1" },
    { id: null, val: "L_Null" },
]);
const coalesceR = new DataFrame([
    { id: 1, rval: "R1" },
    { id: 2, rval: "R2" },
]);

// 32a. Explicit coalesce: true on outer join merges keys into single column "id"
const dfCoalesceOuter = coalesceL.join(coalesceR, { on: "id",
    how: "outer",
    joinNulls: true,
    coalesce: true,
});
const outerCoalesceRows = dfCoalesceOuter.toDicts() as any[];
const r2Row = outerCoalesceRows.find(r => r.rval === "R2");
if (!r2Row || r2Row.id !== 2 || "id_right" in r2Row) {
    throw new Error("Expected explicit coalesce: true to merge right key into 'id' and omit 'id_right'");
}

// 32b. Default coalesce (omitted) on how: 'outer' defaults to coalesce: true (Polars standard behavior)
const dfDefaultOuter = coalesceL.join(coalesceR, { on: "id",
    how: "outer",
    joinNulls: true,
});
const defaultOuterRows = dfDefaultOuter.toDicts() as any[];
const r2DefaultRow = defaultOuterRows.find(r => r.rval === "R2");
if (!r2DefaultRow || r2DefaultRow.id !== 2 || "id_right" in r2DefaultRow) {
    throw new Error("Expected default outer join (coalesce omitted) to default to coalesce: true, merging keys into 'id' and omitting 'id_right'");
}

// 32c. Explicit coalesce: false on outer join with heterogeneous keys
const hetCoalesceL = new DataFrame([{ l_id: 10, val: "A" }, { l_id: 20, val: "B" }]);
const hetCoalesceR = new DataFrame([{ r_id: 20, score: 99 }, { r_id: 30, score: 88 }]);
const dfHetNoCoalesce = hetCoalesceL.join(hetCoalesceR, { leftOn: "l_id",
    rightOn: "r_id",
    how: "outer",
    coalesce: false,
});
const hetNoCoalesceRows = dfHetNoCoalesce.toDicts() as any[];
const r30Row = hetNoCoalesceRows.find(r => r.r_id === 30);
if (!r30Row || r30Row.l_id !== null || r30Row.score !== 88) {
    throw new Error("Expected coalesce: false on heterogeneous outer join to keep l_id=null and r_id=30 for unmatched right row");
}

// 32d. Default coalesce on how: 'right' defaults to coalesce: true
const dfDefaultRight = hetCoalesceL.join(hetCoalesceR, { leftOn: "l_id",
    rightOn: "r_id",
    how: "right",
});
const defaultRightRows = dfDefaultRight.toDicts() as any[];
const r30CoalescedRow = defaultRightRows.find(r => r.l_id === 30);
if (!r30CoalescedRow || "r_id" in r30CoalescedRow) {
    throw new Error("Expected default right join to coalesce r_id into l_id (l_id=30) and drop r_id");
}

// 32e. Heterogeneous outer join with explicit coalesce: true (merges right key into left key and drops right key column)
const dfHetOuterCoalesce = hetCoalesceL.join(hetCoalesceR, { leftOn: "l_id",
    rightOn: "r_id",
    how: "outer",
    coalesce: true,
});
const hetOuterCoalesceRows = dfHetOuterCoalesce.toDicts() as any[];
const r30HetRow = hetOuterCoalesceRows.find(r => r.score === 88);
if (!r30HetRow || r30HetRow.l_id !== 30 || "r_id" in r30HetRow) {
    throw new Error("Expected explicit coalesce: true on heterogeneous outer join to merge r_id=30 into l_id=30 and drop r_id column");
}

// 32f. Composite heterogeneous keys with coalesce: true on outer join
const compL = new DataFrame([{ k1: "A", k2: 1, valL: "left1" }]);
const compR = new DataFrame([{ r1: "A", r2: 1, valR: "right1" }, { r1: "B", r2: 2, valR: "right2" }]);
const dfCompCoalesce = compL.join(compR, { leftOn: ["k1", "k2"],
    rightOn: ["r1", "r2"],
    how: "outer",
    coalesce: true,
});
const compRows = dfCompCoalesce.toDicts() as any[];
const b2Row = compRows.find(r => r.valR === "right2");
if (!b2Row || b2Row.k1 !== "B" || b2Row.k2 !== 2 || "r1" in b2Row || "r2" in b2Row) {
    throw new Error("Expected composite keys (r1, r2) to be coalesced into (k1, k2) and dropped from output");
}

// 32g. Explicit coalesce: false on left join (retains right key column with suffix if colliding)
const dfLeftNoCoalesce = coalesceL.join(coalesceR, { on: "id",
    how: "left",
    coalesce: false,
});
const leftNoCoalesceRows = dfLeftNoCoalesce.toDicts() as any[];
if (!leftNoCoalesceRows.every(r => "id" in r && "id_right" in r)) {
    throw new Error("Expected explicit coalesce: false on left join to preserve both 'id' and 'id_right'");
}

// 32h. Coalesce with joinNulls: true when both sides have null keys
const nullL = new DataFrame([{ id: null as any, val: "LNull" }]);
const nullR = new DataFrame([{ id: null as any, valR: "RNull" }, { id: 99, valR: "R99" }]);
const dfNullCoalesce = nullL.join(nullR, { on: "id",
    how: "outer",
    joinNulls: true,
    coalesce: true,
});
const nullCoalesceRows = dfNullCoalesce.toDicts() as any[];
const matchedNullRow = nullCoalesceRows.find(r => r.val === "LNull" && r.valR === "RNull");
const r99Row = nullCoalesceRows.find(r => r.valR === "R99");
if (!matchedNullRow || matchedNullRow.id !== null) {
    throw new Error("Expected joinNulls matched null keys to coalesce to null");
}
if (!r99Row || r99Row.id !== 99 || "id_right" in r99Row) {
    throw new Error("Expected unmatched right row (id: 99) to coalesce key id to 99");
}

// ─── 33. Row Order Maintenance (maintainOrder) ──────────────────────────────────

const ordL = new DataFrame([
    { id: 3, val: "L3" },
    { id: 1, val: "L1" },
    { id: 2, val: "L2" },
]);
const ordR = new DataFrame([
    { id: 1, rval: "R1" },
    { id: 2, rval: "R2" },
    { id: 3, rval: "R3" },
]);

// maintainOrder: "left" preserving left table row order
const dfOrdLeft = ordL.join(ordR, { on: "id", maintainOrder: "left" });
const ordLeftIds = dfOrdLeft.toDict()["id"];
if (ordLeftIds[0] !== 3 || ordLeftIds[1] !== 1 || ordLeftIds[2] !== 2) {
    throw new Error("maintainOrder: 'left' failed to preserve left table row order");
}

// maintainOrder: true (boolean) equivalent to "left"
const dfOrdBool = ordL.join(ordR, { on: "id", maintainOrder: true });
const ordBoolIds = dfOrdBool.toDict()["id"];
if (ordBoolIds[0] !== 3 || ordBoolIds[1] !== 1 || ordBoolIds[2] !== 2) {
    throw new Error("maintainOrder: true (boolean) failed to preserve left table row order");
}

// maintainOrder: "right" preserving right table row order
const dfOrdRight = ordL.join(ordR, { on: "id", maintainOrder: "right" });
const ordRightIds = dfOrdRight.toDict()["id"];
if (ordRightIds[0] !== 1 || ordRightIds[1] !== 2 || ordRightIds[2] !== 3) {
    throw new Error("maintainOrder: 'right' failed to preserve right table row order");
}

// maintainOrder: "left_right" and "right_left"
const dfOrdLeftRight = ordL.join(ordR, { on: "id", maintainOrder: "left_right" });
if (dfOrdLeftRight.toDict()["id"][0] !== 3) {
    throw new Error("maintainOrder: 'left_right' failed");
}

// ─── 34. Edge Cases: maintainOrder with Unmatched & Duplicate Rows ─────────────────────

// 34a. maintainOrder: "right" with unmatched left rows in a left join
const ordLUnmatched = new DataFrame([
    { id: 10, val: "L10" },
    { id: 20, val: "L20" }, // unmatched in right
    { id: 30, val: "L30" },
]);
const ordRUnmatched = new DataFrame([
    { id: 30, rval: "R30" }, // index 0 in right
    { id: 10, rval: "R10" }, // index 1 in right
]);

const dfOrdRightUnmatched = ordLUnmatched.join(ordRUnmatched, { on: "id",
    how: "left",
    maintainOrder: "right",
});
const ordRightUnmatchedIds = dfOrdRightUnmatched.toDict()["id"];
// Right order: 30 (index 0), 10 (index 1), then unmatched left 20 (index null) at the end
if (ordRightUnmatchedIds[0] !== 30 || ordRightUnmatchedIds[1] !== 10 || ordRightUnmatchedIds[2] !== 20) {
    throw new Error("maintainOrder: 'right' failed for left join with unmatched rows");
}

// 34b. maintainOrder: "right_left" with 1-to-many duplicate key matches
const ordLDup = new DataFrame([
    { id: 2, val: "L2_a" }, // index 0
    { id: 1, val: "L1" },   // index 1
    { id: 2, val: "L2_b" }, // index 2
]);
const ordRDup = new DataFrame([
    { id: 1, rval: "R1" },   // index 0
    { id: 2, rval: "R2" },   // index 1
]);

const dfOrdRightLeft = ordLDup.join(ordRDup, { on: "id",
    how: "inner",
    maintainOrder: "right_left",
});
const ordRightLeftVals = dfOrdRightLeft.toDict()["val"];
// Expected: Right index 0 (id 1 -> L1), then Right index 1 (id 2 -> L2_a then L2_b)
if (ordRightLeftVals[0] !== "L1" || ordRightLeftVals[1] !== "L2_a" || ordRightLeftVals[2] !== "L2_b") {
    throw new Error("maintainOrder: 'right_left' failed for duplicate key matches");
}

// ─── 35. Edge Cases: Coalesce with Heterogeneous Keys & Multiple Keys ─────────────────────

// 35a. Multi-key coalescing on outer join with nulls
const multiKeyL = new DataFrame([
    { k1: 1, k2: "a", val: "L1" },
    { k1: 2, k2: "b", val: "L2" },
]);
const multiKeyR = new DataFrame([
    { rk1: 2, rk2: "b", rval: "R2" },
    { rk1: 3, rk2: "c", rval: "R3" },
]);

const dfMultiCoalesce = multiKeyL.join(multiKeyR, { leftOn: ["k1", "k2"],
    rightOn: ["rk1", "rk2"],
    how: "outer",
    coalesce: true,
});
const multiRows = dfMultiCoalesce.toDicts() as any[];
const r3Row = multiRows.find(r => r.rval === "R3");
if (!r3Row || r3Row.k1 !== 3 || r3Row.k2 !== "c" || "rk1" in r3Row || "rk2" in r3Row) {
    throw new Error("Multi-key coalesce failed to coalesce rk1/rk2 into k1/k2 or suppress rk1/rk2");
}

// 35b. Coalesce on empty DataFrames
const emptyL = new DataFrame({ id: [] as number[], val: [] as string[] });
const emptyR = new DataFrame({ id: [] as number[], rval: [] as string[] });
const dfEmptyCoalesce = emptyL.join(emptyR, { on: "id", coalesce: true });
if (dfEmptyCoalesce.height !== 0 || !dfEmptyCoalesce.columns.includes("id")) {
    throw new Error("Coalesce on empty DataFrame failed");
}

const dfEmptyNoCoalesce = emptyL.join(emptyR, { on: "id", coalesce: false });
if (dfEmptyNoCoalesce.height !== 0 || !dfEmptyNoCoalesce.columns.includes("id_right")) {
    throw new Error("Coalesce false on empty DataFrame failed to preserve id_right");
}

// ─── 36. Asof Join Tests ───────────────────────────────────────────────────────

const trades = new DataFrame([
    { time: 10, symbol: "AAPL", price: 100 },
    { time: 25, symbol: "AAPL", price: 101 },
    { time: 30, symbol: "AAPL", price: 102 },
]);

const quotes = new DataFrame([
    { time: 9, symbol: "AAPL", bid: 99.5 },
    { time: 20, symbol: "AAPL", bid: 100.5 },
    { time: 30, symbol: "AAPL", bid: 102.0 },
]);

// Backward strategy (default)
const dfAsofBackward = trades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "backward" });
const asofBackwardRows = dfAsofBackward.toDicts() as any[];
if (asofBackwardRows[0].bid !== 99.5 || asofBackwardRows[1].bid !== 100.5 || asofBackwardRows[2].bid !== 102.0) {
    throw new Error("joinAsof backward strategy failed");
}

// Forward strategy
const dfAsofForward = trades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "forward" });
const asofForwardRows = dfAsofForward.toDicts() as any[];
if (asofForwardRows[0].bid !== 100.5 || asofForwardRows[1].bid !== 102.0 || asofForwardRows[2].bid !== 102.0) {
    throw new Error("joinAsof forward strategy failed");
}

// Nearest strategy with tie-breaker (prefer backward on equal distance)
const dfAsofNearest = trades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "nearest" });
const asofNearestRows = dfAsofNearest.toDicts() as any[];
if (asofNearestRows[0].bid !== 99.5 || asofNearestRows[1].bid !== 100.5 || asofNearestRows[2].bid !== 102.0) {
    throw new Error("joinAsof nearest strategy failed");
}

// allowExactMatches: false
const dfAsofNoExact = trades.joinAsof(quotes, { on: "time", by: "symbol", strategy: "backward", allowExactMatches: false });
const asofNoExactRows = dfAsofNoExact.toDicts() as any[];
if (asofNoExactRows[0].bid !== 99.5 || asofNoExactRows[1].bid !== 100.5 || asofNoExactRows[2].bid !== 100.5) {
    throw new Error("joinAsof allowExactMatches:false failed");
}

// Heterogeneous key names: leftOn / rightOn & leftBy / rightBy
const leftDF = new DataFrame([
    { t_left: 10, ticker: "AAPL", val: 1 },
    { t_left: 20, ticker: "GOOG", val: 2 }
]);
const rightDF = new DataFrame([
    { t_right: 8, symbol: "AAPL", rval: 100 },
    { t_right: 15, symbol: "GOOG", rval: 200 }
]);
const dfAsofHetero = leftDF.joinAsof(rightDF, { leftOn: "t_left",
    rightOn: "t_right",
    leftBy: "ticker",
    rightBy: "symbol",
    strategy: "backward"
});
const heteroRows = dfAsofHetero.toDicts() as any[];
if (heteroRows[0].rval !== 100 || heteroRows[1].rval !== 200) {
    throw new Error("joinAsof heterogeneous leftOn/rightOn/leftBy/rightBy failed");
}

// -------------------------------------------------------------
// EXTENSIVE ROBUST EDGE CASE TESTS FOR JOIN AND JOIN_ASOF
// -------------------------------------------------------------
{
    // Edge Case 1: Empty left DataFrame (0 rows with key column) with non-empty right DataFrame
    const emptyL = new DataFrame<any>({ id: [] as number[] });
    const nonEmptyR = new DataFrame<any>([{ id: 1, val: "A" }, { id: 2, val: "B" }]);

    const emptyInner = emptyL.join(nonEmptyR, { on: "id", how: "inner" });
    if (emptyInner.height !== 0) throw new Error("Empty left inner join height must be 0");

    const emptyLeftJoin = emptyL.join(nonEmptyR, { on: "id", how: "left" });
    if (emptyLeftJoin.height !== 0) throw new Error("Empty left left join height must be 0");

    const emptyRightJoin = emptyL.join(nonEmptyR, { on: "id", how: "right" });
    if (emptyRightJoin.height !== 2 || emptyRightJoin.toDicts()[0].val !== "A") {
        throw new Error("Empty left right join should preserve right rows");
    }

    const emptyOuterJoin = emptyL.join(nonEmptyR, { on: "id", how: "outer" });
    if (emptyOuterJoin.height !== 2) throw new Error("Empty left outer join height mismatch");

    // Edge Case 2: Cross Join with 0-height DataFrames
    const emptyCross1 = emptyL.join(nonEmptyR, { how: "cross" });
    if (emptyCross1.height !== 0) throw new Error("Cross join with empty left must have height 0");

    const emptyCross2 = nonEmptyR.join(emptyL, { how: "cross" });
    if (emptyCross2.height !== 0) throw new Error("Cross join with empty right must have height 0");

    // Edge Case 3: joinNulls option (matching null with null)
    const dfNullLeft = new DataFrame<any>([
        { k: null, lval: 1 },
        { k: "X", lval: 2 }
    ]);
    const dfNullRight = new DataFrame<any>([
        { k: null, rval: 10 },
        { k: "X", rval: 20 }
    ]);

    const joinNullsDefault = dfNullLeft.join(dfNullRight, { on: "k", how: "inner" });
    if (joinNullsDefault.height !== 1 || joinNullsDefault.toDicts()[0].k !== "X") {
        throw new Error("Default joinNulls: false should ignore null==null matches");
    }

    const joinNullsTrue = dfNullLeft.join(dfNullRight, { on: "k", how: "inner", joinNulls: true });
    if (joinNullsTrue.height !== 2) {
        throw new Error("joinNulls: true should match null with null");
    }
    const nullMatchedRow = joinNullsTrue.toDicts().find((r: any) => r.k === null);
    if (!nullMatchedRow || nullMatchedRow.lval !== 1 || nullMatchedRow.rval !== 10) {
        throw new Error("joinNulls: true matched row values incorrect");
    }

    // Edge Case 4: Semi & Anti join with duplicate keys and nulls
    const semiLeft = new DataFrame<any>([
        { id: 1, name: "A" },
        { id: 1, name: "A_dup" },
        { id: 2, name: "B" },
        { id: null, name: "Null1" }
    ]);
    const semiRight = new DataFrame<any>([
        { id: 1, score: 100 },
        { id: 1, score: 200 },
        { id: 3, score: 300 }
    ]);

    const semiResult = semiLeft.join(semiRight, { on: "id", how: "semi" });
    if (semiResult.height !== 2 || semiResult.toDicts()[0].id !== 1 || semiResult.toDicts()[1].id !== 1) {
        throw new Error("Semi join should keep all matching left rows and omit right columns");
    }
    if ("score" in semiResult.toDicts()[0]) {
        throw new Error("Semi join should not include right table columns");
    }

    const antiResult = semiLeft.join(semiRight, { on: "id", how: "anti" });
    if (antiResult.height !== 2 || antiResult.toDicts()[0].id !== 2 || antiResult.toDicts()[1].id !== null) {
        throw new Error("Anti join should keep unmatched rows (id: 2 and null when joinNulls: false)");
    }

    // Edge Case 5: maintainOrder ("left", "right", "left_right", "right_left")
    const ordLeft = new DataFrame<any>([
        { id: 3, l: "L3" },
        { id: 1, l: "L1" },
        { id: 2, l: "L2" }
    ]);
    const ordRight = new DataFrame<any>([
        { id: 1, r: "R1" },
        { id: 2, r: "R2" },
        { id: 4, r: "R4" }
    ]);

    const ordOuterLR = ordLeft.join(ordRight, { on: "id", how: "outer", maintainOrder: "left_right" });
    const ordLRRows = ordOuterLR.toDicts();
    if (ordLRRows[0].id !== 3 || ordLRRows[1].id !== 1 || ordLRRows[2].id !== 2 || ordLRRows[3].id !== 4) {
        throw new Error("maintainOrder: 'left_right' ordering mismatch");
    }

    const ordOuterRL = ordLeft.join(ordRight, { on: "id", how: "outer", maintainOrder: "right_left" });
    const ordRLRows = ordOuterRL.toDicts();
    if (ordRLRows[0].id !== 1 || ordRLRows[1].id !== 2 || ordRLRows[2].id !== 4 || ordRLRows[3].id !== 3) {
        throw new Error("maintainOrder: 'right_left' ordering mismatch");
    }

    // Edge Case 6: Multiple non-key column collision with custom suffixes
    const colLeft = new DataFrame<any>([{ id: 1, x: "L_X", y: "L_Y", z: "L_Z" }]);
    const colRight = new DataFrame<any>([{ id: 1, x: "R_X", y: "R_Y", z: "R_Z" }]);
    const colJoined = colLeft.join(colRight, { on: "id", how: "inner", suffixes: ["_src", "_tgt"] });
    const colDict = colJoined.toDicts()[0];
    if (colDict.x_src !== "L_X" || colDict.x_tgt !== "R_X" || colDict.y_src !== "L_Y" || colDict.y_tgt !== "R_Y") {
        throw new Error("Custom suffixes on multiple colliding columns mismatch");
    }

    // Edge Case 7: joinAsof with exact match toggle, tolerance, and nearest strategy
    const asofLeftT = new DataFrame<any>([
        { t: 10, cat: "A" },
        { t: 25, cat: "A" },
        { t: 50, cat: "A" }
    ]);
    const asofRightT = new DataFrame<any>([
        { t: 10, cat: "A", price: 100 },
        { t: 20, cat: "A", price: 200 },
        { t: 60, cat: "A", price: 600 }
    ]);

    // 7a: strategy "backward" with allowExactMatches: false
    const asofNoExact = asofLeftT.joinAsof(asofRightT, { on: "t",
        by: "cat",
        strategy: "backward",
        allowExactMatches: false
    });
    const noExactRows = asofNoExact.toDicts();
    if (noExactRows[0].price !== null || noExactRows[1].price !== 200) {
        throw new Error("joinAsof allowExactMatches: false failed for exact key");
    }

    // 7b: strategy "nearest" with tolerance
    const asofNearest = asofLeftT.joinAsof(asofRightT, { on: "t",
        by: "cat",
        strategy: "nearest",
        tolerance: 15
    });
    const nearestRows = asofNearest.toDicts();
    if (nearestRows[0].price !== 100 || nearestRows[1].price !== 200 || nearestRows[2].price !== 600) {
        throw new Error("joinAsof strategy 'nearest' with tolerance failed");
    }

    // 7c: strategy "nearest" exceeding tolerance
    const asofExceedTol = asofLeftT.joinAsof(asofRightT, { on: "t",
        by: "cat",
        strategy: "nearest",
        tolerance: 5
    });
    const exceedRows = asofExceedTol.toDicts();
    if (exceedRows[1].price !== 200 || exceedRows[2].price !== null) {
        throw new Error("joinAsof nearest exceeding tolerance should produce null");
    }

    // Edge Case 8: Unsorted check error validation
    const unsortedRight = new DataFrame([
        { time: 30, symbol: "AAPL", bid: 102.0 },
        { time: 10, symbol: "AAPL", bid: 99.5 }
    ]);
    let unsortedErrorCaught = false;
    try {
        const sampleTrades = new DataFrame([{ time: 20, symbol: "AAPL", price: 100.0 }]);
        sampleTrades.joinAsof(unsortedRight, { on: "time", by: "symbol", checkSorted: true });
    } catch (e: any) {
        unsortedErrorCaught = true;
    }
    // ─── 10/10 ULTRA-COMPLEX ROBUST EDGE CASES ────────────────────────────────

    // 1. Many-to-Many Cross Product Explosion with Composite Nulls and joinNulls
    {
        const m2mL = new DataFrame<any>([
            { k1: "A", k2: null, val_l: 1 },
            { k1: "A", k2: null, val_l: 2 },
            { k1: "B", k2: 10, val_l: 3 },
        ]);
        const m2mR = new DataFrame<any>([
            { k1: "A", k2: null, val_r: "X" },
            { k1: "A", k2: null, val_r: "Y" },
            { k1: "A", k2: null, val_r: "Z" },
            { k1: "B", k2: 10, val_r: "W" },
        ]);

        // Default joinNulls: false -> null composite keys don't match -> only (B, 10) matches
        const m2mDefault = m2mL.join(m2mR, { on: ["k1", "k2"], how: "inner", joinNulls: false });
        if (m2mDefault.height !== 1 || m2mDefault.toDicts()[0].val_r !== "W") {
            throw new Error("M2M Complex Case 1: joinNulls: false failed to suppress null composite joins");
        }

        // joinNulls: true -> (A, null) has 2 left rows * 3 right rows = 6 rows + 1 from (B, 10) = 7 total rows
        const m2mTrue = m2mL.join(m2mR, { on: ["k1", "k2"], how: "inner", joinNulls: true });
        if (m2mTrue.height !== 7) {
            throw new Error(`M2M Complex Case 1: Expected 7 exploded rows, got ${m2mTrue.height}`);
        }
    }

    // 2. BigInt & Extreme Numeric Boundary Keys (Int64, -0, NaN, Infinity)
    {
        const numL = new DataFrame<any>([
            { id: 9007199254740993n, label: "big1" },
            { id: -9007199254740993n, label: "big2" },
            { id: 0, label: "zero" },
            { id: Infinity, label: "inf" },
        ]);
        const numR = new DataFrame<any>([
            { id: 9007199254740993n, score: 100 },
            { id: -9007199254740993n, score: 200 },
            { id: -0, score: 300 },
            { id: Infinity, score: 400 },
        ]);

        const resNum = numL.join(numR, { on: "id", how: "inner" });
        if (resNum.height !== 4) {
            throw new Error(`Complex Case 2: BigInt & numeric boundary join height mismatch (${resNum.height})`);
        }
        const rows = resNum.toDicts();
        const big1 = rows.find((r: any) => r.label === "big1");
        const big2 = rows.find((r: any) => r.label === "big2");
        const zero = rows.find((r: any) => r.label === "zero");
        const inf = rows.find((r: any) => r.label === "inf");

        if (!big1 || big1.score !== 100 || !big2 || big2.score !== 200 || !zero || zero.score !== 300 || !inf || inf.score !== 400) {
            throw new Error("Complex Case 2: BigInt / Extreme numeric boundary values mismatched");
        }
    }

    // 3. Exact Date Objects with Milliseconds as Join Keys
    {
        const d1 = new Date("2026-01-01T12:00:00.123Z");
        const d2 = new Date("2026-01-01T12:00:00.124Z"); // 1ms difference
        const d3 = new Date("2026-01-01T12:00:00.123Z"); // exact match to d1

        const dateL = new DataFrame<any>([{ timestamp: d1, event: "E1" }, { timestamp: d2, event: "E2" }]);
        const dateR = new DataFrame<any>([{ timestamp: d3, meta: "M1" }]);

        const dateRes = dateL.join(dateR, { on: "timestamp", how: "inner" });
        if (dateRes.height !== 1 || dateRes.toDicts()[0].event !== "E1" || dateRes.toDicts()[0].meta !== "M1") {
            throw new Error("Complex Case 3: Date millisecond precision join key failed");
        }
    }

    // 4. Nested Object and Array Canonical Key Join
    {
        const objL = new DataFrame<any>([
            { conf: { a: 1, b: "x" }, l: 10 },
            { conf: { b: "x", a: 1 }, l: 20 }, // Unordered object keys should canonicalize to same hash
            { conf: [1, 2, 3], l: 30 }
        ]);
        const objR = new DataFrame<any>([
            { conf: { a: 1, b: "x" }, r: 100 },
            { conf: [1, 2, 3], r: 300 }
        ]);

        const objRes = objL.join(objR, { on: "conf", how: "inner" });
        // { a: 1, b: "x" } matches rows 0 and 1, array matches row 2 -> 3 total matches
        if (objRes.height !== 3) {
            throw new Error(`Complex Case 4: Deep object/array canonical hashing join failed (height: ${objRes.height})`);
        }
    }

    // 5. Quadruple Colliding Suffix Cascade
    {
        // When both left and right contain col, col_right, col_right_1
        const deepL = new DataFrame<any>([{ id: 1, data: "L0", data_right: "L1", data_right_1: "L2" }]);
        const deepR = new DataFrame<any>([{ id: 1, data: "R0", data_right: "R1" }]);

        const deepJoined = deepL.join(deepR, { on: "id", how: "inner", suffixes: ["", "_right"] });
        const resObj = deepJoined.toDicts()[0];

        // Left keeps data, data_right, data_right_1
        // Right's 'data' wants 'data_right' (taken) -> 'data_right_1' (taken) -> allocates 'data_right_2'
        // Right's 'data_right' wants 'data_right_right' (available)
        if (resObj.data !== "L0" || resObj.data_right !== "L1" || resObj.data_right_1 !== "L2" || resObj.data_right_2 !== "R0") {
            throw new Error("Complex Case 5: Quadruple cascading suffix collision resolution failed");
        }
    }

    // 6. Full Outer Join Key Coalescing with Heterogeneous LeftOn/RightOn
    {
        const hL = new DataFrame<any>([
            { user_id: "U1", left_only: "L1" },
            { user_id: "U2", left_only: "L2" }
        ]);
        const hR = new DataFrame<any>([
            { account_id: "U2", right_only: "R2" },
            { account_id: "U3", right_only: "R3" }
        ]);

        const hOuter = hL.join(hR, { leftOn: "user_id",
            rightOn: "account_id",
            how: "outer",
            coalesce: true
        });

        if (hOuter.height !== 3) throw new Error("Complex Case 6: Heterogeneous outer join height mismatch");
        const rows = hOuter.toDicts();

        // account_id should be coalesced into user_id
        const u1 = rows.find((r: any) => r.user_id === "U1");
        const u2 = rows.find((r: any) => r.user_id === "U2");
        const u3 = rows.find((r: any) => r.user_id === "U3");

        if (!u1 || u1.right_only !== null || !u2 || u2.left_only !== "L2" || u2.right_only !== "R2" || !u3 || u3.left_only !== null || u3.right_only !== "R3") {
            throw new Error("Complex Case 6: Heterogeneous outer join coalescing values failed");
        }
        if ("account_id" in rows[0]) {
            throw new Error("Complex Case 6: Right key 'account_id' should be coalesced away when coalesce: true");
        }
    }

    // 7. joinAsof "forward" Strategy with Multi-Column Partitioning & Duplicates
    {
        const fwdL = new DataFrame<any>([
            { time: 100, region: "US", sector: "TECH", quote: "Q1" },
            { time: 150, region: "US", sector: "TECH", quote: "Q2" },
            { time: 200, region: "EU", sector: "FIN", quote: "Q3" },
        ]);
        const fwdR = new DataFrame<any>([
            { time: 120, region: "US", sector: "TECH", ask: 12.5 },
            { time: 150, region: "US", sector: "TECH", ask: 15.0 }, // Exact match
            { time: 180, region: "US", sector: "TECH", ask: 18.0 },
            { time: 190, region: "EU", sector: "FIN", ask: 99.0 }, // Before EU quote (forward will ignore 190, looks for >= 200)
            { time: 210, region: "EU", sector: "FIN", ask: 101.0 },
        ]);

        const fwdJoined = fwdL.joinAsof(fwdR, { on: "time",
            by: ["region", "sector"],
            strategy: "forward",
            allowExactMatches: true
        });

        const rows = fwdJoined.toDicts();
        if (rows[0].ask !== 12.5 || rows[1].ask !== 15.0 || rows[2].ask !== 101.0) {
            throw new Error("Complex Case 7: joinAsof forward strategy with composite 'by' keys failed");
        }
    }

    // 8. joinAsof "nearest" Equidistant Tie-Breaking Edge Case
    {
        // When left time is 15, and right has 10 and 20 (both diff 5)
        const tieL = new DataFrame<any>([{ t: 15 }]);
        const tieR = new DataFrame<any>([{ t: 10, v: "backward_10" }, { t: 20, v: "forward_20" }]);

        const nearestRes = tieL.joinAsof(tieR, { on: "t",
            strategy: "nearest"
        });
        const rows = nearestRes.toDicts();
        // Math.abs(15 - 10) <= Math.abs(15 - 20) -> tie broken backward to 10
        if (rows[0].v !== "backward_10") {
            throw new Error("Complex Case 8: joinAsof nearest tie-break failed");
        }
    }

    // 9. TypedArray Schema Preservation with Null Injection in Outer Joins
    {
        const typedL = new DataFrame<any>({
            id: new Int32Array([1, 2]),
            score: new Float64Array([10.5, 20.5])
        });
        const typedR = new DataFrame<any>({
            id: new Int32Array([2, 3]),
            score: new Float64Array([200.5, 300.5])
        });

        const typedOuter = typedL.join(typedR, { on: "id", how: "outer", suffixes: ["_l", "_r"] });
        if (typedOuter.height !== 3) throw new Error("Complex Case 9: TypedArray outer join height mismatch");

        const rows = typedOuter.toDicts();
        const r1 = rows.find((r: any) => r.id === 1);
        const r3 = rows.find((r: any) => r.id === 3);

        if (r1.score_l !== 10.5 || r1.score_r !== null || r3.score_l !== null || r3.score_r !== 300.5) {
            throw new Error("Complex Case 9: TypedArray outer join null injection corrupted values");
        }
    }

    // 10. Complex Maintain Order: 'right' and 'left_right' with Semi/Anti and Heterogeneous Outer
    {
        const orderL = new DataFrame<any>([
            { id: 99, val: "L99" },
            { id: 10, val: "L10" },
            { id: 50, val: "L50" }
        ]);
        const orderR = new DataFrame<any>([
            { id: 50, score: 500 },
            { id: 99, score: 990 },
            { id: 70, score: 700 }
        ]);

        // Maintain order 'right': matched and right unmatched rows follow right table index order
        const outerRightOrder = orderL.join(orderR, { on: "id", how: "outer", maintainOrder: "right" });
        const rightOrderRows = outerRightOrder.toDicts();

        // Expected order: id 50 (rIdx 0), id 99 (rIdx 1), id 70 (rIdx 2), id 10 (unmatched left)
        if (rightOrderRows[0].id !== 50 || rightOrderRows[1].id !== 99 || rightOrderRows[2].id !== 70 || rightOrderRows[3].id !== 10) {
            throw new Error("Complex Case 10: maintainOrder 'right' sequence failed");
        }
    }

    // ─── 11. THE ULTIMATE MULTI-TIER TORTURE TEST: 6-KEY COMPOSITE JOIN WITH SPECIAL CHARS, ARRAYS & NULLS
    {
        const tortureL = new DataFrame<any>([
            { k_str: "foo::bar|baz", k_num: -0,  k_big: 1234567890123456789n, k_date: new Date("2026-05-20T00:00:00.123Z"), k_obj: { x: [1, { y: 2 }] }, k_null: null, left_val: "LV1" },
            { k_str: "foo::bar|baz", k_num: 0,   k_big: 1234567890123456789n, k_date: new Date("2026-05-20T00:00:00.123Z"), k_obj: { x: [1, { y: 2 }] }, k_null: null, left_val: "LV2" },
            { k_str: "diff",         k_num: 100, k_big: 999n,                 k_date: new Date("2020-01-01T00:00:00.000Z"), k_obj: { x: [] },              k_null: 42,   left_val: "LV3" },
        ]);

        const tortureR = new DataFrame<any>([
            { k_str: "foo::bar|baz", k_num: 0,   k_big: 1234567890123456789n, k_date: new Date("2026-05-20T00:00:00.123Z"), k_obj: { x: [1, { y: 2 }] }, k_null: null, right_val: "RV1" },
            { k_str: "foo::bar|baz", k_num: -0,  k_big: 1234567890123456789n, k_date: new Date("2026-05-20T00:00:00.123Z"), k_obj: { x: [1, { y: 2 }] }, k_null: null, right_val: "RV2" },
            { k_str: "unmatched",    k_num: 999, k_big: 1n,                   k_date: new Date("2026-12-31T00:00:00.000Z"), k_obj: null,                   k_null: null, right_val: "RV3" },
        ]);

        const keys = ["k_str", "k_num", "k_big", "k_date", "k_obj", "k_null"];

        // Case 11a: joinNulls = false -> composite key with k_null == null must not match
        const resSuppressed = tortureL.join(tortureR, { on: keys, how: "inner", joinNulls: false });
        if (resSuppressed.height !== 0) {
            throw new Error("Torture Test 11a: joinNulls: false failed on composite key with null entry");
        }

        // Case 11b: joinNulls = true -> (-0 matches 0, Date matches Date, deep object matches deep object, null matches null)
        // 2 left rows * 2 right rows = 4 matches
        const resMatched = tortureL.join(tortureR, { on: keys, how: "inner", joinNulls: true });
        if (resMatched.height !== 4) {
            throw new Error(`Torture Test 11b: Expected 4 cross matches, got ${resMatched.height}`);
        }

        // Case 11c: Full Outer join with joinNulls = true
        // 4 matched rows + 1 left unmatched ("LV3") + 1 right unmatched ("RV3") = 6 total rows
        const resOuter = tortureL.join(tortureR, { on: keys, how: "outer", joinNulls: true });
        if (resOuter.height !== 6) {
            throw new Error(`Torture Test 11c: Expected 6 outer rows, got ${resOuter.height}`);
        }
    }

    // ─── 12. EXTREME ASOF JOIN: DUPLICATE TIMESTAMPS, MULTI-TIER 'BY' NULLS & BIDIRECTIONAL NEAREST
    {
        // 10 distinct events at microsecond-like offsets with duplicate timestamps in right table
        const asofStressL = new DataFrame<any>([
            { t: 100, grp1: "A", grp2: "X", event: "L100_A_X" },
            { t: 105, grp1: "A", grp2: "X", event: "L105_A_X" }, // strictly between 100 and 110
            { t: 110, grp1: "A", grp2: "X", event: "L110_A_X" }, // exact match with duplicate right records
            { t: 120, grp1: "B", grp2: null, event: "L120_B_null" },
            { t: 130, grp1: "C", grp2: "Z", event: "L130_C_Z" }, // no right records in group C
        ]);

        const asofStressR = new DataFrame<any>([
            { t: 90,  grp1: "A", grp2: "X", r_bid: 9.0 },
            { t: 100, grp1: "A", grp2: "X", r_bid: 10.0 },
            { t: 110, grp1: "A", grp2: "X", r_bid: 11.0 }, // Right has two prices at t=110
            { t: 110, grp1: "A", grp2: "X", r_bid: 11.5 },
            { t: 115, grp1: "B", grp2: null, r_bid: 50.0 },
            { t: 125, grp1: "B", grp2: null, r_bid: 60.0 },
        ]);

        // Backward test
        const backwardRes = asofStressL.joinAsof(asofStressR, { on: "t",
            by: ["grp1", "grp2"],
            strategy: "backward"
        });
        const bRows = backwardRes.toDicts();
        if (bRows[0].r_bid !== 10.0 || bRows[1].r_bid !== 10.0 || bRows[2].r_bid !== 11.5 || bRows[3].r_bid !== 50.0 || bRows[4].r_bid !== null) {
            throw new Error("Extreme Asof Test 12: Backward strategy resolution mismatch with duplicates & composite by-keys");
        }

        // Forward test
        const forwardRes = asofStressL.joinAsof(asofStressR, { on: "t",
            by: ["grp1", "grp2"],
            strategy: "forward"
        });
        const fRows = forwardRes.toDicts();
        if (fRows[0].r_bid !== 10.0 || fRows[1].r_bid !== 11.0 || fRows[2].r_bid !== 11.0 || fRows[3].r_bid !== 60.0 || fRows[4].r_bid !== null) {
            throw new Error("Extreme Asof Test 12: Forward strategy resolution mismatch with duplicates & composite by-keys");
        }

        // Nearest test with tolerance = 6
        const nearestRes = asofStressL.joinAsof(asofStressR, { on: "t",
            by: ["grp1", "grp2"],
            strategy: "nearest",
            tolerance: 6
        });
        const nRows = nearestRes.toDicts();
        // L100 (exact match -> 10.0)
        // L105 (dist to 100 is 5 <= 6, dist to 110 is 5 <= 6 -> tie broken backward to 100 -> bid 10.0)
        // L110 (exact match at t=110, backward binary search selects last matching duplicate -> bid 11.5)
        // L120 (dist to 115 is 5 <= 6, dist to 125 is 5 <= 6 -> tie broken backward to 115 -> bid 50.0)
        // L130 (no right candidate -> null)
        if (nRows[0].r_bid !== 10.0 || nRows[1].r_bid !== 10.0 || nRows[2].r_bid !== 11.5 || nRows[3].r_bid !== 50.0 || nRows[4].r_bid !== null) {
            throw new Error("Extreme Asof Test 12: Nearest strategy resolution mismatch");
        }
    }

    // ─── 13. Validation & Shortened Error Message Tests ───────────────────────
    {
        let threwCrossWithKeys = false;
        try {
            left.join(right, { on: "id", how: "cross" });
        } catch (e: any) {
            if (e.message.includes('Cannot specify "on", "leftOn", or "rightOn" when how is "cross"')) {
                threwCrossWithKeys = true;
            }
        }
        if (!threwCrossWithKeys) throw new Error("Cross join with keys validation failed");

        let threwBothOnAndLeft = false;
        try {
            left.join(right, { on: "id", leftOn: "id", rightOn: "id" } as any);
        } catch (e: any) {
            if (e.message.includes('Cannot specify both "on" and "leftOn"/"rightOn"')) {
                threwBothOnAndLeft = true;
            }
        }
        if (!threwBothOnAndLeft) throw new Error("Both on and leftOn validation failed");

        let threwMissingRightOn = false;
        try {
            left.join(right, { leftOn: "id" } as any);
        } catch (e: any) {
            if (e.message.includes('join() requires both "leftOn" and "rightOn"')) {
                threwMissingRightOn = true;
            }
        }
        if (!threwMissingRightOn) throw new Error("Missing rightOn validation failed");

        let threwJoinMissingOther = false;
        try {
            left.join(null as any, { on: "id" } as any);
        } catch (e: any) {
            if (e.message.includes('join() requires a valid DataFrame in "other"')) {
                threwJoinMissingOther = true;
            }
        }
        if (!threwJoinMissingOther) throw new Error("Join missing other validation failed");

        let threwAsofMissingOther = false;
        try {
            left.joinAsof(null as any, { on: "id" } as any);
        } catch (e: any) {
            if (e.message.includes('joinAsof() requires a valid DataFrame in "other"')) {
                threwAsofMissingOther = true;
            }
        }
        if (!threwAsofMissingOther) throw new Error("Asof missing other validation failed");

        let threwAsofMismatchBy = false;
        try {
            left.joinAsof(right, { on: "id", leftBy: ["a", "b"], rightBy: ["a"] } as any);
        } catch (e: any) {
            if (e.message.includes("Partition key length mismatch")) {
                threwAsofMismatchBy = true;
            }
        }
        if (!threwAsofMismatchBy) throw new Error("Asof mismatch by length validation failed");
    }

    // ─── NaN Join Key Behavior ──────────────────────────────────────────
    {
        const leftNaN = new DataFrame([
            { id: NaN, val: "L_NaN" },
            { id: 1, val: "L_1" }
        ]);
        const rightNaN = new DataFrame([
            { id: NaN, rval: "R_NaN" },
            { id: 1, rval: "R_1" }
        ]);
        const joinedNaN = leftNaN.join(rightNaN, { on: "id", how: "inner" });
        if (joinedNaN.height !== 2) throw new Error("NaN join expected 2 matches, got " + joinedNaN.height);
        const rows = joinedNaN.toDicts() as any[];
        const nanMatch = rows.find(r => typeof r.id === "number" && Number.isNaN(r.id));
        if (!nanMatch || nanMatch.val !== "L_NaN" || nanMatch.rval !== "R_NaN") {
            throw new Error("NaN join match values mismatch");
        }
    }
}

console.log("✓ join tests passed!");

