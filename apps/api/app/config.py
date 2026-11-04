import os
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    SAHAI_DEMO_MODE: bool = True
    SAHAI_ENV: str = "development"
    DATABASE_URL: str = "sqlite:///./sahai.db"
    SECRET_KEY: str = "sahai_demo_secret_key_not_for_production_89437291847"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def reject_default_secret_outside_demo(self) -> "Settings":
        if not self.SAHAI_DEMO_MODE and self.SECRET_KEY == "sahai_demo_secret_key_not_for_production_89437291847":
            raise ValueError("SECRET_KEY must be set when SAHAI_DEMO_MODE is false")
        return self

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
