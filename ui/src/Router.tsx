import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { App } from "./App.tsx";
import { Accounts } from "./Routes/Accounts.tsx";
import { Exchanges } from "./Routes/Exchanges.tsx";
import { Orders } from "./Routes/Orders.tsx";
import { Overview } from "./Routes/Overview.tsx";
import { Participants } from "./Routes/Participants.tsx";
import { Protocol } from "./Routes/Protocol.tsx";
import { Statements } from "./Routes/Statements.tsx";
import { Veu } from "./Routes/Veu.tsx";

const rootRoute = createRootRoute({ component: App });
const getParentRoute = () => rootRoute;

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute, path: "/", component: Overview }),
  createRoute({ getParentRoute, path: "/participants", component: Participants }),
  createRoute({ getParentRoute, path: "/accounts", component: Accounts }),
  createRoute({ getParentRoute, path: "/orders", component: Orders }),
  createRoute({ getParentRoute, path: "/veu", component: Veu }),
  createRoute({ getParentRoute, path: "/statements", component: Statements }),
  createRoute({ getParentRoute, path: "/protocol", component: Protocol }),
  createRoute({ getParentRoute, path: "/exchanges", component: Exchanges }),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
