const fs = require('fs');
const path = require('path');

// Mock module for handling static files in Jest
module.exports = function(filename) {
  // For HTML files, return the file content as a string
  if (filename.endsWith('.html')) {
    return fs.readFileSync(filename, 'utf8');
  }
  
  // For CSS files, return empty string
  if (filename.endsWith('.css')) {
    return '';
  }
  
  // For other files, return the filename
  return path.basename(filename);
}; 