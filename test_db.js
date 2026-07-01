import mysql from 'mysql2/promise';

async function run() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'TrustFound'
    });
    
    try {
        const [rows] = await db.query('SELECT * FROM claim WHERE item_id = 24');
        console.log("Claims for item 24:");
        console.dir(rows, { depth: null });
        
        const [items] = await db.query('SELECT * FROM item WHERE item_id = 24');
        console.log("Item details:");
        console.dir(items, { depth: null });

        const [users] = await db.query('SELECT * FROM general_user LIMIT 5');
        console.log("Some users:");
        console.dir(users.map(u => ({ id: u.nim || u.nip || u.id, role: u.role, name: u.name || u.full_name, password: u.password })), { depth: null });
        
    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

run();
