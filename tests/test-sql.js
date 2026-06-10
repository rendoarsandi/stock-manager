import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

async function runTest() {
  try {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    
    db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT);");
    db.run("INSERT INTO test (name) VALUES ('Alice'), ('Bob');");
    
    const stmt = db.prepare("SELECT * FROM test");
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    
    console.log("Results from DB:", results);
    if (results.length === 2 && results[0].name === 'Alice' && results[1].name === 'Bob') {
      console.log("SQL.js test passed!");
    } else {
      console.error("SQL.js test failed: incorrect data returned");
      process.exit(1);
    }
  } catch (err) {
    console.error("SQL.js test failed with error:", err);
    process.exit(1);
  }
}

runTest();
