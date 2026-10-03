"""Persist the expiration deadline of isolated preview accounts.

Revision ID: 20261003_0003
Revises: 20260924_0002
"""

import sqlalchemy as sa

from alembic import op

revision = "20261003_0003"
down_revision = "20260924_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The initial revision uses live ORM metadata, so fresh databases already
    # include this column/index. Existing installations still need both.
    inspector = sa.inspect(op.get_bind())
    if "preview_expires_at" not in {column["name"] for column in inspector.get_columns("users")}:
        op.add_column("users", sa.Column("preview_expires_at", sa.DateTime(timezone=True)))
    if "ix_users_preview_expires_at" not in {
        index["name"] for index in inspector.get_indexes("users")
    }:
        op.create_index("ix_users_preview_expires_at", "users", ["preview_expires_at"])


def downgrade() -> None:
    op.drop_index("ix_users_preview_expires_at", table_name="users")
    op.drop_column("users", "preview_expires_at")
