require("dotenv").config();

const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL est manquant.");
  process.exit(1);
}

const wallets = ["EUR", "XOF", "GHS", "NGN"];

const run = async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (full_name, phone, country, phone_verified, two_factor_enabled, kyc_status)
       VALUES ('Demo AfriFlow', '+2250700000000', 'CI', TRUE, TRUE, 'pending')
       ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
    );

    const userId = userResult.rows[0].id;
    const otpHash = await bcrypt.hash("1234", 10);

    await client.query(
      `INSERT INTO otp_verifications (user_id, otp_hash, verified_at)
       VALUES ($1, $2, NOW())`,
      [userId, otpHash]
    );

    for (const currency of wallets) {
      await client.query(
        `INSERT INTO wallets (user_id, currency, balance)
         VALUES ($1, $2, 0)
         ON CONFLICT (user_id, currency) DO UPDATE SET balance = 0, updated_at = NOW()`,
        [userId, currency]
      );
    }

    await client.query(
      `INSERT INTO kyc_documents (user_id, document_name, status)
       VALUES ($1, 'demo-identity.pdf', 'pending')`,
      [userId]
    );

    await client.query("COMMIT");
    console.log("Donnees demo creees avec wallets a zero.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error("Erreur seed PostgreSQL:", error.message);
  process.exit(1);
});
