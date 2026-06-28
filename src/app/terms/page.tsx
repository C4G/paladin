import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { pageConsentText, termsContent } from '@/components/terms-content';

export default function TermsPage() {
  return (
    <div className='container mx-auto max-w-full px-3 py-4 sm:max-w-4xl sm:px-4 sm:py-6 md:py-8'>
      <Card className='overflow-hidden shadow-sm'>
        <CardHeader className='p-4 text-center sm:p-6'>
          <CardTitle className='text-xl sm:text-2xl md:text-3xl'>
            Legal Disclaimer & User Agreement
          </CardTitle>
          <CardDescription className='text-sm sm:text-base'>
            Terms and conditions for using the Paladin Disaster Assistance
            Application
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 p-4 sm:space-y-6 sm:p-6'>
          {termsContent.map((section, index) => (
            <div key={section.title} className='space-y-1.5 sm:space-y-2'>
              <h2 className='text-lg font-semibold sm:text-xl'>
                {section.title}
              </h2>
              <div className='text-sm leading-relaxed sm:text-base sm:leading-7'>
                {section.content}
              </div>
              {index < termsContent.length - 1 && (
                <Separator className='mt-4 sm:mt-6' />
              )}
            </div>
          ))}

          <Separator />

          <div className='space-y-1.5 sm:space-y-2'>
            <h2 className='text-lg font-semibold sm:text-xl'>
              Consent Agreement
            </h2>
            <div className='text-sm leading-relaxed sm:text-base sm:leading-7'>
              {pageConsentText}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
