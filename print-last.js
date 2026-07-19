const fs = require('fs');
const lines = fs.readFileSync('braces.txt', 'utf8').split('\n');
console.log(lines.slice(-150).join('\n'));
