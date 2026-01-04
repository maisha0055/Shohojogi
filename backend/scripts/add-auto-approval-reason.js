const { query } = require('../src/config/database');

async function addAutoApprovalReasonColumn() {
  try {
    console.log('Checking if auto_approval_reason column exists...');
    
    const checkResult = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'nid_verifications' 
       AND column_name = 'auto_approval_reason'`
    );
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Column auto_approval_reason already exists');
      process.exit(0);
    }
    
    console.log('Adding auto_approval_reason column...');
    await query(
      `ALTER TABLE nid_verifications 
       ADD COLUMN auto_approval_reason TEXT`
    );
    
    console.log('✅ Column auto_approval_reason added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding column:', error.message);
    process.exit(1);
  }
}

addAutoApprovalReasonColumn();

