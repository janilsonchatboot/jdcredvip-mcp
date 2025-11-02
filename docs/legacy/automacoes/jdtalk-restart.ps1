# Automacao de reconexao do JDTalk via SSH usando Plink.
param(
    [string]$PlinkPath = "C:\Program Files\PuTTY\plink.exe",
    [string]$Host = "codex@91.108.125.129",
    [string]$KeyPath = "D:\JD-CRED-VIP\automacoes\secrets\jdcredvip-jdtalk",
    [string]$RemoteDirectory = "/opt/jdtalk",
    [string]$Password = "",
    [string]$CredentialPath = ""
)

$logDir = "D:\JD-CRED-VIP\automacoes\logs"
if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

$logFile = Join-Path $logDir "jdtalk-restart.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$commands = @(
    "cd $RemoteDirectory",
    "git pull --rebase",
    "bash iniciar-jdtalk.sh"
) -join " && "

"$timestamp - Iniciando execucao" | Out-File -FilePath $logFile -Append

if (-not (Test-Path -LiteralPath $PlinkPath)) {
    "ERRO: Plink nao encontrado em $PlinkPath" | Out-File -FilePath $logFile -Append
    throw "Plink nao encontrado em $PlinkPath"
}

if ([string]::IsNullOrWhiteSpace($Password) -and -not [string]::IsNullOrWhiteSpace($CredentialPath)) {
    if (Test-Path -LiteralPath $CredentialPath) {
        try {
            $credential = Import-Clixml -Path $CredentialPath
            if ($credential -and $credential.GetNetworkCredential()) {
                $Password = $credential.GetNetworkCredential().Password
            } else {
                "ERRO: Arquivo de credenciais em $CredentialPath nao contem dados validos." | Out-File -FilePath $logFile -Append
                throw "Credencial invalida em $CredentialPath"
            }
        }
        catch {
            "ERRO: Falha ao carregar credencial de $CredentialPath - $_" | Out-File -FilePath $logFile -Append
            throw
        }
    } else {
        "ERRO: Arquivo de credencial nao encontrado em $CredentialPath" | Out-File -FilePath $logFile -Append
        throw "Arquivo de credencial nao encontrado em $CredentialPath"
    }
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    if (-not (Test-Path -LiteralPath $KeyPath)) {
        "ERRO: Chave SSH nao encontrada em $KeyPath" | Out-File -FilePath $logFile -Append
        throw "Chave SSH nao encontrada em $KeyPath"
    }
}

$plinkArgs = @("-ssh", $Host, "-batch")

if ([string]::IsNullOrWhiteSpace($Password)) {
    $plinkArgs += @("-i", $KeyPath)
} else {
    $plinkArgs += @("-pw", $Password)
}

$plinkArgs += $commands

try {
    $output = & $PlinkPath @plinkArgs 2>&1
    if ($output) {
        $output | Out-File -FilePath $logFile -Append
    }
    "$timestamp - Execucao concluida (codigo $LASTEXITCODE)." | Out-File -FilePath $logFile -Append

    if ($LASTEXITCODE -ne 0) {
        throw "Execucao terminou com erro (codigo $LASTEXITCODE)."
    }
}
catch {
    "ERRO: $_" | Out-File -FilePath $logFile -Append
    throw
}
