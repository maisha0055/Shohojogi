const fs = require("fs");
const path = require("path");
const { pool } = require("./src/config/database");

(async () => {
  try {
    const sqlPath = path.join(__dirname, "database", "seed.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Executing seed.sql...");
    // Note: seed.sql contains INSERTs that may conflict; we run them and catch errors per query
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        console.warn("Seed statement error (continuing):", err.message);
      }
    }
    console.log("seed.sql executed (with warnings if any).");
  } catch (err) {
    console.error("Error executing seed.sql:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
