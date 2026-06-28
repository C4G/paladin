import Image from 'next/image';
import Link from 'next/link';
import { DonateCTA } from '@/components/donate-cta';

export default function Home() {
  return (
    <div className='flex min-h-screen flex-col bg-background text-foreground'>
      <main className='flex-1'>
        <section className='w-full py-12 md:py-24 lg:py-32'>
          <div className='container mx-auto px-4 md:px-6'>
            <div className='grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]'>
              <div className='flex flex-col justify-center space-y-4'>
                <div className='space-y-2'>
                  <h1 className='font-serif text-3xl font-bold tracking-tighter text-gray-900 dark:text-white sm:text-5xl xl:text-6xl/none'>
                    Welcome to Paladin Farm & Ranch
                  </h1>
                  <p className='max-w-[600px] text-gray-600 dark:text-gray-300 md:text-xl'>
                    At Paladin Farm & Ranch, we deeply honor the healing journey
                    that lies ahead for you, both physically and mentally.
                  </p>
                </div>
                <div className='flex flex-col gap-2 min-[400px]:flex-row'>
                  <Link href='#get-involved'>
                    <button className='rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'>
                      Get Involved
                    </button>
                  </Link>
                  <Link href='#our-services'>
                    <button className='rounded-md border border-gray-900 px-6 py-3 font-medium text-gray-900 dark:border-gray-100 dark:text-gray-100 dark:hover:bg-gray-800'>
                      Our Services
                    </button>
                  </Link>
                </div>
              </div>
              <div className='flex items-center justify-center'>
                <div className='relative aspect-[4/3] w-full max-w-lg overflow-hidden'>
                  <Image
                    alt='Paladin Farm & Ranch Logo'
                    src='/logo.png'
                    fill
                    style={{ objectFit: 'contain' }}
                    priority
                    className='dark:invisible'
                  />
                  <Image
                    alt='Paladin Farm & Ranch Logo'
                    src='/logo-white.png'
                    fill
                    style={{ objectFit: 'contain' }}
                    priority
                    className='invisible dark:visible'
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='w-full bg-white py-12 dark:bg-gray-800 md:py-24 lg:py-32'>
          <div className='container mx-auto px-4 md:px-6'>
            <div className='flex flex-col items-center justify-center space-y-4 text-center'>
              <div className='space-y-2'>
                <h2 className='font-serif text-3xl font-bold tracking-tighter text-gray-900 dark:text-white sm:text-5xl'>
                  Our Vision and Purpose
                </h2>
                <p className='max-w-[900px] text-gray-600 dark:text-gray-300 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed'>
                  A thriving agricultural ecosystem where veterans and first
                  responders transition from service to sustainable cultivation,
                  nourishing both land and soul.
                </p>
              </div>
            </div>
            <div className='mx-auto mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12'>
              {values.map((value) => (
                <div
                  key={value.title}
                  className='flex flex-col rounded-lg bg-gray-50 p-6 shadow-lg dark:bg-gray-700'
                >
                  <h3 className='mb-2 text-xl font-bold text-gray-900 dark:text-white'>
                    {value.title}
                  </h3>
                  <p className='text-gray-600 dark:text-gray-300'>
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id='our-services'
          className='w-full bg-gray-50 py-12 dark:bg-gray-900 md:py-24 lg:py-32'
        >
          <div className='container mx-auto px-4 md:px-6'>
            <div className='flex flex-col items-center justify-center space-y-4 text-center'>
              <div className='space-y-2'>
                <h2 className='font-serif text-3xl font-bold tracking-tighter text-gray-900 dark:text-white sm:text-5xl'>
                  Our Services
                </h2>
                <p className='max-w-[900px] text-gray-600 dark:text-gray-300 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed'>
                  Empowering Heroes, Nourishing Communities
                </p>
              </div>
            </div>
            <div className='mx-auto mt-8 grid gap-6 sm:grid-cols-2 lg:gap-12'>
              {services.map((service) => (
                <div
                  key={service.title}
                  className='flex flex-col rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800'
                >
                  <h3 className='mb-2 text-xl font-bold text-gray-900 dark:text-white'>
                    {service.title}
                  </h3>
                  <p className='text-gray-600 dark:text-gray-300'>
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='w-full bg-white py-12 dark:bg-gray-800 md:py-24 lg:py-32'>
          <div className='container mx-auto px-4 md:px-6'>
            <div className='flex flex-col items-center justify-center space-y-4 text-center'>
              <div className='space-y-2'>
                <h2 className='font-serif text-3xl font-bold tracking-tighter text-gray-900 dark:text-white sm:text-5xl'>
                  Our Horses
                </h2>
                <p className='max-w-[900px] text-gray-600 dark:text-gray-300 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed'>
                  Horses, with their powerful presence and intuitive nature,
                  have a profound way of connecting with the human soul.
                </p>
              </div>
            </div>
            <div className='mx-auto mt-8 max-w-3xl'>
              <p className='mb-4 text-gray-600 dark:text-gray-300'>
                Their innate ability to sense and respond to human emotions
                creates a therapeutic bridge, promoting understanding,
                self-awareness, and healing. Through guided interactions with
                these magnificent animals, individuals find an avenue to process
                past traumas, experience the joy of the present moment, and
                discover a sense of freedom and renewed purpose.
              </p>
              <p className='mb-4 text-gray-600 dark:text-gray-300'>
                At Paladin Farm & Ranch, our horses serve a purpose that
                stretches beyond therapeutic interventions. Their agility and
                responsiveness make them indispensable during disaster
                responses, especially when moving livestock in precarious
                situations. Their innate understanding of the environment,
                combined with their training, ensures that they can navigate
                challenges and help usher animals to safety.
              </p>
              <p className='text-gray-600 dark:text-gray-300'>
                Moreover, our horses play a pivotal role in search and rescue
                missions, proving invaluable in challenging terrains and
                situations. Their significance extends from healing hearts to
                taking action during crises, underscoring their diverse and
                vital contributions.
              </p>
            </div>
          </div>
        </section>

        <section
          id='get-involved'
          className='w-full bg-gray-50 py-12 dark:bg-gray-900 md:py-24 lg:py-32'
        >
          <div className='container mx-auto px-4 md:px-6'>
            <div className='flex flex-col items-center justify-center space-y-4 text-center'>
              <div className='space-y-2'>
                <h2 className='font-serif text-3xl font-bold tracking-tighter text-gray-900 dark:text-white sm:text-5xl'>
                  Get Involved
                </h2>
                <p className='max-w-[600px] text-gray-600 dark:text-gray-300 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed'>
                  Join us in our mission to empower veterans and first
                  responders through agriculture.
                </p>
              </div>
              <div className='w-full max-w-sm space-y-2'>
                <Link href='/contact-us'>
                  <button className='w-full rounded-md bg-blue-600 px-8 py-3 font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'>
                    Contact Us
                  </button>
                </Link>
              </div>
            </div>
            <div className='mx-auto mt-8 grid gap-6 sm:grid-cols-3 lg:gap-12'>
              {involvementOptions.map((option) => (
                <div
                  key={option.title}
                  className='flex flex-col rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800'
                >
                  <h3 className='mb-2 text-xl font-bold text-gray-900 dark:text-white'>
                    {option.title}
                  </h3>
                  <p className='mb-4 text-gray-600 dark:text-gray-300'>
                    {option.description}
                  </p>
                  {option.action && <div>{option.action}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='w-full bg-white py-12 dark:bg-gray-800 md:py-24 lg:py-32'>
          <div className='container mx-auto px-4 text-center md:px-6'>
            <blockquote className='text-2xl font-semibold italic text-gray-700 dark:text-gray-300'>
              &ldquo;I will say of the LORD, &lsquo;He is my refuge and my
              fortress, my God, in whom I trust.&rsquo;&rdquo;
            </blockquote>
            <p className='mt-4 text-gray-600 dark:text-gray-400'>
              Psalm 91:2 NIV
            </p>
          </div>
        </section>
      </main>
      {/* <Script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=USD" /> */}
    </div>
  );
}

const values = [
  {
    title: 'Stewardship & Sustainability',
    description:
      "We prioritize the land's well-being, ensuring our agricultural pursuits are sustainable for generations to come.",
  },
  {
    title: 'Integrity & Respect',
    description:
      'From our heroes to our partners, every interaction is grounded in honesty, respect, and the highest ethical standards.',
  },
  {
    title: 'Community & Collaboration',
    description:
      'Together, as a unified force, we craft holistic solutions, leveraging the collective strength of our community.',
  },
  {
    title: 'Enduring Commitment',
    description:
      'We are not just a fleeting encounter. We are here for the long haul, supporting our heroes and their families through every season of growth.',
  },
];

const services = [
  {
    title: 'Agricultural Training & Education',
    description:
      'Our flagship initiative taps into the therapeutic nature of farming. By intertwining structured learning with hands-on experience, we equip our heroes with invaluable skills, paving the way for successful integration into the agricultural sector.',
  },
  {
    title: 'Disaster Response & Management',
    description:
      'Marrying the expertise of our trained veterans and first responders with state-of-the-art resources, this program ensures rapid, efficient, and compassionate disaster response and recovery. In the wake of adversity, we rebuild, renew, and rise.',
  },
  {
    title: 'Sustainable Land and Ranch Management',
    description:
      'Envisioning a greener future, this program focuses on sustainable land practices, optimizing productivity while safeguarding our environment. Under the diligent care of our heroes, lands flourish and communities prosper.',
  },
  {
    title: 'Equine & K-9 Search and Rescue',
    description:
      'With a unique synergy between man, horse, and dog, our search and rescue program offers hope in the direst of situations. Together, we ensure that no one is left behind.',
  },
];

const involvementOptions = [
  {
    title: 'For Donors',
    description:
      'Every contribution accelerates our mission to transform lives and landscapes. Help sow seeds of change.',
    action: <DonateCTA />,
  },
  {
    title: 'For Partners and Volunteers',
    description:
      'Collaborate with us in this journey of growth, resilience, and empowerment. Your skills, time, and commitment can make a profound impact.',
  },
  {
    title: 'For Veterans & First Responders',
    description:
      "Discover a path to healing, growth, and a renewed sense of purpose in the heart of our nation's farmlands. Join us, and let's cultivate futures together.",
  },
];
