import fs from 'fs';
import path from 'path';

const distAssetsDir = 'dist/client/assets';
const publicAssetsDir = 'src/public/assets';
const publicIndexHtml = 'src/public/index.html';

try {
  // 1. Clean public/assets
  if (fs.existsSync(publicAssetsDir)) {
    fs.rmSync(publicAssetsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(publicAssetsDir, { recursive: true });

  // 2. Read dist/client/assets and copy files to src/public/assets
  const files = fs.readdirSync(distAssetsDir);
  let clientJsFile = '';
  let clientCssFile = '';

  for (const file of files) {
    fs.copyFileSync(path.join(distAssetsDir, file), path.join(publicAssetsDir, file));
    if (file.startsWith('index-') && file.endsWith('.js')) {
      clientJsFile = file;
    }
    if (file.startsWith('index-') && file.endsWith('.css')) {
      clientCssFile = file;
    }
  }

  console.log(`Copied ${files.length} assets to ${publicAssetsDir}`);
  console.log(`Main JS: ${clientJsFile}, Main CSS: ${clientCssFile}`);

  // 3. Update src/public/index.html
  if (fs.existsSync(publicIndexHtml)) {
    let html = fs.readFileSync(publicIndexHtml, 'utf8');
    
    // Replace JS script tag src
    if (clientJsFile) {
      html = html.replace(/src="\/assets\/index-[a-zA-Z0-9_-]+\.js"/g, `src="/assets/${clientJsFile}"`);
    }
    
    // Replace CSS link tag href
    if (clientCssFile) {
      html = html.replace(/href="\/assets\/index-[a-zA-Z0-9_-]+\.css"/g, `href="/assets/${clientCssFile}"`);
    }
    
    fs.writeFileSync(publicIndexHtml, html, 'utf8');
    console.log(`Updated ${publicIndexHtml} with new asset hashes.`);
  }
} catch (err) {
  console.error("Postbuild copy failed:", err);
  process.exit(1);
}
