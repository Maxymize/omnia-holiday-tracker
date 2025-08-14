import { db } from './index';
import { sql } from 'drizzle-orm';

// Migration tracking table
const migrationsTable = `
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Available migrations
const migrations: Migration[] = [
  {
    name: '001_initial_schema',
    up: async () => {
      const { up } = await import('./migrations/001_initial_schema');
      return up();
    },
    down: async () => {
      const { down } = await import('./migrations/001_initial_schema');
      return down();
    }
  },
  {
    name: '002_audit_logs',
    up: async () => {
      const { up } = await import('./migrations/002_audit_logs');
      return up();
    },
    down: async () => {
      const { down } = await import('./migrations/002_audit_logs');
      return down();
    }
  }
];

async function initMigrationsTable(): Promise<void> {
  try {
    await db.execute(sql.raw(migrationsTable));
    console.log('Migrations table initialized');
  } catch (error) {
    console.error('Failed to initialize migrations table:', error);
    throw error;
  }
}

async function getExecutedMigrations(): Promise<string[]> {
  try {
    const result = await db.execute(
      sql.raw('SELECT name FROM _migrations ORDER BY id')
    );
    return result.rows.map((row: any) => row.name);
  } catch (error) {
    console.error('Failed to get executed migrations:', error);
    return [];
  }
}

async function recordMigration(name: string): Promise<void> {
  try {
    await db.execute(
      sql.raw(`INSERT INTO _migrations (name) VALUES ('${name}')`)
    );
    console.log(`Recorded migration: ${name}`);
  } catch (error) {
    console.error(`Failed to record migration ${name}:`, error);
    throw error;
  }
}

async function removeMigrationRecord(name: string): Promise<void> {
  try {
    await db.execute(
      sql.raw(`DELETE FROM _migrations WHERE name = '${name}'`)
    );
    console.log(`Removed migration record: ${name}`);
  } catch (error) {
    console.error(`Failed to remove migration record ${name}:`, error);
    throw error;
  }
}

export async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...');
  
  try {
    await initMigrationsTable();
    const executedMigrations = await getExecutedMigrations();
    
    console.log('Executed migrations:', executedMigrations);
    
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.name)) {
        console.log(`Running migration: ${migration.name}`);
        
        try {
          await migration.up();
          await recordMigration(migration.name);
          console.log(`✅ Migration ${migration.name} completed`);
        } catch (error) {
          console.error(`❌ Migration ${migration.name} failed:`, error);
          throw error;
        }
      } else {
        console.log(`⏭️  Migration ${migration.name} already executed`);
      }
    }
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration process failed:', error);
    throw error;
  }
}

export async function rollbackLastMigration(): Promise<void> {
  console.log('Rolling back last migration...');
  
  try {
    await initMigrationsTable();
    const executedMigrations = await getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    const lastMigration = executedMigrations[executedMigrations.length - 1];
    const migration = migrations.find(m => m.name === lastMigration);
    
    if (!migration) {
      console.error(`Migration ${lastMigration} not found`);
      return;
    }
    
    console.log(`Rolling back migration: ${migration.name}`);
    
    try {
      await migration.down();
      await removeMigrationRecord(migration.name);
      console.log(`✅ Migration ${migration.name} rolled back`);
    } catch (error) {
      console.error(`❌ Rollback of ${migration.name} failed:`, error);
      throw error;
    }
  } catch (error) {
    console.error('Rollback process failed:', error);
    throw error;
  }
}

export async function getMigrationStatus(): Promise<void> {
  try {
    await initMigrationsTable();
    const executedMigrations = await getExecutedMigrations();
    
    console.log('\n=== Migration Status ===');
    console.log(`Available migrations: ${migrations.length}`);
    console.log(`Executed migrations: ${executedMigrations.length}`);
    
    console.log('\nMigration details:');
    for (const migration of migrations) {
      const executed = executedMigrations.includes(migration.name);
      const status = executed ? '✅ EXECUTED' : '⏳ PENDING';
      console.log(`  ${migration.name}: ${status}`);
    }
    console.log('========================\n');
  } catch (error) {
    console.error('Failed to get migration status:', error);
    throw error;
  }
}

// CLI interface for migrations
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
      runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'down':
      rollbackLastMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'status':
      getMigrationStatus()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    default:
      console.log('Usage: node migrate.js [up|down|status]');
      console.log('  up     - Run pending migrations');
      console.log('  down   - Rollback last migration');
      console.log('  status - Show migration status');
      process.exit(1);
  }
}