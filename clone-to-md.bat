@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM === CONFIG ===
set "SRC=apps\api\src\app"
set "DEST=."            REM mirror under repo root
set "PROMPT=prompt.md"

if not exist "%SRC%" (
  echo [ERROR] Source path not found: %SRC%
  exit /b 1
)

REM Start fresh prompt.md
> "%PROMPT%" echo # Project File Includes

REM Walk all .ts files under SRC (you can narrow this later if needed)
for /r "%SRC%" %%F in (*.ts) do (
  set "ABS=%%F"
  set "NAME=%%~nxF"      REM e.g. jwt-auth.guard.ts
  set "BASE=%%~nF"       REM e.g. jwt-auth.guard
  set "REL=%%F"
  set "REL=!REL:%SRC%\=!"  REM path relative to SRC (e.g. auth\jwt-auth.guard.ts)

  REM Compute subdir (REL minus file name)
  set "SUBDIR=!REL:%NAME%=!"

  REM Ensure destination subdir exists (mirror structure at repo root)
  if not exist "%DEST%\!SUBDIR!" (
    mkdir "%DEST%\!SUBDIR!" 2>nul
  )

  REM Destination .md path (overwrite on purpose)
  set "DESTFILE=%DEST%\!SUBDIR!!BASE!.md"

  REM Copy contents, overwrite
  type "%%F" > "!DESTFILE!"
  echo [*] Wrote !DESTFILE!

  REM Build Obsidian-style link with forward slashes
  set "LINK=!SUBDIR!!BASE!.md"
  set "LINK=!LINK:\=/!"

  (
    echo.
    echo ## !NAME!
    echo ![[!LINK!]]
  )>> "%PROMPT%"
)

echo.
echo [OK] Markdown clones complete (overwritten if existed).
echo [OK] Rebuilt "%PROMPT%".
endlocal
