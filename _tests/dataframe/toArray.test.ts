import { DataFrame } from "df-script";

console.log("Running toArray tests...");

const df = new DataFrame([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" }
]);

// 1. Column array extraction
const resArray = df.toArray("name");
if (!Array.isArray(resArray) || resArray.length !== 2 || resArray[0] !== "Alice" || resArray[1] !== "Bob") {
    throw new Error("toArray string column mismatch");
}

// 2. Empty DataFrame with column
const dfEmpty = new DataFrame({ id: [] });
const emptyArrRes = dfEmpty.toArray("id");
if (!Array.isArray(emptyArrRes) || emptyArrRes.length !== 0) {
    throw new Error("toArray on empty df should be []");
}

// 3. Non-existent column error
let threwMissing = false;
try {
    df.toArray("non_existent" as any);
} catch (e: any) {
    threwMissing = true;
}
if (!threwMissing) {
    throw new Error("toArray with non-existent column should throw ColumnNotFoundError");
}

console.log("✓ toArray tests passed!");
