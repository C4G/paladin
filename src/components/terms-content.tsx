import type React from 'react';

export interface TermsSection {
  title: string;
  content: React.ReactNode;
}

export const termsContent: TermsSection[] = [
  {
    title: 'Limitation of Liability',
    content: (
      <p>
        Paladin Farm and Ranch, 501(c)3 (&quot;Paladin&quot;) is not responsible
        or liable for any damages, theft, loss, or criminal negligence that may
        occur as a result of using this application. This platform serves solely
        as a networking and coordination tool for disaster assistance and does
        not assume liability for the actions or omissions of its users or
        responders.
      </p>
    ),
  },
  {
    title: 'Privacy Policy',
    content: (
      <p>
        Your personal information is protected. Paladin respects your privacy
        and will never sell, rent, or share your information with third-party
        entities for marketing purposes. Information collected is used only for
        the purpose of providing and improving disaster-related services.
      </p>
    ),
  },
  {
    title: 'Prosecution of Criminal Activity',
    content: (
      <p>
        Any criminal misuse of this application—including, but not limited to,
        fraud, impersonation, or misrepresentation—will be reported to law
        enforcement. Paladin will actively cooperate with and support legal
        prosecution of individuals or entities found to be engaging in criminal
        behavior through the use of this platform.
      </p>
    ),
  },
  {
    title: 'Nonprofit Status & Subscription Requirement',
    content: (
      <p>
        Paladin is a registered 501(c)(3) nonprofit organization. Access to this
        application requires a monthly donation, which supports our ongoing
        mission to assist rural and underserved communities in times of crisis.
        These donations are tax-deductible to the extent allowed by law.
      </p>
    ),
  },
];

export const consentText = (
  <p>
    By checking this box, I acknowledge that I have read, understood, and agree
    to the terms and conditions stated above. I understand that this application
    is a nonprofit resource network and not a guarantee of services, and I
    consent to Paladin&apos;s privacy practices and legal policies as described.
  </p>
);

export const pageConsentText = (
  <p>
    By using this application, you acknowledge that you have read, understood,
    and agree to the terms and conditions stated above. You understand that this
    application is a nonprofit resource network and not a guarantee of services,
    and you consent to Paladin&apos;s privacy practices and legal policies as
    described.
  </p>
);
