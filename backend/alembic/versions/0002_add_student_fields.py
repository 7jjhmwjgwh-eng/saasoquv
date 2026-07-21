"""placeholder — schema now fully created by 0001

This revision intentionally does nothing.

Earlier deployments stamped the database with '0002_add_student_fields' while the
initial schema was still split across two migrations. 0001 now creates the complete
schema (including students.parent_phone, students.birth_date and the BigInteger
telegram_id columns), so there is nothing left for 0002 to do — but the revision must
keep existing, otherwise Alembic cannot resolve the version already recorded in
databases that were stamped with it.

Revision ID: 0002_add_student_fields
Revises: 0001_init_schema
"""

revision = "0002_add_student_fields"
down_revision = "0001_init_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
