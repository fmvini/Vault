"""Initial FinTrack schema and system category seed.

Revision ID: 20260921_0001
Revises:
Create Date: 2026-09-21
"""
import uuid

from alembic import op

from app.db.base import Base
from app.db.seed import SYSTEM_CATEGORIES
from app.models import Category

revision = "20260921_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)
    bind.execute(
        Category.__table__.insert(),
        [
            {
                "id": uuid.uuid4(),
                "user_id": None,
                "name": name,
                "type": kind,
                "icon": icon,
                "color": color,
                "is_system": True,
            }
            for name, kind, icon, color in SYSTEM_CATEGORIES
        ],
    )


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
