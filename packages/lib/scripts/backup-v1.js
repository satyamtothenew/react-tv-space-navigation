#!/usr/bin/env node

/**
 * Backup v1 Files
 *
 * This script creates backups of the current v1 files before applying v2.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'spatial-navigation');
const BACKUP_DIR = path.join(ROOT, '.v1-backup');

const FILES_TO_BACKUP = [
  {
    source: path.join(SRC, 'SpatialNavigator.ts'),
    backup: path.join(BACKUP_DIR, 'SpatialNavigator.ts'),
  },
  {
    source: path.join(SRC, 'components', 'Node.tsx'),
    backup: path.join(BACKUP_DIR, 'Node.tsx'),
  },
  {
    source: path.join(SRC, 'components', 'virtualizedList', 'VirtualizedList.tsx'),
    backup: path.join(BACKUP_DIR, 'VirtualizedList.tsx'),
  },
];

console.log('📦 Creating v1 Backups...\n');

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ Created backup directory\n');
} else {
  console.log('ℹ️  Backup directory already exists\n');
}

let successCount = 0;
let errorCount = 0;

FILES_TO_BACKUP.forEach((file) => {
  try {
    if (!fs.existsSync(file.source)) {
      console.log(`⚠️  Skipping ${path.basename(file.source)} - file not found`);
      return;
    }

    fs.copyFileSync(file.source, file.backup);
    console.log(`✅ Backed up ${path.basename(file.source)}`);
    successCount++;
  } catch (error) {
    console.error(`❌ Error backing up ${path.basename(file.source)}:`, error.message);
    errorCount++;
  }
});

console.log('\n' + '━'.repeat(60));
console.log(`\n✨ Backup Complete!`);
console.log(`   Files backed up: ${successCount}`);
if (errorCount > 0) {
  console.log(`   Errors: ${errorCount}`);
}
console.log(`   Location: ${BACKUP_DIR}\n`);
console.log('You can now safely apply v2:');
console.log('  yarn v2:apply\n');

process.exit(errorCount > 0 ? 1 : 0);
