import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import hash_password, hash_access_code
from app.models import User, Company, CompanyUser, Asset, NotificationPreference, Notification

async def init_db():
    """Create all tables in the database."""
    from sqlalchemy import text
    from app.core.config import settings
    async with engine.begin() as conn:
        if "postgres" in settings.DATABASE_URL:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        await conn.run_sync(Base.metadata.create_all)

async def seed_data():
    """Populate database with verified demo accounts and multi-tenant test data."""
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(User).where(User.email == "admin@demo.cyberdome.local"))
        if res.scalar_one_or_none():
            return

        print("--> Seeding CyberDome database with multi-tenant demo data...")

        # ----------------------------------------------------
        # 1. Company A: CyberDome Technologies
        # ----------------------------------------------------
        company_a = Company(
            id="comp-cyberdome-001",
            company_name="CyberDome Technologies",
            domain="cyberdome.local",
            industry="Cybersecurity & Defense",
            size="250-500",
            security_contact="security@cyberdome.local",
            access_code_hash=hash_access_code("CSX-COMPANY"),
            status="ACTIVE"
        )
        db.add(company_a)
        await db.flush()

        # Admin A (Khan Salman)
        admin_a = User(
            id="usr-admin-001",
            name="Khan Salman",
            email="admin@demo.cyberdome.local",
            phone="+1 (555) 019-2831",
            hashed_password=hash_password("Password123!"),
            account_type="COMPANY",
            status="ACTIVE",
            email_verified=True,
            mfa_enabled=False
        )
        db.add(admin_a)
        await db.flush()

        cu_admin_a = CompanyUser(
            company_id=company_a.id,
            user_id=admin_a.id,
            role="ADMIN",
            status="ACTIVE",
            department="Executive Security Leadership"
        )
        db.add(cu_admin_a)
        db.add(NotificationPreference(user_id=admin_a.id))

        # Employee A (Sarah Chen)
        emp_a = User(
            id="usr-emp-001",
            name="Sarah Chen",
            email="employee@demo.cyberdome.local",
            phone="+1 (555) 019-2832",
            hashed_password=hash_password("Password123!"),
            account_type="COMPANY",
            status="ACTIVE",
            email_verified=True,
            mfa_enabled=False
        )
        db.add(emp_a)
        await db.flush()

        cu_emp_a = CompanyUser(
            company_id=company_a.id,
            user_id=emp_a.id,
            role="EMPLOYEE",
            status="ACTIVE",
            department="Security Operations (SOC)"
        )
        db.add(cu_emp_a)
        db.add(NotificationPreference(user_id=emp_a.id))

        # Assets for Company A
        asset_a1 = Asset(
            id="ast-cdx-001",
            company_id=company_a.id,
            name="CyberDome Production Web Gateway",
            asset_type="WEBSITE",
            domain="cyberdome.local",
            hostname="edge.cyberdome.local",
            ip_address="10.0.1.5",
            status="ACTIVE",
            criticality="CRITICAL",
            description="Core TLS 1.3 reverse proxy and SSL termination endpoint"
        )
        asset_a2 = Asset(
            id="ast-cdx-002",
            company_id=company_a.id,
            name="SOC SIEM Collector Core",
            asset_type="SERVER",
            hostname="siem-core.internal",
            ip_address="10.0.1.10",
            status="ACTIVE",
            criticality="HIGH",
            description="High-throughput telemetry ingestion pipeline"
        )
        db.add_all([asset_a1, asset_a2])

        # ----------------------------------------------------
        # 2. Company B: Acme Global Defense (For Cross-Tenant Tests)
        # ----------------------------------------------------
        company_b = Company(
            id="comp-acme-002",
            company_name="Acme Global Defense",
            domain="acmedefense.com",
            industry="Aerospace & Defense",
            size="1000+",
            security_contact="soc@acmedefense.com",
            access_code_hash=hash_access_code("ACME-DEFENSE"),
            status="ACTIVE"
        )
        db.add(company_b)
        await db.flush()

        admin_b = User(
            id="usr-admin-b-002",
            name="Marcus Vance",
            email="admin@acmedefense.com",
            phone="+1 (555) 782-9901",
            hashed_password=hash_password("Password123!"),
            account_type="COMPANY",
            status="ACTIVE",
            email_verified=True,
            mfa_enabled=False
        )
        db.add(admin_b)
        await db.flush()

        cu_admin_b = CompanyUser(
            company_id=company_b.id,
            user_id=admin_b.id,
            role="ADMIN",
            status="ACTIVE",
            department="CISO Office"
        )
        db.add(cu_admin_b)
        db.add(NotificationPreference(user_id=admin_b.id))

        emp_b = User(
            id="usr-emp-b-002",
            name="David Miller",
            email="david@acmedefense.com",
            phone="+1 (555) 782-9902",
            hashed_password=hash_password("Password123!"),
            account_type="COMPANY",
            status="ACTIVE",
            email_verified=True,
            mfa_enabled=False
        )
        db.add(emp_b)
        await db.flush()

        cu_emp_b = CompanyUser(
            company_id=company_b.id,
            user_id=emp_b.id,
            role="EMPLOYEE",
            status="ACTIVE",
            department="Defense Systems Engineering"
        )
        db.add(cu_emp_b)
        db.add(NotificationPreference(user_id=emp_b.id))

        # Assets for Company B
        asset_b1 = Asset(
            id="ast-acme-001",
            company_id=company_b.id,
            name="Acme Classified Research Vault",
            asset_type="SERVER",
            hostname="vault-01.acmedefense.internal",
            ip_address="192.168.50.100",
            status="ACTIVE",
            criticality="CRITICAL",
            description="Highly restricted aerospace defense research database"
        )
        db.add(asset_b1)

        # ----------------------------------------------------
        # 3. NORMAL USER (Independent Public User)
        # CRITICAL MANDATE:
        # - account_type = 'USER'
        # - role = 'USER'
        # - company_id = NULL
        # - NO company_users record created!
        # ----------------------------------------------------
        normal_user = User(
            id="usr-normal-001",
            name="Alex Rivera",
            email="user@demo.cyberdome.local",
            phone="+1 (555) 441-8921",
            hashed_password=hash_password("Password123!"),
            account_type="USER",
            status="ACTIVE",
            email_verified=True,
            mfa_enabled=False
        )
        db.add(normal_user)
        await db.flush()

        db.add(NotificationPreference(user_id=normal_user.id))

        # Personal notification for normal user
        db.add(Notification(
            user_id=normal_user.id,
            company_id=None,
            type="SECURITY",
            severity="INFO",
            title="Welcome to CyberDome Personal Protection",
            message="Your personal cyber safety guardian is active. Test URLs, verify scam calls, and learn cybersecurity basics.",
            channel="WEB",
            status="UNREAD"
        ))

        await db.commit()
        print("--> Database successfully seeded with Company A, Company B, and independent Normal User.")

if __name__ == "__main__":
    asyncio.run(init_db())
    asyncio.run(seed_data())
