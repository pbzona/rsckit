import {
  PropCheckFunction,
  PropCheckResult,
  isPropLarge,
} from "@/lib/prop-checks";
import React from "react";

export function withPropInspector<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  notify: (res: object) => void = console.log, // What to do with the results - needs better typing
  // checkFunctions: PropCheckFunction[], // Need to think this part more, would be cool to make it extendable by giving a nice interface or something to create these functions yourself
) {
  let _shouldNotify = false;
  const _results = {
    isPropLarge: {},
  };

  return function WithPropInspector(props: P) {
    const componentName = WrappedComponent.displayName
      ? WrappedComponent.displayName
      : // biome-ignore lint/complexity/noBannedTypes: sorry god :(
        (WrappedComponent as Function).name;

    for (const [name, value] of Object.entries(props)) {
      const p = { name, value };
      const { result, message } = isPropLarge(p, componentName, "0B");
      if (result) {
        _shouldNotify = true;
        _results.isPropLarge[name] = message;
      }
    }

    const wrapped = <WrappedComponent {...props} />;
    _shouldNotify && notify(_results);

    return wrapped;
  };
}
