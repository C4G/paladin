import { Prisma } from '@prisma/client';

export type Request = Prisma.RequestGetPayload<{
  include: {
    farm: {
      select: {
        latitude: true;
        longitude: true;
        name: true;
        organizationId: true;
      };
    };
    user: { select: { name: true; email: true } };
    id: true;
    disasterType: true;
    createdAt: true;
    closedOn: true;
  };
}>;

export const getDisasterTypeColors = (disasterType: string): string => {
  const type = disasterType.toLowerCase();
  switch (type) {
    case 'hurricane':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'flood':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
    case 'fire':
    case 'wildfire':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'tornado':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'drought':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'frost':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200';
    default:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  }
};

export const RequestList = ({
  title,
  requests,
  onSelect,
  selectedId,
  compact = false,
}: {
  title?: string;
  requests: Request[];
  onSelect?: (_request: Request) => void;
  selectedId?: string;
  compact?: boolean;
}) => (
  <div className={compact ? '' : 'mb-6'}>
    {title && (
      <div className={compact ? 'mb-2' : 'mb-4 pb-4 pt-2'}>
        <h2
          className={
            compact
              ? 'text-sm font-medium text-gray-800 dark:text-white'
              : 'text-2xl font-bold text-gray-800 dark:text-white'
          }
        >
          {title}
        </h2>
      </div>
    )}
    <div>
      {requests.length === 0 ? (
        <p className='text-gray-600 dark:text-gray-400'>No requests found.</p>
      ) : (
        <ul className={compact ? 'space-y-1' : 'space-y-4'}>
          {requests.map((request) => (
            <li
              key={request.id}
              className={`cursor-pointer rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                compact ? 'px-2 py-1.5' : 'p-4 shadow hover:shadow-lg'
              } ${
                selectedId === request.id
                  ? 'bg-primary/10 ring-2 ring-primary dark:bg-primary/20'
                  : request.closedOn
                    ? 'bg-gray-50 opacity-70 hover:bg-gray-100 hover:opacity-100 dark:bg-gray-800/50 dark:hover:bg-gray-700'
                    : 'bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
              }`}
              onClick={() =>
                onSelect
                  ? onSelect(request)
                  : (window.location.href = `/dashboard?requestId=${request.id}`)
              }
            >
              <div className='flex items-center justify-between gap-2'>
                <div
                  className={`min-w-0 flex-1 ${compact ? 'space-y-0.5' : 'space-y-1'}`}
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <span
                      className={`inline-flex shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${request.closedOn ? 'line-through decoration-muted-foreground/50' : ''} ${getDisasterTypeColors(request.disasterType)}`}
                    >
                      {request.disasterType.charAt(0).toUpperCase() +
                        request.disasterType.slice(1).toLowerCase()}
                    </span>
                    {compact && request.farm?.name && (
                      <span
                        className={`truncate text-xs font-medium text-gray-700 dark:text-gray-300 ${request.closedOn ? 'line-through decoration-muted-foreground/50' : ''}`}
                      >
                        {request.farm.name}
                      </span>
                    )}
                  </div>
                  {!compact && (
                    <>
                      <p className='text-sm text-gray-600 dark:text-gray-300'>
                        📍 {request.farm.latitude.toFixed(4)},{' '}
                        {request.farm.longitude.toFixed(4)}
                      </p>
                      <p className='text-xs text-gray-400 dark:text-gray-500'>
                        ID: {request.id.slice(0, 8)}...
                      </p>
                    </>
                  )}
                </div>
                <svg
                  className='h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);
