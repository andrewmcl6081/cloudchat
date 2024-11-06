import { Auth0Provider } from "@auth0/auth0-react";
import { SocketProvider } from "./context/SocketContext";
import type { LinksFunction, LoaderFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import styles from "./tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];
export const loader: LoaderFunction = async () => {
  return {
    env: {
      AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
      AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL,
    },
  };
};

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Auth0Provider
          domain={data.env.AUTH0_DOMAIN}
          clientId={data.env.AUTH0_CLIENT_ID}
          authorizationParams={{
            redirect_uri: data.env.AUTH0_CALLBACK_URL,
          }}
        >
          <SocketProvider>
            <Outlet />
          </SocketProvider>
        </Auth0Provider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}