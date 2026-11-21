@echo off
title CampusCare - Student Wellness & Counselling Desktop App
echo ======================================================================
echo  CampusCare — Student Wellness & Counselling Coordination System
echo  Pure Java Desktop Application (Java Swing + FlatLaf + JDBC)
echo  Database: MySQL 8.0 Live (campuscare @ localhost:3306)
echo ======================================================================
echo.

if not exist "bin\com\campuscare\MainApp.class" (
    echo [INFO] Compiled binaries not found. Compiling first...
    if not exist "bin" mkdir "bin"
    javac -cp "lib/*" -d bin src_java\com\campuscare\*.java
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Compilation failed. Please ensure Java 21+ JDK is installed.
        pause
        exit /b %ERRORLEVEL%
    )
)

echo Starting CampusCare Desktop GUI...
start "CampusCare Desktop" javaw -cp "bin;lib/*" com.campuscare.MainApp
echo Application launched! You can close this terminal or press any key to exit.
exit /b 0
