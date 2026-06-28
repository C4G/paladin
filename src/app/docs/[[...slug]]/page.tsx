import { source } from '@/lib/source';
import { Mermaid } from '@/components/docs/Mermaid';
import { CopyableCodeBlock } from '@/components/docs/CopyableCodeBlock';
import { notFound } from 'next/navigation';

export default async function DocsPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <article className='mx-auto max-w-3xl'>
      <header className='mb-8 border-b pb-6'>
        <h1 className='mb-3 text-3xl font-bold tracking-tight'>
          {page.data.title}
        </h1>
        {page.data.description && (
          <p className='text-lg leading-relaxed text-muted-foreground'>
            {page.data.description}
          </p>
        )}
      </header>
      <div className='prose prose-neutral max-w-none dark:prose-invert'>
        <MDX components={{ Mermaid, pre: CopyableCodeBlock }} />
      </div>
    </article>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
