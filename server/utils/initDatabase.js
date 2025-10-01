const { testConnection, initializeDatabase } = require('../config/db');

async function initDB() {
  console.log('Initializing Vithenics database...');
  
  try {
    const connected = await testConnection();

    if (!connected) {
      console.error('Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    await initializeDatabase();
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

initDB();
