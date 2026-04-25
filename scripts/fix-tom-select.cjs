#!/usr/bin/env node

/**
 * Postinstall script to fix tom-select TypeScript errors
 * This runs automatically after yarn install
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/tom-select/src/getSettings.ts');

try {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix the type definition
    content = content.replace(
      'settings_user:RecursivePartial<TomSettings>):TomSettings{',
      'settings_user:any):any{'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully patched tom-select/src/getSettings.ts');
  } else {
    console.log('⚠️  tom-select/src/getSettings.ts not found - skipping patch');
  }
} catch (error) {
  console.error('❌ Error patching tom-select:', error.message);
  // Don't fail the install if patching fails
  process.exit(0);
}
