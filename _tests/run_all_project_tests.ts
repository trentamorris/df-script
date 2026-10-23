export {};
declare const process: any;
declare const require: any;

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
_runSuite("exprBase", () => { require("./columnExpressions/exprBase/run_all"); });
_runSuite("arrayExpr", () => { require("./columnExpressions/mixins/arrayExpr/run_all"); });
_runSuite("standardExpr", () => { require("./columnExpressions/mixins/standardExpr/run_all"); });
_runSuite("stringExpr", () => { require("./columnExpressions/mixins/stringExpr/run_all"); });
_runSuite("structExpr", () => { require("./columnExpressions/mixins/structExpr/run_all"); });
_runSuite("temporalExpr", () => { require("./columnExpressions/mixins/temporalExpr/run_all"); });
_runSuite("typeSelector.test", () => { require("./columnExpressions/typeSelector.test"); });
_runSuite("typeInference.test", () => { require("./columnExpressions/typeInference.test"); });

// 2. DataFrames
_runSuite("dataframe", () => { require("./dataframe/run_all"); });

// 3. Functions
_runSuite("all.test", () => { require("./functions/all.test"); });
_runSuite("coalesce.test", () => { require("./functions/coalesce.test"); });
_runSuite("concat.test", () => { require("./functions/concat.test"); });
_runSuite("duration.test", () => { require("./functions/duration.test"); });
_runSuite("element.test", () => { require("./functions/element.test"); });
_runSuite("exclude.test", () => { require("./functions/exclude.test"); });
_runSuite("horizontal.test", () => { require("./functions/horizontal.test"); });
_runSuite("implode.test", () => { require("./functions/implode.test"); });
_runSuite("lit.test", () => { require("./functions/lit.test"); });
_runSuite("readCsv.test", () => { require("./functions/readCsv.test"); });
_runSuite("readJson.test", () => { require("./functions/readJson.test"); });
_runSuite("seqRange.test", () => { require("./functions/seqRange.test"); });
_runSuite("struct.test", () => { require("./functions/struct.test"); });
_runSuite("when.test", () => { require("./functions/when.test"); });

// 4. DataTypes
_runSuite("dataTypes.test", () => { require("./datatypes/dataTypes.test"); });

// 5. Utils
_runSuite("utils/array", () => { require("./utils/array/run_all"); });
_runSuite("utils/binary", () => { require("./utils/binary/run_all"); });
_runSuite("utils/csv", () => { require("./utils/csv/run_all"); });
_runSuite("utils/date", () => { require("./utils/date/run_all"); });
_runSuite("utils/duration", () => { require("./utils/duration/run_all"); });
_runSuite("utils/json", () => { require("./utils/json/run_all"); });
_runSuite("utils/number", () => { require("./utils/number/run_all"); });
_runSuite("utils/object", () => { require("./utils/object/run_all"); });
_runSuite("utils/string", () => { require("./utils/string/run_all"); });

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
