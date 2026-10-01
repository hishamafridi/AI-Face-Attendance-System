"""add student management fields

Revision ID: f0c69aa7a105
Revises: 4b285eb8d8c1
Create Date: 2026-09-28 22:42:45.791444

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f0c69aa7a105"
down_revision: Union[str, Sequence[str], None] = "4b285eb8d8c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Add new student fields.
    # They are nullable initially because existing users
    # already exist in the database.

    op.add_column(
        "users",
        sa.Column(
            "student_id",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "department",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "class_name",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "users",
        sa.Column(
            "phone",
            sa.String(length=30),
            nullable=True,
        ),
    )

    # Give existing users safe values.
    op.execute(
        """
        UPDATE users
        SET student_id = 'STUDENT-' || id
        WHERE student_id IS NULL
        """
    )

    op.execute(
        """
        UPDATE users
        SET department = 'Software Engineering'
        WHERE department IS NULL
        """
    )

    op.execute(
        """
        UPDATE users
        SET class_name = 'BS Software Engineering'
        WHERE class_name IS NULL
        """
    )

    # Make required student fields non-null.
    op.alter_column(
        "users",
        "student_id",
        existing_type=sa.String(length=50),
        nullable=False,
    )

    op.alter_column(
        "users",
        "department",
        existing_type=sa.String(length=100),
        nullable=False,
    )

    op.alter_column(
        "users",
        "class_name",
        existing_type=sa.String(length=100),
        nullable=False,
    )

    # Student ID must be unique.
    op.create_unique_constraint(
        "uq_users_student_id",
        "users",
        ["student_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "uq_users_student_id",
        "users",
        type_="unique",
    )

    op.drop_column(
        "users",
        "phone",
    )

    op.drop_column(
        "users",
        "class_name",
    )

    op.drop_column(
        "users",
        "department",
    )

    op.drop_column(
        "users",
        "student_id",
    )