"""add cascade delete to attendance user

Revision ID: 4b285eb8d8c1
Revises: 9332b4a9226c
Create Date: 2026-09-28 22:17:15.021049

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "4b285eb8d8c1"
down_revision: Union[str, Sequence[str], None] = "9332b4a9226c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(
        "attendance_user_id_fkey",
        "attendance",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "attendance_user_id_fkey",
        "attendance",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "attendance_user_id_fkey",
        "attendance",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "attendance_user_id_fkey",
        "attendance",
        "users",
        ["user_id"],
        ["id"],
    )