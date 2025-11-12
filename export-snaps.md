```bat

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
REM =======================================================
if exist "%PROMPT%" del "%PROMPT%"
>>"%PROMPT%" echo # Project File Includes
>>"%PROMPT%" echo.

REM 3a) Root-level md snapshots we created above
for %%F in (
  "package.ts"
  "nx.json"
  "tsconfig.base.json"
  "apps\api\project.json"
  "apps\api\tsconfig.app.json"
  "apps\api\src\main.ts"
) do (
  if exist "%%~F" (
    >>"%PROMPT%" echo ## %%~nxF
    >>"%PROMPT%" echo.
    >>"%PROMPT%" echo ^^![[%%~F:/=\%%]]
    >>"%PROMPT%" echo.
  )
)

REM 3b) All md files under SRC/** — show TS path as header, link to MD
for /r "%SRC%" %%F in (*.md) do (
  set "abs=%%~fF"
  set "rel=!abs:%ROOT%\=!"          REM path relative to repo root
  set "rel=!rel:\=/!"               REM use forward slashes
  set "orig=!rel:.md=.ts!"

  >>"%PROMPT%" echo ## !orig!
  >>"%PROMPT%" echo.
  >>"%PROMPT%" echo ^^![[!rel!]]
  >>"%PROMPT%" echo.
)

echo Done.
endlocal
```