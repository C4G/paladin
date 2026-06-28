import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Presentation Slides',
  description: 'Project presentation slides',
};

export default function PresentationSlidesPage() {
  return (
    <div className='space-y-6'>
      <h1 className='text-2xl font-semibold'>Presentation Slides</h1>

      <a
        href='https://gtvault-my.sharepoint.com/:p:/g/personal/sreth3_gatech_edu/IQAnzf6z4K4TQq3qFxVUfUp9AWc8BF34FGzBnDhlTUMGrlg?e=q3UbCq'
        target='_blank'
        rel='noopener noreferrer'
        className='inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition hover:bg-blue-700'
      >
        View Slide Deck
      </a>

      <a
        href='https://gtvault-my.sharepoint.com/:v:/g/personal/sreth3_gatech_edu/IQA3QHwYYFp-RpIEVYsi15GCAezkL-t2IPUL08L05TJyxwU?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=IhdJTt'
        target='_blank'
        rel='noopener noreferrer'
        className='inline-block rounded-lg bg-gray-800 px-6 py-3 text-white transition hover:bg-gray-900'
      >
        Watch Presentation Video
      </a>
    </div>
  );
}
