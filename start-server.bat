@echo off
cd /d "%~dp0"
echo Starting server at http://localhost:8000
echo Open this URL in your browser.
echo Press Ctrl+C to stop.
python -m http.server 8000
pause
