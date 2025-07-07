// Simple development server script
const fs = require('fs');
const http = require('http');
const path = require('path');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request for ${req.url}`);
  
  // Handle base path
  let filePath = req.url;
  if (filePath === '/') {
    filePath = '/dev.html';
  } else if (filePath.startsWith('/tier-list-of-problems/')) {
    // Fix the path issue by removing the prefix
    filePath = filePath.replace('/tier-list-of-problems/', '/');
  }
  
  // Map the URL to a file path
  filePath = path.join(__dirname, filePath);
  
  // Set content type based on file extension
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  
  switch (extname) {
    case '.js':
    case '.jsx':
    case '.ts':
    case '.tsx':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpg';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
  }
  
  // Read the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found - try to find it in src directory
        console.log(`File not found: ${filePath}`);
        
        // If it's a source file we couldn't find, try the src directory
        if (filePath.includes('.js') || filePath.includes('.ts') || filePath.includes('.jsx') || filePath.includes('.tsx')) {
          const srcPath = path.join(__dirname, 'src', path.basename(filePath));
          console.log(`Trying src directory: ${srcPath}`);
          
          fs.readFile(srcPath, (err2, content2) => {
            if (err2) {
              res.writeHead(404);
              res.end('File not found');
              console.log(`File still not found in src: ${srcPath}`);
              return;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content2, 'utf-8');
          });
        } else {
          res.writeHead(404);
          res.end('File not found');
        }
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // File found, serve it
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('This is a minimal development server to fix the path issues.');
  console.log('Press Ctrl+C to stop the server');
});
