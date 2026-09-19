import path from 'node:path';
import { fileURLToPath } from 'node:url';
import clidocPlugin from '@clidoc/docusaurus';

const siteDir = path.dirname(fileURLToPath(import.meta.url));

export default {
  title: 'clidoc',
  tagline: 'One CLI contract. Useful documentation everywhere.',
  url: 'https://clidoc.dev',
  baseUrl: '/',
  organizationName: 'bhouston',
  projectName: 'clidoc',
  onBrokenLinks: 'throw',
  markdown: { format: 'md' },
  presets: [
    ['classic', {
      docs: { routeBasePath: 'docs', sidebarPath: './sidebars.js' },
      blog: false,
      theme: { customCss: './src/css/custom.css' },
    }],
  ],
  plugins: [[clidocPlugin, {
    input: '../../docs/generated/opencli.json',
    outputDir: path.join(siteDir, 'docs/cli/reference'),
    basePath: '/docs/cli/reference',
  }]],
  themeConfig: {
    navbar: {
      title: 'clidoc',
      items: [
        { to: '/docs/intro', label: 'Docs', position: 'left' },
        { to: '/docs/cli/reference', label: 'CLI reference', position: 'left' },
        { to: '/docs/api', label: 'Core API', position: 'left' },
        { href: 'https://github.com/bhouston/clidoc', label: 'GitHub', position: 'right' },
      ],
    },
    footer: { style: 'dark', copyright: `Copyright © ${new Date().getFullYear()} clidoc · MIT` },
  },
};
