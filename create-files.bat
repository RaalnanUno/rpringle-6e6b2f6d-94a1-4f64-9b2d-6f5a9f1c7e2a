@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM === CONFIG ===
set "SRC=apps\api\src\app"
set "PROMPT=prompt.md"

if not exist "%SRC%" (
  echo [ERROR] Source path not found: %SRC%
  exit /b 1
)

REM Start fresh prompt.md
> "%PROMPT%" echo # Project File Includes

REM Normalize current dir with trailing backslash for prefix stripping
set "CWD=%CD%\"

REM Walk all .ts files under SRC (skip .spec.ts if you want; uncomment next line and comment the one after)
REM for /r "%SRC%" %%F in (*.ts) do if /I not "%%~xF"==".spec.ts" (
for /r "%SRC%" %%F in (*.ts) do (
  set "ABS=%%~fF"         REM absolute path to .ts
  set "DIR=%%~dpF"        REM absolute directory path (ends with \)
  set "NAME=%%~nxF"       REM file name with extension
  set "BASE=%%~nF"        REM file name without extension

  REM Create/overwrite a .md right next to the .ts
  set "DEST=%%~dpF%%~nF.md"
  type "%%F" > "!DEST!" || (echo [!] Failed to write !DEST! & goto :continue)
  echo [*] Wrote !DEST!

  REM Build a repo-root-relative link: apps/api/src/app/...
  set "REL=!ABS:%CWD%=!"
  set "LINK=!REL:.ts=.md!"
  set "LINK=!LINK:\=/!"   REM use forward slashes in markdown

  REM Append a section to prompt.md (escape leading ! with ^)
  (
    echo.
    echo ## !NAME!
    echo ^![[!LINK!]]
  )>> "%PROMPT%"

  :continue
)

echo.
echo [OK] Markdown clones complete.
echo [OK] Rebuilt "%PROMPT%".
endlocal
