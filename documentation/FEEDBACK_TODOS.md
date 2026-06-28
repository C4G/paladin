# Peer Feedback

March 2026

## Completed

- [x] renaming "Contact" to the more conventional "Contact Us"
  - Renamed
- [x] I think there was some incongruity between the instruction to "respond to an existing disaster request" and the UI label of "add my availability," and it took me a moment to realize that adding my availability was responding. I thought listing equipment should be optional for requests.
  - Made terminology consistent (was previously different based on if you were the one responding to your own request).
- [x] it was not apparent at first where I should create an organization (need to go to the Orgs tab to find the create "tab" instead of button) Instead of tabs, if they were buttons and included a more descriptive wording such as "Create an Organization", it would be easier to navigate.
  - Added "Create org" and "Join org" buttons on the "My organizations" page when you are not yet a part of an org, to guide new users to these options.
- [x] Finding an existing request was somewhat challenging, as I couldn't find any kind of list of existing requests. I zoomed out on the map element until I saw one.
  - Improved empty state in "Nearby" and "Members" tabs: now shows "No requests in this area" with a "Show all active requests" button that fetches all requests and zooms the map to fit them.
  - Added "All Requests" and "All Farms" links next to the "Disaster Requests" heading for quick access at any time without having to manually zoom out
- [x] For task 6, it took me 3 minutes to open the address of an existing request directly in Google or Apple Maps. I find it a little bit difficult to navigate the task because I had to click on the "Nearby" tab to see the fire response and then use the three dots to open the address.
  - Made the address and coordinates text directly clickable in the request detail panel. Clicking either opens a dropdown with Google Maps, Apple Maps, and Copy options — no longer hidden behind a three-dot menu.
- [x] users might not immediately interpret the red indicator as a disaster response. It might also be difficult to find the respond to request action since it is located at the bottom right of the screen. It is also difficult to know what expanding the response leads to cancelling my request. If a lot of people respond to the requests, then the site view can be ingested with users.
  - Moved respond to request button to the top to be more prominant
  - Limited initial responder list display to a default of 3, putting the rest under a toggle to avoiding crowding up the view.
- [x] documentation is lacking. There is a little bit about the program and an FAQ, but documentation about how to do things around the website is not there. Doing the survey required some fumbling around that took longer than average.
  - Overhauled documentation on the `Manual` page, adding content for as many features as I could think of.
- [x] Sign up process
  > 1. User registration was somewhat onerous, as I had to enter info about my farm, crops, livestock, and specialized equipment. It would be easier if completing all of this was not necessary at the time of registration.
  > 2. Did not enjoy the long sign up process
  - Crops, Livestock, Equipment, and Emergency Needs tabs now default to "No, I don't have X" — users can skip through without filling them out.
  - Made Total Acreage and Year Established optional on the Farm Details tab.
  - Fixed Google address autofill not clearing validation errors (fields stayed red despite being populated).
  - Fixed persistance issue between tabs of form (clicking from "Profile" to other tabs instead of "Next" didn't save previous inputs, causing red validation errors)

### Could not replicate or functionality already exists:

- [x] The only recommendation is to include an error message when a user is registering a new farm to let the user know that they must fill out all forms
  - This already was in place
- [x] it took me about 3 minutes to create a request on mobile because the dropdown menu could not work. It was neither easy nor difficult to navigate the task. I was not able to select a farm from the dropdown and create a request.
  - Could not replicate - works fine on every size of mobile phone emulation tested.
- [x] Landscape on mobile has a lot of dead space. I would recommend reworking the map view on the right side where the dead space is.
  - No empty space to the right of the map as described. Tested on iPhone SE, iPhone 14 pro max, iPad, Galaxy S8, and more.
- [x] I would focus on improving performance firstly. There are also some layout shift issues, which can make the page feel slightly unstable as it loads. Accessibility is strong overall, but improving button labels and semantic structure would make it even better. From a UX perspective, adding clearer calls to action would help guide users more intentionally through the experience
  - Have not been able to replicate any "layout shift issues". Additionally, no clear feedback provided as to what calls to action are not clear. We've already made efforts to improve CTAs since receiving this feedback, so I will consider this addressed.

## Future Nice To Haves

- [ ] Add a small drop down to pick the urgency of the request or maybe whether the damage is against crop, infrastructure or if human life is at risk
- [ ] Add a spot in the report for photo/video submission
