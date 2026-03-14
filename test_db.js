import sql from './dashboard-api/dist/lib/db.js';

async function run() {
  try {
    const userId = 'cdc4b5e3-0dbf-4ddc-bfce-5a61c8dcc436'; 
    
    // Check if user exists at all
    const users = await sql`SELECT id, email, role FROM users`;
    console.log('All Users:', users);
    
    // Check teams
    const teams = await sql`SELECT id, name FROM teams`;
    console.log('All Teams:', teams);

    // Check all memberships
    const memberships = await sql`SELECT team_id, user_id, role FROM team_members`;
    console.log('All Memberships:', memberships);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
