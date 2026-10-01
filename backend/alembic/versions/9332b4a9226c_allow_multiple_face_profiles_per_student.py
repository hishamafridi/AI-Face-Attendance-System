
"""allow multiple face profiles per student

Revision ID: 9332b4a9226c
Revises: 23b445e3b26a
Create Date: 2026-09-28 01:53:30.545546
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9332b4a9226c"
down_revision: Union[str, Sequence[str], None] = "23b445e3b26a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Add pose temporarily as nullable so existing rows do not fail.
    op.add_column(
        "face_profiles",
        sa.Column(
            "pose",
            sa.String(length=30),
            nullable=True,
        ),
    )

    # Existing face profiles were created before pose support.
    # Treat them as the original/straight enrollment.
    op.execute(
        "UPDATE face_profiles SET pose = 'straight' WHERE pose IS NULL"
    )

    # Now make pose required.
    op.alter_column(
        "face_profiles",
        "pose",
        existing_type=sa.String(length=30),
        nullable=False,
    )

    # Remove the old UNIQUE constraint/index on user_id.
    op.drop_index(
        op.f("ix_face_profiles_user_id"),
        table_name="face_profiles",
    )

    # Create a normal non-unique index.
    op.create_index(
        op.f("ix_face_profiles_user_id"),
        "face_profiles",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_face_profiles_user_id"),
        table_name="face_profiles",
    )

    op.create_index(
        op.f("ix_face_profiles_user_id"),
        "face_profiles",
        ["user_id"],
        unique=True,
    )

    op.drop_column(
        "face_profiles",
        "pose",
    )
