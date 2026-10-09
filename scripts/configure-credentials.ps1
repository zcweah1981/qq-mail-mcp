$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'Windows DPAPI is required.' }
$address = Read-Host 'QQ email address (numeric QQ ID @qq.com)'
if ($address -notmatch '^\d{5,12}@qq\.com$') { throw 'Invalid QQ address.' }
$code = Read-Host 'QQ IMAP authorization code (hidden input)' -AsSecureString
if ($code.Length -eq 0) { throw 'Empty authorization code.' }
$directory = Join-Path $env:LOCALAPPDATA 'qq-mail-mcp'
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$credential = [System.Management.Automation.PSCredential]::new($address, $code)
$credential | Export-Clixml -LiteralPath (Join-Path $directory 'credential.xml')
$code.Dispose()
Write-Host 'Credential encrypted for this Windows user and computer. No mailbox connection was made.'
