declare const process: any;
declare const require: any;
declare const __dirname: string;
import { DataFrame } from "../../src/dataframe";
const fs = (typeof process !== "undefined" && typeof require === "function") ? (function() { try { return require("fs"); } catch { return null; } })() : null;
const path = (typeof process !== "undefined" && typeof require === "function") ? (function() { try { return require("path"); } catch { return null; } })() : null;

console.log("=========================================");
console.log("STARTING DATAFRAME writeJson TESTS...");
console.log("=========================================");

const df = new DataFrame([
    { a: 1, b: "hello" },
    { a: 2, b: "world" }
]);

// 1. Standard JSON array output
const jsonStr = df.writeJson();
const parsed = JSON.parse(jsonStr);
if (!Array.isArray(parsed) || parsed.length !== 2) throw new Error("JSON array output invalid");
if (parsed[0].a !== 1 || parsed[1].b !== "world") throw new Error("JSON array values mismatch");

// 2. NDJSON output
const ndjsonStr = df.writeJson(undefined, { format: "ndjson" });
const lines = ndjsonStr.split("\n").filter(l => l.trim().length > 0);
if (lines.length !== 2) throw new Error("NDJSON lines count mismatch");
const parsedLine0 = JSON.parse(lines[0]);
if (parsedLine0.a !== 1 || parsedLine0.b !== "hello") throw new Error("NDJSON line 0 mismatch");

// 3. Writing JSON to a file path
if (fs && path) {
    const tempFilePath = path.join(__dirname, "temp_test_output.json");
    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }
    
    df.writeJson(tempFilePath);
    if (!fs.existsSync(tempFilePath)) throw new Error("writeJson to file path failed: file does not exist");
    const fileContent = fs.readFileSync(tempFilePath, "utf8");
    if (JSON.parse(fileContent).length !== 2) throw new Error("writeJson to file path: parsed data length mismatch");
    
    fs.unlinkSync(tempFilePath);
}

// 4. Writing JSON to a writable-like object (with .write method)
let writtenStr = "";
const mockWritable = {
    write(str: string) {
        writtenStr += str;
    }
};
df.writeJson(mockWritable);
if (JSON.parse(writtenStr).length !== 2) throw new Error("writeJson to writable-like object failed");

// 5. Custom replacer function in writeJson
const dfForReplacer = new DataFrame([{ a: 1, b: "hello" }]);
const replacerStr = dfForReplacer.writeJson(undefined, {
    replacerOptions: {
        replacer: (key: string, value: any) => {
            if (key === "a") return (value as number) * 10;
            return value;
        }
    }
});
const parsedReplacer = JSON.parse(replacerStr as string);
if (parsedReplacer[0].a !== 10 || parsedReplacer[0].b !== "hello") {
    throw new Error("writeJson custom replacer failed");
}

// 6. Whitelist array replacer in writeJson
const whitelistStr = dfForReplacer.writeJson(undefined, {
    replacerOptions: {
        replacer: ["b"]
    }
});
const parsedWhitelist = JSON.parse(whitelistStr as string);
if (parsedWhitelist[0].a !== undefined || parsedWhitelist[0].b !== "hello") {
    throw new Error("writeJson custom array replacer failed");
}

// 7. Circular reference handling in writeJson
const circularObj: any = { id: 1 };
circularObj.self = circularObj;
const dfCircular = new DataFrame([{ id: 1, self: circularObj }]);
const dfCircularJSON = dfCircular.writeJson(undefined, { replacerOptions: { handleCircular: true } });
const parsedDfCircular = JSON.parse(dfCircularJSON);
if (parsedDfCircular[0].self.self !== "[Circular]") {
    throw new Error("df.writeJson failed to forward handleCircular option");
}

console.log("✓ writeJson tests passed!");
