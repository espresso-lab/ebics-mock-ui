import type { ComponentType } from 'react'
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

const screen = <P extends string>(path: P, component: ComponentType) =>
  createRoute({ getParentRoute: () => rootRoute, path, component })

const routeTree = rootRoute.addChildren([
  screen('/', Participants),
  screen('/accounts', Accounts),
  screen('/orders', Orders),
  screen('/statements', Statements),
  screen('/veu', Veu),
  screen('/protocol', Protocol),
  screen('/exchanges', Exchanges),
  screen('/bank-keys', BankKeys),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
