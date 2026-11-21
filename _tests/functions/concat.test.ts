declare const process: any;
import { DataFrame } from "df-script";
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING $df.concat FUNCTION TESTS...");
console.log("=========================================");

try {
    const df1 = new DataFrame([{ id: 1, name: "Alice" }]);
    const df2 = new DataFrame([{ id: 2, name: "Bob" }]);

    // 1. Vertical Concat (Top-Level)
    const dfVert = $df.concat([df1, df2], { how: "vertical" });
    if (dfVert.height !== 2) throw new Error("Vertical concat height mismatch");
    const collectedVert = dfVert.toDicts();
    if (collectedVert[1].name !== "Bob") throw new Error("Vertical concat value mismatch");

    // 2. Horizontal Concat (Top-Level)
    const df3 = new DataFrame([{ age: 25 }]);
    const dfHoriz = $df.concat([df1, df3], { how: "horizontal" });
    if (dfHoriz.height !== 1) throw new Error("Horizontal concat height mismatch");
    const collectedHoriz = dfHoriz.toDicts() as any[];
    if (collectedHoriz[0].age !== 25 || collectedHoriz[0].name !== "Alice") {
        throw new Error("Horizontal concat values mismatch");
    }

    // 3. Diagonal Concat (Top-Level)
    const df4 = new DataFrame([{ age: 30, city: "Paris" }]);
    const dfDiag = $df.concat([df1, df4], { how: "diagonal" });
    if (dfDiag.height !== 2) throw new Error("Diagonal concat height mismatch");
    const collectedDiag = dfDiag.toDicts() as any[];
    if (collectedDiag[0].age !== null || collectedDiag[1].name !== null || collectedDiag[1].city !== "Paris") {
        throw new Error("Diagonal concat values mismatch");
    }

    // 4. Horizontal Concat Strictness Options
    const dfHorizShort = new DataFrame([{ val: "X" }]);
    const dfHorizTall = new DataFrame([{ other: 10 }, { other: 20 }]);

    let didThrow = false;
    try {
        $df.concat([dfHorizShort, dfHorizTall], { how: "horizontal", horizontal: { strict: true } });
    } catch (e: any) {
        didThrow = true;
    }
    if (!didThrow) throw new Error("Expected strict horizontal concat on mismatched lengths to throw");

    // 5. Plain object and row arrays inputs
    const dfFromRows = $df.concat([
        [{ id: 1, val: "A" }],
        [{ id: 2, val: "B" }]
    ]);
    if (dfFromRows.height !== 2 || dfFromRows.toDicts()[1].val !== "B") {
        throw new Error("Concat row arrays failed");
    }

    const dfFromColDict = $df.concat([
        { id: [1], name: ["Alice"] },
        { id: [2], name: ["Bob"] }
    ]);
    if (dfFromColDict.height !== 2 || dfFromColDict.toDicts()[1].name !== "Bob") {
        throw new Error("Concat column dictionaries failed");
    }

    console.log("✓ $df.concat tests passed successfully!");
} catch (e: any) {
    console.error(`❌ $df.concat test failed: ${e.message}`);
    process.exit(1);
}
