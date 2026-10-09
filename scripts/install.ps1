param([string]$ConfigHome, [string]$InstallRoot, [switch]$SkipDependencyInstall)
. (Join-Path $PSScriptRoot 'plugin-common.ps1')
foreach ($command in @('node','npm','codex')) { Get-Command $command -ErrorAction Stop | Out-Null }
$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) { throw 'Install Node.js 22 or newer first.' }
$ConfigHome = Resolve-ConfigHome $ConfigHome
if (-not $InstallRoot) { $InstallRoot = Join-Path $ProjectRoot '.codex/local-marketplace' }
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$pluginRoot = Join-Path $InstallRoot 'plugins/qq-mail-readonly'
$catalog = Join-Path $InstallRoot '.agents/plugins/marketplace.json'
if (Test-Path -LiteralPath $InstallRoot) {
    if (-not (Test-Path -LiteralPath $catalog)) { throw 'Existing installation directory is not a QQ Mail marketplace; nothing was overwritten.' }
    $existing = Get-Content -Raw -LiteralPath $catalog | ConvertFrom-Json
    if ($existing.name -ne 'qq-mail-local' -or @($existing.plugins).Count -ne 1 -or $existing.plugins[0].name -ne 'qq-mail-readonly' -or $existing.plugins[0].source.path -ne './plugins/qq-mail-readonly') { throw 'Foreign marketplace contents; nothing was overwritten.' }
    $adapter = Get-Content -Raw -LiteralPath (Join-Path $pluginRoot '.mcp.json') | ConvertFrom-Json
    $oldScript = $adapter.mcpServers.'qq-mail-readonly'.args[-1]
    if ([IO.Path]::GetFullPath($oldScript) -ne (Join-Path $ProjectRoot 'scripts/start-secure.ps1')) { throw 'Existing adapter belongs to another checkout; nothing was overwritten.' }
}
$priorConfigHome = $env:CODEX_HOME
try {
    $env:CODEX_HOME = $ConfigHome
    # Preflight CLI support before dependency installation or configuration changes.
    $markets = Invoke-PluginCli @('plugin','marketplace','list','--json') | ConvertFrom-Json
    foreach ($market in $markets.marketplaces) {
        if ($market.name -eq 'qq-mail-local' -and [IO.Path]::GetFullPath($market.root) -ne $InstallRoot) { throw 'Another QQ Mail marketplace is already registered. Use its original checkout; nothing was changed.' }
    }
    if (-not $SkipDependencyInstall) {
        Push-Location $ProjectRoot
        try { & npm ci --ignore-scripts --registry=https://registry.npmjs.org/; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' } } finally { Pop-Location }
    }
    $backup = Backup-PluginConfig $ConfigHome
    if (Test-Path -LiteralPath $InstallRoot) { Copy-Item -LiteralPath $InstallRoot -Destination (Join-Path $backup 'marketplace') -Recurse }
    New-Item -ItemType Directory -Force -Path (Split-Path $catalog), (Join-Path $pluginRoot '.codex-plugin') | Out-Null
    Copy-Item -LiteralPath (Join-Path $ProjectRoot '.codex-plugin/plugin.json') -Destination (Join-Path $pluginRoot '.codex-plugin/plugin.json')
    $mcp = @{ mcpServers = @{ 'qq-mail-readonly' = @{
        command = (Get-Command pwsh).Source
        args = @('-NoProfile','-NonInteractive','-File',(Join-Path $ProjectRoot 'scripts/start-secure.ps1'))
        env = @{ QQ_MAIL_TRANSPORT='stdio'; QQ_MAIL_ADDRESS=''; QQ_MAIL_AUTH_CODE='' }
    } } }
    $mcp | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $pluginRoot '.mcp.json') -Encoding utf8
    @{ name='qq-mail-local'; plugins=@(@{name='qq-mail-readonly';source=@{source='local';path='./plugins/qq-mail-readonly'};policy=@{installation='AVAILABLE';authentication='ON_INSTALL'};category='Productivity'}) } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $catalog -Encoding utf8
    Invoke-PluginCli @('plugin','marketplace','add',$InstallRoot,'--json') | Out-Null
    Invoke-PluginCli @('plugin','add','qq-mail-readonly@qq-mail-local','--json') | Out-Null
    Write-Host 'QQ Mail plugin registered. Credentials were not read or changed. Configure them separately, then reload Codex when ready.'
} finally { $env:CODEX_HOME = $priorConfigHome }
