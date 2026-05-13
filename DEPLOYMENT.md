# Deploiement AFRIFLOW

Ce guide prepare le projet pour Git, PostgreSQL et un hebergement Node.js.

## 1. Preparer Git

Dans `C:\Users\HP\Documents\AFRIFLOW` :

```bash
git init
git status
git add .
git commit -m "Initial AfriFlow platform"
git branch -M main
git remote add origin https://github.com/VOTRE_COMPTE/afriflow.git
git push -u origin main
```

Important : le dossier utilisateur `C:\Users\HP` contient deja un depot Git parent. Pour eviter de versionner tout le PC, l'ideal est de creer un depot Git separe directement dans `AFRIFLOW`.

## 2. Variables d'environnement

Copier l'exemple :

```bash
copy .env.example .env
```

Configurer :

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/afriflow
JWT_SECRET=une-cle-longue-et-secrete
NODE_ENV=development
```

En production, utiliser `.env.production.example` comme modele.

## 3. PostgreSQL local

Avec PostgreSQL installe :

```bash
createdb afriflow
npm install
npm run db:migrate
npm run db:check
npm run dev
```

Le site sera sur :

```text
http://localhost:4000
```

## 4. PostgreSQL avec Docker

Si Docker est installe :

```bash
docker compose up --build
```

Cela lance :

- `postgres` sur le port `5432`
- `app` sur le port `4000`
- migration automatique au demarrage

## 5. Deploiement Render

Le fichier `render.yaml` permet un deploiement blueprint :

1. pousser le projet sur GitHub ;
2. aller sur Render ;
3. New > Blueprint ;
4. selectionner le depot GitHub ;
5. renseigner `PUBLIC_APP_URL` et `CORS_ORIGIN` avec l'URL finale ;
6. Render cree le service web et PostgreSQL.

## 6. Deploiement Railway, Fly.io ou autre

Creer un service Node.js avec :

```bash
npm install
npm run db:migrate
npm start
```

Variables obligatoires :

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `PORT`
- `PUBLIC_APP_URL`
- `CORS_ORIGIN`

## 7. Verification apres deploiement

Avant de pousser :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-check.ps1
```

Tester :

```text
GET /api/health
```

Reponse attendue :

```json
{ "ok": true, "service": "afriflow-api" }
```

Puis ouvrir l'URL publique, creer un compte, et verifier que les wallets `EUR`, `XOF`, `GHS`, `NGN` commencent tous a `0`.
