"""Record the most recent terms and privacy acceptance without backfilling users.

Revision ID: 20261010_0004
Revises: 20261003_0003
"""

import sqlalchemy as sa

from alembic import op

revision = "20261010_0004"
down_revision = "20261003_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fresh databases inherit live ORM metadata from the initial revision.
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}
    if "legal_accepted_at" not in columns:
        op.add_column("users", sa.Column("legal_accepted_at", sa.DateTime(timezone=True)))
    if "legal_version" not in columns:
        op.add_column("users", sa.Column("legal_version", sa.String(32)))


def downgrade() -> None:
    op.drop_column("users", "legal_version")
    op.drop_column("users", "legal_accepted_at")
