// Prisma configuration file
// This file specifies the location of the Prisma schema files

import { loadEnvFile } from 'process'
import { existsSync } from 'fs'

// Load environment variables only if .env file exists
// On Vercel, environment variables are provided directly
if (existsSync('.env')) {
  loadEnvFile('.env')
}

export default {
  schema: './prisma/schema',
}