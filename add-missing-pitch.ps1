Write-Output "Adding missing pitch 6855847..."

# The missing pitch data
$newPitch = @{
    id = "6855847"
    title = "Create an easier way to have ""vanishing tips"""
    details = @{
        problem = "As a physician builder for my specialty, I want to provide hints, tips, or other types of information that show up in a note when it is being edited, but disappear when the note is signed to not clutter the note. I can use an optional SmartList, but there are a number of issues with this: The SmartLinks I want to pull in sometimes include colons in the text which prevents signing the note. My analysts tell me there are issues with my build when they try to move it to production using Data Courier when I use a colon in the text where Data Courier finds the wrong SmartList or doesn't update the optional SmartList's record ID correctly."
        ideaForSolution = "If Epic created a new way to adding disappearing help text to a note that would allow me, and the analysts that help me, be more efficient."
        characteristics = "SmartSection!"
        whyNow = "Questions about this come up every couple weeks which means it happens more frequently and aren't getting reported to the development team."
        maintenance = "Overall improvement."
        internCandidate = $false
    }
}

# Read the existing JSON file
$jsonContent = Get-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Raw
$pitches = $jsonContent | ConvertFrom-Json

# Check if this ID already exists
$existingPitch = $pitches | Where-Object { $_.id -eq $newPitch.id }
if ($existingPitch) {
    Write-Output "Pitch with ID $($newPitch.id) already exists in the file."
    exit
}

# Add the new pitch to the array
$pitches += [PSCustomObject]$newPitch

# Convert back to JSON with proper formatting
$newJson = ConvertTo-Json -InputObject $pitches -Depth 10

# Save the updated JSON
$newJson | Set-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Encoding UTF8

Write-Output "Added missing pitch with ID 6855847. Total pitches now: $($pitches.Count)"
