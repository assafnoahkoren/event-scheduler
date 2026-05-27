import { router } from '../../trpc'
import { stockItemsRouter } from './stock-items.router'
import { stockLocationsRouter } from './stock-locations.router'
import { purchaseOrdersRouter } from './purchase-orders.router'
import { stockArrivalsRouter } from './stock-arrivals.router'
import { stockMovementsRouter } from './stock-movements.router'
import { stockRecountsRouter } from './stock-recounts.router'
import { stockLevelsRouter } from './stock-levels.router'

export const stockRouter = router({
  items: stockItemsRouter,
  locations: stockLocationsRouter,
  purchaseOrders: purchaseOrdersRouter,
  arrivals: stockArrivalsRouter,
  movements: stockMovementsRouter,
  recounts: stockRecountsRouter,
  levels: stockLevelsRouter,
})
