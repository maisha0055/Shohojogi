const fs = require("fs");
const path = require("path");
const { pool } = require("./src/config/database");

(async () => {
  try {
    const sqlPath = path.join(__dirname, "database", "init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    console.log("Executing init.sql...");
    await pool.query(sql);
    console.log("init.sql executed successfully");
  } catch (err) {
    console.error("Error executing init.sql:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
