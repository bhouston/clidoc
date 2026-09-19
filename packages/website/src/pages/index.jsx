import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const paths = [
  { title: 'Describe', body: 'Turn real command definitions into an OpenCLI document with a framework adapter.', href: '/docs/adapters/' },
  { title: 'Check', body: 'Validate a JSON or YAML document against the OpenCLI specification.', href: '/docs/guides/core' },
  { title: 'Publish', body: 'Generate command pages for Docusaurus, VitePress, or Markdown.', href: '/docs/guides/publishing' },
];

export default function Home() {
  return <Layout title="CLI documentation from the source" description="clidoc generates and publishes CLI documentation built upon the OpenCLI specification.">
    <header className={styles.hero}>
      <div className="container">
        <p className={styles.eyebrow}>Built upon the OpenCLI specification</p>
        <h1>CLI documentation from the source</h1>
        <p className={styles.lead}>clidoc gives your commands a portable contract, then turns that contract into documentation people can use.</p>
        <div className={styles.actions}>
          <Link className="button button--primary button--lg" to="/docs">Get started</Link>
          <Link className="button button--secondary button--lg" to="/docs/cli/reference">Explore the CLI</Link>
        </div>
      </div>
    </header>
    <main className="container">
      <section className={styles.grid} aria-label="How clidoc works">
        {paths.map(path => <article className={styles.card} key={path.title}>
          <h2>{path.title}</h2><p>{path.body}</p><Link to={path.href}>Learn more →</Link>
        </article>)}
      </section>
      <section className={styles.example}>
        <div><h2>Use the same contract everywhere</h2><p>Generate once from your CLI, check it with the core library, and publish command pages in your documentation site.</p><Link to="/docs/guides/cli">Read the CLI guide →</Link></div>
        <pre><code>{`$ npm install -g @clidoc/cli\n$ mycli docgen --output cli.json\n$ clidoc validate cli.json\n$ clidoc markdown cli.json --output reference.md`}</code></pre>
      </section>
    </main>
  </Layout>;
}
