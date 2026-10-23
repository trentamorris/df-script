declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isNDistinct tests...");

const df = $df.data([{ a: 10 }, { a: 20 }, { a: 30 }]);
const res = df.select([
    $df.col("a").isNDistinct(0).alias("first_dist"),
    $df.col("a").isNDistinct(-1).alias("last_dist")
]).toDicts() as any[];

if (res[0].first_dist !== true || res[1].first_dist !== false || res[2].last_dist !== true) {
    throw new Error("isNDistinct failed");
}

console.log("✓ StandardExpr.isNDistinct tests passed!");
