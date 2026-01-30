#!/bin/bash
set -e

echo "Running pre-deploy checks..."

echo "Type checking..."
npm run typecheck

echo "Linting..."
npm run lint

echo "Unit tests..."
npm run test

echo "Building..."
npm run build

echo "Checking environment variables..."
required_vars=(
  "DATABASE_URL"
  "NEXTAUTH_URL"
  "NEXTAUTH_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Missing required env var: $var"
    exit 1
  fi
done

echo "All pre-deploy checks passed!"
