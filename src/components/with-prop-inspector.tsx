import { isPropLarge, type PropCheckResult } from "@/lib/prop-checks";
import React from "react";

export interface PropInspection {
  componentName: string;
  props: Record<string, PropCheckResult>;
}

/** Development instrumentation; notification may repeat when React re-renders. */
export function withPropInspector<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  notify: (result: PropInspection) => void = console.log,
  options: { threshold?: string | number } = {},
) {
  const componentName =
    WrappedComponent.displayName || WrappedComponent.name || "Anonymous";
  function WithPropInspector(props: P) {
    const results: PropInspection = { componentName, props: {} };
    for (const [name, value] of Object.entries(props)) {
      const check = isPropLarge(
        { name, value },
        componentName,
        options.threshold ?? "100B",
      );
      if (check.result || check.estimate.bytes === null)
        results.props[name] = check;
    }
    if (Object.keys(results.props).length) notify(results);
    return <WrappedComponent {...props} />;
  }
  WithPropInspector.displayName = `withPropInspector(${componentName})`;
  return WithPropInspector;
}
