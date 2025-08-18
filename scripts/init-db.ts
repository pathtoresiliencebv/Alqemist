import { initializeDatabase, testConnection } from '../lib/database';

async function main() {
  console.log('🚀 Initializing Alqemist database...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const connectionOk = await testConnection();
    
    if (!connectionOk) {
      console.error('❌ Database connection failed. Please check your DATABASE_URL environment variable.');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful!');
    
    // Initialize database tables
    console.log('🏗️  Creating database tables...');
    await initializeDatabase();
    
    console.log('✅ Database initialization complete!');
    console.log('🎉 Your Alqemist database is ready to use.');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

main();
