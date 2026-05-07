# StickyBoard Setup Guide

StickyBoard is a free, self-hosted collaborative sticky-note canvas for classrooms, workshops, staff PD, brainstorming, exit tickets, and group reflection. It uses static HTML files plus Google Sheets and Google Apps Script as the backend.

StickyBoard fills a Jamboard-style need without requiring a paid FigJam, Lucidspark, Padlet, or similar account.

## Files Included

| File | Purpose |
|---|---|
| `index.html` | Public sticky-note canvas. Participants can view and move visible sticky notes. |
| `Submit.html` | Public form for adding sticky notes. |
| `Admin.html` | Password-protected facilitator console for moderation, editing, deletion, and settings. |
| `code.gs` | Google Apps Script backend connected to a Google Sheet. |
| `Setup.md` | This setup guide. |

## What StickyBoard Does

- Lets students, attendees, or staff submit sticky notes.
- Supports multiple sticky-note colors: yellow, blue, green, pink, purple, and orange.
- Allows optional names or team labels.
- Allows optional categories such as `Idea`, `Question`, `Wonder`, `Evidence`, or `Next Step`.
- Displays notes on a collaborative canvas.
- Allows visible notes to be dragged and repositioned.
- Includes an admin console for approving, hiding, editing, or deleting notes.
- Includes a moderation setting:
  - **Moderation ON:** new notes wait for approval.
  - **Moderation OFF:** new notes appear immediately.
- Includes a linked digital citizenship reminder on the board and submit pages.

## Step 1: Create the Google Sheet

1. Go to Google Drive.
2. Create a new Google Sheet.
3. Name it something like `StickyBoard Responses`.
4. Open the sheet.
5. Go to **Extensions > Apps Script**.

## Step 2: Add the Apps Script Backend

1. In Apps Script, delete any starter code.
2. Open `code.gs` from this package.
3. Copy the entire contents of `code.gs`.
4. Paste it into the Apps Script editor.
5. Save the project.
6. Name the Apps Script project `StickyBoard`.

The script will automatically create a sheet tab named `StickyBoard Notes` the first time it runs.

## Step 3: Set the Admin Passcode

1. In Apps Script, click **Project Settings**.
2. Scroll to **Script Properties**.
3. Add this property:

| Property | Value |
|---|---|
| `ADMIN_PASSCODE` | Your private admin password |

Example:

```text
ADMIN_PASSCODE = ChangeThisPasscode123
```

Optional setting:

| Property | Value |
|---|---|
| `MODERATION_ENABLED` | `true` or `false` |

If you do not add `MODERATION_ENABLED`, StickyBoard starts with moderation turned on.

## Step 4: Deploy as a Web App

1. In Apps Script, click **Deploy > New deployment**.
2. Choose **Web app**.
3. Use these settings:

| Setting | Recommended Value |
|---|---|
| Description | `StickyBoard Web App` |
| Execute as | `Me` |
| Who has access | `Anyone` or `Anyone with the link` |

4. Click **Deploy**.
5. Approve the permissions.
6. Copy the Web App URL.

The URL will look similar to this:

```text
https://script.google.com/macros/s/AKfycb.../exec
```

## Step 5: Connect the HTML Files to Apps Script

Open each of these files:

- `index.html`
- `Submit.html`
- `Admin.html`

Find this line in each file:

```javascript
const SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
```

Replace the placeholder with your Apps Script Web App URL.

Example:

```javascript
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbYOUR_DEPLOYMENT_ID/exec';
```

Save all three files.

## Step 6: Publish or Share the HTML Files

You can host the three HTML files in any simple static hosting location, such as:

- GitHub Pages
- Google Drive web hosting alternatives
- Replit
- Netlify
- Your school or organization web server
- A local shared folder for testing

Keep these three files in the same folder:

```text
index.html
Submit.html
Admin.html
```

The links are already built in:

- `index.html` links to `Submit.html`, `Admin.html`, and the digital citizenship section.
- `Submit.html` links back to `index.html`, `Admin.html`, and the digital citizenship section.
- `Admin.html` links to `index.html` and `Submit.html`.

## Recommended Classroom or Workshop Flow

### Moderated Mode

Use this when students are posting publicly during class.

1. Facilitator opens `Admin.html`.
2. Turn moderation on.
3. Participants open `Submit.html`.
4. Participants submit sticky notes.
5. Facilitator approves appropriate notes.
6. Participants view the shared canvas at `index.html`.

### Open Mode

Use this for trusted staff PD, small groups, or rapid brainstorming.

1. Facilitator opens `Admin.html`.
2. Turn moderation off.
3. Participants open `Submit.html`.
4. Notes appear immediately on `index.html`.
5. Facilitator can still hide, edit, or delete notes later.

## Suggested Uses

| Use Case | Suggested Categories |
|---|---|
| Brainstorming | Idea, Maybe, Build On This |
| Exit Ticket | Learned, Question, Still Confused |
| Staff PD | Strategy, Barrier, Resource, Next Step |
| Reading Response | Claim, Evidence, Question, Connection |
| Project Planning | Task, Risk, Resource, Owner |
| Gallery Walk | Notice, Wonder, Suggestion |

## Digital Citizenship Reminder

StickyBoard includes a built-in digital citizenship section. Before using it with students or workshop attendees, remind participants:

- Use the board for learning, planning, and reflection.
- Do not post names, private information, insults, or off-topic comments.
- Keep language school-appropriate and professional.
- Anonymous does not mean consequence-free.
- The facilitator may approve, edit, hide, or delete sticky notes.

## Troubleshooting

### The board says “Backend not configured”

The Apps Script URL has not been pasted into one or more HTML files.

Check:

- `index.html`
- `Submit.html`
- `Admin.html`

Make sure each file has the same Web App URL in `SCRIPT_URL`.

### The admin page says the passcode is not set

Add `ADMIN_PASSCODE` in Apps Script Project Settings under Script Properties.

### Notes do not appear after submission

Check whether moderation is turned on.

- If moderation is on, notes must be approved in `Admin.html`.
- If moderation is off, notes should appear after the board refreshes.

### The board does not update immediately

`index.html` refreshes automatically every 20 seconds. You can also refresh the page manually.

### Participants cannot access the backend

Redeploy the Apps Script Web App and check the access setting. For most classroom use, set access to **Anyone with the link**.

### I changed the Apps Script but nothing changed

Apps Script deployments do not always update automatically.

1. Go to **Deploy > Manage deployments**.
2. Edit your deployment.
3. Choose a new version.
4. Deploy again.
5. Copy the latest Web App URL if it changed.

## Privacy Notes

StickyBoard is designed to avoid collecting student email addresses or login data. Notes are stored in your Google Sheet. Optional display names are participant-entered and should not be required for students unless your campus or district procedures allow it.

For student use, review your district policies before collecting any personal information.
