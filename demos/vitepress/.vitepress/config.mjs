import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { writeVitePress } from '@opencli/vitepress';

const document = JSON.parse(await readFile(new URL('../../../docs/generated/opencli.json', import.meta.url), 'utf8'));
const sidebar = await writeVitePress(document, {
  outputDir: fileURLToPath(new URL('..', import.meta.url)),
  basePath: '/reference',
});

export default {
  title: 'OpenCLI',
  description: 'CLI metadata to Markdown, wherever you publish.',
  themeConfig: {
    nav: [{ text: 'Guide', link: '/' }],
    sidebar: [{ text: 'CLI reference', items: sidebar }],
    socialLinks: [{ icon: 'github', link: 'https://github.com/bhouston/opencli' }],
  },
};
