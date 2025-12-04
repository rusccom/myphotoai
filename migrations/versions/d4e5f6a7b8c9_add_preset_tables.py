"""Add preset tables

Revision ID: d4e5f6a7b8c9
Revises: b8f3c5a9d2e1
Create Date: 2025-12-04 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd4e5f6a7b8c9'
down_revision = 'b8f3c5a9d2e1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('preset_category',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug')
    )

    op.create_table('preset',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('r2_object_key', sa.String(length=1024), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['preset_category.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('preset', schema=None) as batch_op:
        batch_op.create_index('ix_preset_category_id', ['category_id'], unique=False)


def downgrade():
    with op.batch_alter_table('preset', schema=None) as batch_op:
        batch_op.drop_index('ix_preset_category_id')

    op.drop_table('preset')
    op.drop_table('preset_category')
