from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "asm_faraday"
    postgres_user: str = "asm"
    postgres_password: str = "asm_password"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    faraday_url: str = "http://localhost:5985"
    faraday_username: str = "faraday"
    faraday_password: str = "changeme"
    faraday_workspace: str = "nuclei-asm"
    faraday_verify_ssl: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def database_dsn(self) -> str:
        return (
            f"dbname={self.postgres_db} user={self.postgres_user} "
            f"password={self.postgres_password} host={self.postgres_host} port={self.postgres_port}"
        )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
