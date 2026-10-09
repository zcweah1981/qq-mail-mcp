$ErrorActionPreference = 'Stop'
if (-not $IsWindows -or $PSVersionTable.PSVersion.Major -lt 7) { throw 'Windows and PowerShell 7 are required.' }
$ProjectRoot = Split-Path $PSScriptRoot -Parent
function Invoke-PluginCli([string[]]$Arguments) {
    $errorFile = [IO.Path]::GetTempFileName()
    try {
        $result = & codex @Arguments 2>$errorFile
        if ($LASTEXITCODE -ne 0 -and (Get-Content -Raw -LiteralPath $errorFile).Contains('max_concurrent_threads_per_session')) {
            $result = & codex -c 'agents.max_concurrent_threads_per_session={}' @Arguments 2>$errorFile
        }
        if ($LASTEXITCODE -ne 0) { throw 'Codex command failed. Configuration backup is retained; inspect with codex plugin list --json.' }
        return ($result -join [Environment]::NewLine)
    } finally { Remove-Item -LiteralPath $errorFile -Force }
}
function Resolve-ConfigHome([string]$Value) {
    if (-not $Value) { $Value = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' } }
    return [IO.Path]::GetFullPath($Value)
}
function Backup-PluginConfig([string]$Directory) {
    $backup = Join-Path $Directory ('backups/qq-mail-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $backup | Out-Null
    $config = Join-Path $Directory 'config.toml'
    if (Test-Path -LiteralPath $config) { Copy-Item -LiteralPath $config -Destination (Join-Path $backup 'config.toml') }
    Write-Host "Backup: $backup"
    return $backup
}
