#!/usr/bin/env node

/**
 * 🔄 I18N Migration Rollback Script
 * 
 * Safely rollback i18n migration to previous state
 * - Restore original index.ts
 * - Remove modular translations
 * - Verify build works
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  backupSource: '/tmp/i18n-original-backup.ts',
  indexFile: './lib/i18n/index.ts',
  translationsDir: './lib/i18n/translations',
  backupDir: './migration-backups'
};

class I18nRollback {
  constructor() {
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async rollback() {
    try {
      console.log('🔄 Starting I18N Migration Rollback...');
      
      // Backup current state before rollback
      await this.backupCurrentState();
      
      // Restore original files
      await this.restoreOriginalIndex();
      
      // Remove modular structure
      await this.removeModularStructure();
      
      // Verify build works
      await this.testBuild();
      
      console.log('✅ Rollback completed successfully!');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  async backupCurrentState() {
    console.log('💾 Backing up current state...');
    
    const rollbackBackupDir = path.join(CONFIG.backupDir, `rollback-backup-${this.timestamp}`);
    fs.mkdirSync(rollbackBackupDir, { recursive: true });
    
    // Backup current index.ts if exists
    if (fs.existsSync(CONFIG.indexFile)) {
      fs.copyFileSync(CONFIG.indexFile, path.join(rollbackBackupDir, 'index.ts'));
    }
    
    // Backup translations directory if exists
    if (fs.existsSync(CONFIG.translationsDir)) {
      const backupTransDir = path.join(rollbackBackupDir, 'translations');
      this.copyDirectoryRecursive(CONFIG.translationsDir, backupTransDir);
    }
    
    console.log(`✅ Current state backed up to: ${rollbackBackupDir}`);
  }

  async restoreOriginalIndex() {
    console.log('📝 Restoring original index.ts...');
    
    if (!fs.existsSync(CONFIG.backupSource)) {
      throw new Error(`Original backup not found: ${CONFIG.backupSource}`);
    }
    
    const originalContent = fs.readFileSync(CONFIG.backupSource, 'utf8');
    fs.writeFileSync(CONFIG.indexFile, originalContent, 'utf8');
    
    console.log('✅ Original index.ts restored');
  }

  async removeModularStructure() {
    console.log('🗑️ Removing modular structure...');
    
    if (fs.existsSync(CONFIG.translationsDir)) {
      fs.rmSync(CONFIG.translationsDir, { recursive: true, force: true });
      console.log('✅ Translations directory removed');
    } else {
      console.log('ℹ️ No translations directory to remove');
    }
  }

  async testBuild() {
    console.log('🔨 Testing build after rollback...');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    try {
      const { stdout, stderr } = await execPromise('npm run build');
      
      if (stderr && !stderr.includes('Warning:')) {
        console.warn('⚠️ Build warnings:', stderr);
      }
      
      console.log('✅ Build successful after rollback');
      
    } catch (error) {
      console.error('❌ Build failed after rollback:', error.message);
      throw new Error('Rollback caused build failures - manual intervention required');
    }
  }

  copyDirectoryRecursive(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    
    files.forEach(file => {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      
      if (fs.lstatSync(sourcePath).isDirectory()) {
        this.copyDirectoryRecursive(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
  }
}

// CLI Entry Point
if (require.main === module) {
  const rollback = new I18nRollback();
  
  rollback.rollback()
    .then(() => {
      console.log('🎉 Rollback completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Rollback failed:', error.message);
      process.exit(1);
    });
}

module.exports = I18nRollback;