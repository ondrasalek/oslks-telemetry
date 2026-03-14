import sql from './dashboard-api/dist/lib/db.js';

async function run() {
  try {
    const websites = await sql`SELECT id, domain, team_id FROM websites`;
    console.log('Orphan Check - All Websites:', websites);

    const teams = await sql`SELECT id, name FROM teams`;
    console.log('Orphan Check - All Teams:', teams);
    
    // Find missing team IDs attached to websites
    const orphans = await sql`
        SELECT w.domain, w.team_id 
        FROM websites w 
        LEFT JOIN teams t ON w.team_id = t.id 
        WHERE t.id IS NULL
    `;
    console.log('Orphaned Websites:', orphans);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
