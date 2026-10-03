Browser review — 2026-10-03

Observed local landing page with Startup/Silver/Gold/Diamond plans, registration step one, required-field errors on empty Continue, member login, contact/support page and anonymous admin/settings redirect to admin/login.

Fixed shared text/select input label associations and error descriptions, direct registration gender/birth/password labels, named password visibility buttons, login labels/autocomplete/required attributes and contact labels. Browser accessibility tree confirms registration/login/contact inputs now have names. TypeScript passed.

Contact map was blocked by frame-src. Allowed the two precise hosts used by its original Google Maps URL and redirect (maps.google.com and www.google.com); browser now shows the actual map controls and attribution. Removed contradictory empty support state when a guest receives the sign-in error.

Signed-in member/admin browser acceptance is still pending. Asked owner to sign in as a test member. No credentials were created or changed in the browser, no account was submitted, no live announcement/payment was made. Mobile viewport acceptance remains pending.

Mobile follow-up: tested 390x844 viewport. Menu opens and exposes navigation. Fixed rotated hero decoration causing scroll width 396 versus client width 382; after containment both equal 382. Registration and contact also have equal content/client widths. Moved floating WhatsApp above mobile bottom navigation to uncover Profile tab. TypeScript passed. Browser viewport reset after testing; signed-in journey still pending.
