'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function UserManualPage() {
  return (
    <div className='container mx-auto max-w-full px-3 py-4 sm:max-w-4xl sm:px-4 sm:py-6 md:py-8'>
      <Card className='overflow-hidden shadow-sm'>
        <CardHeader className='p-4 text-center sm:p-6'>
          <CardTitle className='text-xl sm:text-2xl md:text-3xl'>
            <h1 className='mb-6 text-3xl font-bold'>User Manual</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4 p-4 sm:space-y-6 sm:p-6'>
          <h2 className='text-lg font-semibold sm:text-xl'>Registration</h2>

          <ul className='ml-4 list-decimal text-sm leading-relaxed sm:text-base sm:leading-7 md:ml-8'>
            <li>
              To register a new account, first click &#39;Sign In&#39; in the
              top right of the screen
            </li>
            <li>Click &#39;Sign in with Google&#39;</li>
            <li>Enter an email address</li>
            <li>Enter your password if prompted</li>
            <li>
              In the Registration page, fill in the Profile, Farm Details,
              Crops, Livestock, Equipment and Emergency Needs
            </li>
          </ul>

          <Separator className='mt-4 sm:mt-6' />

          <h2 className='text-lg font-semibold sm:text-xl'>Edit Profile</h2>

          <ul className='ml-4 list-decimal md:ml-8'>
            <li>
              To edit your profile, first select your profile icon in the top
              right of the screen. It will be a circle that displays your google
              account picture
            </li>
            <li>From the menu that appears select &#39;Edit Profile&#39;</li>
            <li>
              Navigate through the tabs and change the information you would
              like to update
            </li>
            <li>
              You may also add, update, and delete other farms if you have more
              than one in this menu
            </li>
            <li>
              When complete, click the &#39;Save Changes&#39; button at the
              bottom of the screen
            </li>
            <li>
              Please note only one farm may be modified, added, or deleted at a
              time
            </li>
          </ul>

          <Separator className='mt-4 sm:mt-6' />

          <h2 className='text-lg font-semibold sm:text-xl'>
            Light and Dark Mode
          </h2>
          <ul className='ml-4 list-decimal md:ml-8'>
            <li>
              To change between light mode and dark mode, first select your
              profile icon in the top right of the screen. It will be a circle
              that displays your google account picture
            </li>
            <li>
              In the menu that appears you will see either &#39;Light Mode&#39;
              or &#39;Dark Mode&#39; depending on your current setting
            </li>
            <li>Click on this menu item to switch to the other option</li>
          </ul>

          <Separator className='mt-4 sm:mt-6' />

          <h2 className='text-lg font-semibold sm:text-xl'>
            Create an emergency request
          </h2>
          <ul className='ml-4 list-decimal md:ml-8'>
            <li>
              To create an emergency request, click the &#39;Create Request&#39;
              button
            </li>
            <li>Select the type of disaster</li>
            <li>Select a farm</li>
            <li>
              (Optional) Select the &#39;Do you have a Gate you want to
              add?&#39; checkbox
            </li>
            <li>(Optional) Select a Gate from the dropdown</li>
            <li>Click Create Request</li>
          </ul>

          <Separator className='mt-4 sm:mt-6' />

          <h2 className='text-lg font-semibold sm:text-xl'>
            View your open requests
          </h2>
          <ul className='ml-4 list-decimal md:ml-8'>
            <li>
              To view your open requests navigate to the Dashboard using the
              &#39;Dashboard&#39; button
            </li>
            <li>
              Allow location sharing via the prompt from your internet browser
            </li>
            <li>
              On a desktop computer or tablet your open requests will appear in
              the &#39;Your Open Requests&#39; menu found on the left side of
              the screen
            </li>
            <li>
              On a mobile device your open requests will appear when the
              &#39;Show Requests&#39; options is clicked
            </li>
            <li>Click on a request to view its details</li>
          </ul>

          <Separator className='mt-4 sm:mt-6' />

          <h2 className='text-lg font-semibold sm:text-xl'>
            View all active requests
          </h2>
          <ul className='ml-4 list-decimal md:ml-8'>
            <li>
              To view all active requests navigate to the Dashboard using the
              &#39;Dashboard&#39; button
            </li>
            <li>
              Allow location sharing via the prompt from your internet browser
            </li>
            <li>
              On a desktop computer or tablet open requests not belonging to you
              will appear under the &#39;Active Requests&#39; menu found on the
              left side of the screen
            </li>
            <li>
              On a mobile device all open requests will appear when the
              &#39;Show Requests&#39; options is clicked
            </li>
            <li>Click on a request to view its details</li>
          </ul>

          <Separator className='mt-4 sm:mt-6' />

          <h2 className='text-lg font-semibold sm:text-xl'>
            Respond to an open request
          </h2>
          <ul className='ml-4 list-decimal md:ml-8'>
            <li>
              To respond to an open requst navigate to the Dashboard using the
              &#39;Dashboard&#39; button
            </li>
            <li>
              Allow location sharing via the prompt from your internet browser
            </li>
            <li>
              Click on the open request you want to respond to. For finding all
              active requests, please refer to the section directly above
            </li>
            <li>Click &#39;Respond to Request&#39;</li>
            <li>
              If your ETA cannot be automatically calculate, please enter it
              based on your distance to the request
            </li>
            <li>List any equipment you will be providing</li>
            <li>Click the &#39;Submit Response&#39; button</li>
          </ul>

          <Separator className='mt-4 sm:mt-6' />

          <h2 className='text-lg font-semibold sm:text-xl'>
            Close your open request
          </h2>
          <ul className='ml-4 list-decimal md:ml-8'>
            <li>
              To close your open request navigate to the Dashboard tab using the
              &#39;Dashboard&#39; button
            </li>
            <li>
              Allow location sharing via the prompt from your internet browser
            </li>
            <li>
              Select the request you would like to close from &#39;Your Open
              Requests&#39;. For assistance finding a specific request, please
              refer to &#39;View your open requests&#39;
            </li>
            <li>
              At the bottom of the &#39;Request Details&#39; menu, select
              &#39;Close Request&#39;
            </li>
            <li>
              Select &#39;Confirm&#39; in the confirmation dialogue to close the
              request
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
