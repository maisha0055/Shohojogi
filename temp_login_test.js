(async () => {
  try {
    const res = await fetch("http://localhost:5050/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@workercalling.com",
        password: "Admin@12345",
      }),
    });
    const text = await res.text();
    console.log("STATUS", res.status);
    console.log(text);
  } catch (err) {
    console.error("ERROR", err);
  }
})();
