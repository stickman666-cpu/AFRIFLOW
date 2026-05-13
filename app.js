const pool = require('./db');

async function initialiserAFRIFLOW() {
  try {
    // 1. Création de la table des Utilisateurs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        solde DECIMAL(15, 2) DEFAULT 0.00
      );
    `);

    // 2. Ajout d'un utilisateur de test (toi !)
    // On utilise "ON CONFLICT" pour ne pas créer de doublon si tu relances le script
    await pool.query(`
      INSERT INTO utilisateurs (nom, email, solde) 
      VALUES ('Utilisateur Test', 'test@afriflow.com', 1000.00)
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log("✅ AFRIFLOW est prêt : Tables créées et utilisateur de test ajouté !");
    
    // On affiche la liste des utilisateurs pour vérifier
    const res = await pool.query('SELECT * FROM utilisateurs');
    console.table(res.rows);

  } catch (err) {
    console.error("❌ Erreur :", err.message);
  } finally {
    pool.end();
  }
}

// C'est cette ligne qui doit correspondre au nom de la fonction en haut !
initialiserAFRIFLOW();