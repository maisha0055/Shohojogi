#!/bin/bash

# Quick Fix Script for Instant Booking Error
# This script fixes the database constraints needed for "call worker instantly" feature

echo "🔧 Fixing Instant Booking Database Constraints..."
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    echo "Please make sure you're running this script from the backend directory"
    exit 1
fi

# Check if database variables are set
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Database credentials not found in .env file"
    echo "Please ensure DB_NAME, DB_USER, and DB_PASSWORD are set in .env"
    exit 1
fi

echo "📋 Database: $DB_NAME"
echo "👤 User: $DB_USER"
echo ""

# Run the fix SQL script
echo "🔄 Running constraint fix script..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -f fix-instant-booking-constraints.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Constraints have been updated."
    echo ""
    echo "The following changes were made:"
    echo "  ✓ worker_id is now nullable (allows call_worker bookings)"
    echo "  ✓ booking_type constraint now includes 'call_worker'"
    echo "  ✓ status constraint now includes 'pending_estimation'"
    echo ""
    echo "You can now use the 'call worker instantly' feature without errors!"
    echo ""
else
    echo ""
    echo "❌ Error: Failed to update constraints."
    echo "Please check the error messages above and ensure:"
    echo "  1. PostgreSQL is running"
    echo "  2. Database credentials are correct"
    echo "  3. You have proper permissions to alter table constraints"
    echo ""
    exit 1
fi

