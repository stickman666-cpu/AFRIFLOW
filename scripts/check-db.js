require("dotenv").config();

const { Client } = require("pg");

const run = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL est manquant.");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query("SELECT NOW() AS connected_at");
  await client.end();

  console.log(`Connexion PostgreSQL OK: ${result.rows[0].connected_at.toISOString()}`);
};

run().catch((error) => {
  console.error(`Connexion PostgreSQL echouee: ${error.message}`);
  process.exit(1);
});
