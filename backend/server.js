require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();
const port = process.env.PORT || 4000;
const publicRoot = path.join(__dirname, "..");
const corsOrigin = process.env.CORS_ORIGIN || "*";

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120
}));
app.use(express.static(publicRoot));

const walletCurrencies = ["EUR", "XOF", "GHS", "NGN"];

const asyncRoute = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const createZeroWallets = async (client, userId) => {
  for (const currency of walletCurrencies) {
    await client.query(
      `INSERT INTO wallets (user_id, currency, balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id, currency) DO NOTHING`,
      [userId, currency]
    );
  }
};

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "afriflow-api" });
});

app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const { fullName, phone, country, otp, kycDocumentName } = req.body;

  if (!fullName || !phone || !country || !otp) {
    return res.status(400).json({ message: "fullName, phone, country et otp sont obligatoires." });
  }

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (full_name, phone, country, phone_verified, two_factor_enabled, kyc_status)
       VALUES ($1, $2, $3, TRUE, TRUE, 'pending')
       ON CONFLICT (phone) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         country = EXCLUDED.country,
         phone_verified = TRUE,
         updated_at = NOW()
       RETURNING id, full_name, phone, country, phone_verified, two_factor_enabled, kyc_status, created_at`,
      [fullName, phone, country]
    );

    const user = userResult.rows[0];
    const otpHash = await bcrypt.hash(String(otp), 10);

    await client.query(
      `INSERT INTO otp_verifications (user_id, otp_hash, verified_at)
       VALUES ($1, $2, NOW())`,
      [user.id, otpHash]
    );

    await createZeroWallets(client, user.id);

    await client.query(
      `INSERT INTO kyc_documents (user_id, document_name, status)
       VALUES ($1, $2, 'pending')`,
      [user.id, kycDocumentName || "document-demo.pdf"]
    );

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'USER_REGISTERED', 'user', $1, $2)`,
      [user.id, JSON.stringify({ walletsInitializedAtZero: true })]
    );

    await client.query("COMMIT");
    res.status(201).json({
      user: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        country: user.country,
        kycStatus: user.kyc_status,
        phoneVerified: user.phone_verified,
        twoFactorEnabled: user.two_factor_enabled
      },
      wallets: walletCurrencies.map((currency) => ({ currency, balance: 0 }))
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.get("/api/users/:userId/wallets", asyncRoute(async (req, res) => {
  const result = await db.query(
    `SELECT currency, balance
     FROM wallets
     WHERE user_id = $1
     ORDER BY currency`,
    [req.params.userId]
  );
  res.json({ wallets: result.rows });
}));

app.get("/api/rates", asyncRoute(async (req, res) => {
  const result = await db.query(
    `SELECT id, source_currency, target_currency, rate, margin_percent, active
     FROM exchange_rates
     WHERE active = TRUE
     ORDER BY source_currency, target_currency`
  );
  res.json({ rates: result.rows });
}));

app.post("/api/transfers/simulate", asyncRoute(async (req, res) => {
  const { sendAmount, sourceCurrency, targetCurrency } = req.body;
  const amount = Number(sendAmount);

  if (!amount || amount <= 0 || !sourceCurrency || !targetCurrency) {
    return res.status(400).json({ message: "Montant, devise source et devise cible obligatoires." });
  }

  const rateResult = await db.query(
    `SELECT rate, margin_percent
     FROM exchange_rates
     WHERE source_currency = $1 AND target_currency = $2 AND active = TRUE`,
    [sourceCurrency, targetCurrency]
  );

  if (!rateResult.rowCount) {
    return res.status(404).json({ message: "Taux indisponible pour ce corridor." });
  }

  const rate = Number(rateResult.rows[0].rate);
  const marginPercent = Number(rateResult.rows[0].margin_percent);
  const feeAmount = Math.max(amount * 0.024, sourceCurrency === "EUR" ? 2.5 : amount * 0.008);
  const receiveAmount = Math.max(amount - feeAmount, 0) * rate * (1 - marginPercent / 100);

  res.json({
    sourceCurrency,
    targetCurrency,
    sendAmount: amount,
    feeAmount,
    rate,
    receiveAmount
  });
}));

app.get("/api/admin/kyc", asyncRoute(async (req, res) => {
  const result = await db.query(
    `SELECT kd.id, kd.document_name, kd.status, kd.created_at, u.full_name, u.phone, u.country
     FROM kyc_documents kd
     JOIN users u ON u.id = kd.user_id
     ORDER BY kd.created_at DESC`
  );
  res.json({ documents: result.rows });
}));

app.patch("/api/admin/kyc/:documentId", asyncRoute(async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "approved", "rejected"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Statut KYC invalide." });
  }

  const result = await db.query(
    `UPDATE kyc_documents
     SET status = $1, reviewed_at = NOW()
     WHERE id = $2
     RETURNING id, user_id, document_name, status`,
    [status, req.params.documentId]
  );

  if (!result.rowCount) {
    return res.status(404).json({ message: "Document introuvable." });
  }

  await db.query(
    `UPDATE users
     SET kyc_status = $1, updated_at = NOW()
     WHERE id = $2`,
    [status, result.rows[0].user_id]
  );

  res.json({ document: result.rows[0] });
}));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicRoot, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: "Erreur serveur AfriFlow.",
    detail: process.env.NODE_ENV === "production" ? undefined : error.message
  });
});

app.listen(port, () => {
  console.log(`AfriFlow API running on http://localhost:${port}`);
});
