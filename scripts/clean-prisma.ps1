Write-Host "🧹 Pulizia cache Prisma..." -ForegroundColor Yellow

Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

$foldersToDelete = @(
  ".next",
  "node_modules\\.prisma",
  "node_modules\\@prisma\\client"
)

foreach ($folder in $foldersToDelete) {
  if (Test-Path $folder) {
    Write-Host "Eliminando $folder..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $folder -ErrorAction SilentlyContinue
  }
}

Write-Host "✅ Pulizia completata!" -ForegroundColor Green
Write-Host "Esegui ora: npx prisma generate" -ForegroundColor Cyan
