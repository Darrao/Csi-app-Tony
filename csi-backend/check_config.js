
const { MongoClient } = require('mongodb');

// Replace with your MongoDB connection string (from environment variable or hardcoded for testing)
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/csi-app';

async function checkEmailConfig() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const database = client.db();
        const collection = database.collection('emailconfigs');

        const config = await collection.findOne({ active: true });

        if (config) {
            console.log("✅ Found active email config:", config);
        } else {
            console.log("❌ No active email config found!");
            const allConfigs = await collection.find({}).toArray();
            console.log("⚠️ Total configs in collection:", allConfigs.length);
            console.log("Configs:", allConfigs);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

checkEmailConfig();
