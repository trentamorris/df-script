declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.normalize tests...");


const df = $df.data({
    raw: ["e\u0301", "\u00E9", "ﬁ", null]
});

const res = df.select([
    $df.col("raw").str.normalize("NFC").alias("nfc"),
    $df.col("raw").str.normalize("NFD").alias("nfd"),
    $df.col("raw").str.normalize("NFKC").alias("nfkc")
]).toDicts() as any[];

if (res[0].nfc !== "\u00E9") throw new Error("NFC failed");
if (res[1].nfd !== "e\u0301") throw new Error("NFD failed");
if (res[2].nfkc !== "fi") throw new Error("NFKC failed");
if (res[3].nfc !== null) throw new Error("normalize null failed");


console.log("✓ StringExpr.normalize tests passed!");
