declare const process: any;
import { $df } from "../../src/index";

console.log("=========================================");
console.log("STARTING DATAFRAME partitionBy() TESTS...");
console.log("=========================================");

try {
    const df = $df.data({
        dept: ["Engineering", "Sales", "Engineering", "HR", "Sales"],
        name: ["Alice", "Bob", "Charlie", "David", "Eve"],
        salary: [100, 80, 110, 70, 85]
    });

    // 1. Basic array partitioning
    const partitions = df.partitionBy("dept");
    if (!Array.isArray(partitions) || partitions.length !== 3) {
        throw new Error(`Expected 3 partitions, got ${partitions?.length}`);
    }

    // Encounter order: Engineering, Sales, HR
    const p0 = partitions[0];
    if (p0.height !== 2) throw new Error(`Partition 0 expected height 2, got ${p0.height}`);
    if (p0.columns.join(",") !== "dept,name,salary") throw new Error("Columns mismatch in partition 0");
    const p0Names = p0.toDict().name;
    if (p0Names[0] !== "Alice" || p0Names[1] !== "Charlie") {
        throw new Error(`Partition 0 names mismatch: ${JSON.stringify(p0Names)}`);
    }

    const p1 = partitions[1];
    if (p1.height !== 2) throw new Error(`Partition 1 expected height 2, got ${p1.height}`);
    const p1Names = p1.toDict().name;
    if (p1Names[0] !== "Bob" || p1Names[1] !== "Eve") {
        throw new Error(`Partition 1 names mismatch: ${JSON.stringify(p1Names)}`);
    }

    const p2 = partitions[2];
    if (p2.height !== 1) throw new Error(`Partition 2 expected height 1, got ${p2.height}`);
    if (p2.toDict().name[0] !== "David") throw new Error("Partition 2 name mismatch");

    // 2. Partitioning as dictionary
    const dict = df.partitionBy("dept", { asDict: true });
    if (typeof dict !== "object" || dict == null) throw new Error("Expected dictionary output");
    if (Object.keys(dict).length !== 3) throw new Error("Expected 3 dictionary keys");

    // 3. Partitioning by expression (e.g. $df.col("dept"))
    const exprParts = df.partitionBy($df.col("dept"));
    if (exprParts.length !== 3) throw new Error(`Expected 3 partitions via expression, got ${exprParts.length}`);

    // 4. Multi-column partitionBy
    const multiDf = $df.data({
        cat: ["A", "A", "B", "B"],
        sub: [1, 2, 1, 1],
        val: [10, 20, 30, 40]
    });
    const multiParts = multiDf.partitionBy(["cat", "sub"]);
    if (multiParts.length !== 3) throw new Error(`Expected 3 partitions for multi-column, got ${multiParts.length}`);

    // 5. Empty dataframe partitioning
    const emptyDf = $df.data({
        k: [] as string[],
        v: [] as number[]
    });
    const emptyParts = emptyDf.partitionBy("k");
    if (emptyParts.length !== 0) throw new Error("Empty DataFrame partition should produce empty array");

    const emptyDict = emptyDf.partitionBy("k", { asDict: true });
    if (Object.keys(emptyDict).length !== 0) throw new Error("Empty DataFrame partition should produce empty dict");

    // 5. Invalid column error
    let threw = false;
    try {
        df.partitionBy("non_existent" as any);
    } catch {
        threw = true;
    }
    if (!threw) throw new Error("Expected partitionBy to throw for invalid column name");

    console.log("✓ All DataFrame.partitionBy() tests passed successfully!");
} catch (err) {
    console.error("❌ DataFrame.partitionBy() tests failed:", err);
    process.exit(1);
}
