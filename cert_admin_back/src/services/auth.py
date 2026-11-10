from fastapi import HTTPException
from datetime import timezone, datetime, timedelta
import bcrypt
import jwt
from src.config import settings
from concurrent.futures import ThreadPoolExecutor
from src.schemas.users import UserInCookiesSchema
import asyncio


# Часовой пояс, в котором сбрасываются сессии (Кыргызстан, UTC+6, без перехода на летнее время).
SESSION_RESET_TZ = timezone(timedelta(hours=6), name="Asia/Bishkek")


def next_session_reset(now: datetime | None = None) -> datetime:
    """Ближайшая полночь (00:00) по Бишкеку — момент принудительного сброса всех сессий."""
    now = (now or datetime.now(timezone.utc)).astimezone(SESSION_RESET_TZ)
    return datetime.combine(now.date() + timedelta(days=1), datetime.min.time(), tzinfo=SESSION_RESET_TZ)


class AuthService:
    executor = ThreadPoolExecutor(max_workers=4)

    async def start_in_another_loop(self, func, *args):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, func, *args)

    @staticmethod
    async def create_access_token(data: UserInCookiesSchema) -> str:
        to_encode = data.model_dump().copy()
        now = datetime.now(timezone.utc)
        # Токен живёт не дольше ACCESS_TOKEN_EXPIRE_MINUTES и в любом случае истекает в 00:00,
        # поэтому все сессии автоматически сбрасываются в полночь.
        expire = min(
            now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            next_session_reset(now),
        )
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    async def hash_pswd(self, password: str) -> bytes:
        is_valid = await self.start_in_another_loop(
            bcrypt.hashpw,
            password.encode('utf-8'),
            bcrypt.gensalt()
        )
        return is_valid

    async def verify_password(self, plain_password, hashed_password):
        return await self.start_in_another_loop(
            bcrypt.checkpw,
            plain_password.encode('utf-8'),
            hashed_password
        )

    @staticmethod
    async def decode_token_for_logout(token: str) -> UserInCookiesSchema | None:
        """Подпись проверяется, срок — нет: выход с истёкшей сессией тоже попадает в журнал."""
        try:
            user = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
                options={"verify_exp": False},
            )
            return UserInCookiesSchema(**user)
        except (jwt.InvalidTokenError, ValueError):
            return None

    @staticmethod
    async def decode_token(token) -> UserInCookiesSchema:
        try:
            user = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return UserInCookiesSchema(**user)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Сессия истекла, войдите снова")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Некорректный токен доступа")
