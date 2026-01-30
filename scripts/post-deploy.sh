#!/bin/bash
set -e

BASE_URL="${1:-https://formazione.tuodominio.it}"

echo "Running post-deploy verification..."

echo "Checking health endpoint..."
health=$(curl -s "$BASE_URL/api/health")
if [[ $(echo "$health" | jq -r '.status') != "healthy" ]]; then
  echo "Health check failed!"
  exit 1
fi
echo "Health check passed"

echo "Checking login page..."
login_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login")
if [[ $login_status != "200" ]]; then
  echo "Login page not accessible!"
  exit 1
fi
echo "Login page accessible"

echo "Checking database..."
db_status=$(echo "$health" | jq -r '.checks.database')
if [[ $db_status != "ok" ]]; then
  echo "Database check failed!"
  exit 1
fi
echo "Database connected"

echo "All post-deploy checks passed!"
