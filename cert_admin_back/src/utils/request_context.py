"""Данные текущего HTTP-запроса (IP, User-Agent), доступные из сервисов без передачи Request."""
from contextvars import ContextVar
from dataclasses import dataclass

from starlette.types import ASGIApp, Receive, Scope, Send


@dataclass(frozen=True)
class RequestInfo:
    ip_address: str | None = None
    user_agent: str | None = None


_request_info: ContextVar[RequestInfo] = ContextVar("request_info", default=RequestInfo())


def get_request_info() -> RequestInfo:
    return _request_info.get()


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        # за nginx реальный адрес клиента приходит в X-Real-IP / X-Forwarded-For
        ip = headers.get("x-real-ip") or headers.get("x-forwarded-for", "").split(",")[0].strip() or None
        if ip is None and scope.get("client"):
            ip = scope["client"][0]
        user_agent = headers.get("user-agent")

        token = _request_info.set(RequestInfo(
            ip_address=ip[:64] if ip else None,
            user_agent=user_agent[:512] if user_agent else None,
        ))
        try:
            await self.app(scope, receive, send)
        finally:
            _request_info.reset(token)
