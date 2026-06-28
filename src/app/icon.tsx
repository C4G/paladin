import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: 'white',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
      }}
    >
      <div
        style={{
          width: '80%',
          height: '80%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid black',
          transform: 'rotate(45deg)',
        }}
      >
        <div
          style={{
            color: '#800020',
            fontSize: '20px',
            fontWeight: 'bold',
            transform: 'rotate(-45deg)',
          }}
        >
          P
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
