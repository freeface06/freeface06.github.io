const fs = require('fs');
const path = require('path');

const workspaceDir = path.resolve(__dirname, '../../../../');
const galleryDir = path.join(workspaceDir, 'images/gallery');
const scriptJsPath = path.join(workspaceDir, 'js/script.js');

console.log('🔄 Scanning images/gallery directory...');

if (!fs.existsSync(galleryDir)) {
  console.error(`❌ Gallery directory not found: ${galleryDir}`);
  process.exit(1);
}

const files = fs.readdirSync(galleryDir);
const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov'];

const mediaFiles = files
  .filter(f => {
    const ext = path.extname(f).toLowerCase();
    return validExtensions.includes(ext);
  })
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  .map(f => `images/gallery/${f}`);

console.log(`📸 Found ${mediaFiles.length} media files in images/gallery:`);
mediaFiles.forEach((file, idx) => console.log(`  [${String(idx + 1).padStart(2, '0')}] ${file}`));

if (mediaFiles.length === 0) {
  console.warn('⚠️ No media files found to sync.');
  process.exit(0);
}

// Update js/script.js
if (!fs.existsSync(scriptJsPath)) {
  console.error(`❌ js/script.js not found: ${scriptJsPath}`);
  process.exit(1);
}

let scriptContent = fs.readFileSync(scriptJsPath, 'utf8');

const listRegex = /let\s+galleryMediaList\s*=\s*\[[\s\S]*?\];/;
const formattedList = `let galleryMediaList = [\n` +
  mediaFiles.map(f => `      '${f.replace(/'/g, "\\'")}'`).join(',\n') +
  `\n    ];`;

if (!listRegex.test(scriptContent)) {
  console.error('❌ Could not find galleryMediaList array in js/script.js');
  process.exit(1);
}

scriptContent = scriptContent.replace(listRegex, formattedList);
fs.writeFileSync(scriptJsPath, scriptContent, 'utf8');
console.log('✅ Successfully updated js/script.js with latest gallery media list!');

// Validate JS syntax
try {
  new Function(scriptContent);
  console.log('✅ js/script.js syntax validation passed (0 errors)');
} catch (err) {
  console.error('❌ JS Syntax Error:', err.message);
  process.exit(1);
}

console.log('\n🎉 Gallery Sync Completed Successfully!');
