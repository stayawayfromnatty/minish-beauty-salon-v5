$ErrorActionPreference = 'Stop'

try {
    Write-Host "Creating GitHub Repository..."
    $headers = @{
        "Authorization" = "token YOUR_GITHUB_TOKEN"
        "Accept" = "application/vnd.github.v3+json"
    }
    $body = @{
        "name" = "minish-beauty-salon"
        "private" = $false
    } | ConvertTo-Json

    # Ignore if it already exists
    try {
        Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
    } catch {
        Write-Host "Repo might already exist, continuing..."
    }

    Write-Host "Initializing Git..."
    git init
    git config user.name "stayawayfromnatty"
    git config user.email "stayawayfromnatty@users.noreply.github.com"
    
    Write-Host "Adding files..."
    git add .
    
    Write-Host "Committing..."
    git commit -m "Initial commit of Minish Beauty Salon POS System (V4)"
    
    Write-Host "Setting up branch and remote..."
    git branch -M main
    
    # Remove origin if it exists just in case
    git remote remove origin 2>$null
    git remote add origin https://stayawayfromnatty:YOUR_GITHUB_TOKEN@github.com/stayawayfromnatty/minish-beauty-salon.git
    
    Write-Host "Pushing to GitHub..."
    git push -u origin main
    
    Write-Host "SUCCESS! All files uploaded to GitHub."
} catch {
    Write-Error $_
}
