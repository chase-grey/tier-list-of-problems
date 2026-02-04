$jsonContent = Get-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Raw
$pitches = $jsonContent | ConvertFrom-Json

Write-Output "Total pitches: $($pitches.Count)"

# Extract all IDs and sort them
$ids = $pitches | ForEach-Object { $_.id } | Sort-Object

Write-Output "`nAll IDs in order:"
$ids | ForEach-Object { Write-Output $_ }

# Find duplicates
$duplicates = $ids | Group-Object | Where-Object { $_.Count -gt 1 }

if ($duplicates) {
    Write-Output "`nDuplicates found:"
    $duplicates | ForEach-Object { Write-Output "ID $($_.Name) appears $($_.Count) times" }
} else {
    Write-Output "`nNo duplicates found."
}
