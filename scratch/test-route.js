async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/import/active-session');
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

run();
