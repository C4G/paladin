'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const color =
    score >= 90
      ? 'text-green-500 border-green-500/30 bg-green-500/10'
      : score >= 50
        ? 'text-orange-400 border-orange-400/30 bg-orange-400/10'
        : 'text-red-500 border-red-500/30 bg-red-500/10';

  return (
    <div className='flex flex-col items-center gap-1'>
      <div
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full border-2 text-xl font-bold',
          color
        )}
      >
        {score}
      </div>
      <span className='text-xs text-muted-foreground'>{label}</span>
    </div>
  );
}

const reports = [
  {
    id: 'desktop',
    title: 'Desktop',
    date: 'April 23, 2026',
    screenshot: '/lighthouse-desktop.png',
    scores: {
      performance: 99,
      accessibility: 96,
      bestPractices: 100,
      seo: 100,
    },
  },
  {
    id: 'mobile',
    title: 'Mobile',
    date: 'April 23, 2026',
    screenshot: '/lighthouse-mobile.png',
    scores: {
      performance: 96,
      accessibility: 96,
      bestPractices: 100,
      seo: 100,
    },
  },
];

export default function LighthouseReportPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const desktop = reports[0].scores;
  const mobile = reports[1].scores;

  return (
    <div className='flex flex-col gap-8'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-semibold tracking-tight'>
          Lighthouse Report
        </h1>
        <p className='text-sm text-muted-foreground'>
          All audits were run in Chrome Incognito mode to ensure no extensions
          or cached data affected the results.
        </p>
      </div>

      {/* Summary comparison */}
      <div className='overflow-hidden rounded-lg border border-border'>
        <table className='w-full text-left text-sm'>
          <thead className='border-b border-border bg-muted/50'>
            <tr>
              <th className='px-4 py-3 font-medium text-muted-foreground'>
                Metric
              </th>
              <th className='px-4 py-3 text-center font-medium text-muted-foreground'>
                Desktop
              </th>
              <th className='px-4 py-3 text-center font-medium text-muted-foreground'>
                Mobile
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {(
              [
                ['Performance', desktop.performance, mobile.performance],
                ['Accessibility', desktop.accessibility, mobile.accessibility],
                ['Best Practices', desktop.bestPractices, mobile.bestPractices],
                ['SEO', desktop.seo, mobile.seo],
              ] as const
            ).map(([label, d, m]) => (
              <tr key={label} className='transition-colors hover:bg-muted/50'>
                <td className='px-4 py-3 font-medium'>{label}</td>
                <td className='px-4 py-3 text-center'>{d}</td>
                <td className='px-4 py-3 text-center'>{m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Individual reports with expandable screenshots */}
      <div className='flex flex-col gap-4'>
        {reports.map((report) => (
          <div
            key={report.id}
            className='overflow-hidden rounded-lg border border-border'
          >
            <button
              onClick={() =>
                setExpandedId(expandedId === report.id ? null : report.id)
              }
              className='flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-muted/50'
            >
              <div className='flex items-center gap-6'>
                <div>
                  <h3 className='font-semibold'>{report.title}</h3>
                  <p className='text-xs text-muted-foreground'>{report.date}</p>
                </div>
                <div className='flex gap-4'>
                  <ScoreBadge label='Perf' score={report.scores.performance} />
                  <ScoreBadge
                    label='A11y'
                    score={report.scores.accessibility}
                  />
                  <ScoreBadge label='BP' score={report.scores.bestPractices} />
                  <ScoreBadge label='SEO' score={report.scores.seo} />
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                  expandedId === report.id && 'rotate-180'
                )}
              />
            </button>
            {expandedId === report.id && (
              <div className='flex flex-col gap-3 border-t border-border bg-muted/30 p-4'>
                <p className='text-xs text-muted-foreground'>
                  Screenshot captured in Chrome Incognito mode
                </p>
                <div className='relative overflow-hidden rounded-md border border-border'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.screenshot}
                    alt={`Lighthouse report - ${report.title}`}
                    className='w-full object-contain'
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className='hidden p-8 text-center text-sm text-muted-foreground'>
                    Screenshot not found. Save the image to{' '}
                    <code className='rounded bg-muted px-1 py-0.5 text-xs'>
                      public{report.screenshot}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PWA Section */}
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <h2 className='text-xl font-semibold tracking-tight'>
            Progressive Web App
          </h2>
          <p className='text-sm text-muted-foreground'>
            PWA installability was verified via Chrome DevTools. The site is
            installable as a Progressive Web App.
          </p>
        </div>
        <div className='overflow-hidden rounded-lg border border-border'>
          <button
            onClick={() => setExpandedId(expandedId === 'pwa' ? null : 'pwa')}
            className='flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-muted/50'
          >
            <div className='flex items-center gap-6'>
              <div>
                <h3 className='font-semibold'>PWA Installability</h3>
                <p className='text-xs text-muted-foreground'>
                  Verified April 23, 2026
                </p>
              </div>
              <ScoreBadge label='PWA' score={100} />
            </div>
            <ChevronDown
              className={cn(
                'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                expandedId === 'pwa' && 'rotate-180'
              )}
            />
          </button>
          {expandedId === 'pwa' && (
            <div className='flex flex-col gap-3 border-t border-border bg-muted/30 p-4'>
              <p className='text-xs text-muted-foreground'>
                Screenshots from Chrome DevTools Application panel
              </p>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='overflow-hidden rounded-md border border-border'>
                  <p className='border-b border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground'>
                    Installability Check
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src='/PWA_installability.png'
                    alt='PWA installability verification'
                    className='w-full object-contain'
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className='hidden p-8 text-center text-sm text-muted-foreground'>
                    Screenshot not found. Save the image to{' '}
                    <code className='rounded bg-muted px-1 py-0.5 text-xs'>
                      public/PWA_installability.png
                    </code>
                  </div>
                </div>
                <div className='overflow-hidden rounded-md border border-border'>
                  <p className='border-b border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground'>
                    Installed PWA
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src='/PWA_installed.png'
                    alt='PWA installed on device'
                    className='w-full object-contain'
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className='hidden p-8 text-center text-sm text-muted-foreground'>
                    Screenshot not found. Save the image to{' '}
                    <code className='rounded bg-muted px-1 py-0.5 text-xs'>
                      public/PWA_installed.png
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
