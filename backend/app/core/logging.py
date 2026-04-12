"""Application logging configuration utilities."""

import json
import logging
from logging.config import dictConfig


class JsonFormatter(logging.Formatter):
    """Render log records as compact JSON for container-friendly logs."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        return json.dumps(payload)


def setup_logging(log_level: str = "INFO", use_json: bool = False) -> None:
    """Configure root, uvicorn, and app loggers with a shared format."""

    formatter_name = "json" if use_json else "default"
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": "app.core.logging.JsonFormatter",
                "datefmt": "%Y-%m-%dT%H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": formatter_name,
                "stream": "ext://sys.stdout",
            }
        },
        "root": {"level": log_level.upper(), "handlers": ["console"]},
        "loggers": {
            "uvicorn": {"level": log_level.upper(), "handlers": ["console"], "propagate": False},
            "uvicorn.error": {"level": log_level.upper(), "handlers": ["console"], "propagate": False},
            "uvicorn.access": {"level": log_level.upper(), "handlers": ["console"], "propagate": False},
            "app": {"level": log_level.upper(), "handlers": ["console"], "propagate": False},
        },
    }
    dictConfig(config)
