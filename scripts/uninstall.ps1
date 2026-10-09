param([string]$ConfigHome, [string]$InstallRoot)
. (Join-Path $PSScriptRoot 'plugin-common.ps1')
$ConfigHome = Resolve-ConfigHome $ConfigHome
$priorConfigHome = $env:CODEX_HOME
try {
    $env:CODEX_HOME = $ConfigHome
    if (-not $InstallRoot) { $InstallRoot = Join-Path $ProjectRoot '.codex/local-marketplace' }
    $InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
    $markets = Invoke-PluginCli @('plugin','marketplace','list','--json') | ConvertFrom-Json
    foreach ($market in $markets.marketplaces) {
        if ($market.name -eq 'qq-mail-local' -and [IO.Path]::GetFullPath($market.root) -ne $InstallRoot) { throw 'Registered plugin belongs to another checkout; nothing was removed.' }
    }
    $adapterPath = Join-Path $InstallRoot 'plugins/qq-mail-readonly/.mcp.json'
    if (Test-Path -LiteralPath $adapterPath) {
        $adapter = Get-Content -Raw -LiteralPath $adapterPath | ConvertFrom-Json
        if ([IO.Path]::GetFullPath($adapter.mcpServers.'qq-mail-readonly'.args[-1]) -ne (Join-Path $ProjectRoot 'scripts/start-secure.ps1')) { throw 'Adapter belongs to another checkout; nothing was removed.' }
    }
    Backup-PluginConfig $ConfigHome | Out-Null
    Invoke-PluginCli @('plugin','remove','qq-mail-readonly@qq-mail-local','--json') | Out-Null
    Write-Host 'Plugin removed. Marketplace, encrypted credentials, repository and cursor state were preserved.'
} finally { $env:CODEX_HOME = $priorConfigHome }
