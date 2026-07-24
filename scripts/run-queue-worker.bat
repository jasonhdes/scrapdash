@echo off
cd /d C:\xampp\htdocs\scrapdash\backend
"C:\xampp\php\php.exe" artisan queue:work --stop-when-empty --sleep=1 >> "C:\xampp\htdocs\scrapdash\backend\storage\logs\queue-worker.log" 2>&1
