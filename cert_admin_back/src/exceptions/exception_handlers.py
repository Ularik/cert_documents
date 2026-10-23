from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from src.exceptions import exceptions


def register_exception_handlers(app):

    @app.exception_handler(exceptions.HasNotRightsToTaskException)
    async def has_no_rights_handler(request: Request, exc: exceptions.HasNotRightsToTaskException):
        raise HTTPException(status_code=403, detail=exc.detail)

    @app.exception_handler(exceptions.DepartmentNotFoundException)
    async def not_found_handler(request: Request, exc: exceptions.DepartmentNotFoundException):
        raise HTTPException(status_code=404, detail=exc.detail)

    @app.exception_handler(exceptions.UserNotFoundException)
    async def not_found_handler(request: Request, exc: exceptions.UserNotFoundException):
        raise HTTPException(status_code=404, detail=exc.detail)

    @app.exception_handler(exceptions.ReplyNotFoundException)
    async def not_found_handler(request: Request, exc: exceptions.ReplyNotFoundException):
        raise HTTPException(status_code=404, detail=exc.detail)

    @app.exception_handler(exceptions.TaskAlreadyExistException)
    async def exist_exception_handler(request: Request, exc: exceptions.TaskAlreadyExistException):
        raise HTTPException(status_code=400, detail=exc.detail)

    @app.exception_handler(exceptions.DepartmentAlreadyExistException)
    async def department_exist_exception_handler(
        request: Request,
        exc: exceptions.DepartmentAlreadyExistException,
    ):
        return JSONResponse(status_code=409, content={"detail": exc.detail})

    @app.exception_handler(exceptions.UserAlreadyExistException)
    async def exist_exception_handler(request: Request, exc: exceptions.UserAlreadyExistException):
        raise HTTPException(status_code=400, detail=exc.detail)

    @app.exception_handler(exceptions.NoResultException)
    async def not_found_handler(request: Request, exc: exceptions.NoResultException):
        raise HTTPException(status_code=404, detail=exc.detail)
