# AFRIFLOW

Depot pour le projet fintech AfriFlow Money.

Prototype d'une plateforme de transfert d'argent multi-devises orientee marche africain.

## Structure

- `index.html` : front-end mobile-first.
- `css/styles.css` : design bleu nuit, vert emeraude et blanc.
- `js/app.js` : inscription obligatoire, simulation, wallets a zero et navigation.
- `backend/server.js` : API Node.js / Express.
- `backend/db.js` : connexion PostgreSQL.
- `database/schema.sql` : tables PostgreSQL.
- `.env.example` : exemple de configuration.

## Important

Avant utilisation, chaque client doit s'inscrire. A l'inscription, le backend cree automatiquement les wallets `EUR`, `XOF`, `GHS` et `NGN` avec un solde `0`.

## Installation backend

1. Installer PostgreSQL.
2. Creer une base :

```sql
CREATE DATABASE afriflow;
```

3. Importer le schema :

```bash
psql -U postgres -d afriflow -f database/schema.sql
```

4. Copier `.env.example` vers `.env`, puis verifier `DATABASE_URL`.
5. Installer les dependances :

```bash
npm install
```

6. Lancer l'API :

```bash
npm run dev
```

Le site sera disponible sur `http://localhost:4000`.

## Deploiement

Les fichiers necessaires sont inclus :

- `.gitignore` pour Git.
- `.env.example` et `.env.production.example` pour les variables.
- `Dockerfile` et `docker-compose.yml` pour lancer app + PostgreSQL.
- `render.yaml` pour un deploiement Render avec PostgreSQL.
- `Procfile` pour les plateformes compatibles.
- `.github/workflows/ci.yml` pour verifier le projet sur GitHub Actions.
- `scripts/migrate.js`, `scripts/seed.js`, `scripts/reset-db.js`, `scripts/check-db.js`.

Voir `DEPLOYMENT.md` pour les commandes completes.

## Routes API principales

- `GET /api/health`
- `POST /api/auth/register`
- `GET /api/users/:userId/wallets`
- `GET /api/rates`
- `POST /api/transfers/simulate`
- `GET /api/admin/kyc`
- `PATCH /api/admin/kyc/:documentId`

## Mode demo

Si le backend n'est pas lance, le front-end cree une inscription locale dans le navigateur pour permettre de tester l'interface. Pour utiliser PostgreSQL, lance l'API avec `npm run dev`.
