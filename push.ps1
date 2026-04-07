$ErrorActionPreference = 'Stop'
$token = "YOUR_GITHUB_TOKEN"

try {
    $headers = @{
        "Authorization" = "token $token"
        "Accept" = "application/vnd.github.v3+json"
    }

    $body = @{
        name = "minish-beauty-salon"
        private = $false
    } | ConvertTo-Json

    try {
        Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
        Write-Host "Repo created on GitHub."
    } catch {
        Write-Host "Repo already exists or failed to create."
    }

    git init
    git branch -M main
    
    # Remove existing origin if needed
    try { git remote remove origin 2>$null } catch {}
    
    git remote add origin "https://stayawayfromnatty:$token@github.com/stayawayfromnatty/minish-beauty-salon.git"
    
    git add .
    try { git commit -m "Upload POS App" } catch {}
    git push -u origin main
    
    Write-Host "SUCCESS! Deployment finished."
} catch {
    Write-Host "Error occurred:"
    Write-Host $_
}
