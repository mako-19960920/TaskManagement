# 画面の E2E テスト（Playwright）を、E2E 用のデータベースで動かす。
#   1. E2E 用のデータベース（taskboard_e2e）を作り直す（初期データ6件だけの状態にする）
#   2. API をそのデータベースにつないで、決められたポート（8080・5173）で起動する（start-servers.ps1）
#   3. E2E テストを動かす（frontend で npx playwright test）
#   4. 最後に、いつものデータベース（taskboard）で起動し直す（テストが失敗しても必ず行う）
# いつものデータベースのデータは書き換えない。
# 使い方（TaskManagement フォルダで）：powershell -ExecutionPolicy Bypass -File scripts\e2e.ps1
# 引数は Playwright に渡す（例：scripts\e2e.ps1 --headed で、ブラウザを見ながら動かす）

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot   # TaskManagement フォルダ
$compose = Join-Path $root "docker-compose.yml"
$startServers = Join-Path $PSScriptRoot "start-servers.ps1"
$e2eDatabase = "taskboard_e2e"

function Invoke-Psql([string]$sql) {
    # docker の出力がエラー扱いにならないように、cmd を通して動かす（start-servers.ps1 と同じ）
    cmd /c "docker compose -f `"$compose`" exec -T db psql -U taskboard -d taskboard -c `"$sql`" 2>&1"
    if ($LASTEXITCODE -ne 0) { throw "データベースの操作に失敗しました: $sql" }
}

$exitCode = 1
try {
    Write-Host "== DB を起動します"
    cmd /c "docker compose -f `"$compose`" up -d --wait 2>&1"
    if ($LASTEXITCODE -ne 0) { throw "DB（Docker）を起動できませんでした。Docker Desktop が動いているか確認してください" }

    Write-Host "== E2E 用のデータベース（$e2eDatabase）を作り直します"
    Invoke-Psql "DROP DATABASE IF EXISTS $e2eDatabase WITH (FORCE)"
    Invoke-Psql "CREATE DATABASE $e2eDatabase"

    Write-Host "== E2E 用のデータベースで、サーバーを起動します"
    $env:DB_URL = "jdbc:postgresql://localhost:5433/$e2eDatabase"
    & $startServers
    if ($LASTEXITCODE -ne 0) { throw "サーバーを起動できませんでした。logs フォルダの新しいログを見てください" }

    Write-Host "== E2E テストを動かします"
    Push-Location (Join-Path $root "frontend")
    try {
        npx playwright test @args
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
} finally {
    Write-Host "== いつものデータベースで、サーバーを起動し直します"
    Remove-Item Env:DB_URL -ErrorAction SilentlyContinue
    & $startServers
}

if ($exitCode -eq 0) {
    Write-Host "E2E テスト: すべて成功しました"
} else {
    Write-Host "E2E テスト: 失敗があります。frontend で npx playwright show-report を打つと、結果と画面の記録を見られます"
}
exit $exitCode
