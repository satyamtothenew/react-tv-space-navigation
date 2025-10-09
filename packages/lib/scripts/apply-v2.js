#!/usr/bin/env node

/**
 * Apply v2 Performance Improvements
 *
 * This script copies the optimized v2 files to replace the v1 production files.
 * It creates backups of v1 files before replacing them.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'spatial-navigation');
const BACKUP_DIR = path.join(ROOT, '.v1-backup');

const FILES_TO_REPLACE = [
  {
    v2: path.join(SRC, 'SpatialNavigator.v2.ts'),
    v1: path.join(SRC, 'SpatialNavigator.ts'),
    backup: path.join(BACKUP_DIR, 'SpatialNavigator.ts'),
  },
  {
    v2: path.join(SRC, 'components', 'Node.v2.tsx'),
    v1: path.join(SRC, 'components', 'Node.tsx'),
    backup: path.join(BACKUP_DIR, 'Node.tsx'),
  },
  {
    v2: path.join(SRC, 'components', 'virtualizedList', 'VirtualizedList.v2.tsx'),
    v1: path.join(SRC, 'components', 'virtualizedList', 'VirtualizedList.tsx'),
    backup: path.join(BACKUP_DIR, 'VirtualizedList.tsx'),
  },
  {
    v2: path.join(SRC, 'context', 'UnifiedNavigationContext.v2.tsx'),
    v1: null, // New file, no v1 equivalent
    backup: null,
  },
];

console.log('🚀 Applying v2 Performance Improvements...\n');

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('✅ Created backup directory\n');
}

let successCount = 0;
let errorCount = 0;

FILES_TO_REPLACE.forEach((file) => {
  try {
    // Check if v2 file exists
    if (!fs.existsSync(file.v2)) {
      console.log(`⚠️  Skipping ${path.basename(file.v2)} - file not found`);
      return;
    }

    // Backup v1 file if it exists
    if (file.v1 && fs.existsSync(file.v1) && file.backup) {
      fs.copyFileSync(file.v1, file.backup);
      console.log(`📦 Backed up ${path.basename(file.v1)}`);
    }

    // Copy v2 to production
    if (file.v1) {
      fs.copyFileSync(file.v2, file.v1);
      console.log(`✅ Applied ${path.basename(file.v2)} → ${path.basename(file.v1)}\n`);
      successCount++;
    } else {
      // For new files, just note they exist
      console.log(`ℹ️  ${path.basename(file.v2)} is available (new in v2)\n`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(file.v2)}:`, error.message);
    errorCount++;
  }
});

console.log('━'.repeat(60));
console.log(`\n✨ v2 Applied Successfully!`);
console.log(`   Files updated: ${successCount}`);
if (errorCount > 0) {
  console.log(`   Errors: ${errorCount}`);
}
console.log(`   Backups saved to: .v1-backup/\n`);
console.log('Next steps:');
console.log('  1. Run tests: yarn test');
console.log('  2. Run benchmarks: yarn benchmark:all');
console.log('  3. Test your app');
console.log('  4. To revert: yarn v2:revert\n');
console.log('🎉 Your library is now using v2 performance optimizations!\n');

process.exit(errorCount > 0 ? 1 : 0);
