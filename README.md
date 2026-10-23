# Form Filler

A tool for sending test responses to Google Forms. It reads a form, lets you decide how each answer should be spread (probabilities, answer lists, ranges, rules), then submits as many randomized responses as you want.

It comes in two versions that share the same interface:

| Version | Folder | Needs a server? |
| --- | --- | --- |
| Chrome extension | `form-filler-extension` | No |
| Local web app | `form-filler` | Yes, a small Node server |

Use this only on forms you own or have permission to test. Filling someone else's survey or poll with generated answers corrupts their results.

---

## Option 1: Chrome extension

### Install

1. Unzip `form-filler-extension.zip`. The folder you select must contain `manifest.json` directly.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the extension folder.
5. Pin the extension from the puzzle-piece menu.

### Use

1. Click the extension icon. The app opens in a new tab. If the tab you were on is a Google Form, its link is filled in and loaded automatically.
2. Otherwise paste the form link and click **Load form**.
3. Set up your questions (see "Setting up questions" below).
4. Click **Preview** to see 10 generated responses without sending anything.
5. Set the number of responses and the pace, then click **Send**.

Keep the tab open while sending. Closing it stops the run.

---

## Option 2: Local web app

Requires Node.js 18 or newer.

```
cd form-filler
npm install
npm start
```

Then open `http://localhost:3000`.

The server only fetches and posts to Google Forms addresses (`docs.google.com`, `forms.gle`) and listens on your own machine only.

---

## Setting up questions

Each question is a collapsed card showing its type and a one-line summary of the current settings. Click a card to open it. The switch on the right includes or skips the question. A skipped question is left blank.

| Question type | What you control |
| --- | --- |
| Multiple choice, dropdown | A slider per option. Values are relative weights, shown as percentages. |
| Linear scale | Same as above, plus a **Bell curve** preset. |
| Checkboxes | An independent chance (0 to 100%) for each option. |
| Short text, paragraph | A list of possible answers, one per line. Pick **Random each time** or **Balanced shuffle** (each answer used evenly before repeating). |
| Grid | A set of sliders for each row. Checkbox grids are treated as one pick per row. |
| Date, time | A from and to range. |
| "Other" option | Shows as a normal option. Add its text answers, one per line. |

Every slider group has **Even** and **Random mix** buttons.

### Rules

Under any question that has an earlier choice question, click **Add a rule based on an earlier answer**. Example: when question 2 is "Male", use this name list for question 3. You can add several rules per question, and the first matching rule replaces that question's normal settings. Rules can only depend on earlier multiple choice, dropdown, scale or checkbox questions.

---

## Sending

- **Responses:** 1 to 500 per run.
- **Pace:** Fast (about 0.5 seconds), Normal (about 1.5 seconds), Slow (about 4 seconds), or **Spread over time**, where you enter a number of minutes and the delay is calculated from the response count. All delays are randomized a little.
- **Stop:** ends the run after the current response.
- **Results:** shows sent and failed counts and a table of what was generated (first 50 rows).

### More menu

- **Save settings:** remembers everything for that form (answers, sliders, skips, rules) in your browser. It loads automatically the next time you load the same form.
- **Clear saved:** removes the saved settings for that form.
- **Download CSV:** exports the generated rows from the last preview or send, so you can compare them with the Responses tab in Google Forms.

---

## Troubleshooting

| Problem | What to do |
| --- | --- |
| "Could not read this form" | Use the shareable link ending in `/viewform`. Links from the form editor and forms that require sign-in cannot be read. |
| Every response shows as failed | A required question may be unsupported or skipped, the form may require sign-in, or it may limit one response per person. |
| `npm error Missing script: "start"` | You are one folder too high. Run `cd form-filler` again and check that `package.json` and `server.js` are listed. |
| Console message about `com.chrome.devtools.json` and a Kaspersky address | Harmless. Chrome DevTools probes that URL and the antivirus blocks it. The app does not use it. |
| The web app page misbehaves with Kaspersky installed | Try an Incognito window, or add `localhost` to Kaspersky's web protection exclusions. |

---

## Limitations

- Forms that require Google sign-in cannot be filled, because responses are sent anonymously.
- File upload questions are not supported and are left blank.
- Forms with branching (the next section depends on an answer) are not followed answer by answer, so they may be rejected.
- Multi-page forms use a simple page sequence.
- Google may throttle very fast or very large runs. Use Normal or Slow pace and sensible counts.

---

## Files

```
form-filler-extension/
  manifest.json     Extension definition
  background.js     Opens the app tab and prefills the current form link
  transport.js      Talks to Google directly
  app.html          Interface
  app.css           Styles
  app.js            Form parsing, answer generation and interface logic
  icons/            Extension icons

form-filler/
  package.json
  server.js         Small local proxy for fetching and posting
  public/
    index.html      Interface (same as the extension)
    app.css
    app.js
    transport.js    Talks to the local server
```
