const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'public');
const files = ['index.html', 'styles.css', 'app.js', 'db.js', 'employer.js'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'employers'), { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(out, file));
fs.copyFileSync(path.join(root, 'employers', 'index.html'), path.join(out, 'employers', 'index.html'));

fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n');
console.log(`SponsorAtlas build complete: ${files.length + 2} static files written to ${out}`);