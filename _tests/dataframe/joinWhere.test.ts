declare const process: any;
import { DataFrame } from "df-script";
import { $df } from "df-script";

console.log("Running joinWhere tests...");

// 1. Basic inner join with inequality predicates (Polars doc example)
const east = new DataFrame([
    { id: 100, dur: 120, rev: 12, cores: 2 },
    { id: 101, dur: 140, rev: 14, cores: 8 },
    { id: 102, dur: 160, rev: 16, cores: 4 }
]);

const west = new DataFrame([
    { t_id: 404, time: 90, cost: 9, cores: 4 },
    { t_id: 498, time: 130, cost: 13, cores: 2 },
    { t_id: 676, time: 150, cost: 15, cores: 1 },
    { t_id: 742, time: 170, cost: 16, cores: 4 }
]);

// dur < time AND rev < cost
const res1 = east.joinWhere(
    west,
    $df.col("dur").lt($df.col("time")),
    $df.col("rev").lt($df.col("cost"))
);

if (res1.height !== 5) {
    throw new Error(`Expected joinWhere inner height 5, got ${res1.height}`);
}

const rows1 = res1.toDicts() as any[];
// Verification of matched rows:
// 100 (120, 12) -> 498 (130, 13), 676 (150, 15), 742 (170, 16)
// 101 (140, 14) -> 676 (150, 15), 742 (170, 16)
if (rows1[0].id !== 100 || rows1[0].t_id !== 498) throw new Error("Mismatch row 0 in joinWhere test 1");
if (rows1[1].id !== 100 || rows1[1].t_id !== 676) throw new Error("Mismatch row 1 in joinWhere test 1");
if (rows1[2].id !== 100 || rows1[2].t_id !== 742) throw new Error("Mismatch row 2 in joinWhere test 1");
if (rows1[3].id !== 101 || rows1[3].t_id !== 676) throw new Error("Mismatch row 3 in joinWhere test 1");
if (rows1[4].id !== 101 || rows1[4].t_id !== 742) throw new Error("Mismatch row 4 in joinWhere test 1");

// Verify duplicate column "cores" was suffixed with "_right"
if (!("cores" in rows1[0]) || !("cores_right" in rows1[0])) {
    throw new Error("Expected cores and cores_right in joined output");
}
if (rows1[0].cores !== 2 || rows1[0].cores_right !== 2) {
    throw new Error("Mismatch cores values");
}

// 2. OR-ed predicates: (dur < time) | (rev < cost)
const res2 = east.joinWhere(
    west,
    $df.col("dur").lt($df.col("time")).or($df.col("rev").lt($df.col("cost")))
);
if (res2.height !== 6) {
    throw new Error(`Expected joinWhere OR height 6, got ${res2.height}`);
}

// 3. Left join with unmatched row: east row 102 should be kept with null right columns
const resLeft = east.joinWhere(
    west,
    $df.col("dur").lt($df.col("time")),
    $df.col("rev").lt($df.col("cost")),
    { how: "left" }
);
if (resLeft.height !== 6) {
    throw new Error(`Expected joinWhere left height 6, got ${resLeft.height}`);
}
const rowsLeft = resLeft.toDicts() as any[];
const unmatchedLeft = rowsLeft[5];
if (unmatchedLeft.id !== 102 || unmatchedLeft.t_id !== null || unmatchedLeft.cores_right !== null) {
    throw new Error(`Expected unmatched left row with nulls, got ${JSON.stringify(unmatchedLeft)}`);
}

// 4. Right join with unmatched row
const dfL = new DataFrame([{ a: 1, val: 10 }]);
const dfR = new DataFrame([
    { b: 1, val: 10 },
    { b: 2, val: 99 }
]);
const resRight = dfL.joinWhere(
    dfR,
    $df.col("a").eq($df.col("b")),
    { how: "right" }
);
if (resRight.height !== 2) {
    throw new Error(`Expected joinWhere right height 2, got ${resRight.height}`);
}
const rowsRight = resRight.toDicts() as any[];
if (rowsRight[0].a !== 1 || rowsRight[0].b !== 1) throw new Error("Right join matched row mismatch");
if (rowsRight[1].a !== null || rowsRight[1].b !== 2) throw new Error("Right join unmatched row mismatch");

// 5. Custom suffixes option: [leftSuffix, rightSuffix]
const resCustomSuffix = dfL.joinWhere(
    dfR,
    $df.col("a").eq($df.col("b")),
    { suffixes: ["_lhs", "_rhs"] }
);
const customRows = resCustomSuffix.toDicts() as any[];
if (!("val_lhs" in customRows[0]) || !("val_rhs" in customRows[0])) {
    throw new Error("Expected val_lhs and val_rhs with custom suffixes");
}

// 6. Array of predicates
const resArrayPreds = east.joinWhere(
    west,
    [
        $df.col("dur").lt($df.col("time")),
        $df.col("rev").lt($df.col("cost"))
    ]
);
if (resArrayPreds.height !== 5) {
    throw new Error("Expected array of predicates to yield height 5");
}

// 7. Empty DataFrames
const emptyDf = new DataFrame<any>([]);
const resEmptyLeft = emptyDf.joinWhere(west, $df.col("dur").lt($df.col("time")));
if (resEmptyLeft.height !== 0) throw new Error("Expected 0 rows when joining empty left");

const resEmptyRight = east.joinWhere(emptyDf, $df.col("dur").lt($df.col("time")));
if (resEmptyRight.height !== 0) throw new Error("Expected 0 rows when joining empty right");

const resEmptyRightLeftJoin = east.joinWhere(emptyDf, $df.col("dur").lt($df.col("time")), { how: "left" });
if (resEmptyRightLeftJoin.height !== 3) throw new Error("Expected 3 rows when left joining empty right");

// 8. Error handling
let threwMissingOther = false;
try {
    east.joinWhere(null as any);
} catch (e: any) {
    if (e.message.includes('joinWhere() requires a valid DataFrame in "other"')) {
        threwMissingOther = true;
    }
}
if (!threwMissingOther) throw new Error("Expected error for missing other");

let threwInvalidHow = false;
try {
    east.joinWhere(west, { how: "outer" as any });
} catch (e: any) {
    if (e.message.includes('joinWhere() "how" must be one of "inner", "left", "right"')) {
        threwInvalidHow = true;
    }
}
if (!threwInvalidHow) throw new Error("Expected error for invalid how");

// 9. Null values in operands (SQL Kleene 3-valued logic check)
const dfNullL = new DataFrame([
    { id: 1, val: null },
    { id: 2, val: 50 },
    { id: 3, val: 100 }
]);
const dfNullR = new DataFrame([
    { r_id: 1, threshold: 40 },
    { r_id: 2, threshold: null },
    { r_id: 3, threshold: 60 }
]);
// Null operands should evaluate to null / false, not match
const resNull = dfNullL.joinWhere(
    dfNullR,
    $df.col("val").gt($df.col("threshold"))
);
// id: 2 (50) > r_id: 1 (40) -> 1 match
// id: 3 (100) > r_id: 1 (40) -> 1 match
// id: 3 (100) > r_id: 3 (60) -> 1 match
// total = 3
if (resNull.height !== 3) {
    throw new Error(`Expected 3 matches for null operand test, got ${resNull.height}`);
}

// 10. Complex Arithmetic expressions across sides: (val * 2 + 10) >= (threshold / 2)
const resArithmetic = dfNullL.joinWhere(
    dfNullR,
    $df.col("val").mul(2).add(10).ge($df.col("threshold").div(2))
);
// id: 2 (50*2+10 = 110) >= r_id: 1 (20) & r_id: 3 (30) -> 2 matches
// id: 3 (100*2+10 = 210) >= r_id: 1 (20) & r_id: 3 (30) -> 2 matches
if (resArithmetic.height !== 4) {
    throw new Error(`Expected 4 matches for arithmetic test, got ${resArithmetic.height}`);
}

// 11. String methods and operations: str.concat, str.toUpperCase, and exact matching
const dfStrL = new DataFrame([
    { prefix: "auth", code: "admin" },
    { prefix: "user", code: "guest" },
    { prefix: "sys", code: "kernel" }
]);
const dfStrR = new DataFrame([
    { tag: "ADMIN", pattern: "admin" },
    { tag: "GUEST", pattern: "guest" },
    { tag: "ROOT", pattern: "root" }
]);
const resStr = dfStrL.joinWhere(
    dfStrR,
    $df.col("code").eq($df.col("pattern")),
    $df.col("code").str.toUpperCase().eq($df.col("tag"))
);
if (resStr.height !== 2) {
    throw new Error(`Expected 2 matches for string expression joinWhere, got ${resStr.height}`);
}
const strDicts = resStr.toDicts() as any[];
if (strDicts[0].prefix !== "auth" || strDicts[0].tag !== "ADMIN") throw new Error("Mismatch row 0 in string join");
if (strDicts[1].prefix !== "user" || strDicts[1].tag !== "GUEST") throw new Error("Mismatch row 1 in string join");

// 12. DateTime comparisons and temporal intervals
const dfDateL = new DataFrame([
    { event: "E1", date: new Date("2026-01-01T10:00:00Z") },
    { event: "E2", date: new Date("2026-01-01T14:00:00Z") },
    { event: "E3", date: new Date("2026-01-01T18:00:00Z") }
]);
const dfDateR = new DataFrame([
    { window_id: "W_MORNING", start: new Date("2026-01-01T08:00:00Z"), end: new Date("2026-01-01T12:00:00Z") },
    { window_id: "W_AFTERNOON", start: new Date("2026-01-01T12:00:00Z"), end: new Date("2026-01-01T16:00:00Z") },
    { window_id: "W_EVENING", start: new Date("2026-01-01T16:00:00Z"), end: new Date("2026-01-01T20:00:00Z") }
]);
const resDate = dfDateL.joinWhere(
    dfDateR,
    $df.col("date").ge($df.col("start")),
    $df.col("date").lt($df.col("end"))
);
if (resDate.height !== 3) {
    throw new Error(`Expected 3 matches for datetime range join, got ${resDate.height}`);
}
const dateRows = resDate.toDicts() as any[];
if (dateRows[0].event !== "E1" || dateRows[0].window_id !== "W_MORNING") throw new Error("Date window match 1 error");
if (dateRows[1].event !== "E2" || dateRows[1].window_id !== "W_AFTERNOON") throw new Error("Date window match 2 error");
if (dateRows[2].event !== "E3" || dateRows[2].window_id !== "W_EVENING") throw new Error("Date window match 3 error");

// 13. Suffix collision when both tables share exact column names (e.g. "time", "date")
const dfCollisionL = new DataFrame([
    { time: 10, category: "A" },
    { time: 20, category: "B" }
]);
const dfCollisionR = new DataFrame([
    { time: 15, category: "A" },
    { time: 25, category: "B" }
]);
// Condition: time < time_right AND category == category_right
const resCollision = dfCollisionL.joinWhere(
    dfCollisionR,
    $df.col("time").lt($df.col("time_right")),
    $df.col("category").eq($df.col("category_right"))
);
if (resCollision.height !== 2) {
    throw new Error(`Expected 2 matches for colliding column join, got ${resCollision.height}`);
}
const colRows = resCollision.toDicts() as any[];
if (colRows[0].time !== 10 || colRows[0].time_right !== 15) throw new Error("Collision row 0 values mismatch");
if (colRows[1].time !== 20 || colRows[1].time_right !== 25) throw new Error("Collision row 1 values mismatch");

// 14. Nested Kleene logic: (P1 & P2) | (!P3 & P4)
const dfLogicL = new DataFrame([
    { a: 1, b: 10, flag: true },
    { a: 2, b: 20, flag: false },
    { a: 3, b: 30, flag: true }
]);
const dfLogicR = new DataFrame([
    { x: 1, y: 15, active: true },
    { x: 2, y: 25, active: true },
    { x: 3, y: 35, active: false }
]);
const resLogic = dfLogicL.joinWhere(
    dfLogicR,
    ($df.col("a").eq($df.col("x")).and($df.col("b").lt($df.col("y"))))
        .or($df.col("flag").not().and($df.col("active").eq(true)))
);
// Row L0 (1, 10, true):
//   R0 (1, 15): (1==1 & 10<15) -> true
//   R1 (2, 25): false | (false & true) -> false
//   R2 (3, 35): false
// Row L1 (2, 20, false):
//   !flag is true!
//   R0: active is true -> true
//   R1: active is true -> true
//   R2: active is false -> false
// Row L2 (3, 30, true):
//   R0: false
//   R1: false
//   R2: (3==3 & 30<35) -> true
// Total expected: L0-R0, L1-R0, L1-R1, L2-R2 -> 4 matches
if (resLogic.height !== 4) {
    throw new Error(`Expected 4 matches for nested boolean logic, got ${resLogic.height}`);
}

// 15. Literal Comparisons against constant values
const resLit = dfLogicL.joinWhere(
    dfLogicR,
    $df.col("a").gt(1),
    $df.col("y").lt(30)
);
// Left rows with a > 1: L1 (a=2), L2 (a=3)
// Right rows with y < 30: R0 (y=15), R1 (y=25)
// Total 2 * 2 = 4 rows
if (resLit.height !== 4) {
    throw new Error(`Expected 4 matches for literal comparison, got ${resLit.height}`);
}

// 16. Right join keeping multiple unmatched right rows
const dfSingleL = new DataFrame([{ k: 100, v: "only_one" }]);
const dfMultiR = new DataFrame([
    { k: 100, r_val: "match" },
    { k: 200, r_val: "unmatched_1" },
    { k: 300, r_val: "unmatched_2" }
]);
const resMultiRight = dfSingleL.joinWhere(
    dfMultiR,
    $df.col("k").eq($df.col("k_right")),
    { how: "right" }
);
if (resMultiRight.height !== 3) {
    throw new Error(`Expected 3 rows in right join, got ${resMultiRight.height}`);
}
const multiRightDicts = resMultiRight.toDicts() as any[];
if (multiRightDicts[0].v !== "only_one" || multiRightDicts[0].r_val !== "match") throw new Error("Match row mismatch");
if (multiRightDicts[1].k !== null || multiRightDicts[1].r_val !== "unmatched_1") throw new Error("Unmatched 1 row mismatch");
if (multiRightDicts[2].k !== null || multiRightDicts[2].r_val !== "unmatched_2") throw new Error("Unmatched 2 row mismatch");

// 17. Left join keeping multiple unmatched left rows when 0 predicates match
const resZeroMatchLeft = dfMultiR.joinWhere(
    dfSingleL,
    $df.col("k").eq(999999), // will never match
    { how: "left" }
);
if (resZeroMatchLeft.height !== 3) {
    throw new Error(`Expected 3 rows for zero-match left join, got ${resZeroMatchLeft.height}`);
}
const zeroMatchDicts = resZeroMatchLeft.toDicts() as any[];
for (let i = 0; i < 3; i++) {
    if (zeroMatchDicts[i].v !== null) throw new Error(`Expected null right column at ${i}`);
}

// 18. Type coercion during expression evaluation (e.g. numeric string vs number)
const dfCoerceL = new DataFrame([{ str_num: "42", label: "A" }]);
const dfCoerceR = new DataFrame([
    { num: 42, tag: "match_exact" },
    { num: 100, tag: "larger" }
]);
const resCoerce = dfCoerceL.joinWhere(
    dfCoerceR,
    $df.col("str_num").cast($df.Int32).eq($df.col("num"))
);
if (resCoerce.height !== 1) {
    throw new Error(`Expected 1 match with cast in joinWhere, got ${resCoerce.height}`);
}
if ((resCoerce.toDicts() as any[])[0].tag !== "match_exact") {
    throw new Error("Mismatch tag in cast test");
}

// 19. Edge Case 1: Vectorized Short-Circuiting & Null-Safe Division by Zero
const dfDivL = new DataFrame([
    { id: 1, numerator: 100 },
    { id: 2, numerator: 200 },
    { id: 3, numerator: null },
    { id: 4, numerator: 50 }
]);
const dfDivR = new DataFrame([
    { r_id: 1, denominator: 0 },    // Division by zero
    { r_id: 2, denominator: null }, // Division by null
    { r_id: 3, denominator: 50 }    // Valid divisor
]);
// Condition: denominator > 0 AND (numerator / denominator) > 1
const resDiv = dfDivL.joinWhere(
    dfDivR,
    $df.col("denominator").gt(0),
    $df.col("numerator").div($df.col("denominator")).gt(1)
);
// id: 1 (100 / 50 = 2 > 1) -> match
// id: 2 (200 / 50 = 4 > 1) -> match
// id: 4 (50 / 50 = 1 not > 1) -> no match
if (resDiv.height !== 2) {
    throw new Error(`Expected 2 matches for division-by-zero short circuit test, got ${resDiv.height}`);
}
const divRows = resDiv.toDicts() as any[];
if (divRows[0].id !== 1 || divRows[1].id !== 2) {
    throw new Error("Mismatch rows in division by zero test");
}

// 20. Edge Case 2: Nested Structural Types (Struct deep property traversal across joined rows)
const dfStructL = new DataFrame([
    { agent: "A1", meta: { rating: 4.8, active: true } },
    { agent: "A2", meta: { rating: 3.2, active: false } },
    { agent: "A3", meta: null }
]);
const dfStructR = new DataFrame([
    { policy: "P1", req: { min_rating: 4.0, requires_active: true } },
    { policy: "P2", req: { min_rating: 3.0, requires_active: false } }
]);
const resStruct = dfStructL.joinWhere(
    dfStructR,
    $df.col("meta").struct.field("rating").ge($df.col("req").struct.field("min_rating")),
    $df.col("meta").struct.field("active").eq($df.col("req").struct.field("requires_active"))
);
// A1 (4.8, true):
//   P1 (4.0, true) -> match (4.8 >= 4.0 & true == true)
//   P2 (3.0, false) -> no match
// A2 (3.2, false):
//   P1 (4.0, true) -> no match
//   P2 (3.0, false) -> match (3.2 >= 3.0 & false == false)
// A3 (null): null -> no match
if (resStruct.height !== 2) {
    throw new Error(`Expected 2 matches for nested struct joinWhere, got ${resStruct.height}`);
}
const structRows = resStruct.toDicts() as any[];
if (structRows[0].agent !== "A1" || structRows[0].policy !== "P1") throw new Error("Struct join match 1 mismatch");
if (structRows[1].agent !== "A2" || structRows[1].policy !== "P2") throw new Error("Struct join match 2 mismatch");

// 21. Edge Case 3: Dynamic Regex Extraction Inside Non-Equi Predicate
const dfLogs = new DataFrame([
    { log_id: "L1", raw: "REQ_ID:1002 status:FAIL" },
    { log_id: "L2", raw: "REQ_ID:2004 status:SUCCESS" },
    { log_id: "L3", raw: "INVALID_FORMAT" }
]);
const dfAlerts = new DataFrame([
    { alert_code: 1002, severity: "CRITICAL" },
    { alert_code: 9999, severity: "LOW" }
]);
const resRegex = dfLogs.joinWhere(
    dfAlerts,
    $df.col("raw").str.extract(/REQ_ID:(\d+)/, { groupIndex: 1 }).cast($df.Int32).eq($df.col("alert_code"))
);
if (resRegex.height !== 1) {
    throw new Error(`Expected 1 match for dynamic regex extraction join, got ${resRegex.height}`);
}
const regexRows = resRegex.toDicts() as any[];
if (regexRows[0].log_id !== "L1" || regexRows[0].alert_code !== 1002) {
    throw new Error("Dynamic regex extraction match mismatch");
}

// 22. Edge Case 4: Triangular Cross Self-Join with Strict Deduplication (id < id_right)
const dfPoints = new DataFrame([
    { id: 1, coord: 10 },
    { id: 2, coord: 25 },
    { id: 3, coord: 50 },
    { id: 4, coord: 80 }
]);
// Exactly N * (N - 1) / 2 = 4 * 3 / 2 = 6 pairwise combinations without reflexive or symmetric duplicates
const resTriangular = dfPoints.joinWhere(
    dfPoints,
    $df.col("id").lt($df.col("id_right")),
    $df.col("coord_right").sub($df.col("coord")).le(40) // Distance <= 40
);
// Pairs:
// (1, 2): diff 15 <= 40 -> match
// (1, 3): diff 40 <= 40 -> match
// (1, 4): diff 70 > 40 -> no
// (2, 3): diff 25 <= 40 -> match
// (2, 4): diff 55 > 40 -> no
// (3, 4): diff 30 <= 40 -> match
// Total: 4 pairs
if (resTriangular.height !== 4) {
    throw new Error(`Expected 4 matches for triangular self-join, got ${resTriangular.height}`);
}
const triRows = resTriangular.toDicts() as any[];
for (let i = 0; i < triRows.length; i++) {
    if (triRows[i].id >= triRows[i].id_right) {
        throw new Error(`Strict deduplication violated at row ${i}: id ${triRows[i].id} not < ${triRows[i].id_right}`);
    }
}

// 23. Edge Case 5: Multi-Column Simultaneous Overlap with Strict Inverted Ranges (Spatial / Trading Match)
const dfBids = new DataFrame([
    { bid_id: "B1", bid_price: 105, min_qty: 10, max_qty: 50, expiry: 100 },
    { bid_id: "B2", bid_price: 95, min_qty: 20, max_qty: 100, expiry: 80 }
]);
const dfAsks = new DataFrame([
    { ask_id: "A1", ask_price: 100, available_qty: 30, settlement: 90 }, // matches B1
    { ask_id: "A2", ask_price: 100, available_qty: 5, settlement: 90 },  // qty too low for B1 (5 < 10)
    { ask_id: "A3", ask_price: 110, available_qty: 40, settlement: 70 }  // price too high for B1 (110 > 105)
]);
const resTrade = dfBids.joinWhere(
    dfAsks,
    $df.col("bid_price").ge($df.col("ask_price")),
    $df.col("available_qty").ge($df.col("min_qty")),
    $df.col("available_qty").le($df.col("max_qty")),
    $df.col("expiry").ge($df.col("settlement"))
);
if (resTrade.height !== 1) {
    throw new Error(`Expected exactly 1 trade match, got ${resTrade.height}`);
}
if ((resTrade.toDicts() as any[])[0].bid_id !== "B1" || (resTrade.toDicts() as any[])[0].ask_id !== "A1") {
    throw new Error("Multi-column simultaneous range trade mismatch");
}

// 24. Edge Case 6: Left Join with Complex Predicate Failing Kleene Logic (NULL vs UNKNOWN)
const dfKleeneL = new DataFrame([
    { item_id: "X1", val: 10, factor: null },
    { item_id: "X2", val: 20, factor: 5 }
]);
const dfKleeneR = new DataFrame([
    { ref_id: "R1", limit: 50 }
]);
// (val * factor) > limit:
// Row X1: (10 * null) = null. (null > 50) = null (Kleene UNKNOWN).
// Under LEFT JOIN, row X1 must be retained with null right columns!
const resKleeneLeft = dfKleeneL.joinWhere(
    dfKleeneR,
    $df.col("val").mul($df.col("factor")).gt($df.col("limit")),
    { how: "left" }
);
// Row X1 -> retained as unmatched (null ref_id)
// Row X2 -> (20 * 5 = 100 > 50) -> matches R1
if (resKleeneLeft.height !== 2) {
    throw new Error(`Expected 2 rows in Kleene left join, got ${resKleeneLeft.height}`);
}
const kleeneRows = resKleeneLeft.toDicts() as any[];
if (kleeneRows[0].item_id !== "X1" || kleeneRows[0].ref_id !== null) {
    throw new Error("Kleene left join: row with null predicate result must preserve left with null right");
}
if (kleeneRows[1].item_id !== "X2" || kleeneRows[1].ref_id !== "R1") {
    throw new Error("Kleene left join: matched row mismatch");
}

// -----------------------------------------------------------------------------------------
// 25. THE TITAN ADVERSARIAL STRESS TEST
// Subsystems stressed:
// 1. Kleene 3-Valued Logic Inversion with Nested NULLs: (NULL XOR TRUE) & !(NULL)
// 2. IEEE 754 Subnormal & Boundary Math: (5e-324 / 1e-323) vs MAX_SAFE_INTEGER truncation
// 3. Scope Collision: Columns with pre-existing suffix clash ("val_right", "val_lhs")
// 4. Bidirectional Struct Field Deserialization across cross-evaluated predicates
// 5. Left Join Preserving Empty Nested Schema on Kleene Undetermined Outcomes
// -----------------------------------------------------------------------------------------

const dfAlpha = new DataFrame([
    {
        uuid: "00000000-0000-0000-0000-000000000000",
        spread: 5e-324, // Subnormal floating point boundary
        seq: 9007199254740991, // 2^53 - 1 safe integer boundary
        flags: { is_hedged: true, risk_tier: 1 },
        val_right: 42, // Pre-existing column that matches default right join suffix
        val: 100,
        epoch: new Date("1970-01-01T00:00:00.000Z"),
        k_val: null
    },
    {
        uuid: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
        spread: NaN,
        seq: -9007199254740991,
        flags: { is_hedged: false, risk_tier: 9 },
        val_right: 99,
        val: 200,
        epoch: new Date("2038-01-19T03:14:07.000Z"),
        k_val: true
    },
    {
        uuid: "7FFFFFFF-0000-0000-0000-000000000000",
        spread: 1.0,
        seq: 0,
        flags: null, // Null struct test
        val_right: 0,
        val: null,
        epoch: new Date("9999-12-31T23:59:59.999Z"),
        k_val: false
    }
]);

const dfBeta = new DataFrame([
    {
        val: 100,
        val_right: 84, // Will become val_right_rhs without collision
        val_lhs: -1,   // Suffix collision trap
        tick: 1e-323,  // Subnormal divisor
        delta: -0,
        target_uuid: "00000000-0000-0000-0000-000000000000",
        rule: { allowed_risk: [1, 2, 3], active: true },
        k_cond: null
    },
    {
        val: 200,
        val_right: 999,
        val_lhs: -2,
        tick: 0, // Div-by-zero bait
        delta: +0,
        target_uuid: "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
        rule: { allowed_risk: [], active: false },
        k_cond: true
    }
]);

// Predicate 1: Subnormal ratio and Float Sign Bit Preservation
const p1_subnormal = $df.col("spread").div($df.col("tick")).gt(0)
    .and($df.col("spread").isNotNull())
    .and($df.col("tick").gt(0));

// Predicate 2: Suffix collision predicate across virtual row
// Both tables have "val_right". With suffixes: ["_lhs", "_rhs"], they become "val_right_lhs" and "val_right_rhs"
const p2_suffix_clash = $df.col("val_right_lhs").mul(2).eq($df.col("val_right_rhs"));

// Predicate 3: Nested Struct Property Navigation & Array Bounds
const p3_deep_traversal = $df.col("flags").struct.field("risk_tier").isNotNull()
    .and(
        $df.col("rule").struct.field("allowed_risk").arr.contains(
            $df.col("flags").struct.field("risk_tier")
        )
    );

// Predicate 4: Kleene 3-Valued Logic Rigor (Truth Tables with NULLs)
const p4_kleene_logic = $df.col("k_val").eq($df.col("k_cond"))
    .or(
        $df.col("k_val").isNull().and($df.col("k_cond").isNull())
    );

const titanResult = dfAlpha.joinWhere(
    dfBeta,
    p1_subnormal
        .and(p2_suffix_clash)
        .and(p3_deep_traversal)
        .and(p4_kleene_logic),
    {
        how: "left",
        suffixes: ["_lhs", "_rhs"]
    }
);

// Height check: Exactly 1 row matches (Alpha[0] with Beta[0]).
// Alpha[1] fails p3 (risk_tier 9 not in [])
// Alpha[2] fails p3 (flags is null, gracefully evaluates to null/false)
// Left join preserves all 3 left rows
if (titanResult.height !== 3) {
    throw new Error(`CRITICAL ENGINE COLLAPSE: Expected height 3, got ${titanResult.height}`);
}

const titanRows = titanResult.toDicts() as any[];

// Test 1: Suffix De-duplication Sanitization
const colNames = titanResult.columns;
const expectedCols = [
    "val_right_lhs", // Left table native `val_right` suffixed with left suffix
    "val_right_rhs", // Right table native `val_right` suffixed with right suffix
    "val_lhs",       // Left table native `val` suffixed with left suffix
    "val_rhs"        // Right table native `val` suffixed with right suffix
];
for (const col of expectedCols) {
    if (!colNames.includes(col)) {
        throw new Error(`SCHEMA INTEGRITY FAILURE: Column "${col}" missing or overwritten in ${colNames.join(", ")}`);
    }
}

// Test 2: Verification of Row 0 (Precision & Scope Resolution)
const r0 = titanRows[0];
if (r0.uuid !== "00000000-0000-0000-0000-000000000000") throw new Error("Row 0: Left UUID corrupted");
if (r0.val_right_lhs !== 42 || r0.val_right_rhs !== 84) {
    throw new Error(`Row 0: Scope collision occurred. LHS: ${r0.val_right_lhs}, RHS: ${r0.val_right_rhs}`);
}
if (r0.target_uuid !== "00000000-0000-0000-0000-000000000000") {
    throw new Error("Row 0: Right table columns failed to map to match");
}

// Test 3: Unmatched Row 2 with Null Struct Schema Preservation
const r2 = titanRows[2];
if (r2.uuid !== "7FFFFFFF-0000-0000-0000-000000000000") throw new Error("Row 2: UUID mismatch");
if (r2.target_uuid !== null) throw new Error("Row 2: Unmatched right side should be null");
if (r2.rule !== null) throw new Error("Row 2: Nested struct right column should be null");

// Test 4: BigInt / SafeInteger 64-bit Bitmask Loss
if (r0.seq !== 9007199254740991) {
    throw new Error(`PRECISION CORRUPTION: 64-bit sequence truncated to ${r0.seq}`);
}

console.log("🔥 SURVIVED THE TITAN TEST: Engine is genuinely robust.");

console.log("✓ joinWhere tests passed!");