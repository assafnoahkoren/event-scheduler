import { prisma } from './db'

// Service categories will be created per organization
// These are the default categories that will be created when an organization is created
export const DEFAULT_SERVICE_CATEGORIES = [
  { name: 'Photography', description: 'Professional photography services' },
  { name: 'Videography', description: 'Video recording and editing services' },
  { name: 'Catering', description: 'Food and beverage services' },
  { name: 'Sound & Lighting', description: 'Audio and lighting equipment and services' },
  { name: 'Decoration', description: 'Event decoration and styling' },
  { name: 'DJ & Music', description: 'DJ services and live music' },
  { name: 'MC & Host', description: 'Master of ceremonies and hosting services' },
  { name: 'Venue', description: 'Event venue rental' },
  { name: 'Transportation', description: 'Transportation and logistics services' },
  { name: 'Security', description: 'Event security services' },
  { name: 'Cleaning', description: 'Cleaning services before/after events' },
  { name: 'Flowers', description: 'Floral arrangements and bouquets' },
  { name: 'Printing', description: 'Invitations, banners, and printing services' },
  { name: 'Entertainment', description: 'Entertainment acts and performers' },
  { name: 'Equipment Rental', description: 'Tables, chairs, and other equipment' },
]

async function main() {
  console.log('🚀 Starting database seeding...')

  try {
    // Note: Service categories are now created per organization
    // They will be created when an organization is created
    console.log('📝 Note: Service categories are now organization-specific')
    console.log('    They will be created automatically when organizations are created')

    console.log('✅ Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()