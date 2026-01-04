#!/bin/bash

# Script to run the pending_estimation status migration
# This adds 'pending_estimation' status to the bookings table

echo "Running pending_estimation status migration..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if database variables are set
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "Error: Database credentials not found in .env file"
    echo "Please ensure DB_NAME, DB_USER, and DB_PASSWORD are set in .env"
    exit 1
fi

# Run the migration
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -f database/migration_add_pending_estimation_status.sql

if [ $? -eq 0 ]; then
    echo "✓ Migration completed successfully!"
    echo "✓ 'pending_estimation' status is now available for bookings"
else
    echo "✗ Migration failed. Please check the error messages above."
    exit 1
fi

