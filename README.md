# YogaFlow interactive prototype 2.0

A browser-based prototype for the Yoga H’om studio project (Team RAS). Sprint 2 adds the business rules the studio confirmed in the Sprint 1 review.

## Run

Open [`index.html`](index.html) in a modern browser. No installation or server is needed.

Use **Preview as** to switch between Studio Manager, Studio Staff, Instructor (Maya Chen), and Customer (Alex Morgan). Changes are kept in the browser. **Reset sample data** restores the starting records.

## What changed in Sprint 2

| Studio answer (Sprint 1 review) | Where to see it |
| --- | --- |
| Schedule icons: registered, full / waiting list, etc. | Class schedule |
| Passes have an effective start date and a validity period the studio can change | Passes & purchases, Pass settings |
| Senior discount applied automatically from the date of birth | Passes & purchases (try Jordan Lee · 412-555-0102) |
| Payments recorded in the studio’s current system in Release 1 | Passes & purchases |
| Instructors run check-in; check-in opens 30 minutes before class | Class check-in (Instructor view) |
| No eligible pass: buy one before class | Class check-in → Sell a pass |
| Earliest-expiring pass used automatically | Class check-in (Alex Morgan has two passes) |
| Unconfirmed payment, early arrival, full class: staff may override with a reason | Class check-in (Staff view, Priya Shah) |
| Roster locks when the instructor submits it; only the instructor reopens | Class check-in → Submit roster |
| Required customer fields; same names told apart by phone | Customers → Register customer |
| Ordinary passes do not cover workshops or special programs | Check Alex into Yoga & Breathwork |
| Two reports per role; instructors see only their own pay | Reports |
| Paper passes logged as customers walk in | Passes & purchases → Log a paper pass |
| Free class needs a customer record | Community Free Class |
| Scheduling checks instructor, room, and studio calendar | Manage schedule → Create class |

## Demo path (about 90 seconds)

1. **Instructor**: Class check-in → Alex Morgan. The 4-Class Pass is chosen because it expires first. Confirm, then Submit roster.
2. **Staff**: Class check-in → Priya Shah. Payment is pending, so tick the override, give a reason, and confirm.
3. **Staff**: Passes & purchases → Jordan Lee (412-555-0102). The senior discount is already applied.
4. **Manager**: Manage schedule → Create class on the same evening as Vinyasa Flow. The room and instructor conflicts are shown.
5. **Manager**: Reports → Sales report and Attendance & utilization.

## Files

- `index.html`: app shell
- `styles.css`: visual design (Sprint 1 styles plus a short Sprint 2 section)
- `domain.js`: domain layer: classes, business rules, and controllers (mirrors the class diagrams in Report 2.0)
- `app.js`: user interface; calls the controllers in `domain.js`
- `docs/`: project reports

## Scope

Front-end prototype with sample data. There is no server, sign-in, or payment processing. Prices and the senior discount rate are sample values.
