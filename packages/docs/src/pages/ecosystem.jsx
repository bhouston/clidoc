import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

export default function Ecosystem() {
  return (
    <Layout
      title="OpenCLI ecosystem"
      description="Explore the OpenCLI specification, Go code generation, and clidoc’s JavaScript and TypeScript tooling."
    >
      <header className={styles.hero}>
        <div className="container">
          <p className={styles.eyebrow}>The OpenCLI ecosystem</p>
          <h1>A shared language for command-line tools</h1>
          <p className={styles.lead}>
            clidoc builds on OpenCLI: an open specification for describing a CLI independently of its implementation
            language or framework.
          </p>
          <div className={styles.actions}>
            <Link className="button button--primary button--lg" to="https://opencli.dev">
              Visit OpenCLI.dev
            </Link>
            <Link className="button button--secondary button--lg" to="https://opencli.dev/specification">
              Read the specification
            </Link>
          </div>
        </div>
      </header>
      <main className="container">
        <section className={styles.grid} aria-label="OpenCLI projects and tools">
          <article className={styles.card}>
            <h2>OpenCLI.dev</h2>
            <p>
              The home of the specification, with guides and a live editor for authoring CLI documents. Its ocli tool
              validates documents and generates documentation and CLI code.
            </p>
            <p>
              <Link to="https://opencli.dev/docs/getting-started">Follow the OpenCLI guide →</Link>
            </p>
            <Link to="https://opencli.dev/editor">Try the live editor →</Link>
          </article>
          <article className={styles.card}>
            <h2>Go code generation</h2>
            <p>
              OpenCLI’s ocli tool generates Go CLI scaffolding for Cobra and urfave/cli from an OpenCLI document. Define
              the interface in the spec, generate the framework code, then implement your command handlers.
            </p>
            <Link to="https://opencli.dev/docs/code-generation-go">Explore Go support →</Link>
          </article>
          <article className={styles.card}>
            <h2>JavaScript &amp; TypeScript</h2>
            <p>
              clidoc brings existing yargs, Commander.js, and oclif commands into the ecosystem. Export an OpenCLI
              document, validate it, and publish documentation with Docusaurus, VitePress, or Markdown.
            </p>
            <p>
              <Link to="/docs/frameworks/">Explore clidoc integrations →</Link>
            </p>
            <Link to="/docs/publishing">Publish your documentation →</Link>
          </article>
        </section>
        <section className={styles.example} aria-labelledby="shared-spec-title">
          <div>
            <h2 id="shared-spec-title">One specification, more possibilities</h2>
            <p>
              Whether you start with an OpenCLI document or extract one from an existing CLI, the specification gives
              tools a common way to describe commands, arguments, and flags.
            </p>
          </div>
          <div>
            <p>
              OpenCLI is evolving. Check the specification version supported by each tool when sharing documents across
              the ecosystem.
            </p>
            <Link to="https://github.com/bcdxn/opencli">Explore the OpenCLI repository →</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
