const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const source = path.join(__dirname, '../public/logo-source.png');
const destDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (!fs.existsSync(source)) {
  console.error('Source icon not found at ' + source);
  process.exit(1);
}

const promises = sizes.map(size => {
  return sharp(source)
    .resize(size, size)
    .toFile(path.join(destDir, `icon-${size}x${size}.png`))
    .then(() => console.log(`Generated ${size}x${size} icon`))
    .catch(err => console.error(`Error generating ${size}x${size} icon:`, err));
});

Promise.all(promises).then(() => {
  console.log('All icons generated successfully!');
});
