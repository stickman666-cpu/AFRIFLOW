const { Pool } = require("pg");

const isSslRequired = process.env.DATABASE_URL?.includes("sslmode=require") || process.env.PGSSLMODE === "require";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSslRequired ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect()
};
