<# 
Export selected repo files into prompt.md with correct code fences.

HOW TO RUN:
1) From the repo root, in PowerShell:
      pwsh -File .\export-project.ps1
   or (Windows PowerShell):
      powershell.exe -ExecutionPolicy Bypass -File .\export-project.ps1

Tip: If PowerShell blocks scripts, either run from an elevated shell or add -ExecutionPolicy Bypass as shown.
#>

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# --- Settings ---
$Root    = (Get-Location).Path
$OutPath = Join-Path $Root 'prompt.md'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# Pick your explicit files here:
$explicit = @(
  'nx.json',
  'tsconfig.base.json',
  'apps/api/project.json',
  'apps/api/tsconfig.app.json',
  'apps/api/src/main.ts'
)

# And include all .ts files under the app directory (adjust the path if needed)
$tsFiles = Get-ChildItem -Path 'apps/api/src/app' -Recurse -Include *.ts -File -ErrorAction SilentlyContinue |
           ForEach-Object { $_.FullName }

# Merge list and make unique
$files = ($explicit + $tsFiles) | Select-Object -Unique

function Get-Lang([string]$Path) {
  switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.ts'   { 'ts' }
    '.js'   { 'js' }
    '.json' { 'json' }
    '.md'   { 'md' }
    default { '' }
  }
}

# Start the output file fresh
[IO.File]::WriteAllText($OutPath, "# Project File Includes`r`n`r`n", $Utf8NoBom)

foreach ($f in $files) {
  # Resolve absolute path
  $abs = if ([IO.Path]::IsPathRooted($f)) { $f } else { Join-Path $Root $f }

  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) {
    Add-Content -Path $OutPath -Value "$f`r`n`"$f`" not found.`r`n"
    continue
  }

  # Make a pretty relative path for display
  $rel     = [IO.Path]::GetRelativePath($Root, $abs)
  $display = $rel -replace '\\','/'

  $lang = Get-Lang $abs

  Add-Content -Path $OutPath -Value "$display`r`n"
  if ([string]::IsNullOrEmpty($lang)) {
    Add-Content -Path $OutPath -Value "```"
  } else {
    Add-Content -Path $OutPath -Value "```$lang"
  }

  # Append file contents
  Get-Content -LiteralPath $abs -Raw | Add-Content -Path $OutPath

  # Close fence and add a blank line
  Add-Content -Path $OutPath -Value "```"
  Add-Content -Path $OutPath -Value ""
}

Write-Host "Wrote $OutPath"
