"""
CYBERDOME — Module 02 IoT ML Compatibility Wrapper.
Re-exports production IoTMLService while preserving backward compatibility
for existing consumers across CyberDome modules and test suites.
"""

from app.services.iot_ml_service import (
    IoTMLService,
    iot_ml_service,
    IoTFeatureAdapter,
    InsufficientDataException,
)
from app.schemas.iot import IoTMLAnalysisResult

# Backward compatibility aliases
MLIoTService = IoTMLService
ml_iot_service = iot_ml_service
MLIoTAnalysisResult = IoTMLAnalysisResult

__all__ = [
    "IoTMLService",
    "MLIoTService",
    "iot_ml_service",
    "ml_iot_service",
    "IoTFeatureAdapter",
    "InsufficientDataException",
    "IoTMLAnalysisResult",
    "MLIoTAnalysisResult",
]
