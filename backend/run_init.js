const fs = require("fs");
const path = require("path");
const { pool } = require("./src/config/database");

(async () => {
  try {
    const sqlPath = path.join(__dirname, "database", "init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Executing init.sql statements (idempotent runner)...");

    // Split on semicolon followed by newline to keep statement boundaries
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    let executed = 0;
    for (const stmt of statements) {
      try {
        await pool.query(stmt + (stmt.trim().endsWith(";") ? "" : ";"));
        executed++;
      } catch (err) {
        // Log and continue; many statements may duplicate existing objects
        console.warn(
          "Statement error (continuing):",
          err.message.split("\n")[0]
        );
      }
    }

    console.log(
      `init.sql runner finished. Statements executed: ${executed}/${statements.length}`
    );
  } catch (err) {
    console.error("Fatal error executing init.sql:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
