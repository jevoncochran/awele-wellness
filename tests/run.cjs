// Runs every tests/*.test.cjs file and prints a one-line result for each.
// Usage: npm test            (all suites)
//        node tests/run.cjs catalog   (only suites whose name contains "catalog")
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const filter = process.argv[2];
const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith(".test.cjs") && (!filter || f.includes(filter)))
  .sort();

if (files.length === 0) {
  console.log("No test files matched.");
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const run = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: "utf8" });
  const lines = (run.stdout + run.stderr).trim().split("\n");
  const summary = lines.filter((l) => /passed \(|FAILED \(|^ERROR|Error:/.test(l)).slice(-1)[0] ?? "no result";
  const ok = run.status === 0;
  if (!ok) {
    failed++;
    console.log(`FAIL  ${file}`);
    console.log(lines.filter((l) => /^FAIL|^ERROR|Error/.test(l)).map((l) => "      " + l).join("\n"));
  } else {
    console.log(`ok    ${file.padEnd(26)} ${summary.trim()}`);
  }
}

console.log(failed ? `\n${failed} suite(s) failed. Run one directly for details: node tests/<name>.test.cjs` : "\nAll suites passed.");
process.exit(failed ? 1 : 0);
