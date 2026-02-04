Write-Output "Analyzing and removing duplicates from pitches.json..."

# Read the existing JSON file
$jsonContent = Get-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Raw
$pitches = $jsonContent | ConvertFrom-Json

# Before stats
$originalCount = $pitches.Count
Write-Output "Original pitch count: $originalCount"

# Get IDs and find duplicates
$ids = $pitches | ForEach-Object { $_.id }
$duplicateIds = $ids | Group-Object | Where-Object { $_.Count -gt 1 } | Select-Object -ExpandProperty Name

if ($duplicateIds) {
    Write-Output "`nDuplicate IDs found:"
    foreach ($id in $duplicateIds) {
        $count = ($ids | Where-Object { $_ -eq $id }).Count
        Write-Output "ID $id appears $count times"
    }
}
else {
    Write-Output "`nNo duplicate IDs found."
}

# Keep only the first instance of each ID
$uniquePitches = @()
$seenIds = @{}

foreach ($pitch in $pitches) {
    $id = $pitch.id
    if (-not $seenIds.ContainsKey($id)) {
        $uniquePitches += $pitch
        $seenIds[$id] = $true
    }
}

# After stats
$removedCount = $originalCount - $uniquePitches.Count
Write-Output "`nAfter removing duplicates: $($uniquePitches.Count) pitches"
Write-Output "Removed $removedCount duplicates"

if ($removedCount -gt 0) {
    # Convert back to JSON with proper formatting
    $newJson = ConvertTo-Json -InputObject $uniquePitches -Depth 10

    # Save the updated JSON
    $newJson | Set-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Encoding UTF8
    Write-Output "`nDuplicates have been removed. Updated file saved."
}
else {
    Write-Output "`nNo changes were made to the file as no duplicates were found."
}
