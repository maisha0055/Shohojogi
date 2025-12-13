# Fixing "EADDRINUSE: address already in use" Error

## Quick Fix

### Method 1: Kill the process using the port (Windows PowerShell)
```powershell
# Find and kill process on port 5050
$port = 5050
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess
if ($process) { Stop-Process -Id $process -Force; Write-Host "Process killed" }
```

Or use the provided script:
```powershell
cd backend
.\kill_port.ps1
```

### Method 2: Change the port
Edit `backend/.env` and change:
```
PORT=5050
```
to:
```
PORT=5051
```
(or any other available port)

### Method 3: Find and kill manually
1. Open Task Manager (Ctrl+Shift+Esc)
2. Go to "Details" tab
3. Find `node.exe` processes
4. End the one using port 5050

## Prevention

### Always stop the server properly:
- Press `Ctrl+C` in the terminal where the server is running
- Or use: `npm run stop` (if configured)

### Check before starting:
```powershell
# Check if port is in use
Get-NetTCPConnection -LocalPort 5050 -ErrorAction SilentlyContinue
```

## Why This Happens

- Server wasn't stopped properly (closed terminal without Ctrl+C)
- Multiple server instances started
- Another application using the same port
- Previous crash left the process running
