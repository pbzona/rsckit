import { DependencyGraphPlugin } from "./webpack-graph-plugin.js";

export const withGraph =
  () =>
  (nextConfig: { webpack?: unknown } = {}) => {
    return Object.assign({}, nextConfig, {
      webpack(config, options) {
        config.plugins.push(new DependencyGraphPlugin());

        if (typeof nextConfig.webpack === "function") {
          return nextConfig.webpack(config, options);
        }
        return config;
      },
    });
  };
