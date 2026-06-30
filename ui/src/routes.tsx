import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { Shell } from './Shell'
import { Accounts } from './screens/Accounts'
import { BankKeys } from './screens/BankKeys'
import { Exchanges } from './screens/Exchanges'
import { Orders } from './screens/Orders'
import { Participants } from './screens/Participants'
import { Protocol } from './screens/Protocol'
import { Statements } from './screens/Statements'
import { Veu } from './screens/Veu'

const rootRoute = createRootRoute({ component: Shell })

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: Participants }),
  createRoute({ getParentRoute: () => rootRoute, path: '/accounts', component: Accounts }),
  createRoute({ getParentRoute: () => rootRoute, path: '/orders', component: Orders }),
  createRoute({ getParentRoute: () => rootRoute, path: '/statements', component: Statements }),
  createRoute({ getParentRoute: () => rootRoute, path: '/veu', component: Veu }),
  createRoute({ getParentRoute: () => rootRoute, path: '/protocol', component: Protocol }),
  createRoute({ getParentRoute: () => rootRoute, path: '/exchanges', component: Exchanges }),
  createRoute({ getParentRoute: () => rootRoute, path: '/bank-keys', component: BankKeys }),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
