@echo off
cd /d C:\xampp\htdocs\scrapdash\backend
"C:\xampp\php\php.exe" artisan schedule:run >> "C:\xampp\htdocs\scrapdash\backend\storage\logs\scheduler.log" 2>&1
