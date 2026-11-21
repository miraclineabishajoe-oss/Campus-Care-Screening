Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " CampusCare — Student Wellness & Counselling Coordination System" -ForegroundColor Cyan
Write-Host " Pure Java Desktop Application (Java Swing + FlatLaf + JDBC)" -ForegroundColor Green
Write-Host " Database: MySQL 8.0 Live (campuscare @ localhost:3306)" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

if (-not (Test-Path "bin\com\campuscare\MainApp.class")) {
    Write-Host "[INFO] Compiled classes not found. Compiling Java sources..." -ForegroundColor Yellow
    if (-not (Test-Path "bin")) { New-Item -ItemType Directory -Path "bin" | Out-Null }
    javac -cp "lib/*" -d bin src_java\com\campuscare\*.java
}

Write-Host "[OK] Launching CampusCare Java Desktop Application..." -ForegroundColor Green
Start-Process -FilePath "javaw" -ArgumentList "-cp `"bin;lib/*`" com.campuscare.MainApp"
Write-Host "[DONE] Application launched in background window." -ForegroundColor Cyan
