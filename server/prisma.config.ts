// Prisma configuration file
// This file specifies the location of the Prisma schema files

import { loadEnvFile } from 'process'

// Load environment variables
loadEnvFile('.env')

export default {
  schema: './prisma/schema',
}