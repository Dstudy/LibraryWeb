-- Check if DaDoc column exists in thongbao table
SET @columnExists = 0;
SELECT COUNT(*) INTO @columnExists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'thongbao' 
AND COLUMN_NAME = 'DaDoc';

-- Add the column if it doesn't exist
SET @query = IF(@columnExists = 0, 
    'ALTER TABLE thongbao ADD COLUMN DaDoc BOOLEAN DEFAULT FALSE',
    'SELECT "DaDoc column already exists"');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
