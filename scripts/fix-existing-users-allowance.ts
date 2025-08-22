#!/usr/bin/env ts-node

import { db } from '../lib/db/index';
import { users, settings } from '../lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixExistingUsersAllowance() {
  console.log('🔧 Fixing existing users vacation allowance...');
  
  try {
    // Get default holiday allowance from settings
    const allowanceSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'system.default_holiday_allowance'))
      .limit(1);
    
    const defaultAllowance = allowanceSetting.length > 0 
      ? parseInt(allowanceSetting[0].value) || 25
      : 25;
      
    console.log(`📋 Using default holiday allowance: ${defaultAllowance} days`);
    
    // Check all users first
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      holidayAllowance: users.holidayAllowance
    }).from(users);
    
    console.log('\n📊 Current user allowances:');
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}): ${user.holidayAllowance} days`);
    });
    
    // Find users with null or 20 holiday allowance (old default)
    const usersToUpdate = await db.select()
      .from(users)
      .where(
        eq(users.holidayAllowance, 20)  // Update users with old hardcoded 20
      );
    
    console.log(`👥 Found ${usersToUpdate.length} users with old 20-day allowance`);
    
    if (usersToUpdate.length === 0) {
      console.log('✅ All users already have holiday allowance set');
      return;
    }
    
    // Update all users with 20-day allowance to new default
    const updateResult = await db.update(users)
      .set({ 
        holidayAllowance: defaultAllowance,
        updatedAt: new Date()
      })
      .where(eq(users.holidayAllowance, 20));
    
    console.log('✅ Successfully updated existing users with default holiday allowance');
    
    // Verify the update
    const verifyResult = await db.select()
      .from(users)
      .where(eq(users.holidayAllowance, 20));
      
    console.log(`🔍 Verification: ${verifyResult.length} users still have 20-day allowance (should be 0)`);
    
    // Show updated users
    const updatedUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      holidayAllowance: users.holidayAllowance
    }).from(users);
    
    console.log('\n📊 Current user allowances:');
    updatedUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}): ${user.holidayAllowance} days`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing existing users allowance:', error);
    process.exit(1);
  }
}

fixExistingUsersAllowance().then(() => {
  console.log('\n✅ Fix existing users allowance completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});