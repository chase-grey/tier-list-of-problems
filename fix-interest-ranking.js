const fs = require('fs');

// Read the file content
const filePath = 'c:/EpicSource/Projects/tier-list-of-problems/src/components/InterestRanking/InterestRanking.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace line 237
content = content.replace('          onUpdateVote(draggableId, updatedVote);', '          handleUpdateVote(draggableId, updatedVote);');

// Replace line 304
content = content.replace('          onUpdateVote(draggableId, updatedVote);', '          handleUpdateVote(draggableId, updatedVote);');

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('File updated successfully');
