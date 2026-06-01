# Publica o projeto em: https://github.com/marcosvrca/sistemadegestao-vendas-financeiro
# Execute no PowerShell, na pasta recanto-da-fe:
#   .\publicar-github.ps1

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/marcosvrca/sistemadegestao-vendas-financeiro.git"

function Get-GitExe {
    $candidates = @(
        "git",
        "$env:ProgramFiles\Git\bin\git.exe",
        "${env:ProgramFiles(x86)}\Git\bin\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\bin\git.exe"
    )
    foreach ($c in $candidates) {
        if ($c -eq "git") {
            $cmd = Get-Command git -ErrorAction SilentlyContinue
            if ($cmd) { return $cmd.Source }
        } elseif (Test-Path $c) {
            return $c
        }
    }
    return $null
}

$git = Get-GitExe
if (-not $git) {
    Write-Host "Git nao encontrado. Instale: https://git-scm.com/download/win" -ForegroundColor Red
    Write-Host "Ou: winget install Git.Git" -ForegroundColor Yellow
    exit 1
}

Set-Location $PSScriptRoot

if (-not (Test-Path ".git")) {
    & $git init
    & $git branch -M main
}

$remotes = & $git remote 2>$null
if ($remotes -notcontains "origin") {
    & $git remote add origin $RepoUrl
} else {
    & $git remote set-url origin $RepoUrl
}

& $git add -A
$status = & $git status --porcelain
if (-not $status) {
    Write-Host "Nada novo para commitar." -ForegroundColor Yellow
} else {
    & $git commit -m "Sistema de gestao: vendas, estoque, financeiro e cadastros"
}

Write-Host "Enviando para GitHub..." -ForegroundColor Cyan
& $git push -u origin main

Write-Host "Concluido: $RepoUrl" -ForegroundColor Green
