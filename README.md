# rsckit

This is an 🧪experimental🧪 set of tools to help understand and diagnose React server components in your Next.js application. It has been tested with Next.js 15 and should *only be used for local development*.

## Installation

Eventually I'd like to publish this as a package, but it's not even close to ready. For now, clone the repo and build it locally with `pnpm build`.

In the Next.js project you'd like to work on, add it as a file dependency in your `package.json`:

```json
{
  "dependencies": {
    "rsckit": "file:/path/to/rsckit"
  }
}
```

You can also link it with PNPM, although module resolution tends to be unpredictable with certain dependencies. For example, you may have to move certain dev dependencies to regular dependencies in order to have them resolve correctly. If this turns out to be my problem, I will try to fix it in the future, but based on my research it seems to be a known issue with PNPM.

## Usage

### Debug components

Currently rsckit exports a higher order component that helps inspect props passed from server components to client components:

```tsx
'use client';

export function MyComponent(name, age) {
  return (
    <div>
      <h1>Hi, my name is {name}</h1>
      <p>I am {age} years old</p>
    </div>
  )
}
```

To inspect the props passed to this component, modify your client component like so:

```tsx
'use client';
import { withPropInspector } from 'rsckit/components';

// Optional: add an underscore or modify the name somehow
// This avoids the need to change the name in other files that import it
// because we'll export the "old" identifier
function MyComponent_(name, age) {
  return (
    <div>
      <h1>Hi, my name is {name}</h1>
      <p>I am {age} years old</p>
    </div>
  )
}

// Add a displayName to identify the component when logging - this is important!
MyComponent_.displayName = 'MyComponent';

// Export your component wrapped in the HOC
export const MyComponent = withPropInspector(MyComponent_);
```

This instruments your component with a `PropCheckFunction` that logs details about the size of the props passed to your client component. In the future, I plan to expose an API for creating and adding custom functions and loggers, but for now, it will log to stdout the size in bytes for all props on all components that it wraps. This happens at render time.

To test this, be sure to run `pnpm install` if you've made any changes and rebuilt rsckit, then run `pnpm build` in your Next.js project. Because client components are initially rendered on the server, this will log details during the build.

### CLI

Currently this is just a file crawler and component dependency checker. It will show the number of page.tsx files in your app directory (accounts for other valid extensions as well). You can run it using the `analyze` command:

```sh
pnpm rsckit:analyze --projectDir "/path/to/your-project" 
```

Use the `--help` flag for more details.

In the future, this will index and analyze the structure of your Next.js project - for example, finding and instrumenting client components via a codemod. For now, you can find client components manually:

```sh
grep 'use client' ./**/*.(js|jsx|tsx)
# or
rg 'use client' .
```

There are other ways to do this, use whatever tools you're comfortable with.

## Why?

The inspiration for this project was to help pinpoint the source of large RSC payloads. One of the way RSC payloads can become bloated is by passing large objects as props from server to client components.

If you're not familiar with this problem, check out this guide in the Vercel docs: [How to optimize RSC payload size](https://vercel.com/guides/how-to-optimize-rsc-payload-size).

## FAQ

### Will this fix my app/perf/hosting bill?

No, but it might help you figure out where to start optimization efforts.

### Can't you do this with AI?

In some cases yes. This is a deterministic solution that lets you see exactly how everything is calculated, which might be preferred in many cases. RSCs are a new enough primitive that many LLMs don't always get the details right. This code was written by a human who understands how they work.

## Roadmap

This is an intentionally unordered list:

- Tests 👼
- Module caching
- Third party component analysis
- Custom prop checking functions
- Client-side rendering analysis
