# Security policy

The Fabric app playground is a static website: no server, no sign-in, no accounts and no data sent anywhere. Everything runs in your browser. Your project and progress are kept in that browser only.

## What counts as a security issue here

- **The code preview.** The learner's code runs in a sandboxed frame. Anything that lets code in that frame reach the playground page, other sites or the visitor's data is a security issue.
- **Cross-site scripting.** Text, links or saved progress that could run script in the playground page.
- **The build and deploy.** The GitHub Actions workflows and dependencies, for example a compromised or vulnerable package that ships to the site.
- **Secrets.** A credential or token committed to the repository, including in its history.

A wrong step or a wrong fact about Fabric is a mistake, not a security issue. Please [open an issue](https://github.com/goldlayerdata/fabric-app-playground/issues/new?template=step-is-wrong.yml) for those.

## How to report

**Please don't open a public issue for a security problem.** Report it privately:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability**. GitHub's private vulnerability reporting is switched on for this repository.

Include what you found, how to reproduce it, and what it could affect. The maintainers will acknowledge the report, keep you updated, and credit you when it is fixed, unless you'd rather not be named.

## Supported versions

Only the live site (the latest commit on `main`) is supported. Fixes are published by deploying a new version.

## What the repository already does

- Secret scanning and push protection are on.
- Code scanning (CodeQL) runs on pushes and pull requests.
- Dependabot alerts are on.
- Workflows get read-only permissions by default, and `main` can't be force-pushed or deleted.
- Dependencies are pinned to exact versions, and the site loads nothing from a CDN.
