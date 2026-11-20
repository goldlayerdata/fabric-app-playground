# Runs every query in data/catalog.json against the Contoso model open in Power BI Desktop and
# saves the results to data/snapshots.json, in the shape the Rayfin 2.0 semantic model connector
# returns: { status: 'success', table: { columns: [{ name, dataType }], rows: unknown[][] }, requestId }.
#
#   npm run catalog
#   npm run snapshots                      # finds the open Desktop model by itself
#   pwsh -File tools/snapshot.ps1 -Port 53973
#
# Reads only. The queries use the model's own measures ([Revenue], [# Orders], [# Customers], [Margin %]):
# open examples/default_measures/gold-layer-data-contoso-measures.pbip from gold-layer-examples first.
param(
  [int]$Port = 0,
  [string]$AdomdDll = 'C:\Program Files\Microsoft Power BI Desktop\bin\Microsoft.PowerBI.AdomdClient.dll'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

if ($Port -eq 0) {
  $portFiles = @(
    Get-ChildItem "$env:LOCALAPPDATA\Microsoft\Power BI Desktop\AnalysisServicesWorkspaces\*\Data\msmdsrv.port.txt" -ErrorAction SilentlyContinue
    Get-ChildItem "$env:USERPROFILE\Microsoft\Power BI Desktop Store App\AnalysisServicesWorkspaces\*\Data\msmdsrv.port.txt" -ErrorAction SilentlyContinue
  ) | Sort-Object LastWriteTime -Descending
  if (-not $portFiles) { throw 'No open Power BI Desktop model found. Open gold-layer-data-contoso-measures.pbip, or pass -Port.' }
  $Port = [int]((Get-Content $portFiles[0].FullName -Raw -Encoding Unicode).Trim())
}

Add-Type -Path $AdomdDll
$conn = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection "Data Source=localhost:$Port"
$conn.Open()
Write-Host "connected: localhost:$Port, database $($conn.Database)"

$typeNames = @{
  'System.String' = 'String'; 'System.Int64' = 'Int64'; 'System.Int32' = 'Int64'
  'System.Double' = 'Double'; 'System.Decimal' = 'Decimal'; 'System.DateTime' = 'DateTime'
  'System.Boolean' = 'Boolean'
}

$catalog = Get-Content (Join-Path $root 'data\catalog.json') -Raw | ConvertFrom-Json
$out = [ordered]@{}
foreach ($entry in $catalog.queries) {
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = $entry.query
  if ($entry.expectError) {
    # Saved on purpose: the error text the model returns for this query.
    try { $cmd.ExecuteReader().Close(); throw "expected an error from $($entry.id), but the query ran" }
    catch [Microsoft.AnalysisServices.AdomdClient.AdomdErrorResponseException] {
      $out[$entry.id] = [ordered]@{
        status = 'error'
        error = [ordered]@{ category = 'query'; message = $_.Exception.Message.Trim() }
        requestId = ''
      }
      Write-Host ("{0,-36} error saved" -f $entry.id)
    }
    continue
  }
  $reader = $cmd.ExecuteReader()
  $columns = [System.Collections.Generic.List[object]]::new()
  for ($i = 0; $i -lt $reader.FieldCount; $i++) {
    $t = $reader.GetFieldType($i).FullName
    $columns.Add([ordered]@{ name = $reader.GetName($i); dataType = ($typeNames[$t] ?? $t) })
  }
  $rows = [System.Collections.Generic.List[object]]::new()
  while ($reader.Read()) {
    $row = [object[]]::new($reader.FieldCount)
    for ($i = 0; $i -lt $reader.FieldCount; $i++) {
      $v = $reader.GetValue($i)
      if ($v -is [System.DBNull]) { $v = $null }
      elseif ($v -is [datetime]) { $v = $v.ToString('yyyy-MM-ddTHH:mm:ss') }
      elseif ($v -is [decimal]) { $v = [double]$v }
      $row[$i] = $v
    }
    $rows.Add($row)
  }
  $reader.Close()
  $out[$entry.id] = [ordered]@{
    status = 'success'
    table = [ordered]@{ columns = $columns; rows = $rows }
    requestId = ''
  }
  Write-Host ("{0,-36} {1,3} rows" -f $entry.id, $rows.Count)
}
$conn.Close()

$doc = [ordered]@{
  source = 'Contoso sample model (SQLBI Contoso Data Generator V2, MIT), queried in Power BI Desktop'
  takenAt = (Get-Date).ToString('yyyy-MM-dd')
  snapshots = $out
}
$path = Join-Path $root 'data\snapshots.json'
ConvertTo-Json -InputObject $doc -Depth 12 | Set-Content -Path $path -Encoding utf8NoBOM
Write-Host "saved $($out.Count) snapshots -> $path"
