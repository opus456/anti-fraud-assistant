-- ============================================================
-- 迁移: 添加预警审计字段 (resolved_by, resolve_note)
-- 执行时间: 在已有数据库上添加新字段
-- ============================================================

-- 添加处理人ID字段
ALTER TABLE alert_records 
ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES users(id);

-- 添加处理备注字段
ALTER TABLE alert_records 
ADD COLUMN IF NOT EXISTS resolve_note TEXT DEFAULT '';

-- 创建索引便于查询
CREATE INDEX IF NOT EXISTS idx_ar_resolved_by ON alert_records(resolved_by);

-- 验证
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'alert_records' 
AND column_name IN ('resolved_by', 'resolve_note');
