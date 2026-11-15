# MYCA public-site replica audit

Captured against the public website on 2026-11-15.

## Reference behavior and shell

- Public site is a Next.js web app presented in a centered mobile rail with a maximum width of 448px.
- Outer desktop canvas: pale cyan/blue-gray; app surface: very light blue; white sticky header and bottom navigation.
- Header: hamburger, location selector, MYCA logo, notifications.
- Bottom navigation: خانه، درخواست‌ها، پیام‌ها، پروفایل.
- Home page: photographic elder-care hero, floating search field, three primary service cards, call-to-advice card, my-requests card.
- Main navigation drawer: contact, about section, care and corporate links, review/leave/comment/revision/ticket actions, role login links, service catalogs.
- Location selector: searchable location, current-location action, map loading placeholder, editable address, save/cancel.
- Search term سالمند returns three subcategories and nine shift suggestions.
- Login routes inspected: receiver, recruitment partner, support office. OTP/password modes and terms checkbox were recorded. Recruitment partner adds employee checkbox and person type; support office adds person type.
- Catalogs: myca-products (10 pages), elder-home (5 pages), elders-pricing (3 pages). Original PDF routes redirect back to the public MYCA domain.

## Public category routes captured

| Route | Visible page title |
|---|---|
| /category/11 | مراقبت از سالمند |
| /category/12 | مراقبت از کودک |
| /category/13 | پرستاری و مراقبت بیمار |
| /category/14 | امور منزل |
| /category/17 | مشاوره و همراهی |
| /category/22 | سالمند مستقل |
| /category/27 | پرستار نوزاد |
| /category/32 | مراقبت ویژه |

## Known gaps to inspect

- Remaining category child routes and their exact destination IDs.
- About section iframe source and content.
- Authenticated customer/provider/partner dashboards.
- Actual OTP, password, request, messaging and ticket APIs.
- Location search provider and map implementation.
- Exact downloadable catalog PDF assets and any server headers.
- Responsive screenshots at tablet and desktop widths.

## Source-of-truth note

The live public site is the fidelity target for its currently visible pages. The supplied MYCA Design Language v1.0 remains the canonical reference for future product surfaces. The live site's observed public palette and typography differ from the design-language tokens; this difference is intentional and documented rather than silently reconciled.


## Pricing catalog implementation — 2026-11-15

- Added a web-based elderly pricing catalog at /catalogs/elders-pricing using Elders Pricing 02.pdf.
- Added a web-based child-care pricing catalog at /catalogs/pedia using pedia 01.pdf.
- Implemented the monthly wage packages and the one-time commission schedule shown in the source PDFs.
- Added a contract-term calculator and source notes. Night shift, Friday attendance and additional-child surcharges are disclosed but excluded from the base estimate where the source does not provide a complete numeric calculation basis.
- Updated shared color tokens to the MYCA Design Language v1.0 palette and set the mobile content rail to 393px.
