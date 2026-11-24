FROM python:3.12-slim
WORKDIR /app
COPY server.py index.html app.js style.css ./
RUN mkdir -p /data && chown 10001:10001 /data
USER 10001:10001
ENV LAB_DB=/data/lab.sqlite
EXPOSE 8080
CMD ["python3", "server.py"]
