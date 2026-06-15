# Faraday Nuclei Pipeline

Pipeline implemented here:

```text
nuclei.json -> Faraday -> PostgreSQL findings cache -> FastAPI -> React dashboard
```

This service does not run Nuclei. The existing ASM backend runs Nuclei and sends the generated `nuclei_<scan_id>.json` file path to this pipeline automatically.

If the running Faraday version does not expose a compatible report upload endpoint, the service falls back to parsing `nuclei.json` and creating vulnerabilities through Faraday's vulnerabilities API.

## Folder Structure

```text
defectdojo_pipeline/
  app/
    config.py
    database.py
    faraday_client.py
    main.py
    models.py
    repository.py
    risk.py
    schemas.py
  docker-compose.yml
  Dockerfile
  README.md
  requirements.txt
  schema.sql
```

## API

- `POST /faraday/import-nuclei-file`: imports an existing Nuclei JSON result file into Faraday.
- `GET /faraday/findings`: returns cached Faraday findings.
- `GET /faraday/findings/critical`: returns cached critical Faraday findings.
- `GET /faraday/summary`: returns Faraday counts plus risk score and risk level.

## Environment Variables

```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=asm_faraday
POSTGRES_USER=asm
POSTGRES_PASSWORD=asm_password

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

FARADAY_URL=http://localhost:5985
FARADAY_USERNAME=faraday
FARADAY_PASSWORD=changeme
FARADAY_WORKSPACE=nuclei-asm
FARADAY_VERIFY_SSL=false
```

## Run

```bash
docker compose -f defectdojo_pipeline/docker-compose.yml up --build
```

FastAPI runs on `http://localhost:8001`.

## Import Example

```bash
curl -X POST http://localhost:8001/faraday/import-nuclei-file \
  -H "Content-Type: application/json" \
  -d '{"file_path":"/absolute/path/to/nuclei_123.json"}'
```
