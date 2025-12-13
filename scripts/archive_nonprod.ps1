# Archive non-production top-level files into archive/ and compress
Set-StrictMode -Off
$keep = @('api','ml_service','frontend','core','utils','data','docker-compose.yml','Dockerfile','api/Dockerfile','ml_service/Dockerfile','requirements.txt','README.md','openapi.yaml','main.py','run_server.py','server_control.py','.gitignore','.env','.github','.git','.streamlit','.vscode','archive')
New-Item -ItemType Directory -Path archive -Force | Out-Null
Get-ChildItem -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $name = $_.Name
    if ($keep -contains $name) { Write-Host "Keeping: $name"; return }
    if ($name -eq 'archive') { return }
    if ($name -eq '.git') { Write-Host 'Skipping .git'; return }
    try {
        git ls-files --error-unmatch $name > $null 2>&1
        git mv -f -- $name archive/ 2>$null
        Write-Host "git mv tracked: $name"
    } catch {
        try {
            Move-Item -Force -LiteralPath $name -Destination (Join-Path 'archive' $name) -ErrorAction Stop
            Write-Host "Moved: $name"
        } catch {
            Write-Host "Failed to move: $name - $_"
        }
    }
}
# Stage changes
git add -A
if (git status --porcelain) {
    git commit -m 'chore: archive non-production files'
    git push origin main
} else {
    Write-Host 'No changes to commit'
}
# Compress archive
$ts = (Get-Date -Format yyyyMMdd_HHmmss)
if (Test-Path archive) {
    tar -czf "archive/archived_all_$ts.tar.gz" -C archive .
    Write-Host "Created: archive/archived_all_$ts.tar.gz"
}
# List archive summary
Get-ChildItem -Path archive -File | Sort-Object Length -Descending | Select-Object Name,@{Name='MB';Expression={[math]::Round($_.Length/1MB,2)}} | Format-Table -AutoSize
