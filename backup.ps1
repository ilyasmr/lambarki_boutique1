# PowerShell Backup Script for Dolibarr Boutique
# This script backs up the PostgreSQL database to JSON, copies the site source code,
# zips them together, and keeps only the latest 7 backups.

$ErrorActionPreference = "Stop"

# Define directories
$ProjectDir = "C:\Users\PRO\Downloads\dolibarr-boutique"
$BackupDir = "$ProjectDir\backups"
$TempDir = "$BackupDir\temp"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$ZipFile = "$BackupDir\backup_$Timestamp.zip"

Write-Output "Starting backup process..."

# 1. Create backups directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Output "Created backups directory."
}

# Clean any existing temp directory
if (Test-Path $TempDir) {
    Remove-Item -Path $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# 2. Copy source files (excluding heavy directories)
Write-Output "Staging files for backup..."
Get-ChildItem -Path $ProjectDir | Where-Object {
    $_.Name -notin "node_modules", "dist", ".git", "backups"
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $TempDir -Recurse -Force
}

# 3. Perform database JSON backup inside temp directory
Write-Output "Querying and exporting database tables..."
node "$ProjectDir\server\backup-db.js" "$TempDir\db_backup.json"

# 4. Zip the staged files
Write-Output "Compressing backup zip..."
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipFile -Force

# 5. Clean up temp folder
Remove-Item -Path $TempDir -Recurse -Force
Write-Output "Cleaned up temporary files."

# 6. Keep only the last 7 backups
Write-Output "Checking and cleaning up older backups (keeping last 7)..."
$OldBackups = Get-ChildItem -Path $BackupDir -Filter *.zip | 
              Sort-Object LastWriteTime -Descending | 
              Select-Object -Skip 7

foreach ($old in $OldBackups) {
    Remove-Item -Path $old.FullName -Force
    Write-Output "Removed old backup: $($old.Name)"
}

Write-Output "Backup completed successfully!"
Write-Output "File saved to: $ZipFile"
