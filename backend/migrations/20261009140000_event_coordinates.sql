-- City-level coordinates (from GeoLite2-City, i.e. the city centroid, not the visitor's
-- exact position) so the dashboard can plot cities. Nullable: older events have none.
ALTER TABLE events ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitude REAL;
