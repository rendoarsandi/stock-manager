const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Run gen_sql.cjs to rebuild migrate.sql
try {
  console.log('Rebuilding SQL migration script from data/db.json...');
  execSync('node data/gen_sql.cjs', { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to run data/gen_sql.cjs:', err.message);
  process.exit(1);
}

// 2. Read and parse migrate.sql
const sqlPath = path.join(__dirname, 'migrate.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('migrate.sql not found!');
  process.exit(1);
}

const rawSql = fs.readFileSync(sqlPath, 'utf8');

// Split SQL file by semicolons, filtering out comments and empty statements
const statements = rawSql
  .split(';')
  .map(s => s.trim())
  .filter(s => {
    if (!s) return false;
    // Check if statement has meaningful contents beyond comments
    const lines = s.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
    return lines.length > 0;
  });

console.log(`Parsed ${statements.length} SQL statements to migrate.`);

// 3. Send statements in a POST request to localhost
const payload = JSON.stringify({ statements });

// Try to automatically read MIGRATE_KEY from wrangler.toml as a fallback
let wranglerKey = '';
try {
  const wranglerPath = path.join(__dirname, '../wrangler.toml');
  if (fs.existsSync(wranglerPath)) {
    const content = fs.readFileSync(wranglerPath, 'utf8');
    const match = content.match(/MIGRATE_KEY\s*=\s*["']([^"']+)["']/);
    if (match) {
      wranglerKey = match[1];
    }
  }
} catch (e) {}

async function run() {
  const targetUrl = process.env.MIGRATE_URL;
  const targetKey = process.env.MIGRATE_KEY || wranglerKey;
  let success = false;

  if (targetUrl) {
    console.log(`Migrating to specified target: ${targetUrl}...`);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (targetKey) {
        headers['Authorization'] = `Bearer ${targetKey}`;
      }
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: payload
      });
      
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (e) {}

      if (response.ok && data && data.success) {
        console.log(`Successfully migrated ${data.count} statements to target!`);
        success = true;
      } else {
        console.error('Migration failed. Status:', response.status, 'Body:', text);
      }
    } catch (err) {
      console.error('Failed to connect to target:', err.message);
    }
  } else {
    const ports = [8787, 5173]; // Try local DO (8787) and Vite dev server (5173)
    for (const port of ports) {
      const url = `http://127.0.0.1:${port}/api/dev/migrate`;
      console.log(`Attempting to migrate to ${url}...`);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload
        });
        
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (e) {}

        if (response.ok && data && data.success) {
          console.log(`Successfully migrated ${data.count} statements!`);
          success = true;
          break;
        } else {
          console.error(`Request to port ${port} failed:`, data ? data.error : text);
        }
      } catch (err) {
        console.log(`Could not connect to port ${port}: ${err.message}`);
      }
    }
  }

  if (!success) {
    console.error('\nMigration failed. Please make sure your dev server is running or you provided correct MIGRATE_URL.');
    process.exit(1);
  }
}

run();
