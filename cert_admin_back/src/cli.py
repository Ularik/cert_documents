import argparse
import asyncio
import getpass

from sqlalchemy import select

from src.database import AsyncSessionMaker
from src.models import Users, UserStatus
from src.services.auth import AuthService


async def create_superuser() -> None:
    username = input("Username: ").strip()
    last_name = input("Last name: ").strip()

    if not username or not last_name:
        raise SystemExit("Username and last name are required")

    password = getpass.getpass("Password: ")
    password_confirm = getpass.getpass("Confirm password: ")

    if password != password_confirm:
        raise SystemExit("Passwords do not match")

    if len(password) < 12:
        raise SystemExit("Password must be at least 12 characters")

    async with AsyncSessionMaker() as db:
        existing_user = await db.scalar(
            select(Users).where(
                (Users.username == username) & (Users.last_name == last_name)
            )
        )

        if existing_user:
            raise SystemExit("User with this username and last name already exists")

        user = Users(
            username=username,
            last_name=last_name,
            hashed_password=await AuthService().hash_pswd(password),
            status=UserStatus.ADMIN,
        )

        db.add(user)
        await db.commit()

    print(f"Administrator '{username}' created successfully")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["createsuperuser"])
    args = parser.parse_args()

    if args.command == "createsuperuser":
        asyncio.run(create_superuser())
