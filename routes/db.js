const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://admin:gksdnfxkfl2007@hanultari-tennis.0rzdd.mongodb.net/?retryWrites=true&w=majority&appName=Hanultari-Tennis';
const client = new MongoClient(uri);

let db;

async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db('yourDatabaseName');
        console.log('MongoDB 연결 성공');
    }
    return db;
}

module.exports = connectDB;
