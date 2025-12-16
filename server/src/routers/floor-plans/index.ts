import { router } from '../../trpc'
import { componentTypesRouter } from './component-types.router'
import { siteFloorPlansRouter } from './site-floor-plans.router'
import { templatesRouter } from './templates.router'
import { eventLayoutsRouter } from './event-layouts.router'

export const floorPlanRouter = router({
  componentTypes: componentTypesRouter,
  siteFloorPlans: siteFloorPlansRouter,
  templates: templatesRouter,
  eventLayouts: eventLayoutsRouter,
})
