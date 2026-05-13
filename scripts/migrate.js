require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL est manquant. Copiez .env.example vers .env et configurez PostgreSQL.");
  process.exit(1);
}

const run = async () => {
  const client = new Client({ connectionString: databaseUrl });
  const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  await client.connect();
  try {
    await client.query(schema);
    console.log("Migration PostgreSQL terminee.");
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error("Erreur migration PostgreSQL:", error.message);
  process.exit(1);
});
