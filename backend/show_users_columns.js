const { query, pool } = require("./src/config/database");

(async () => {
  try {
    const res = await query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users';"
    );
    console.log("Users columns:");
    console.table(res.rows);
  } catch (err) {
    console.error("ERROR", err);
  } finally {
    await pool.end();
  }
})();
