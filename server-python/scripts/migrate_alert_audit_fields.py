"""
数据库迁移脚本 - 添加 alert_records 审计字段
运行: python -m scripts.migrate_alert_audit_fields
"""
import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.database import engine

async def run_migration():
    """添加 resolved_by 和 resolve_note 字段到 alert_records 表"""
    async with engine.begin() as conn:
        print("开始执行迁移...")
        
        # 检查 resolved_by 字段是否存在
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'alert_records' AND column_name = 'resolved_by'
        """))
        if result.fetchone() is None:
            print("添加 resolved_by 字段...")
            await conn.execute(text("""
                ALTER TABLE alert_records 
                ADD COLUMN resolved_by INTEGER REFERENCES users(id)
            """))
            print("✓ resolved_by 字段添加成功")
        else:
            print("✓ resolved_by 字段已存在")
        
        # 检查 resolve_note 字段是否存在
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'alert_records' AND column_name = 'resolve_note'
        """))
        if result.fetchone() is None:
            print("添加 resolve_note 字段...")
            await conn.execute(text("""
                ALTER TABLE alert_records 
                ADD COLUMN resolve_note TEXT DEFAULT ''
            """))
            print("✓ resolve_note 字段添加成功")
        else:
            print("✓ resolve_note 字段已存在")
        
        # 创建索引
        print("创建索引...")
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_ar_resolved_by ON alert_records(resolved_by)
        """))
        print("✓ 索引创建成功")
        
        print("\n迁移完成！")

if __name__ == "__main__":
    asyncio.run(run_migration())
