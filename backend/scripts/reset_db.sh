#!/bin/bash
# Reset the local database - clears all data so you can redo /install
#
# Usage:
#   ./scripts/reset_db.sh          # Truncate all tables (keep schema)
#   ./scripts/reset_db.sh --drop   # Drop and recreate the entire database

set -euo pipefail

# Load DATABASE_URL from .env if it exists
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ -f "$ENV_FILE" ]; then
    export $(grep -E '^DATABASE_URL=' "$ENV_FILE" | xargs)
fi

DB_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/oslks_telemetry}"

echo "🗄️  Database: $DB_URL"
echo ""

if [ "${1:-}" = "--drop" ]; then
    echo "💣 Dropping and recreating database..."
    DB_NAME=$(echo "$DB_URL" | sed -E 's|.*/([^?]+).*|\1|')
    BASE_URL=$(echo "$DB_URL" | sed -E 's|/[^/]*(\?.*)?$|/postgres|')
    
    psql "$BASE_URL" -c "DROP DATABASE IF EXISTS $DB_NAME;"
    psql "$BASE_URL" -c "CREATE DATABASE $DB_NAME;"
    echo "✅ Database '$DB_NAME' recreated. Run migrations to set up schema."
else
    echo "🧹 Truncating all tables..."
    psql "$DB_URL" <<-SQL
        -- Disable triggers to avoid FK issues during truncation
        SET session_replication_role = 'replica';
        
        TRUNCATE TABLE events CASCADE;
        TRUNCATE TABLE api_keys CASCADE;
        TRUNCATE TABLE team_members CASCADE;
        TRUNCATE TABLE teams CASCADE;
        TRUNCATE TABLE verification_token CASCADE;
        TRUNCATE TABLE sessions CASCADE;
        TRUNCATE TABLE accounts CASCADE;
        TRUNCATE TABLE websites CASCADE;
        TRUNCATE TABLE users CASCADE;
        TRUNCATE TABLE system_settings CASCADE;
        
        -- Re-enable triggers
        SET session_replication_role = 'origin';
SQL
    echo ""
    echo "✅ All tables cleared. Visit http://localhost:3000/install to set up again."
fi
