import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.dirname(fileURLToPath(import.meta.url));

import opencliPlugin from '@opencli/docusaurus';

module.exports = {
  title: 'OpenCLI',
  tagline: 'One CLI contract. Documentation everywhere.',
  url: 'https://bhouston.github.io',
  baseUrl: '/opencli/',
  organizationName: 'bhouston',
  projectName: 'opencli',
  onBrokenLinks: 'throw',
  markdown: { format: 'md' },
  presets: [['classic', { docs: { routeBasePath: '/', sidebarPath: './sidebars.js' }, blog: false }]],
  plugins: [
    [
      opencliPlugin,
      {
        input: '../../docs/generated/opencli.json',
        outputDir: path.join(siteDir, 'docs/reference'),
        basePath: '/reference',
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'OpenCLI',
      items: [
        { to: '/', label: 'Guide', position: 'left' },
        { href: 'https://github.com/bhouston/opencli', label: 'GitHub', position: 'right' },
      ],
    },
    footer: { style: 'dark', copyright: 'MIT · OpenCLI JS/TS' },
  },
};
