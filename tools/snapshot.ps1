# Runs every query in data/catalog.json against the model its `connector` names, each open in its own
# Power BI Desktop, and saves the results to data/snapshots.json, in the shape the Rayfin 2.0 semantic
# model connector returns: { status: 'success', table: { columns: [{ name, dataType }], rows: unknown[][] }, requestId }.
#
#   npm run catalog
#   npm run snapshots -- -ContosoPort 62108 -ParetoPort 49660
#
# Reads only. Open both models from gold-layer-examples first, each in its own Desktop window:
#   contoso = examples/default_measures/gold-layer-data-contoso-measures.pbip ([Revenue], [# Orders], [# Customers], [Margin %])
#   pareto  = examples/pareto/gold-layer-data-pareto.pbip (the same tables, with Pareto measures)
# Each Desktop's port is in its AnalysisServicesWorkspaces\*\Data\msmdsrv.port.txt.
param(
  [Parameter(Mandatory)][int]$ContosoPort,
  [Parameter(Mandatory)][int]$ParetoPort,
  [string]$AdomdDll = 'C:\Program Files\Microsoft Power BI Desktop\bin\Microsoft.PowerBI.AdomdClient.dll'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Add-Type -Path $AdomdDll
$conns = @{}
foreach ($pair in @(@('contoso', $ContosoPort), @('pareto', $ParetoPort))) {
  $c = New-Object Microsoft.AnalysisServices.AdomdClient.AdomdConnection "Data Source=localhost:$($pair[1])"
  $c.Open()
  Write-Host "connected: $($pair[0]) = localhost:$($pair[1]), database $($c.Database)"
  $conns[$pair[0]] = $c
}

$typeNames = @{
  'System.String' = 'String'; 'System.Int64' = 'Int64'; 'System.Int32' = 'Int64'
  'System.Double' = 'Double'; 'System.Decimal' = 'Decimal'; 'System.DateTime' = 'DateTime'
  'System.Boolean' = 'Boolean'
}

$catalog = Get-Content (Join-Path $root 'data\catalog.json') -Raw | ConvertFrom-Json
$out = [ordered]@{}
foreach ($entry in $catalog.queries) {
  $cmd = $conns[$entry.connector].CreateCommand()
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
      Write-Host ("{0,-36} {1,-8} error saved" -f $entry.id, $entry.connector)
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
  Write-Host ("{0,-36} {1,-8} {2,3} rows" -f $entry.id, $entry.connector, $rows.Count)
}
foreach ($c in $conns.Values) { $c.Close() }

$doc = [ordered]@{
  source = 'Contoso sample model (SQLBI Contoso Data Generator V2, MIT), queried in Power BI Desktop: contoso = gold-layer-data-contoso-measures.pbip, pareto = gold-layer-data-pareto.pbip'
  takenAt = (Get-Date).ToString('yyyy-MM-dd')
  snapshots = $out
}
$path = Join-Path $root 'data\snapshots.json'
ConvertTo-Json -InputObject $doc -Depth 12 | Set-Content -Path $path -Encoding utf8NoBOM
Write-Host "saved $($out.Count) snapshots -> $path"
