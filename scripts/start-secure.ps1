$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { [Console]::Error.WriteLine('qq-mail-mcp: Windows DPAPI is required.'); exit 1 }
$previousAddress = $env:QQ_MAIL_ADDRESS
$previousCode = $env:QQ_MAIL_AUTH_CODE
$exitStatus = 1
try {
    $credentialFile = Join-Path (Join-Path $env:LOCALAPPDATA 'qq-mail-mcp') 'credential.xml'
    if (Test-Path -LiteralPath $credentialFile) {
        $credential = Import-Clixml -LiteralPath $credentialFile
        if ($credential -isnot [System.Management.Automation.PSCredential]) { throw 'Invalid credential object.' }
        $env:QQ_MAIL_ADDRESS = $credential.UserName
        $env:QQ_MAIL_AUTH_CODE = $credential.GetNetworkCredential().Password
    } else {
        $env:QQ_MAIL_ADDRESS = ''
        $env:QQ_MAIL_AUTH_CODE = ''
    }
    $entry = Join-Path (Split-Path $PSScriptRoot -Parent) 'src/index.mjs'
    & node $entry
    $exitStatus = $LASTEXITCODE
} catch { [Console]::Error.WriteLine('qq-mail-mcp: secure launcher failed; check local configuration.') }
finally {
    $env:QQ_MAIL_ADDRESS = $previousAddress
    $env:QQ_MAIL_AUTH_CODE = $previousCode
    $credential = $null
}
exit $exitStatus
