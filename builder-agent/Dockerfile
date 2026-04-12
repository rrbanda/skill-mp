FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
COPY . .
RUN uv sync --no-cache --locked --link-mode copy

RUN mkdir -p /app/registry \
 && chown -R 1001:0 /app \
 && chmod -R g=u /app
USER 1001

EXPOSE 8001

CMD ["uv", "run", "--no-sync", "server"]
