# タスクボードの DB・API・画面を、決められたポートで起動する。
# ポートが使用中なら、そのプロセスを止めてから同じポートで起動する（別のポートには逃がさない）。
#   DB  : 5433（Docker の PostgreSQL）
#   API : 8080（Spring Boot）
#   画面: 5173（Vite）
# ログは TaskManagement/logs/ に日時付きで残す（消さない）。

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot   # TaskManagement フォルダ
$logDir = Join-Path $root "logs"
New-Item -ItemType Directory -Force $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$startLog = Join-Path $logDir "$stamp-start.log"
$backendLog = Join-Path $logDir "$stamp-backend.log"
$frontendLog = Join-Path $logDir "$stamp-frontend.log"
Start-Transcript -Path $startLog | Out-Null

function Get-ListeningPids([int]$port) {
    try {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique |
            Where-Object { $_ -gt 0 }
    } catch {
        @()
    }
}

function Free-Port([int]$port) {
    $pids = @(Get-ListeningPids $port)
    if ($pids.Count -eq 0) {
        Write-Host "ポート $port は空いています"
        return
    }
    foreach ($procId in $pids) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        Write-Host "ポート $port を使っているプロセスを停止します: $($proc.ProcessName) (PID $procId)"
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    for ($i = 0; $i -lt 20; $i++) {
        if (-not (Get-ListeningPids $port)) {
            Write-Host "ポート $port が空きました"
            return
        }
        Start-Sleep -Milliseconds 500
    }
    Fail "ポート $port" "ポート $port を空けられませんでした。別のポートでは起動しません。" $null
}

function Wait-Http([string]$url, [int]$seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { return $true }
        } catch { }
        Start-Sleep 2
    }
    return $false
}

function Explain([string]$text) {
    $hints = @(
        @{ p = '認識されていません|is not recognized'; m = 'コマンド（gradlew.bat / npm など）が見つかりません。起動したフォルダか PATH を確認してください' },
        @{ p = 'already in use|EADDRINUSE'; m = 'ポートがまだ別のプロセスに使われています' },
        @{ p = 'Connection refused|Connection to localhost:5433'; m = 'データベース（Docker の 5433）につながりません。Docker と DB コンテナを確認してください' },
        @{ p = 'password authentication failed'; m = 'データベースのユーザー名かパスワードが違います（application.yml）' },
        @{ p = 'JAVA_HOME|java.*(not recognized|見つかりません)'; m = 'Java が見つかりません' },
        @{ p = "npm.*(not recognized|見つかりません)|'npm'"; m = 'npm（Node.js）が見つかりません' },
        @{ p = 'Cannot find module|ERR_MODULE_NOT_FOUND'; m = 'フロントの部品が足りません。frontend で npm install を実行してください' },
        @{ p = 'BUILD FAILED|COMPILATION ERROR|error:'; m = 'バックエンドのビルド（コンパイル）に失敗しています' }
    )
    $found = @()
    foreach ($h in $hints) { if ($text -match $h.p) { $found += $h.m } }
    if ($found.Count -eq 0) { $found = @('ログから原因を特定できませんでした。上のログ末尾を確認してください') }
    return $found
}

function Fail([string]$what, [string]$message, [string]$log) {
    Write-Host ""
    Write-Host "===== 起動失敗: $what ====="
    Write-Host $message
    if ($log -and (Test-Path $log)) {
        Write-Host "ログ: $log"
        Write-Host "----- ログ末尾 30 行 -----"
        # cmd のメッセージは Shift-JIS、Java/Node の出力は UTF-8 のことが多いので、文字化けの少ない方で読む
        $bytes = [IO.File]::ReadAllBytes($log)
        $utf8 = [Text.Encoding]::UTF8.GetString($bytes)
        $text = if ($utf8.Contains([char]0xFFFD)) { [Text.Encoding]::GetEncoding(932).GetString($bytes) } else { $utf8 }
        ($text -split "`r?`n" | Select-Object -Last 30) | ForEach-Object { Write-Host $_ }
        Write-Host "----- 考えられる原因 -----"
        Explain $text | ForEach-Object { Write-Host "・$_" }
    }
    Write-Host "スクリプトの記録: $startLog"
    Stop-Transcript | Out-Null
    exit 1
}

# 1. Docker と DB（5433）
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Desktop を起動します..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    for ($i = 0; $i -lt 60; $i++) {
        docker info *> $null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep 3
    }
    if ($LASTEXITCODE -ne 0) { Fail "DB" "Docker Desktop が起動しませんでした。" $null }
}
Push-Location $root
cmd /c "docker compose up -d 2>&1" | ForEach-Object { Write-Host $_ }
$dbExit = $LASTEXITCODE
Pop-Location
if ($dbExit -ne 0) { Fail "DB (5433)" "docker compose up -d に失敗しました。" $null }
Write-Host "DB (5433): 起動を指示しました"

# 2. ポートを空ける
Free-Port 8080
Free-Port 5173

# 3. 起動（画面は出さず、出力をログに残す）
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
Start-Process -FilePath "cmd.exe" -WindowStyle Hidden -WorkingDirectory $backendDir `
    -ArgumentList "/c", "cd /d `"$backendDir`" && .\gradlew.bat bootRun > `"$backendLog`" 2>&1"
Write-Host "API を起動しました。ログ: $backendLog"
Start-Process -FilePath "cmd.exe" -WindowStyle Hidden -WorkingDirectory $frontendDir `
    -ArgumentList "/c", "cd /d `"$frontendDir`" && npm run dev > `"$frontendLog`" 2>&1"
Write-Host "画面を起動しました。ログ: $frontendLog"

# 4. 起動の確認
if (-not (Wait-Http "http://localhost:8080/api/tasks" 120)) {
    Fail "API (8080)" "120 秒待っても http://localhost:8080/api/tasks が応答しません。" $backendLog
}
Write-Host "API  (8080): OK"
if (-not (Wait-Http "http://localhost:5173/" 30)) {
    Fail "画面 (5173)" "30 秒待っても http://localhost:5173/ が応答しません。" $frontendLog
}
Write-Host "画面 (5173): OK"
Write-Host "ブラウザで http://localhost:5173 を開いてください。"
Write-Host "スクリプトの記録: $startLog"
Stop-Transcript | Out-Null
exit 0
