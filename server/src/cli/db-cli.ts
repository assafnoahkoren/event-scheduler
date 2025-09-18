#!/usr/bin/env node

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
}

// Helper functions for colored output
const log = {
  info: (msg: string) => console.log(`${colors.cyan}${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.error(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  dim: (msg: string) => console.log(`${colors.gray}${msg}${colors.reset}`)
}

// Database operations
const operations = [
  { key: '1', name: 'Generate Prisma Client', command: 'npx prisma generate' },
  { key: '2', name: 'Run Migrations (Dev)', command: 'npx prisma migrate dev' },
  { key: '3', name: 'Push Schema to Database', command: 'npx prisma db push' },
  { key: '4', name: 'Seed Database', command: 'tsx src/seed.ts' },
  { key: '5', name: 'Open Prisma Studio', command: 'npx prisma studio' },
  { key: '6', name: 'Reset Database', command: 'npx prisma migrate reset' },
  { key: '7', name: 'Validate Schema', command: 'npx prisma validate' },
  { key: '8', name: 'Format Schema', command: 'npx prisma format' },
  { key: '9', name: 'Deploy Migrations (Prod)', command: 'npx prisma migrate deploy' },
  { key: 'd', name: 'Start Docker Database', command: 'docker-compose up -d', workDir: '../' },
  { key: 's', name: 'Stop Docker Database', command: 'docker-compose down', workDir: '../' },
  { key: 'c', name: 'Clean Docker Database', command: 'docker-compose down -v', workDir: '../' },
  { key: 'q', name: 'Exit', command: null }
]

// Execute command with live output
function executeCommand(command: string, workDir?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Pause stdin handling and restore normal mode
    process.stdin.pause()
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false)
    }

    const options = workDir
      ? { cwd: join(process.cwd(), workDir), shell: true }
      : { shell: true }

    const child = spawn(command, [], {
      ...options,
      stdio: 'inherit',
      env: { ...process.env }
    })

    child.on('error', (error) => {
      // Resume stdin handling
      process.stdin.resume()
      reject(error)
    })

    child.on('close', (code) => {
      // Resume stdin handling
      process.stdin.resume()
      if (code === 0) resolve()
      else reject(new Error(`Command failed with exit code ${code}`))
    })
  })
}

// Display menu
function displayMenu() {
  console.clear()
  console.log(`
${colors.cyan}╔════════════════════════════════════════╗${colors.reset}
${colors.cyan}║     ${colors.bright}DATABASE MANAGEMENT CLI${colors.reset}${colors.cyan}           ║${colors.reset}
${colors.cyan}║     ${colors.gray}Event Scheduler Database Tools${colors.reset}${colors.cyan}    ║${colors.reset}
${colors.cyan}╚════════════════════════════════════════╝${colors.reset}

${colors.bright}Prisma Operations:${colors.reset}
  ${colors.cyan}1${colors.reset} → Generate Prisma Client
  ${colors.cyan}2${colors.reset} → Run Migrations (Dev)
  ${colors.cyan}3${colors.reset} → Push Schema to Database
  ${colors.cyan}4${colors.reset} → Seed Database
  ${colors.cyan}5${colors.reset} → Open Prisma Studio
  ${colors.cyan}6${colors.reset} → Reset Database
  ${colors.cyan}7${colors.reset} → Validate Schema
  ${colors.cyan}8${colors.reset} → Format Schema
  ${colors.cyan}9${colors.reset} → Deploy Migrations (Prod)

${colors.bright}Docker Operations:${colors.reset}
  ${colors.cyan}d${colors.reset} → Start Docker Database
  ${colors.cyan}s${colors.reset} → Stop Docker Database
  ${colors.cyan}c${colors.reset} → Clean Docker Database (remove volumes)

  ${colors.red}q${colors.reset} → Exit

${colors.cyan}Select an operation:${colors.reset} `)
}

// Main CLI function
async function main() {
  // Get command line argument
  const arg = process.argv[2]

  // If argument provided, execute directly
  if (arg) {
    const op = operations.find(o => o.key === arg.toLowerCase())
    if (op && op.command) {
      log.dim(`Running: ${op.command}`)
      try {
        await executeCommand(op.command, op.workDir)
        log.success(`${op.name} completed successfully!`)
      } catch (error) {
        log.error(`Failed: ${error instanceof Error ? error.message : error}`)
        process.exit(1)
      }
      return
    } else if (arg === 'q') {
      process.exit(0)
    }
  }

  // Interactive mode
  displayMenu()

  // Set up stdin for single key input
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(true)
  }
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', async (key: string) => {
    // Handle Ctrl+C
    if (key === '\u0003') {
      console.log('\n')
      log.warning('Process interrupted. Exiting...')
      process.exit(0)
    }

    const operation = operations.find(op => op.key === key.toLowerCase())

    if (!operation) {
      console.log(`\n${colors.red}Invalid option. Please try again.${colors.reset}`)
      setTimeout(() => {
        displayMenu()
      }, 1500)
      return
    }

    if (operation.key === 'q') {
      console.log('\n')
      log.success('Goodbye!')
      process.exit(0)
    }

    if (operation.command) {
      console.log('\n')
      log.dim(`Running: ${operation.command}`)
      console.log(`${colors.gray}${'─'.repeat(42)}${colors.reset}\n`)

      try {
        await executeCommand(operation.command, operation.workDir)
        console.log('\n')
        log.success(`${operation.name} completed successfully!`)
      } catch (error) {
        console.log('\n')
        log.error(`Failed: ${error instanceof Error ? error.message : error}`)
      }

      // Special case for Prisma Studio
      if (operation.key === '5') {
        log.warning('Prisma Studio is running. Press Ctrl+C to stop it.')
        process.exit(0)
      }

      // Wait and redisplay menu
      console.log(`\n${colors.dim}Press any key to continue...${colors.reset}`)

      // Re-enable raw mode for menu navigation
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true)
      }

      process.stdin.once('data', () => {
        displayMenu()
      })
    }
  })
}

// Handle errors
process.on('uncaughtException', (error) => {
  log.error(`Unexpected error: ${error.message}`)
  process.exit(1)
})

// Check if seed file exists warning
const seedExists = existsSync(join(process.cwd(), 'src', 'seed.ts'))
if (!seedExists) {
  operations.find(op => op.key === '4')!.name += ' (seed.ts not found)'
}

// Run CLI
main().catch((error) => {
  log.error(`Failed to start CLI: ${error}`)
  process.exit(1)
})