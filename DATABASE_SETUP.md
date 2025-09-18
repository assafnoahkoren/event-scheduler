# Database Setup

## Prerequisites
- Docker and Docker Compose installed
- Node.js and npm installed

## Quick Start

### 1. Start the PostgreSQL database
```bash
# Start the database with Docker Compose
docker-compose up -d

# Check if the database is running
docker-compose ps
```

The database will be available at:
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:5050` (optional web interface)
  - Email: `admin@eventscheduler.com`
  - Password: `admin`

### 2. Run database migrations
```bash
# Navigate to server directory
cd server

# Generate Prisma Client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate
```

### 3. View the database (optional)
```bash
# Open Prisma Studio (web-based database viewer)
npm run db:studio
```

## Database Connection Details
- Host: `localhost`
- Port: `5432`
- Database: `event_scheduler`
- Username: `postgres`
- Password: `postgres`

## Available Scripts

In the `server` directory:

- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema without migrations (development)
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database (deletes all data!)
- `npm run db:seed` - Seed database with sample data (if configured)

## Stopping the Database
```bash
# Stop the database
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers AND volumes (deletes all data!)
docker-compose down -v
```

## Troubleshooting

### Database connection refused
1. Check if Docker is running
2. Check if the container is running: `docker-compose ps`
3. Check logs: `docker-compose logs postgres`

### Permission denied errors
- Make sure the port 5432 is not already in use
- On Windows, ensure Docker Desktop is running

### Reset everything
```bash
# Stop everything and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-run migrations
cd server && npm run db:migrate
```