const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = 3000;

// --- 1. MIDDLEWARES ---
// Ils doivent impérativement être placés AVANT les routes
app.use(cors()); 
app.use(express.json()); 
app.use(express.static('.')); // Permet de lire ton index.html et ton dossier css/js

// --- 2. ROUTES ---

// Voir tous les utilisateurs
app.get('/utilisateurs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM utilisateurs');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur lors de la récupération des utilisateurs");
    }
});

// Voir le solde d'un utilisateur spécifique
app.get('/solde/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT nom, solde FROM utilisateurs WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send("Utilisateur non trouvé");
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Erreur serveur");
    }
});

// Effectuer un transfert d'argent (Logique FinTech)
app.post('/transfert', async (req, res) => {
    const { expediteur_id, destinataire_id, montant } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Début de la transaction

        // 1. Vérifier et retirer l'argent de l'expéditeur
        const retrait = await client.query(
            'UPDATE utilisateurs SET solde = solde - $1 WHERE id = $2 AND solde >= $1 RETURNING *',
            [montant, expediteur_id]
        );

        if (retrait.rowCount === 0) {
            throw new Error("Solde insuffisant ou expéditeur inexistant");
        }

        // 2. Ajouter l'argent au destinataire
        const ajout = await client.query(
            'UPDATE utilisateurs SET solde = solde + $1 WHERE id = $2 RETURNING *',
            [montant, destinataire_id]
        );

        if (ajout.rowCount === 0) {
            throw new Error("Destinataire inexistant");
        }

        // 3. Enregistrer la trace du transfert
        await client.query(
            'INSERT INTO transactions (expediteur_id, destinataire_id, montant) VALUES ($1, $2, $3)',
            [expediteur_id, destinataire_id, montant]
        );

        await client.query('COMMIT'); // On valide tout
        res.json({ message: "Transfert effectué avec succès !" });

    } catch (err) {
        await client.query('ROLLBACK'); // Annulation totale en cas de problème
        res.status(400).json({ erreur: err.message });
    } finally {
        client.release();
    }
});

// --- 3. DÉMARRAGE DU SERVEUR ---
// Cette partie doit toujours être à la toute fin du fichier
app.listen(port, () => {
    console.log(`🚀 AFRIFLOW est prêt !`);
    console.log(`🔗 Accès local : http://localhost:${port}`);
});