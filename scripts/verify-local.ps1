param(
  [string]$BaseUrl = "http://127.0.0.1:4000",
  [string]$ApiUrl = "http://127.0.0.1:4010"
)

$ErrorActionPreference = "Stop"

function Test-Endpoint {
  param(
    [string]$Name,
    [string]$Url,
    [int[]]$ExpectedStatus
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
    $status = [int]$response.StatusCode
  } catch {
    if (-not $_.Exception.Response) {
      throw
    }
    $status = [int]$_.Exception.Response.StatusCode
  }

  if ($ExpectedStatus -notcontains $status) {
    throw "$Name returned HTTP $status"
  }

  Write-Output "$Name OK ($status)"
}

Test-Endpoint -Name "Frontend" -Url $BaseUrl -ExpectedStatus @(200)
Test-Endpoint -Name "API health" -Url "$ApiUrl/health" -ExpectedStatus @(200)
Test-Endpoint -Name "Session guard" -Url "$ApiUrl/api/state" -ExpectedStatus @(401)
