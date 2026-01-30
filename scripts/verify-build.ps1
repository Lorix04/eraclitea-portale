Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   VERIFICA PRE-DEPLOY PORTALE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()

Write-Host "1. Verifica TypeScript..." -ForegroundColor Yellow
$tscResult = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "   ❌ TypeScript FALLITO" -ForegroundColor Red
  $errors += "TypeScript"
  Write-Host $tscResult -ForegroundColor Gray
} else {
  Write-Host "   ✅ TypeScript OK" -ForegroundColor Green
}

Write-Host "2. Verifica ESLint..." -ForegroundColor Yellow
$lintResult = npm run lint 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "   ⚠️ ESLint con warnings/errori" -ForegroundColor Yellow
  Write-Host $lintResult -ForegroundColor Gray
} else {
  Write-Host "   ✅ ESLint OK" -ForegroundColor Green
}

Write-Host "3. Verifica Prisma..." -ForegroundColor Yellow
$prismaResult = npx prisma generate 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "   ❌ Prisma generate FALLITO" -ForegroundColor Red
  $errors += "Prisma"
  Write-Host $prismaResult -ForegroundColor Gray
} else {
  Write-Host "   ✅ Prisma OK" -ForegroundColor Green
}

Write-Host "4. Verifica Build..." -ForegroundColor Yellow
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "   ❌ Build FALLITO" -ForegroundColor Red
  $errors += "Build"
  Write-Host $buildResult -ForegroundColor Gray
} else {
  Write-Host "   ✅ Build OK" -ForegroundColor Green
}

Write-Host "5. Verifica Test..." -ForegroundColor Yellow
$testResult = npm run test 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "   ❌ Test FALLITI" -ForegroundColor Red
  $errors += "Test"
} else {
  Write-Host "   ✅ Test OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   RIEPILOGO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
  Write-Host ""
  Write-Host "✅ PRONTO PER IL DEPLOY!" -ForegroundColor Green
  Write-Host ""
} else {
  Write-Host ""
  Write-Host "❌ PROBLEMI DA RISOLVERE:" -ForegroundColor Red
  foreach ($err in $errors) {
    Write-Host "   - $err" -ForegroundColor Red
  }
  Write-Host ""
}
