// backend/test-db.js
const { Client } = require('pg');

const client = new Client({
    user: 'uniroom_user',
    host: '127.0.0.1',
    database: 'uniroom',
    password: '12345',      // <--- ¡OJO! AHORA SÍ TIENE COMILLAS ' '
    port: 5435,             // <--- CAMBIAMOS A 5435 PARA EVITAR CONFLICTOS
    ssl: false
});

console.log('--- DIAGNÓSTICO UNIROOM ---');
console.log(`Intentando conectar a: ${client.user}@${client.host}:${client.port}/${client.database}`);

client.connect()
    .then(() => {
        console.log('✅ ¡CONEXIÓN EXITOSA!');
        return client.query('SELECT NOW() as hora_servidor');
    })
    .then((res) => {
        console.log('📅 Hora de la DB:', res.rows[0].hora_servidor);
        client.end();
    })
    .catch((err) => {
        console.error('❌ ERROR:', err.message);
        client.end();
    });