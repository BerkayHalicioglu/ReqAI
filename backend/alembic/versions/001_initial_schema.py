"""Initial database schema migration for ReqAI

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-07-27 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Documents table
    op.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
            uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Requirements table
    op.execute("""
        CREATE TABLE IF NOT EXISTS requirements (
            id UUID PRIMARY KEY,
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Tasks table
    op.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id UUID PRIMARY KEY,
            requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
            complexity VARCHAR(50) NOT NULL DEFAULT 'MODERATE',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Test Scenarios table
    op.execute("""
        CREATE TABLE IF NOT EXISTS test_scenarios (
            id UUID PRIMARY KEY,
            task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            expected_result TEXT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
            comment TEXT,
            evidence_file VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)


def downgrade() -> None:
    op.drop_table('test_scenarios', if_exists=True)
    op.drop_table('tasks', if_exists=True)
    op.drop_table('requirements', if_exists=True)
    op.drop_table('documents', if_exists=True)
