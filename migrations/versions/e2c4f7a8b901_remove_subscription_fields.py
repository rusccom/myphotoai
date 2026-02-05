"""Remove subscription fields from user

Revision ID: e2c4f7a8b901
Revises: d4e5f6a7b8c9
Create Date: 2026-02-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e2c4f7a8b901'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('subscription_type')
        batch_op.drop_column('subscription_start_date')
        batch_op.drop_column('subscription_end_date')
        batch_op.drop_column('stripe_subscription_id')


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('stripe_subscription_id', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('subscription_end_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('subscription_start_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('subscription_type', sa.Enum('FREE', 'PLUS', 'PREMIUM', name='subscriptiontype'), nullable=False))
        batch_op.create_unique_constraint(None, ['stripe_subscription_id'])
