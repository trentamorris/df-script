import { $df, DataFrame } from "../src/index";
// Mock Datasets
const MOCK_DATASETS = {
    sales: [
        { id: 1, item: "Laptop", category: "Electronics", sales: 1200.00, date: "2026-06-01" },
        { id: 2, item: "Keyboard", category: "Electronics", sales: 80.00, date: "2026-06-02" },
        { id: 3, item: "Desk Chair", category: "Furniture", sales: 350.00, date: "2026-06-03" },
        { id: 4, item: "Monitor", category: "Electronics", sales: 450.00, date: "2026-06-04" },
        { id: 5, item: "Coffee Mug", category: "Kitchen", sales: 15.00, date: "2026-06-05" },
        { id: 6, item: "Desk Lamp", category: "Furniture", sales: 45.00, date: "2026-06-06" }
    ],
    users: [
        { id: 1, user: "Alice", role: "admin", active: true, joined: "2026-01-15" },
        { id: 2, user: "Bob", role: "editor", active: false, joined: "2026-02-20" },
        { id: 3, user: "Charlie", role: "viewer", active: true, joined: "2026-03-05" },
        { id: 4, user: "David", role: "viewer", active: true, joined: null }
    ],
    sensors: [
        { timestamp: "2026-06-15T12:00:00Z", sensor_id: "SN-001", temperature: 22.4, humidity: 45 },
        { timestamp: "2026-06-15T12:05:00Z", sensor_id: "SN-001", temperature: 22.6, humidity: 46 },
        { timestamp: "2026-06-15T12:10:00Z", sensor_id: "SN-002", temperature: 18.9, humidity: 60 },
        { timestamp: "2026-06-15T12:15:00Z", sensor_id: "SN-002", temperature: 19.1, humidity: null }
    ]
};
// Preset Queries
const PRESETS = {
    filter: {
        dataset: "sales",
        query: `df.filter(\n  $df.col("sales").gt(100)\n)`
    },
    groupby: {
        dataset: "sales",
        query: `df.groupby("category").agg(\n  $df.col("sales").sum().alias("total_sales"),\n  $df.col("sales").avg().alias("avg_sales"),\n  $df.col("item").count().alias("item_count")\n)`
    },
    temporal: {
        dataset: "sensors",
        query: `df.select(\n  $df.col("timestamp"),\n  $df.col("timestamp").str.to_datetime().dt.hour().alias("hour"),\n  $df.col("timestamp").str.to_datetime().dt.minute().alias("minute")\n)`
    },
    string: {
        dataset: "users",
        query: `df.select(\n  $df.col("user").str.upper().alias("USER_UPPER"),\n  $df.col("role").str.to_titlecase().alias("Role_Title"),\n  $df.col("active")\n)`
    },
    window: {
        dataset: "sales",
        query: `df.select(\n  $df.col("category"),\n  $df.col("item"),\n  $df.col("sales"),\n  $df.col("sales").sum().over("category").alias("category_sales_total")\n)`
    },
    pivot: {
        dataset: "sales",
        query: `df.pivot({\n  index: "category",\n  columns: "item",\n  values: "sales"\n})`
    }
};
// State
let activeDf = $df.data(MOCK_DATASETS.sales);
let currentResultDf = activeDf;
// DOM Elements
const datasetSelect = document.getElementById("dataset-select");
const csvInput = document.getElementById("csv-input");
const queryInput = document.getElementById("query-input");
const statTime = document.getElementById("stat-time");
const statShape = document.getElementById("stat-shape");
const resultTable = document.getElementById("result-table");
// Buttons
const btnParseCsv = document.getElementById("btn-parse-csv");
const btnRun = document.getElementById("btn-run");
const btnCopyCsv = document.getElementById("btn-copy-csv");
const btnCopyJson = document.getElementById("btn-copy-json");
// Functions
/**
 * Updates the displayed dataset from select input
 */
function updateActiveDataset() {
    const datasetName = datasetSelect.value;
    activeDf = $df.data(MOCK_DATASETS[datasetName]);
    csvInput.value = activeDf.write_csv();
}
/**
 * Returns CSS class name for data type badges
 */
function getTypeBadgeClass(typeStr) {
    const name = typeStr.toLowerCase();
    if (name.includes("int") || name.includes("uint"))
        return "type-int";
    if (name.includes("float") || name.includes("decimal"))
        return "type-float";
    if (name.includes("utf8") || name.includes("string"))
        return "type-utf8";
    if (name.includes("bool"))
        return "type-bool";
    if (name.includes("date") || name.includes("time"))
        return "type-datetime";
    return "type-utf8";
}
/**
 * Renders a DataFrame into the output table
 */
function renderTable(df) {
    const schema = df.get_schema();
    const cols = df.columns;
    const data = df.to_dicts();
    const height = df.height;
    // Render Header
    let headerHTML = "<tr>";
    for (let i = 0; i < cols.length; i++) {
        const colName = cols[i];
        const typeStr = schema[colName]?.name || "Unknown";
        const badgeClass = getTypeBadgeClass(typeStr);
        headerHTML += `<th>${colName}<span class="type-badge ${badgeClass}">${typeStr}</span></th>`;
    }
    headerHTML += "</tr>";
    // Render Rows
    let bodyHTML = "";
    if (height === 0) {
        bodyHTML = `<tr><td colspan="${cols.length || 1}" style="text-align: center; color: var(--text-muted);">Empty Result (0 Rows)</td></tr>`;
    }
    else {
        for (let r = 0; r < height; r++) {
            bodyHTML += "<tr>";
            const row = data[r];
            for (let c = 0; c < cols.length; c++) {
                const val = row[cols[c]];
                bodyHTML += `<td>${val === null ? '<span style="color: rgba(255,255,255,0.25);">null</span>' : val}</td>`;
            }
            bodyHTML += "</tr>";
        }
    }
    resultTable.querySelector("thead").innerHTML = headerHTML;
    resultTable.querySelector("tbody").innerHTML = bodyHTML;
    // Update Stats
    statShape.textContent = `${height} Rows x ${cols.length} Cols`;
}
/**
 * Evaluates and runs the expression pipeline
 */
function executePipeline() {
    const query = queryInput.value;
    const startTime = performance.now();
    try {
        // Dynamically evaluate expression with local variables $df and df
        const runQuery = new Function("$df", "df", `return ${query}`);
        const result = runQuery($df, activeDf);
        if (!(result instanceof DataFrame)) {
            throw new TypeError("Expression did not return a DataFrame.");
        }
        currentResultDf = result;
        const timeTaken = performance.now() - startTime;
        statTime.textContent = `${timeTaken.toFixed(2)} ms`;
        statTime.style.color = "#34d399"; // Green on success
        renderTable(currentResultDf);
    }
    catch (err) {
        statTime.textContent = "Error";
        statTime.style.color = "#f87171"; // Red on error
        resultTable.querySelector("thead").innerHTML = "<tr><th>Execution Error</th></tr>";
        resultTable.querySelector("tbody").innerHTML = `<tr><td style="color: #f87171; font-family: var(--font-mono); font-size: 0.8rem; white-space: pre-wrap;">${err.message || err}</td></tr>`;
        statShape.textContent = "0 Rows x 0 Cols";
    }
}
// Event Listeners
datasetSelect.addEventListener("change", () => {
    updateActiveDataset();
    // Auto run query on switch
    executePipeline();
});
btnParseCsv.addEventListener("click", () => {
    const csvText = csvInput.value.trim();
    if (!csvText)
        return;
    try {
        activeDf = $df.read_json(csvText); // Attempt JSON first
    }
    catch {
        try {
            activeDf = $df.read_json(csvText, { format: "ndjson" }); // NDJSON second
        }
        catch {
            activeDf = $df.read_csv(csvText); // CSV last
        }
    }
    executePipeline();
});
btnRun.addEventListener("click", executePipeline);
// Copy actions
btnCopyCsv.addEventListener("click", () => {
    const csv = currentResultDf.write_csv();
    navigator.clipboard.writeText(csv);
    btnCopyCsv.textContent = "Copied!";
    setTimeout(() => btnCopyCsv.textContent = "Copy CSV", 1500);
});
btnCopyJson.addEventListener("click", () => {
    const json = currentResultDf.write_json();
    navigator.clipboard.writeText(json);
    btnCopyJson.textContent = "Copied!";
    setTimeout(() => btnCopyJson.textContent = "Copy JSON", 1500);
});
// Preset loading
document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const presetName = e.currentTarget.dataset.preset;
        const preset = PRESETS[presetName];
        datasetSelect.value = preset.dataset;
        updateActiveDataset();
        queryInput.value = preset.query;
        executePipeline();
    });
});
// Initialize
updateActiveDataset();
// Load default filter query in input
queryInput.value = PRESETS.filter.query;
executePipeline();
