import { convexTest } from "convex-test";
import schema from "../convex/schema.ts";
import { list, insert, adjustStock } from "../convex/products.ts";
import { register, getByUsername } from "../convex/users.ts";

// Stub the generated API object mapping for testing
const testApi = {
  products: {
    list,
    insert,
    adjustStock,
  },
  users: {
    register,
    getByUsername,
  }
};

async function runTests() {
  console.log("Running Convex migration tests...");
  const t = convexTest(schema);

  console.log("1. Testing user registration...");
  const adminId = await t.mutation(testApi.users.register, {
    username: "admin_test",
    password_hash: "secret_hash",
    role: "admin"
  });
  console.log("User registered with ID:", adminId);

  console.log("2. Testing get user by username...");
  const user = await t.query(testApi.users.getByUsername, { username: "admin_test" });
  if (user && user.username === "admin_test") {
    console.log("User retrieved successfully!");
  } else {
    throw new Error("Failed to retrieve user");
  }

  console.log("3. Testing product creation...");
  const productId = await t.mutation(testApi.products.insert, {
    name: "Korek Api Super Jet",
    model: "Super Jet",
    initial_stock: 50,
    low_stock_threshold: 10,
    userId: adminId
  });
  console.log("Product created with ID:", productId);

  console.log("4. Testing products listing...");
  const products = await t.query(testApi.products.list, {});
  console.log("Found products count:", products.length);
  if (products.length !== 1 || products[0].name !== "Korek Api Super Jet") {
    throw new Error("Failed to retrieve products list correctly");
  }

  console.log("5. Testing adjust stock...");
  const newStock = await t.mutation(testApi.products.adjustStock, {
    id: productId,
    quantity_change: -5,
    movement_type: "sale",
    reference: "Manual sale test",
    userId: adminId
  });
  console.log("Adjusted stock. New stock quantity is:", newStock);
  if (newStock !== 45) {
    throw new Error("Expected stock to be 45, got " + newStock);
  }

  console.log("✅ All Convex migration tests passed successfully!");
}

runTests().catch(err => {
  console.error("❌ Tests failed:", err);
  process.exit(1);
});
