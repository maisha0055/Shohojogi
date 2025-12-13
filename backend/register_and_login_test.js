(async () => {
  try {
    const fetch = (...args) =>
      import("node-fetch").then(({ default: fetch }) => fetch(...args));
    const user = {
      email: "devtest@example.com",
      password: "testPass123",
      full_name: "Dev Test",
      phone: "+8801999999999",
    };

    console.log("Registering user...");
    let res = await fetch("http://localhost:5050/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    let data = await res.json();
    console.log("Register status", res.status, data);

    console.log("Logging in...");
    res = await fetch("http://localhost:5050/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    data = await res.json();
    console.log("Login status", res.status, data);
  } catch (err) {
    console.error("ERROR", err);
  }
})();
