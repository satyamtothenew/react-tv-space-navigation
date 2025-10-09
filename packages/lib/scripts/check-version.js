#!/usr/bin/env node

/**
 * Check Version Status
 *
 * This script shows which version (v1 or v2) is currently active.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'spatial-navigation');

const FILES_TO_CHECK = [
  {
    name: 'SpatialNavigator',
    production: path.join(SRC, 'SpatialNavigator.ts'),
    v2: path.join(SRC, 'SpatialNavigator.v2.ts'),
    v1Backup: path.join(ROOT, '.v1-backup', 'SpatialNavigator.ts'),
  },
  {
    name: 'Node',
    production: path.join(SRC, 'components', 'Node.tsx'),
    v2: path.join(SRC, 'components', 'Node.v2.tsx'),
    v1Backup: path.join(ROOT, '.v1-backup', 'Node.tsx'),
  },
  {
    name: 'VirtualizedList',
    production: path.join(SRC, 'components', 'virtualizedList', 'VirtualizedList.tsx'),
    v2: path.join(SRC, 'components', 'virtualizedList', 'VirtualizedList.v2.tsx'),
    v1Backup: path.join(ROOT, '.v1-backup', 'VirtualizedList.tsx'),
  },
];

console.log('\n📊 Version Status Check\n');
console.log('━'.repeat(60));

let v2AppliedCount = 0;
let totalFiles = FILES_TO_CHECK.length;

FILES_TO_CHECK.forEach((file) => {
  const prodExists = fs.existsSync(file.production);
  const v2Exists = fs.existsSync(file.v2);
  const v1BackupExists = fs.existsSync(file.v1Backup);

  console.log(`\n📁 ${file.name}`);
  console.log(`   Production file: ${prodExists ? '✅' : '❌'}`);
  console.log(`   v2 file: ${v2Exists ? '✅' : '❌'}`);
  console.log(`   v1 backup: ${v1BackupExists ? '✅' : '❌'}`);

  if (prodExists && v2Exists) {
    // Check if production is using v2
    const prodContent = fs.readFileSync(file.production, 'utf8');
    const isV2 = prodContent.includes('v2 - Optimized') || prodContent.includes('V2 Optimization');

    if (isV2) {
      console.log(`   Status: 🚀 Using v2 (Optimized)`);
      v2AppliedCount++;
    } else {
      console.log(`   Status: 📦 Using v1 (Original)`);
    }
  }
});

console.log('\n' + '━'.repeat(60));
console.log('\n📈 Summary:');

if (v2AppliedCount === totalFiles) {
  console.log('   ✅ All files using v2 (Optimized)');
  console.log('   🎉 Performance improvements active!\n');
  console.log('To revert to v1:');
  console.log('   yarn v2:revert\n');
} else if (v2AppliedCount > 0) {
  console.log(`   ⚠️  Mixed: ${v2AppliedCount}/${totalFiles} files using v2`);
  console.log('   Recommendation: Complete the migration\n');
  console.log('To apply v2:');
  console.log('   yarn v2:apply\n');
} else {
  console.log('   📦 All files using v1 (Original)');
  console.log('   To get performance improvements:\n');
  console.log('To apply v2:');
  console.log('   yarn v2:backup  # Create backups first');
  console.log('   yarn v2:apply   # Apply optimizations\n');
}

console.log('Available commands:');
console.log('   yarn v2:status   - Show this status');
console.log('   yarn v2:backup   - Backup v1 files');
console.log('   yarn v2:apply    - Apply v2 optimizations');
console.log('   yarn v2:revert   - Revert to v1');
console.log('   yarn benchmark:all - Compare performance\n');
