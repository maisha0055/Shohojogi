# PowerShell script to kill process on port 5050
param(
    [int]$Port = 5050
)

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if ($connections) {
    $connections | ForEach-Object {
        $processId = $_.OwningProcess
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-Host "Stopping process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Yellow
            Stop-Process -Id $processId -Force
            Write-Host "✅ Process stopped" -ForegroundColor Green
        }
    }
} else {
    Write-Host "No process found on port $Port" -ForegroundColor Green
}
