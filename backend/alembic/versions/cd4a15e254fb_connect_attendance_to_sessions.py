"""connect attendance to sessions

Revision ID: cd4a15e254fb
Revises: bb23166e508d
Create Date: 2026-09-29 23:59:29.868812

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "cd4a15e254fb"
down_revision: Union[str, Sequence[str], None] = "bb23166e508d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "attendance",
        sa.Column(
            "session_id",
            sa.Integer(),
            nullable=False,
        ),
    )

    op.create_index(
        op.f("ix_attendance_session_id"),
        "attendance",
        ["session_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_attendance_session_id",
        "attendance",
        "attendance_sessions",
        ["session_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "fk_attendance_session_id",
        "attendance",
        type_="foreignkey",
    )

    op.drop_index(
        op.f("ix_attendance_session_id"),
        table_name="attendance",
    )

    op.drop_column(
        "attendance",
        "session_id",
    )