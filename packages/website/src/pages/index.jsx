import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const paths = [
  { title: 'Describe', body: 'Turn real command definitions into an OpenCLI document with a framework adapter.', href: '/docs/adapters/' },
  { title: 'Check', body: 'Validate a JSON or YAML document against the OpenCLI specification.', href: '/docs/guides/core' },
  { title: 'Publish', body: 'Generate command pages for Docusaurus, VitePress, or Markdown.', href: '/docs/guides/publishing' },
];

const frameworks = [
  { name: 'yargs', image: 'yargs-logo.png' },
  { name: 'Commander.js', image: 'commander.svg' },
  { name: 'oclif', image: 'oclif.svg' },
];

const publishers = [
  { name: 'Docusaurus', image: 'docusaurus.svg' },
  { name: 'VitePress', image: 'vitepress.svg' },
];

function IntegrationList({ items, href }) {
  return <div className={styles.integrations}>
    {items.map(({ name, image }) => <Link className={styles.integration} to={href} key={name}>
      <img src={`/img/integrations/${image}`} alt="" loading="lazy" />
      <span>{name}</span>
    </Link>)}
  </div>;
}

export default function Home() {
  return <Layout title="CLI documentation from the source" description="clidoc generates and publishes CLI documentation built upon the OpenCLI specification.">
    <header className={styles.hero}>
      <div className="container">
        <p className={styles.eyebrow}>Built upon the OpenCLI specification</p>
        <h1>CLI documentation from the source</h1>
        <p className={styles.lead}>Generate a CLI document from yargs, Commander.js, or oclif, then publish it with Docusaurus or VitePress.</p>
        <div className={styles.actions}>
          <Link className="button button--primary button--lg" to="/docs">Get started</Link>
          <Link className="button button--secondary button--lg" to="/docs/cli/reference">Explore the CLI</Link>
        </div>
      </div>
    </header>
    <main className="container">
      <section className={styles.support} aria-labelledby="frameworks-title">
        <div><h2 id="frameworks-title">Built for your CLI framework</h2><p>Use built-in adapters for yargs, Commander.js, and oclif to generate an OpenCLI document from the command definitions you already maintain.</p><Link to="/docs/adapters/">Explore the adapters →</Link></div>
        <IntegrationList items={frameworks} href="/docs/adapters/" />
      </section>
      <section className={styles.support} aria-labelledby="publishing-title">
        <div><h2 id="publishing-title">Publish where your docs live</h2><p>Publishing plugins generate command pages for Docusaurus and VitePress. You can also render Markdown for other documentation sites.</p><Link to="/docs/guides/publishing">Explore publishing plugins →</Link></div>
        <IntegrationList items={publishers} href="/docs/guides/publishing" />
      </section>
      <section className={styles.example}>
        <div><h2>Generate from your own CLI</h2><p>Give your CLI a docgen command with an adapter, then validate its OpenCLI document with clidoc.</p><Link to="/docs/guides/cli">Read the CLI guide →</Link></div>
        <pre><code>{`$ npm install -g @clidoc/cli\n$ mycli docgen --output cli.json\n$ clidoc validate cli.json`}</code></pre>
      </section>
      <section className={styles.grid} aria-label="How clidoc works">
        {paths.map(path => <article className={styles.card} key={path.title}>
          <h2>{path.title}</h2><p>{path.body}</p><Link to={path.href}>Learn more →</Link>
        </article>)}
      </section>
    </main>
  </Layout>;
}
