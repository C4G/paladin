import { docs, devDocs } from 'collections/server';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});

export const devDocsSource = loader({
  baseUrl: '/dev-docs',
  source: devDocs.toFumadocsSource(),
});
