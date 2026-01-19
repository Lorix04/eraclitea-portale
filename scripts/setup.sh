#!/bin/bash
set -e

echo "🚀 Setup Portale Formazione"

echo "📦 Installazione dipendenze..."
npm install

echo "🐳 Avvio servizi Docker (dev)..."
docker compose -f docker-compose.dev.yml up -d

echo "⏳ Attesa servizi..."
sleep 10

echo "🔧 Prisma setup..."
npx prisma generate
npx prisma db push

echo "🌱 Seed..."
npm run seed

echo "✅ Setup completato!"
echo "App: http://localhost:3000  •  MinIO: http://localhost:9001  •  Mailhog: http://localhost:8025"
