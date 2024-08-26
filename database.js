const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bot.db');

db.serialize(() => {
    // Create the topics table
    db.run(`
        CREATE TABLE IF NOT EXISTS topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    `);

    // Create the explanations table
    db.run(`
        CREATE TABLE IF NOT EXISTS explanations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic_id INTEGER NOT NULL,
            explanation TEXT NOT NULL,
            author TEXT NOT NULL,
            upvotes INTEGER DEFAULT 0,
            FOREIGN KEY (topic_id) REFERENCES topics(id)
        )
    `);

    // Create the requests table
    db.run(`
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL UNIQUE,
            request_count INTEGER DEFAULT 1
        )
    `);

    // Create the requesters table
    db.run(`
        CREATE TABLE IF NOT EXISTS requesters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            topic_id INTEGER NOT NULL,
            FOREIGN KEY (topic_id) REFERENCES requests(id)
        )
    `);
});

module.exports = db;
