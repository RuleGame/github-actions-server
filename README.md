# GitHub Actions Server for Sapir

Simple server that handles GitHub Actions Uploads.

Requires a `config.json` and `.secret` file where the former contains a mapping of projects to its config with the shape:

```ts
type Config = {
    [project: string]: {
        basePath: string,
    }
}
```

The `.secret` file contains the key that each upload must include in its form data.
