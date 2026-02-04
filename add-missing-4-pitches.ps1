# Create objects for the 4 missing pitches
$newPitches = @(
    @{
        id = "8079609"
        title = "ST / Generative AI / Text Actions / Text assistant is disabled on certain types of content"
        details = @{
            problem = "When users use the text assistant, they sometimes see that the text assistant is disabled when they highlight certain types of content. This includes refreshable SmartLinks, SmartSections, sectioning SmartLinks, and SmartBlocks. This has been confusing and frustrating to end users. I've heard that it feels like the tool is unreliable for them since they can't count on it always being available. There are also valid use cases, like acting on an entire note, that get blocked and it may not be intuitive why this is."
            ideaForSolution = "Users always have access to the text assistant and never see that it's disabled."
            characteristics = "The system has reasonable defaults on what to do in all situations. Users can easily undo to go back to the previous state if the system reacted in an undesired way. We avoid harmful unintended impacts, such as deleting refreshability unnecessarily or breaking links elsewhere in the chart (like with DAN)"
            whyNow = "We're close to turning the text assistant on by default. What I've been hearing is this is a barrier to adoption and unintuitive, since people are struggling to figure out when they can/cannot use the tool."
        }
    },
    @{
        id = "8082575"
        title = "ST / Pitch - Alternate Font Support"
        details = @{
            problem = "Some fonts are not available on all systems. This means that user A may create a document which looks great to them but looks significantly worse to user B who is running on a different platform."
            ideaForSolution = "As a user, I would want to receive a similar experience regardless of whether I am logged-in at work on the standard PCs or from home on my MacBook."
            characteristics = "Due to technical limitations, we may never get to 100% parity in terms of font support, but we should be able to get to a point where we can provide smart alternatives for the most common workflows. The \\falt keyword allows for a given font to specify a \"backup name\" if the original is not found on the system. The goal would be to be able to create a mapping table of (the most common) fonts which users use to similar fonts on other platforms, helping bridge the gap between mutually-exclusive data collections."
            whyNow = "With the recent push for Mac support and the upcoming support for Linux web servers, we are looking more and more at cross-platform compatibility."
            smartToolsFit = "This helps with our accessibility and compatibility concerns, providing a more-similar result regardless of what happens to be installed on the user's system(s) at the time."
            epicFit = "This would help with maintaining quality and avoiding pain points brought about by hardware differences."
            success = "We could gather frequently-used font data from customers to build a shortlist of fonts to accommodate and work on determining appropriate alternatives which would help create cross-platform parity."
            maintenance = "This would be a new concept to keep in mind for maintenance purposes. However, we won't be able to get to every font type out there (as there are millions of possibilities). Given that, we should be able to limit ourselves to just the heavy hitters, limiting the likelihood of future updates (since the same fonts will almost always continue to be at the top of the list)."
            internCandidate = $false
        }
    },
    @{
        id = "8085038"
        title = "ST / May 26 Pitch / AI Text Assistant / AI Text Assistant sometimes creates inaccurate content"
        details = @{
            problem = "When clinicians use the AI Text Assistant to summarize notes that contain content prone to misinterpretation--such as tables of pertinent negatives--the AI Text Assistant sometimes produces prose that contains inaccurate information. See care concern 8041004. This issue was fixed by changing the source content to be clearer, but there is likely other content out there that is similarly confusing to both humans and the model"
            ideaForSolution = "When clinicians use the AI Text Assistant to summarize notes, it is able to parse the data better and give accurate outputs, or perhaps give a confidence indication if it thinks there may be error."
            characteristics = "An established plan of how to handle and priorize errors and further investigation in how to prevent errors broadly."
            whyNow = "Usage of the AITA will continue to expand, especially with tools like templated text actions"
            smartToolsFit = "Software must work -- address existing issues in software"
            epicFit = "Do no harm, continue making progress on the AI Text Assistant as it's one of the starter kit AI features that is quickly being broadly adopted across the Epic community"
            internCandidate = $false
        }
    },
    @{
        id = "8098258"
        title = "ST / Pitch / SmartTool Background Color and Hyperspace Theme Limits"
        details = @{
            problem = "As a Hyperspace user, I want the background color options for the SmartTextBox to be limited to only those that pair well with my chosen Hyperspace theme so that I can maintain a consistent, visually appealing, and accessible experience without accidentally selecting clashing or unreadable color combinations."
            ideaForSolution = "When a user changes their Hyperspace theme, the available SmartTextBox background colors automatically update to a curated set that is visually compatible. (Ex: You can't use a light background color with the dark room theme) Color options consider readability (contrast between text and background) and alignment with the overall theme's design palette. Users are prevented from selecting background colors that would cause poor readability or conflict with the theme. Documentation or a tooltip explains why some background colors may not be available for certain themes."
            characteristics = "Wave 0 (May26) Investigate (Pulsar Search) what Hyperspace theme and SmartTextBox background colors are paired together. Visualize the data (in a graph of some kind?) to help show what end users are doing today. Wave 1 (future version) Provide limits to what background color can be chosen for a particular theme. For example, if you are using the dark room theme you almost certainly don't want to use a light background color in the SmartTextBox. You might however want to use a dark SmartTextBox background color when using one of the darker (ex: Deep Blue) themes though. Probably track the user's background color with light /dark / high contrast (?) themes so switching themes keeps the SmartTextBox color preference. Maybe provide a way to easily toggle between light and dark backgrounds to allow a builder the ability to preview the SmartTool in a different background color."
            whyNow = "Color handling is challenging and a frequent source of issues, especially with copy/paste and color changing workflows. End users will rarely do this though."
            smartToolsFit = "Software Must Work"
            epicFit = "Software must work, maintain high quality. Preventative quality improvements, such as automated testing and refactoring"
            success = "Initial wave should be a smaller investigation project to see what color/theme combinations are used today."
            maintenance = "None"
            internCandidate = $false
        }
    }
)

# Read the existing JSON file
$jsonContent = Get-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Raw
$pitches = $jsonContent | ConvertFrom-Json

# Check for existing IDs and add missing ones
$addedCount = 0
foreach ($newPitch in $newPitches) {
    # Check if pitch already exists
    $existingPitch = $pitches | Where-Object { $_.id -eq $newPitch.id }
    
    if (!$existingPitch) {
        # Add this pitch
        $pitches += [PSCustomObject]$newPitch
        $addedCount++
        Write-Output "Added pitch with ID: $($newPitch.id)"
    } else {
        Write-Output "Pitch with ID: $($newPitch.id) already exists, skipping"
    }
}

# Convert back to JSON with proper formatting
$newJson = ConvertTo-Json -InputObject $pitches -Depth 10

# Save the updated JSON
$newJson | Set-Content -Path "c:\EpicSource\tier-list-of-problems\src\assets\pitches.json" -Encoding UTF8

Write-Output "`nAdded $addedCount new pitches. Total pitches now: $($pitches.Count)"
