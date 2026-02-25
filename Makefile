.PHONY: dev build stop logs clean migrate test lint

# Start all services in dev mode (hot-reload)
dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Build and start production containers
build:
	docker-compose up --build -d

# Stop all containers
stop:
	docker-compose down

# Tail logs from all containers (or specific: make logs s=backend)
logs:
	docker-compose logs -f $(s)

# Remove all containers, volumes, and images (full reset)
clean:
	docker-compose down -v --rmi local

# Run Alembic DB migrations inside backend container
migrate:
	docker-compose exec backend alembic upgrade head

# Run all tests
test:
	docker-compose exec backend pytest
	docker-compose exec frontend npm run test

# Run linter on frontend
lint:
	docker-compose exec frontend npm run lint

# Open an interactive shell inside a service container
shell:
	docker-compose exec $(s) bash