import Link from 'next/link';

interface InfoProps {
  className?: string;
  onLinkClick?: () => void;
  isMobile?: boolean;
}

interface ContactInfo {
  companyName: string;
  address: string;
  email: string;
}

const contactInfo: ContactInfo = {
  companyName: 'Paladin Farm and Ranch',
  address: 'PO Box 7228 Glen Rose, TX 76043',
  email: 'Stephen@PaladinFarmandRanch.com',
};

interface InfoLink {
  href: string;
  label: string;
}

const footerLinks: InfoLink[] = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/team', label: 'Team' },
];

// Contact information component
const ContactInfo = ({
  isMobile,
  currentYear,
}: {
  isMobile: boolean;
  currentYear: number;
}) => {
  const { companyName, address, email } = contactInfo;

  if (isMobile) {
    return (
      <>
        <p className='max-w-full break-words text-center text-xs text-gray-600 dark:text-gray-400'>
          © {currentYear} {companyName}
        </p>
        <p className='max-w-full break-words text-center text-xs text-gray-600 dark:text-gray-400'>
          {address}
        </p>
        <p className='max-w-full break-words text-center text-xs text-gray-600 dark:text-gray-400'>
          {email}
        </p>
      </>
    );
  }

  return (
    <p className='text-sm text-gray-600 dark:text-gray-400'>
      © {currentYear} {companyName} | {address} | {email}
    </p>
  );
};

// Links component
const InfoLinks = ({
  isMobile,
  onLinkClick,
}: {
  isMobile: boolean;
  onLinkClick?: () => void;
}) => {
  const linkClass = isMobile ? 'text-xs' : 'text-sm';
  const containerClass = isMobile ? 'justify-center mt-2' : 'items-center';

  return (
    <div className={`flex ${containerClass} space-x-4`}>
      {footerLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`${linkClass} text-primary hover:underline`}
          onClick={onLinkClick}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
};

export function AppInfo({
  className = '',
  onLinkClick,
  isMobile = false,
}: InfoProps) {
  const currentYear = new Date().getFullYear();

  const containerClass = isMobile
    ? 'flex flex-col items-center space-y-3'
    : 'flex flex-row items-center justify-between w-full';

  return (
    <div className={`${containerClass} ${className}`}>
      <ContactInfo isMobile={isMobile} currentYear={currentYear} />
      <InfoLinks isMobile={isMobile} onLinkClick={onLinkClick} />
    </div>
  );
}
