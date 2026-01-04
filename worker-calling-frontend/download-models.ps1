# Download Face-API Models Script
# Run this script from the worker-calling-frontend directory

Write-Host "🔄 Downloading face-api.js models..." -ForegroundColor Cyan
Write-Host ""

$modelsDir = "public\models"
$baseUrl = "https://raw.githubusercontent.com/vladmandic/face-api/master/model"

# Create models directory if it doesn't exist
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
    Write-Host "✅ Created directory: $modelsDir" -ForegroundColor Green
}

$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1"
)

$successCount = 0
$failCount = 0

foreach ($file in $files) {
    $url = "$baseUrl/$file"
    $filepath = "$modelsDir\$file"
    
    try {
        Write-Host "Downloading: $file..." -NoNewline
        Invoke-WebRequest -Uri $url -OutFile $filepath -ErrorAction Stop
        Write-Host " ✅" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host " ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
if ($successCount -eq $files.Count) {
    Write-Host "✅ All models downloaded successfully!" -ForegroundColor Green
    Write-Host "📁 Location: $modelsDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 You can now use face verification!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some downloads failed. Please try again or download manually." -ForegroundColor Yellow
    Write-Host "Manual download: https://github.com/vladmandic/face-api/tree/master/model" -ForegroundColor Cyan
}


