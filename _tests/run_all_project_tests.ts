export {};
import { createRequire } from "module";
declare const process: any;

const _require = typeof require !== "undefined" ? require : createRequire(import.meta.url);

console.log("=========================================");
console.log("RUNNING ALL DFSCRIPT PROJECT TESTS...");
console.log("=========================================");

const _failedSuites: string[] = [];
let _currentSuiteName = "";
const _realExit = process.exit;
(process as any).exit = (code?: number) => {
    if (code && code !== 0) {
        _failedSuites.push(`${_currentSuiteName} (exited with code ${code})`);
    }
};

const _runSuite = (name: string, fn: () => void) => {
    _currentSuiteName = name;
    try {
        fn();
    } catch (err: any) {
        console.error(`❌ Suite failed: ${name}`, err);
        _failedSuites.push(`${name}: ${err?.message || err}`);
    }
};

// 1. ColumnExpressions
_runSuite("arrayExpr", () => { _require("./columnExpressions/mixins/arrayExpr/run_all"); });
_runSuite("standardExpr", () => { _require("./columnExpressions/mixins/standardExpr/run_all"); });
_runSuite("stringExpr", () => { _require("./columnExpressions/mixins/stringExpr/run_all"); });
_runSuite("structExpr", () => { _require("./columnExpressions/mixins/structExpr/run_all"); });
_runSuite("temporalExpr", () => { _require("./columnExpressions/mixins/temporalExpr/run_all"); });
_runSuite("typeSelector.test", () => { _require("./columnExpressions/typeSelector.test"); });
_runSuite("typeInference.test", () => { _require("./columnExpressions/typeInference.test"); });

// 2. DataFrames
_runSuite("dataframe", () => { _require("./dataframe/run_all"); });

// 3. Functions
_runSuite("all.test", () => { _require("./functions/all.test"); });
_runSuite("coalesce.test", () => { _require("./functions/coalesce.test"); });
_runSuite("col.test", () => { _require("./functions/col.test"); });
_runSuite("concat.test", () => { _require("./functions/concat.test"); });
_runSuite("data.test", () => { _require("./functions/data.test"); });
_runSuite("duration.test", () => { _require("./functions/duration.test"); });
_runSuite("element.test", () => { _require("./functions/element.test"); });
_runSuite("exclude.test", () => { _require("./functions/exclude.test"); });
_runSuite("horizontal.test", () => { _require("./functions/horizontal.test"); });
_runSuite("implode.test", () => { _require("./functions/implode.test"); });
_runSuite("lit.test", () => { _require("./functions/lit.test"); });
_runSuite("readCsv.test", () => { _require("./functions/readCsv.test"); });
_runSuite("readJson.test", () => { _require("./functions/readJson.test"); });
_runSuite("seqRange.test", () => { _require("./functions/seqRange.test"); });
_runSuite("struct.test", () => { _require("./functions/struct.test"); });
_runSuite("when.test", () => { _require("./functions/when.test"); });

// 4. DataTypes
_runSuite("dataTypes.test", () => { _require("./datatypes/dataTypes.test"); });
_runSuite("exceptions", () => { _require("./exceptions/run_all"); });

// 5. Utils
_runSuite("utils/array", () => { _require("./utils/array/run_all"); });
_runSuite("utils/binary", () => { _require("./utils/binary/run_all"); });
_runSuite("utils/csv", () => { _require("./utils/csv/run_all"); });
_runSuite("utils/date", () => { _require("./utils/date/run_all"); });
_runSuite("utils/duration", () => { _require("./utils/duration/run_all"); });
_runSuite("utils/json", () => { _require("./utils/json/run_all"); });
_runSuite("utils/number", () => { _require("./utils/number/run_all"); });
_runSuite("utils/object", () => { _require("./utils/object/run_all"); });
_runSuite("utils/string", () => { _require("./utils/string/run_all"); });

console.log("=========================================");
if (_failedSuites.length > 0) {
    console.error(`❌ TEST SUITE FAILED: ${_failedSuites.length} failure(s) encountered:`);
    for (const f of _failedSuites) {
        console.error(`  - ${f}`);
    }
    _realExit(1);
} else {
    console.log("🎉 ALL TESTS IN THE PROJECT PASSED SUCCESSFULLY!");
    _realExit(0);
}
