import fs from 'fs';
const path = 'dist/index.html';
let html = fs.readFileSync(path, 'utf8');
html = html.replace(/src="\.\/(data\/[^"]+)"/g, 'src="/$1"');
fs.writeFileSync(path, html, 'utf8');
console.log('postbuild: Fixed data paths in dist/index.html');
