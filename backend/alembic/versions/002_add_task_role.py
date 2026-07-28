"""Add role column to tasks table

Revision ID: 002_add_task_role
Revises: 001_initial_schema
Create Date: 2026-07-28 15:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_add_task_role'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("""
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tasks' AND column_name='role'
                ) THEN
                    ALTER TABLE tasks ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'DEVELOPER';
                END IF;
            END $$;
        """)
    else:
        try:
            op.execute("ALTER TABLE tasks ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'DEVELOPER';")
        except Exception:
            pass


def downgrade() -> None:
    op.execute("""
        ALTER TABLE tasks DROP COLUMN IF EXISTS role;
    """)
