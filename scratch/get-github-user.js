async function run() {
  try {
    const res = await fetch('https://api.github.com/users/rendoarsandi');
    const data = await res.json();
    console.log("GitHub User Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

run();
