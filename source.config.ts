import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';

export const docs = defineDocs({
  dir: 'content/docs',
});

export const devDocs = defineDocs({
  dir: 'content/dev-docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid],
  },
});
