FROM python:3.11-slim

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user api/requirements.txt ./api/requirements.txt
COPY --chown=user ml_core/requirements.txt ./ml_core/requirements.txt

RUN pip install --no-cache-dir \
    -r api/requirements.txt \
    -r ml_core/requirements.txt

COPY --chown=user api/ ./api/
COPY --chown=user ml_core/ ./ml_core/
COPY --chown=user datasets/ ./datasets/

RUN mkdir -p uploads

ENV PYTHONPATH=/app
ENV APP_ENV=production

EXPOSE 7860

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "7860"]
