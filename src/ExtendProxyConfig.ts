import { ProxyConfig } from "@sitecore-jss/sitecore-jss-proxy";

export type ExtendProxyConfig = ProxyConfig & {
  publicDomain: string;
};