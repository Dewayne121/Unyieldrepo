/**
 * Remove dark backgrounds from rank icons to make them transparent
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const RANKS_DIR = path.join(__dirname, '../assets/ranks');

const RANK_FILES = [
  'rank_bronze.png',
  'rank_silver.png',
  'rank_gold.png',
  'rank_platinum.png',
  'rank_diamond.png',
  'rank_champion.png',
  'rank_unyield.png',
];

/**
 * Remove dark/near-black background from an image
 * Makes pixels with low brightness transparent
 */
async function removeBackground(inputPath, outputPath) {
  try {
    const { data, info } = await sharp(inputPath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const buffer = Buffer.alloc(data.length);

    // Threshold for considering a pixel "dark enough" to be background
    const brightnessThreshold = 30;

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels > 3 ? data[i + 3] : 255;

      // Calculate perceived brightness
      const brightness = (r * 299 + g * 587 + b * 1000) / 1000;

      // If pixel is very dark and doesn't have high color saturation, make it transparent
      // Also check if it's close to black/gray (low saturation)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;

      const isDark = brightness < brightnessThreshold;
      const isLowSaturation = saturation < 20;

      if (isDark && isLowSaturation) {
        // Make transparent
        buffer[i] = r;
        buffer[i + 1] = g;
        buffer[i + 2] = b;
        buffer[i + 3] = 0; // Alpha = 0 (transparent)
      } else if (brightness < 50 && saturation < 40) {
        // Semi-transparent for dark midtones
        buffer[i] = r;
        buffer[i + 1] = g;
        buffer[i + 2] = b;
        buffer[i + 3] = Math.floor((brightness / 50) * a); // Fade based on brightness
      } else {
        // Keep original
        buffer[i] = r;
        buffer[i + 1] = g;
        buffer[i + 2] = b;
        buffer[i + 3] = a;
      }
    }

    await sharp(buffer, {
      raw: {
        width,
        height,
        channels: 4,
      },
    })
      .png()
      .toFile(outputPath);

    console.log(`✅ Processed: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${inputPath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🎨 Removing backgrounds from rank icons...\n');

  // Create backup directory
  const backupDir = path.join(RANKS_DIR, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const results = [];

  for (const filename of RANK_FILES) {
    const inputPath = path.join(RANKS_DIR, filename);
    const backupPath = path.join(backupDir, filename);
    const tempPath = path.join(RANKS_DIR, `temp_${filename}`);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  File not found: ${filename}`);
      results.push({ file: filename, success: false });
      continue;
    }

    // Backup original
    try {
      fs.copyFileSync(inputPath, backupPath);
      console.log(`📦 Backed up: ${filename}`);
    } catch (error) {
      console.log(`⚠️  Could not backup: ${filename}`);
    }

    // Remove background to temp file
    const success = await removeBackground(inputPath, tempPath);

    if (success) {
      // Replace original with processed file (delete original, then rename temp)
      try {
        fs.unlinkSync(inputPath);
        fs.renameSync(tempPath, inputPath);
        console.log(`✅ Replaced: ${filename}`);
      } catch (error) {
        console.log(`⚠️  Could not replace: ${filename} - ${error.message}`);
        results.push({ file: filename, success: false });
        // Clean up temp file
        try {
          fs.unlinkSync(tempPath);
        } catch (e) {}
        continue;
      }
    }

    results.push({ file: filename, success });
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  console.log(`✅ Successfully processed: ${successful}/${RANK_FILES.length}`);
  console.log(`📦 Backups saved to: assets/ranks/backup/`);
  console.log('='.repeat(60));
}

main().catch(console.error);
