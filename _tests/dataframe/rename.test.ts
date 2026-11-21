import { DataFrame } from "df-script";

console.log("Running rename tests...");

const df = new DataFrame([
    { id: 1, first_name: "Alice" }
]);

const dfRenamed = df.rename({ first_name: "firstName" });

if (dfRenamed.schema.firstName === undefined) {
    throw new Error("Renamed column firstName schema missing");
}
if (dfRenamed.schema.first_name !== undefined) {
    throw new Error("Old column first_name schema still exists");
}

const collected = dfRenamed.toDicts() as any[];
if (collected[0].firstName !== "Alice") {
    throw new Error(`Expected Alice, got ${collected[0].firstName}`);
}
// 2. Order preservation test
const dfMulti = new DataFrame([
    { a: 1, b: 2, c: 3 }
]);
const dfRenamedOrder = dfMulti.rename({ b: "beta" });
const cols = dfRenamedOrder.columns;
if (cols[0] !== "a" || cols[1] !== "beta" || cols[2] !== "c") {
    throw new Error(`Order preservation failed: expected ["a", "beta", "c"], got ${JSON.stringify(cols)}`);
}

// 3. Collision error test
let threwCollision = false;
try {
    dfMulti.rename({ a: "c" });
} catch (e: any) {
    if (e.message.includes("Duplicate column selection")) {
        threwCollision = true;
    }
}
if (!threwCollision) {
    throw new Error("Expected duplicate collision error on rename");
}

// 4. Empty mapping / no-op test
const dfNoOp = dfMulti.rename({});
if (dfNoOp.columns.join(",") !== "a,b,c") {
    throw new Error("No-op rename modified column names");
}

// 5. Strictly-typed rename result verification
const strictlyRenamed = df.rename({ first_name: "firstName" });
const firstNameVal: string = strictlyRenamed.toDicts()[0].firstName;
if (firstNameVal !== "Alice") {
    throw new Error("Strictly typed firstName value mismatch");
}

console.log("✓ rename tests passed!");

