import { AppInfo } from './app-info';

export function Footer() {
  return (
    <footer className='hidden border-t px-4 py-4 md:flex'>
      <AppInfo isMobile={false} />
    </footer>
  );
}
