@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM =======================================================
REM CONFIG — adjust if your paths change
REM =======================================================
set "SRC=apps\api\src\app"
set "PROMPT=prompt.md"
set "ROOT=%CD%"

REM =======================================================
REM 1) Copy specific root-level files to .md (if present)
REM    (edit this list to taste)
REM    NOTE: We output side-by-side snapshots:
REM          e.g. package.json -> package.md
REM =======================================================
for %%F in (
  "package.json"
  "nx.json"
  "tsconfig.base.json"
  "apps\api\project.json"
  "apps\api\tsconfig.app.json"
  "apps\api\src\main.ts"
) do (
  if exist "%%~F" (
    copy /y "%%~F" "%%~dpnF.md" >nul
  )
)

REM =======================================================
REM 2) Copy ALL .ts under apps/api/src/app to corresponding .md
REM    (side-by-side; overwrite always)
REM =======================================================
if not exist "%SRC%" (
  echo [ERROR] Source path not found: %SRC%
  exit /b 1
)

for /r "%SRC%" %%F in (*.ts) do (
  copy /y "%%~fF" "%%~dpnF.md" >nul
)

REM =======================================================
REM 3) Build prompt.md with path headers and Obsidian links
REM    - For root-level items, header shows ORIGINAL path,
REM      link targets the generated .md snapshot.
REM    - For SRC/**, we show "original .ts" header and link to its .md
REM =======================================================
if exist "%PROMPT%" del "%PROMPT%"
>>"%PROMPT%" echo # Project File Includes
>>"%PROMPT%" echo.

REM 3a) Root-level md snapshots we created above
for %%F in (
  "package.json"
  "nx.json"
  "tsconfig.base.json"
  "apps\api\project.json"
  "apps\api\tsconfig.app.json"
  "apps\api\src\main.ts"
) do (
  if exist "%%~F" (
    REM Absolute original and its .md snapshot
    set "ABS=%%~fF"
    set "MD=%%~dpnF.md"

    REM Compute display path for ORIGINAL (relative + forward slashes)
    set "REL=!ABS:%ROOT%\=!"
    set "REL=!REL:\=/!"

    REM Compute link target path for the MD file (relative + forward slashes)
    set "MDREL=!MD:%ROOT%\=!"
    set "MDREL=!MDREL:\=/!"

    >>"%PROMPT%" echo ## !REL!
    >>"%PROMPT%" echo.
    REM Output an embedded Obsidian link to the MD snapshot:
    >>"%PROMPT%" echo ^^![[!MDREL!]]
    >>"%PROMPT%" echo.
  )
)

REM 3b) All md files under SRC/** — show TS path as header, link to MD
for /r "%SRC%" %%F in (*.md) do (
  set "ABS=%%~fF"
  set "REL=!ABS:%ROOT%\=!"
  set "REL=!REL:\=/!"
  set "ORIG=!REL:.md=.ts!"

  >>"%PROMPT%" echo ## !ORIG!
  >>"%PROMPT%" echo.
  >>"%PROMPT%" echo ^^![[!REL!]]
  >>"%PROMPT%" echo.
)

echo Done.
endlocal
