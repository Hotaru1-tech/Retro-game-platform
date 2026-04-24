import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, "retro-game-production-plan-may-10.xlsx");
const previewDir = path.join(__dirname, "previews");

const theme = {
  titleFill: "#123B5D",
  sectionFill: "#DCEAF7",
  headerFill: "#2D6A8E",
  headerFont: "#FFFFFF",
  bodyFill: "#FDFEFE",
  border: "#C9D6E2",
  text: "#1F2937",
  muted: "#5B6673",
  success: "#D1FAE5",
  warning: "#FEF3C7",
  danger: "#FEE2E2",
  info: "#DBEAFE",
};

const masterPlanRows = [
  ["P0", "Payments", "Replace simulated payments with Bonum payment integration", "Current backend payment flow is demo-only", "Not started", new Date("2026-05-01"), "Use Bonum Gateway as the production provider"],
  ["P0", "Payments", "Add Bonum webhook or callback handling for payment success/failure", "Prevents fake client-side payment success", "Not started", new Date("2026-05-01"), "Subscription state must be confirmed from Bonum server callbacks"],
  ["P0", "Payments", "Test monthly and yearly subscription flows end-to-end through Bonum", "Revenue path must work before launch", "Not started", new Date("2026-05-02"), "Include failed payment and retry cases"],
  ["P0", "Security", "Implement CSP for community games", "Listed as future enhancement and now required", "Not started", new Date("2026-04-29"), "Needed for untrusted game content"],
  ["P0", "Security", "Lock down iframe sandbox and parent messaging rules", "Reduces iframe escape and unsafe communication", "Partial", new Date("2026-04-29"), "Define an explicit postMessage allowlist"],
  ["P0", "Security", "Add server-side rate limiting", "Reduces abuse on auth, submissions, payments, and rooms", "Not started", new Date("2026-04-30"), "Apply per route group"],
  ["P0", "Marketplace", "Verify submission scan blocks dangerous patterns", "Core marketplace protection", "Partial", new Date("2026-04-30"), "Test with known bad payloads"],
  ["P0", "Marketplace", "Validate submission review workflow end-to-end", "Admin approval path must be reliable", "Partial", new Date("2026-05-01"), "Submit, reject, approve, and disable in staging"],
  ["P0", "Admin", "Verify admin-only permissions everywhere", "Prevents privilege escalation", "Not started", new Date("2026-05-01"), "Review route protection and client visibility"],
  ["P0", "Quality", "Set up ESLint so npm run lint works non-interactively", "CI and release gating depend on it", "Not started", new Date("2026-04-27"), "Current command opens setup prompt"],
  ["P0", "Quality", "Add CI pipeline for build, lint, and tests", "Prevents broken deploys", "Not started", new Date("2026-04-28"), "GitHub Actions is enough"],
  ["P0", "Quality", "Add smoke tests for auth, rooms, matchmaking, chess, submissions, and admin", "Minimum confidence for launch", "Not started", new Date("2026-05-02"), "Focus on high-risk flows first"],
  ["P0", "Ops", "Set up production and staging envs for frontend, backend, DB, and Redis", "Needed for safe launch rehearsal", "Partial", new Date("2026-04-28"), "Vercel plus Railway/Render plus Upstash is fine"],
  ["P0", "Ops", "Centralize secrets and rotate any exposed local test creds", "Secret hygiene before production", "Partial", new Date("2026-04-28"), "Move secrets into managed envs"],
  ["P0", "Ops", "Add monitoring and error logging", "You need visibility on launch day", "Not started", new Date("2026-05-02"), "Sentry plus uptime checks is enough"],
  ["P1", "Database", "Verify migrations are production-safe and reproducible", "Avoids schema drift on deploy", "Partial", new Date("2026-05-02"), "Check Prisma migration history carefully"],
  ["P1", "Reliability", "Add backup and restore plan for Postgres", "Prevents irreversible launch-day data loss", "Not started", new Date("2026-05-03"), "Test at least one restore"],
  ["P1", "Reliability", "Add stronger readiness checks", "Improves deploy confidence", "Partial", new Date("2026-05-03"), "Health exists, readiness needs more depth"],
  ["P1", "Frontend", "Confirm production API and WebSocket config works", "Prevents frontend/backend connection failures", "Partial", new Date("2026-05-03"), "Test deployed URLs, not localhost assumptions"],
  ["P1", "Multiplayer", "Run multiplayer soak test with several users", "Checks socket stability before launch", "Not started", new Date("2026-05-05"), "Aim for a 30 to 60 minute session"],
  ["P1", "Marketplace", "Moderate and verify sample community games manually", "Catches content and policy gaps", "Not started", new Date("2026-05-05"), "Use the staging admin flow"],
  ["P1", "Admin", "Add audit visibility for approvals, rejections, and payments", "Helps moderation and debugging", "Partial", new Date("2026-05-05"), "Simple logs are acceptable for v1"],
  ["P2", "Docs", "Create launch runbook and rollback plan", "Needed if deploy goes wrong", "Not started", new Date("2026-05-07"), "Keep it short and operational"],
  ["P2", "Docs", "Create support checklist for the first 48 hours", "Improves triage speed after launch", "Not started", new Date("2026-05-08"), "Capture likely failure paths"],
];

const scheduleRows = [
  [new Date("2026-04-24"), "Finalize launch scope, assign owners, confirm Bonum as payment provider", "Critical", "Not started"],
  [new Date("2026-04-25"), "Start Bonum integration discovery, set up ESLint, create CI skeleton", "Critical", "Not started"],
  [new Date("2026-04-26"), "Implement basic Bonum payment backend and create staging env", "Critical", "Not started"],
  [new Date("2026-04-27"), "Lint working, CI running, Bonum checkout flow sketched", "Critical", "Not started"],
  [new Date("2026-04-28"), "Secrets cleaned up and Bonum env variables finalized", "Critical", "Not started"],
  [new Date("2026-04-29"), "CSP and iframe/message hardening implemented while Bonum callback flow is integrated", "Critical", "Not started"],
  [new Date("2026-04-30"), "Rate limiting and marketplace scan verification complete", "Critical", "Not started"],
  [new Date("2026-05-01"), "Bonum payment integration complete and admin permissions validated end-to-end", "Critical", "Not started"],
  [new Date("2026-05-02"), "Smoke tests added for core flows, Bonum payment flow tested, monitoring/logging live", "Critical", "Not started"],
  [new Date("2026-05-03"), "DB migration check and backup/restore rehearsal complete", "Critical", "Not started"],
  [new Date("2026-05-04"), "Frontend/backend production config verified in staging", "High", "Not started"],
  [new Date("2026-05-05"), "Multiplayer soak test and moderation tests completed", "High", "Not started"],
  [new Date("2026-05-06"), "Fix highest-severity bugs only", "High", "Not started"],
  [new Date("2026-05-07"), "Code freeze except launch blockers, runbook and rollback ready", "High", "Not started"],
  [new Date("2026-05-08"), "Full staging rehearsal from signup to payment to gameplay to admin review", "Critical", "Not started"],
  [new Date("2026-05-09"), "Final regression and launch signoff", "Critical", "Not started"],
  [new Date("2026-05-10"), "Production launch with monitoring and active bug triage", "Critical", "Not started"],
];

const checklistRows = [
  ["Payments", "Real card payment works in production", "", "", ""],
  ["Payments", "Subscription updates from webhook correctly", "", "", ""],
  ["Payments", "Failed payment path handled safely", "", "", ""],
  ["Auth", "Login and session flow works in production", "", "", ""],
  ["Auth", "Role-based access enforced for developer/admin actions", "", "", ""],
  ["Marketplace", "Submission scan rejects unsafe files and patterns", "", "", ""],
  ["Marketplace", "Approved games appear correctly in community listings", "", "", ""],
  ["Marketplace", "Rejected and disabled games are hidden correctly", "", "", ""],
  ["Security", "CSP active for community game content", "", "", ""],
  ["Security", "iframe sandbox verified", "", "", ""],
  ["Security", "postMessage contract restricted", "", "", ""],
  ["Security", "Rate limiting enabled on sensitive routes", "", "", ""],
  ["Multiplayer", "Room create, join, and start flow works", "", "", ""],
  ["Multiplayer", "Matchmaking works with multiple clients", "", "", ""],
  ["Multiplayer", "Chess gameplay finishes without desync", "", "", ""],
  ["Ops", "Frontend deploy works", "", "", ""],
  ["Ops", "Backend deploy works", "", "", ""],
  ["Ops", "Database migrations apply cleanly", "", "", ""],
  ["Ops", "Redis connection works in production", "", "", ""],
  ["Ops", "Monitoring and alerts are working", "", "", ""],
  ["Ops", "Backup and restore tested", "", "", ""],
  ["Quality", "CI passes on main branch", "", "", ""],
  ["Quality", "Lint passes", "", "", ""],
  ["Quality", "Smoke tests pass", "", "", ""],
  ["Release", "Rollback plan documented", "", "", ""],
  ["Release", "Launch-day owner assignments confirmed", "", "", ""],
];

const riskRows = [
  ["Payment integration slips", "Launch blocked or revenue broken", "High", "Choose provider immediately and cut extras", new Date("2026-04-24")],
  ["Marketplace security gap", "Abuse or malicious content reaches production", "High", "Prioritize CSP, sandboxing, scan verification, and moderation", new Date("2026-04-24")],
  ["No automated tests", "Late regressions before launch", "High", "Add smoke tests first instead of broad deep coverage", new Date("2026-04-25")],
  ["No working lint and CI gate", "Broken code reaches production", "High", "Configure ESLint and CI this week", new Date("2026-04-27")],
  ["Deployment misconfiguration", "Production outage on launch", "Medium", "Run a staging rehearsal and keep a rollback plan", new Date("2026-05-07")],
  ["Socket instability under load", "Multiplayer failure at launch", "Medium", "Run a soak test before code freeze", new Date("2026-05-05")],
  ["Secrets and env mismanagement", "Auth or payment outage or exposure", "Medium", "Centralize and rotate secrets", new Date("2026-04-28")],
];

function applyTitleBand(sheet, rangeText, title) {
  const range = sheet.getRange(rangeText);
  range.merge();
  range.values = [[title]];
  range.format = {
    fill: theme.titleFill,
    font: { color: "#FFFFFF", bold: true, size: 16 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  range.format.rowHeightPx = 30;
}

function applySectionBand(sheet, rangeText, label) {
  const range = sheet.getRange(rangeText);
  range.merge();
  range.values = [[label]];
  range.format = {
    fill: theme.sectionFill,
    font: { color: theme.text, bold: true, size: 11 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
  };
  range.format.rowHeightPx = 22;
}

function styleHeader(range) {
  range.format = {
    fill: theme.headerFill,
    font: { color: theme.headerFont, bold: true, size: 10 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
  };
  range.format.rowHeightPx = 26;
}

function addStatusFormatting(range) {
  range.conditionalFormats.addCustom('=E7="Done"', { fill: theme.success });
  range.conditionalFormats.addCustom('=E7="In progress"', { fill: theme.info });
  range.conditionalFormats.addCustom('=E7="Partial"', { fill: theme.warning });
  range.conditionalFormats.addCustom('=E7="Not started"', { fill: theme.danger });
}

function addPriorityFormatting(range) {
  range.conditionalFormats.addCustom('=A7="P0"', { fill: "#FDE68A" });
  range.conditionalFormats.addCustom('=A7="P1"', { fill: "#DBEAFE" });
  range.conditionalFormats.addCustom('=A7="P2"', { fill: "#E9D5FF" });
}

function addPassFailValidation(range) {
  range.dataValidation = {
    rule: {
      type: "list",
      values: ["Pass", "Fail", "Blocked"],
    },
  };
}

function applyBodyStyle(range) {
  range.format = {
    fill: theme.bodyFill,
    font: { color: theme.text, size: 10 },
    verticalAlignment: "top",
    wrapText: true,
  };
}

async function buildWorkbook() {
  const workbook = Workbook.create();
  const overview = workbook.worksheets.add("Master Plan");
  const schedule = workbook.worksheets.add("Schedule");
  const checklist = workbook.worksheets.add("Readiness");
  const risks = workbook.worksheets.add("Risks");

  overview.showGridLines = false;
  schedule.showGridLines = false;
  checklist.showGridLines = false;
  risks.showGridLines = false;

  buildMasterPlanSheet(overview);
  buildScheduleSheet(schedule);
  buildChecklistSheet(checklist);
  buildRiskSheet(risks);

  await fs.mkdir(previewDir, { recursive: true });

  for (const name of ["Master Plan", "Schedule", "Readiness", "Risks"]) {
    const blob = await workbook.render({ sheetName: name, autoCrop: "all", scale: 1, format: "png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await fs.writeFile(path.join(previewDir, `${name.replaceAll(" ", "_")}.png`), bytes);
  }

  const inspection = await workbook.inspect({
    kind: "table",
    range: "Master Plan!A1:G18",
    include: "values,formulas",
    tableMaxRows: 18,
    tableMaxCols: 7,
  });
  console.log(inspection.ndjson);

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 20 },
    summary: "formula error scan",
  });
  console.log(errors.ndjson);

  const xlsx = await SpreadsheetFile.exportXlsx(workbook);
  await xlsx.save(outputPath);
  console.log(`Saved workbook to ${outputPath}`);
}

function buildMasterPlanSheet(sheet) {
  applyTitleBand(sheet, "A1:G2", "Retro Game Platform Production Plan Through May 10, 2026");
  sheet.getRange("A3:G4").merge();
  sheet.getRange("A3").values = [[
    "This sheet is the working master list. Keep the Status, Owner, and Notes columns up to date daily. The most urgent production blockers are Bonum payments, custom-game security, CI/lint, and staging readiness.",
  ]];
  sheet.getRange("A3:G4").format = {
    fill: "#F6FAFD",
    font: { color: theme.muted, italic: true, size: 10 },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange("A3:G4").format.rowHeightPx = 34;

  applySectionBand(sheet, "I1:L1", "Launch Snapshot");
  sheet.getRange("I2:L5").values = [
    ["Metric", "Value", "Target", "Notes"],
    ["Days until launch", 16, 0, "Measured from April 24, 2026"],
    ["P0 items", 15, 0, "Critical blockers"],
    ["P1 items", 7, 0, "Important but secondary"],
    ["P2 items", 2, 0, "Polish and operations"],
  ];
  styleHeader(sheet.getRange("I2:L2"));
  applyBodyStyle(sheet.getRange("I3:L5"));
  sheet.getRange("J3:K5").format.numberFormat = "0";

  sheet.getRange("I7:J10").values = [
    ["Status", "Count"],
    ["Not started", 14],
    ["Partial", 8],
    ["Done", 0],
  ];
  styleHeader(sheet.getRange("I7:J7"));
  applyBodyStyle(sheet.getRange("I8:J10"));

  const chart = sheet.charts.add("bar", sheet.getRange("I7:J10"));
  chart.title = "Master Plan Status Count";
  chart.hasLegend = false;
  chart.setPosition("I12", "L27");

  sheet.getRange("A6:H6").values = [[
    "Priority", "Area", "Task", "Why It Matters", "Status", "Deadline", "Notes", "Owner"
  ]];
  styleHeader(sheet.getRange("A6:H6"));

  const rows = masterPlanRows.map((row) => [...row, ""]);
  sheet.getRange(`A7:H${6 + rows.length}`).values = rows;
  applyBodyStyle(sheet.getRange(`A7:H${6 + rows.length}`));
  sheet.getRange(`F7:F${6 + rows.length}`).format.numberFormat = "yyyy-mm-dd";
  addPriorityFormatting(sheet.getRange(`A7:A${6 + rows.length}`));
  addStatusFormatting(sheet.getRange(`E7:E${6 + rows.length}`));
  sheet.getRange(`E7:E${6 + rows.length}`).dataValidation = {
    rule: { type: "list", values: ["Not started", "Partial", "In progress", "Done", "Blocked"] },
  };

  sheet.tables.add(`A6:H${6 + rows.length}`, true, "MasterPlanTable");
  sheet.freezePanes.freezeRows(6);

  sheet.getRange("A:H").format.columnWidthPx = 100;
  sheet.getRange("A:A").format.columnWidthPx = 68;
  sheet.getRange("B:B").format.columnWidthPx = 94;
  sheet.getRange("C:C").format.columnWidthPx = 260;
  sheet.getRange("D:D").format.columnWidthPx = 220;
  sheet.getRange("E:E").format.columnWidthPx = 110;
  sheet.getRange("F:F").format.columnWidthPx = 94;
  sheet.getRange("G:G").format.columnWidthPx = 220;
  sheet.getRange("H:H").format.columnWidthPx = 96;
}

function buildScheduleSheet(sheet) {
  applyTitleBand(sheet, "A1:D2", "Daily Schedule To Production Launch");
  sheet.getRange("A4:D4").values = [["Date", "Must Be Done By End Of Day", "Priority", "Status"]];
  styleHeader(sheet.getRange("A4:D4"));
  sheet.getRange(`A5:D${4 + scheduleRows.length}`).values = scheduleRows;
  applyBodyStyle(sheet.getRange(`A5:D${4 + scheduleRows.length}`));
  sheet.getRange(`A5:A${4 + scheduleRows.length}`).format.numberFormat = "yyyy-mm-dd";
  sheet.getRange(`D5:D${4 + scheduleRows.length}`).dataValidation = {
    rule: { type: "list", values: ["Not started", "In progress", "Done", "Blocked"] },
  };
  sheet.getRange(`C5:C${4 + scheduleRows.length}`).conditionalFormats.addCustom('=C5="Critical"', { fill: "#FDE68A" });
  sheet.getRange(`C5:C${4 + scheduleRows.length}`).conditionalFormats.addCustom('=C5="High"', { fill: "#DBEAFE" });
  sheet.getRange(`D5:D${4 + scheduleRows.length}`).conditionalFormats.addCustom('=D5="Done"', { fill: theme.success });
  sheet.getRange(`D5:D${4 + scheduleRows.length}`).conditionalFormats.addCustom('=D5="Blocked"', { fill: theme.danger });
  sheet.tables.add(`A4:D${4 + scheduleRows.length}`, true, "ScheduleTable");
  sheet.freezePanes.freezeRows(4);

  sheet.getRange("A:A").format.columnWidthPx = 96;
  sheet.getRange("B:B").format.columnWidthPx = 420;
  sheet.getRange("C:C").format.columnWidthPx = 90;
  sheet.getRange("D:D").format.columnWidthPx = 110;
}

function buildChecklistSheet(sheet) {
  applyTitleBand(sheet, "A1:E2", "Launch Readiness Checklist");
  sheet.getRange("A3:E3").values = [["Category", "Check", "Pass / Fail", "Owner", "Notes"]];
  styleHeader(sheet.getRange("A3:E3"));
  sheet.getRange(`A4:E${3 + checklistRows.length}`).values = checklistRows;
  applyBodyStyle(sheet.getRange(`A4:E${3 + checklistRows.length}`));
  addPassFailValidation(sheet.getRange(`C4:C${3 + checklistRows.length}`));
  sheet.getRange(`C4:C${3 + checklistRows.length}`).conditionalFormats.addCustom('=C4="Pass"', { fill: theme.success });
  sheet.getRange(`C4:C${3 + checklistRows.length}`).conditionalFormats.addCustom('=C4="Fail"', { fill: theme.danger });
  sheet.getRange(`C4:C${3 + checklistRows.length}`).conditionalFormats.addCustom('=C4="Blocked"', { fill: theme.warning });
  sheet.tables.add(`A3:E${3 + checklistRows.length}`, true, "ReadinessTable");
  sheet.freezePanes.freezeRows(3);

  sheet.getRange("A:A").format.columnWidthPx = 96;
  sheet.getRange("B:B").format.columnWidthPx = 320;
  sheet.getRange("C:C").format.columnWidthPx = 98;
  sheet.getRange("D:D").format.columnWidthPx = 90;
  sheet.getRange("E:E").format.columnWidthPx = 220;
}

function buildRiskSheet(sheet) {
  applyTitleBand(sheet, "A1:E2", "Launch Risk Register");
  sheet.getRange("A4:E4").values = [["Risk", "Impact", "Likelihood", "Mitigation", "Decision Date"]];
  styleHeader(sheet.getRange("A4:E4"));
  sheet.getRange(`A5:E${4 + riskRows.length}`).values = riskRows;
  applyBodyStyle(sheet.getRange(`A5:E${4 + riskRows.length}`));
  sheet.getRange(`E5:E${4 + riskRows.length}`).format.numberFormat = "yyyy-mm-dd";
  sheet.getRange(`C5:C${4 + riskRows.length}`).conditionalFormats.addCustom('=C5="High"', { fill: "#FDE68A" });
  sheet.getRange(`C5:C${4 + riskRows.length}`).conditionalFormats.addCustom('=C5="Medium"', { fill: "#DBEAFE" });
  sheet.tables.add(`A4:E${4 + riskRows.length}`, true, "RiskTable");
  sheet.freezePanes.freezeRows(4);

  sheet.getRange("A:A").format.columnWidthPx = 210;
  sheet.getRange("B:B").format.columnWidthPx = 190;
  sheet.getRange("C:C").format.columnWidthPx = 90;
  sheet.getRange("D:D").format.columnWidthPx = 280;
  sheet.getRange("E:E").format.columnWidthPx = 96;
}

await buildWorkbook();
