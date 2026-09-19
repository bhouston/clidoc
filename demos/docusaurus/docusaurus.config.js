import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.dirname(fileURLToPath(import.meta.url));

import clidocPlugin from '@clidoc/docusaurus';

module.exports = {
  title: 'clidoc',
  tagline: 'One CLI contract. Documentation everywhere.',
  url: 'https://bhouston.github.io',
  baseUrl: '/clidoc/',
  organizationName: 'bhouston',
  projectName: 'clidoc',
  onBrokenLinks: 'throw',
  markdown: { format: 'md' },
  presets: [['classic', { docs: { routeBasePath: '/', sidebarPath: './sidebars.js' }, blog: false }]],
  plugins: [
    [
      clidocPlugin,
      {
        input: '../../docs/generated/clidoc.json',
        outputDir: path.join(siteDir, 'docs/reference'),
        basePath: '/reference',
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'clidoc',
      items: [
        { to: '/', label: 'Guide', position: 'left' },
        { href: 'https://github.com/bhouston/clidoc', label: 'GitHub', position: 'right' },
      ],
    },
    footer: { style: 'dark', copyright: 'MIT · clidoc' },
  },
};
