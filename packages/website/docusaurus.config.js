const path = require('node:path');

const clidocPlugin = require('@clidoc/docusaurus');

const siteDir = __dirname;

module.exports = {
  title: 'clidoc',
  tagline: 'One CLI contract. Useful documentation everywhere.',
  favicon: 'img/clidoc.svg',
  url: process.env.SITE_URL ?? 'https://clidoc.ben3d.ca',
  baseUrl: process.env.BASE_URL ?? '/',
  organizationName: 'bhouston',
  projectName: 'clidoc',
  onBrokenLinks: 'throw',
  markdown: { format: 'md' },
  presets: [
    [
      'classic',
      {
        docs: { routeBasePath: 'docs', sidebarPath: './sidebars.js' },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  plugins: [
    [
      clidocPlugin,
      {
        input: '../../docs/generated/clidoc.json',
        outputDir: path.join(siteDir, 'docs/cli/reference'),
        basePath: '/cli/reference',
        docsRouteBasePath: '/docs',
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'clidoc',
      items: [
        { to: '/docs', label: 'Docs', position: 'left' },
        { to: '/docs/cli/reference', label: 'CLI reference', position: 'left' },
        { to: '/docs/api', label: 'Core API', position: 'left' },
        { href: 'https://github.com/bhouston/clidoc', label: 'GitHub', position: 'right' },
      ],
    },
    footer: { style: 'dark', copyright: `Copyright © ${new Date().getFullYear()} clidoc · MIT` },
  },
};
