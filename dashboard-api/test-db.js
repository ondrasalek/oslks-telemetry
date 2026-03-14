import postgres from 'postgres';
const sql = postgres(
    'postgres://postgres:9Th2SC5eiaH6H1VMxX201DXz9fsoA02MeIFdLm2KQYtNqKXtgrLfxumlCqIYrdkm@vc0wg4044cgs8sggog8s8w4o:5432/oslks_telemetry?sslmode=disable',
);

async function check() {
    try {
        const result =
            await sql`SELECT w.domain, w.team_id, tm.user_id FROM websites w LEFT JOIN team_members tm ON w.team_id = tm.team_id;`;
        console.log('Team members:');
        console.log(result);

        const teams = await sql`SELECT id FROM teams;`;
        console.log('Teams:');
        console.log(teams);

        const users = await sql`SELECT id, email FROM users;`;
        console.log('Users:');
        console.log(users);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
