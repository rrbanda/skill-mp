FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
COPY . .
RUN uv sync --no-cache --locked --link-mode copy

ENV OPENAI_API_KEY=not-needed

RUN chown -R 1001:1001 /app
USER 1001

EXPOSE 8001

CMD ["uv", "run", "--no-sync", "server"]
