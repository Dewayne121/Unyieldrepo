/**
 * Generate Rank Icons using Together.ai Image-to-Image
 * API Reference: https://docs.together.ai/docs/image-generation
 */

const fs = require('fs');
const path = require('path');

// API Configuration
const API_KEY = '134f4ae20b1869f1c7dde35d3028cb104e1fa55ad27b3955d3c7894c06c535b6';
const API_URL = 'https://api.together.xyz/v1/images/generations';

// Reference image path
const REFERENCE_IMAGE = path.join(__dirname, '../assets/capture.png');

// Rank definitions with prompts
const RANKS = [
  {
    name: 'bronze',
    displayName: 'Bronze',
    prompt: 'Glossy embossed 3D bronze metal crest shield badge, beveled edges with ornate laurel filigree engravings, premium loot finish, warm bronze copper tones with specular reflections and subtle bloom, high-contrast cinematic lighting with strong rim light, polished reflective materials, dark cosmic gradient backdrop with smooth glow, clean sharp silhouette, ultra-detailed engraved trim, AAA mobile game badge style, esports rank icon, 4k detail, centered on solid black background',
    xp: 0
  },
  {
    name: 'silver',
    displayName: 'Silver',
    prompt: 'Glossy embossed 3D sterling silver metal crest shield badge, beveled edges with ornate laurel filigree engravings, premium loot finish, cool steel silver tones with specular reflections and subtle bloom, high-contrast cinematic lighting with strong rim light, polished reflective materials, dark cosmic gradient backdrop with smooth glow, clean sharp silhouette, ultra-detailed engraved trim, AAA mobile game badge style, esports rank icon, 4k detail, centered on solid black background',
    xp: 100
  },
  {
    name: 'gold',
    displayName: 'Gold',
    prompt: 'Glossy embossed 3D gold metal crest shield badge, beveled edges with ornate laurel filigree engravings, premium loot finish, rich warm gold tones with specular reflections and subtle bloom, high-contrast cinematic lighting with strong rim light, polished reflective materials, dark cosmic gradient backdrop with smooth glow, clean sharp silhouette, ultra-detailed engraved trim, AAA mobile game badge style, esports rank icon, 4k detail, centered on solid black background',
    xp: 500
  },
  {
    name: 'platinum',
    displayName: 'Platinum',
    prompt: 'Glossy embossed 3D platinum white-gold metal crest shield badge, beveled edges with ornate laurel filigree engravings, premium loot finish, icy platinum tones with electric blue accents, specular reflections and subtle bloom, high-contrast cinematic lighting with strong rim light, polished reflective materials, dark cosmic gradient backdrop with smooth glow, clean sharp silhouette, ultra-detailed engraved trim, AAA mobile game badge style, esports rank icon, 4k detail, centered on solid black background',
    xp: 1000
  },
  {
    name: 'diamond',
    displayName: 'Diamond',
    prompt: 'Glossy embossed 3D diamond crystal crest shield badge, beveled edges with ornate filigree engravings, premium loot finish, brilliant diamond crystal with electric cyan glowing accents, prismatic light refractions with specular reflections and bloom, high-contrast cinematic lighting with strong rim light, polished reflective crystalline materials, dark cosmic nebula gradient backdrop with smooth glow, clean sharp silhouette, ultra-detailed engraved trim, AAA mobile game badge style, esports rank icon, 4k detail, centered on solid black background',
    xp: 2500
  },
  {
    name: 'champion',
    displayName: 'Champion',
    prompt: 'Glossy embossed 3D champion crest shield badge, beveled edges with elaborate ornate laurel wreath filigree, premium loot finish, royal purple and gold hybrid with crimson energy glow accents, specular reflections and subtle bloom, high-contrast cinematic lighting with dramatic rim light, polished reflective materials, dark cosmic nebula gradient backdrop with smooth purple glow, clean sharp silhouette, ultra-detailed engraved trim with crown motif, AAA mobile game badge style, esports rank icon, 4k detail, centered on solid black background',
    xp: 5000
  },
  {
    name: 'unyield',
    displayName: 'UNYIELD',
    prompt: 'Glossy embossed 3D legendary UNYIELD crest shield badge, beveled edges with most elaborate ornate phoenix dragon filigree engravings, premium loot finish, obsidian black diamond with intense crimson red energy glow and crack effects, specular reflections and dramatic bloom, high-contrast cinematic lighting with powerful rim light, polished reflective dark materials with red energy veins, dark cosmic nebula gradient backdrop with intense crimson glow, clean sharp silhouette, ultra-detailed engraved trim with ancient runes, AAA mobile game badge style, ultimate esports rank icon, 4k detail, centered on solid black background',
    xp: 10000
  }
];

/**
 * Convert image to base64
 */
async function imageToBase64(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  return buffer.toString('base64');
}

/**
 * Generate a single rank icon using Together.ai
 */
async function generateRankIcon(rank, referenceBase64) {
  console.log(`\n🎨 Generating ${rank.displayName} icon...`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-dev',
        prompt: rank.prompt,
        image: referenceBase64,
        width: 1024,
        height: 1024,
        response_format: 'b64_json',
        disable_safety_checker: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.data && data.data[0] && data.data[0].b64_json) {
      return data.data[0].b64_json;
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error(`❌ Error generating ${rank.displayName}:`, error.message);
    throw error;
  }
}

/**
 * Save base64 image to file
 */
function saveImage(base64Data, filename) {
  const assetsPath = path.join(__dirname, '../assets/ranks');

  // Create directory if it doesn't exist
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }

  const filePath = path.join(assetsPath, filename);
  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(filePath, buffer);

  console.log(`✅ Saved: ${filename}`);
  return filePath;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Rank Icon Generation...\n');
  console.log('📁 Loading reference image...');

  // Check if reference image exists
  if (!fs.existsSync(REFERENCE_IMAGE)) {
    console.error(`❌ Reference image not found: ${REFERENCE_IMAGE}`);
    process.exit(1);
  }

  // Convert reference to base64
  const referenceBase64 = await imageToBase64(REFERENCE_IMAGE);
  console.log('✅ Reference image loaded');

  // Generate each rank icon
  const results = [];

  for (const rank of RANKS) {
    try {
      const iconBase64 = await generateRankIcon(rank, referenceBase64);
      const filename = `rank_${rank.name}.png`;
      const filePath = saveImage(iconBase64, filename);

      results.push({
        rank: rank.displayName,
        file: filename,
        path: filePath,
        xp: rank.xp
      });

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to generate ${rank.displayName}: ${error.message}`);
      results.push({
        rank: rank.displayName,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 GENERATION SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  console.log(`\n✅ Successfully generated: ${successful.length}/${RANKS.length}`);
  console.log(`❌ Failed: ${failed.length}/${RANKS.length}`);

  if (successful.length > 0) {
    console.log('\n📁 Generated Icons:');
    successful.forEach(r => {
      console.log(`   ${r.rank} → assets/ranks/${r.file} (${r.xp} XP)`);
    });
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Generations:');
    failed.forEach(r => {
      console.log(`   ${r.rank}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Done! Icons saved to: assets/ranks/');
  console.log('='.repeat(60));
}

// Run
main().catch(console.error);
