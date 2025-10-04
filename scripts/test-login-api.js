const fs = require("fs");
const path = require("path");

// Load environment variables
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

async function testLoginAPI() {
  console.log("🧪 Testing Login API Directly...\n");

  const testCredentials = [
    { email: "admin@voteguard.system", password: "Admin123!" },
    { email: "john.admin@example.com", password: "Password123!" },
    { email: "jane.user@example.com", password: "Password123!" }
  ];

  for (const creds of testCredentials) {
    console.log(`Testing: ${creds.email}`);
    
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(creds),
      });

      const result = await response.json();
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, result);
      
      if (response.ok) {
        console.log("   ✅ Login successful!");
      } else {
        console.log("   ❌ Login failed");
      }
      
    } catch (error) {
      console.log("   ❌ Request failed:", error.message);
    }
    
    console.log("");
  }
}

testLoginAPI();