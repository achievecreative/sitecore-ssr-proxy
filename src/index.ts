import express from "express";
import compression from "compression";
import "dotenv/config";
import scProxy from "@sitecore-jss/sitecore-jss-proxy";
import { config } from "./config";
//import { cacheMiddleware } from "./cacheMiddleware";
import vhost from "vhost";

const server = express();
const port = process.env.PORT || 3000;

// enable gzip compression for appropriate file types
server.use(compression());

// turn off x-powered-by http header
server.settings["x-powered-by"] = false;

// Serve static app assets from local /dist folder
server.use(
  "/dist",
  express.static("dist", {
    fallthrough: false, // force 404 for unknown assets under /dist
  })
);

/**
 * Output caching, can be enabled,
 * Read about restrictions here: {@link https://doc.sitecore.com/xp/en/developers/hd/190/sitecore-headless-development/caching-in-headless-server-side-rendering-mode.html}
 */
//server.use(cacheMiddleware());

server.use((req, _res, next) => {
  // because this is a proxy, all headers are forwarded on to the Sitecore server
  // but, if we SSR we only understand how to decompress gzip and deflate. Some
  // modern browsers would send 'br' (brotli) as well, and if the Sitecore server
  // supported that (maybe via CDN) it would fail SSR as we can't decode the Brotli
  // response. So, we force the accept-encoding header to only include what we can understand.
  if (req.headers["accept-encoding"]) {
    req.headers["accept-encoding"] = "gzip, deflate";
  }

  next();
});

server.use(async (req, _res, next) => {
  let url = req.url?.toLocaleLowerCase();

  //Ignore paths
  if (
    !url ||
    url.startsWith("/-/") ||
    url.startsWith("/sitcore") ||
    url.startsWith('/api') ||
    url === "/"
  ) {
    next();
    return;
  }

  let parsedRoute = config.serverBundle.parseRouteUrl(url);

  let data = { path: parsedRoute.sitecoreRoute, raw: false };
  let response = await fetch(`${config.apiHost}/api/sitecore/urlservice/check`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "content-type": "application/json" },
  });
  let result = await response.json();
  if (!!result?.status && result.status !== 200) {
    if (result.status == 404) {
      _res.redirect(result?.url ?? "/");
    } else {
      _res.redirect(result?.url ?? "/");
    }

    return;
  }

  next();
});

// For any other requests, we render app routes server-side and return them
//server.use('*', scProxy(config.serverBundle.renderView, config, config.serverBundle.parseRouteUrl));
server.use(vhost(config.publicDomain,scProxy(config.serverBundle.renderView,config, config.serverBundle.parseRouteUrl)));

server.listen(port, () => {
  console.log(`server listening on port ${port}!`);
});
