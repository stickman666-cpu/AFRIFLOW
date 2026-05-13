require("dotenv").config();

const { Client } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL est manquant.");
  process.exit(1);
}

const tables = [
  "audit_logs",
  "transactions",
  "beneficiaries",
  "kyc_documents",
  "wallets",
  "otp_verifications",
  "exchange_rates",
  "users"
];

const run = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Reset bloque en production.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`);
    console.log("Base locale reinitialisee.");
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error("Erreur reset PostgreSQL:", error.message);
  process.exit(1);
});
