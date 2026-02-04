# List of IDs from the provided list
$expectedIds = @(
    "709400", "803923", "3401552", "3450155", "3752427", 
    "4320574", "5027515", "5094667", "6246577", "7446923", 
    "7557419", "7691740", "7882764", "7914897", "7936231", 
    "7963351", "7974971", "7983072", "7983256", "7987855", 
    "7987877", "7989552", "7992270", "7992394", "7993986", 
    "8033379", "8051800", "8062765", "8066648", "8069508", 
    "8076785", "8078994", "8079609", "8082575", "8085038", 
    "8098258", "8100957", "8101556", "8101802", "8103394", 
    "8103427", "8103446", "8103527", "8103951", "8105838", 
    "8105976", "8107064", "8107734", "8107786", "8107804", 
    "8107845", "8109595"
)

# Read the existing JSON file
$jsonContent = Get-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Raw
$pitches = $jsonContent | ConvertFrom-Json

# Extract the IDs from the JSON file
$actualIds = $pitches | ForEach-Object { $_.id }

# Find missing IDs
$missingIds = $expectedIds | Where-Object { $_ -notin $actualIds }

Write-Output "Total expected IDs: $($expectedIds.Count)"
Write-Output "Total actual IDs in JSON: $($actualIds.Count)"

if ($missingIds) {
    Write-Output "`nMissing IDs in the JSON file:"
    foreach ($id in $missingIds) {
        Write-Output "ID $id is missing"
    }
} else {
    Write-Output "`nAll expected IDs are present in the JSON file"
}

# Check if there are any IDs in the JSON that aren't in our expected list
$extraIds = $actualIds | Where-Object { $_ -notin $expectedIds }
if ($extraIds) {
    Write-Output "`nExtra IDs in the JSON file that weren't in your list:"
    foreach ($id in $extraIds) {
        Write-Output "ID $id is extra"
    }
}
