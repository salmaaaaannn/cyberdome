from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None

def success_response(data: Any) -> dict:
    return {
        "success": True,
        "data": data,
        "error": None
    }

def error_response(code: str, message: str, details: Any = None) -> dict:
    return {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "details": details
        }
    }
