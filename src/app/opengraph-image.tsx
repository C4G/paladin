import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Paladin Farm & Ranch';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: 'white',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px solid black',
          width: '120px',
          height: '120px',
          transform: 'rotate(45deg)',
        }}
      >
        <div
          style={{
            color: '#800020',
            fontSize: '64px',
            fontWeight: 'bold',
            transform: 'rotate(-45deg)',
          }}
        >
          P
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            color: '#800020',
            fontSize: '48px',
            fontWeight: 'bold',
            fontFamily: 'serif',
          }}
        >
          PALADIN
        </div>
        <div
          style={{
            color: 'black',
            fontSize: '32px',
          }}
        >
          FARM & RANCH
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
