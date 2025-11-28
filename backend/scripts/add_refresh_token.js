const { initDatabase, runQuery, closeDatabase } = require('../config/database');

const migrate = async () => {
    try {
        console.log('🔄 Starting migration...');
        await initDatabase();

        // Check if column exists
        try {
            await runQuery('SELECT google_refresh_token FROM users LIMIT 1');
            console.log('✅ Column google_refresh_token already exists');
        } catch (e) {
            console.log('➕ Adding google_refresh_token column...');
            await runQuery('ALTER TABLE users ADD COLUMN google_refresh_token TEXT');
            console.log('✅ Column added successfully');
        }

        await closeDatabase();
        console.log('🎉 Migration completed');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
