$ErrorActionPreference = "Stop"

Write-Host "Verification des fichiers AFRIFLOW..."

$requiredFiles = @(
  "package.json",
  ".gitignore",
  ".env.example",
  ".env.production.example",
  "Dockerfile",
  "docker-compose.yml",
  "render.yaml",
  "backend/server.js",
  "backend/db.js",
  "database/schema.sql",
  "scripts/migrate.js",
  "scripts/check-db.js",
  ".github/workflows/ci.yml"
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path $file)) {
    throw "Fichier manquant: $file"
  }
}

Write-Host "Tous les fichiers de deploiement sont presents."

if (Get-Command npm -ErrorAction SilentlyContinue) {
  npm run check
} else {
  Write-Host "npm n'est pas disponible dans le PATH. Installe Node.js avant le deploiement."
}
