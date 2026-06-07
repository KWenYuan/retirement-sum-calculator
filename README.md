# Wealth Planning Studio

## 1. Project Overview

Wealth Planning Studio is a private advisor calculator for retirement planning discussions.

It helps show clients their current assets, projected retirement assets, retirement timeline, expected lump sums, income streams, CPF age 55 event, SRS withdrawals, policies, investments, cash planning, and retirement income sources.

The app is mainly for advisor use, but it also has a cleaner Presentation Mode for showing clients during appointments.

## 2. Main Purpose

Use this app to:

- Enter client details in Advisor Mode
- Present clean visuals in Presentation Mode
- Show current assets today
- Show projected assets by age
- Show CPF age 55 transfer estimates
- Show SRS, policies, investments, and cash planning
- Show what the client may receive at each selected age
- Export a client-facing PDF report
- Export/import client JSON data for annual reviews

## 3. How To Run Locally

Open Terminal and run:

```bash
cd ~/Desktop/"Wealth Planning Studio"
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

To test on iPad using the same WiFi:

```bash
npm run dev -- --host 0.0.0.0
```

Then open the Network URL shown in Terminal on iPad Safari.

## 4. How To Build

Run:

```bash
npm run build
```

This checks whether the app is ready for deployment. If the build fails, fix the error before pushing or deploying.

## 5. How To Push To GitHub

Normal update flow:

```bash
git status
git add .
git commit -m "Update retirement calculator"
git push origin main
```

If GitHub has accidental changes that you do not want, avoid pulling first.

Only if you are sure your local version is the correct version:

```bash
git push --force-with-lease origin main
```

Warning: only use `--force-with-lease` if you are sure the local version should replace the GitHub version.

## 6. How To Deploy / Update Website

The app can be hosted on Vercel.

Basic process:

1. Push the latest code to GitHub.
2. Vercel automatically redeploys.
3. Open the Vercel website link on iPad.

Typical Vercel settings:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

## 7. Important Files / Folders

- `src/`  
  Main React app code.

- `src/App.jsx`  
  Main app state, mode switching, PDF export, JSON import/export, and section layout.

- `src/components/`  
  Reusable UI sections, charts, timeline, input panels, PDF report component, annual review, and follow-up tasks.

- `src/components/InputSections.jsx`  
  Advisor Mode input forms for profile, CPF, SRS, policies, investments, and cash.

- `src/components/Dashboard.jsx`  
  Main dashboard, projected assets chart, asset breakdown, and client-facing metrics.

- `src/components/RetirementTimeline.jsx`  
  Visual retirement timeline.

- `src/components/ExportReport.jsx`  
  Hidden PDF-specific report layout.

- `src/utils/projections.js`  
  Core projection logic for CPF, SRS, policies, investments, cash, payout summaries, timeline events, and income sources.

- `src/utils/clientData.js`  
  JSON export/import, autosave, restore, and migration helpers.

- `src/utils/annualReview.js`  
  Annual review comparison and “what changed” logic.

- `src/utils/chartColors.js`  
  Shared chart and category colour mapping.

- `src/config/cpfRules.js`  
  CPF assumptions such as OA/SA/RA interest, BRS table, FRS/ERS multipliers, and withdrawal rules.

- `src/data/defaults.js`  
  Default client profile, CPF, SRS, policy, investment, and cash values.

- `src/styles.css`  
  Main styling for the app, dashboard, timeline, forms, and PDF report.

- `public/logo.png`  
  Logo used in the app and PDF export. Replace this file to change the logo.

- `package.json`  
  Project dependencies and scripts.

- `README.md`  
  This guide.

## 8. App Modes

### Advisor Mode

Use Advisor Mode to enter and edit client details.

It includes:

- Client profile inputs
- CPF inputs
- SRS inputs
- Policy inputs
- Investment inputs
- Cash / Savings inputs
- Follow-up tasks
- Advisor notes
- PDF export
- JSON import/export
- Annual review import

### Presentation Mode

Use Presentation Mode to show clients a cleaner dashboard.

It hides most input forms and focuses on:

- Current assets today
- Key retirement numbers
- Projected assets by age
- Asset breakdown
- Retirement timeline
- What the client receives at the selected age
- Retirement income sources
- Key takeaways

Use the `Edit Details` button to return to Advisor Mode.

## 9. Data Export / Import

There are two different exports.

### PDF Export

The PDF is a client-facing report.

Use it when you want to share a clean retirement summary with the client.

### JSON Export

The JSON file is internal editable client data.

Use it to continue work next year or during annual reviews. It restores calculator inputs, assumptions, policies, investments, cash settings, follow-up tasks, and review data.

Do not share JSON with clients unless you intentionally want to share the editable data.

Suggested workflow:

1. Enter client data.
2. Export PDF for the client.
3. Export JSON for your internal record.
4. Next year, import the JSON.
5. Update the latest values.
6. Export a new PDF and JSON.

## 10. CPF Logic Notes

CPF logic is simplified for illustration.

- CPF OA and SA are projected separately.
- CPF OA uses the OA interest rate from `src/config/cpfRules.js`.
- CPF SA uses the SA interest rate from `src/config/cpfRules.js`.
- CPF MA is projected separately as part of CPF assets.
- At age 55, projected OA + SA are used to estimate RA set aside.
- If OA + SA exceeds the selected retirement sum, the excess is shown as withdrawable.
- If OA + SA is below the selected retirement sum, withdrawable amount is capped by the configured minimum withdrawal.
- CPF LIFE is not actuarially projected because actual payout is unknown.
- CPF assumptions are simplified and controlled in `src/config/cpfRules.js`.

## 11. Policy Logic Notes

Policy logic is intentionally simplified and editable.

- Premium commitment means how long premiums are paid.
- Premium end age = start age + premium commitment years.
- After premium commitment ends, no more premiums are added.
- Existing policy value continues compounding until withdrawal age.
- Withdrawal age means when the client uses the money.
- Lump sum withdrawal is shown as money received.
- Monthly/yearly withdrawal becomes an income stream.
- Monthly/yearly withdrawal reduces remaining policy value gradually.
- Do not use “Holding until age” anymore. Withdrawal age now defines when the policy value is projected to.

## 12. Investment Logic Notes

Investment logic is also simplified.

- Current value should grow based on expected return even if monthly contribution is `$0`.
- Monthly contribution is optional.
- Risk level was removed because expected return controls the projection.
- Withdrawal types are:
  - Lump sum
  - Monthly income
  - Yearly income
  - Keep invested
- Lump sum withdrawals convert into cash / money received.
- Monthly/yearly income reduces investment value gradually.

## 13. Cash / Savings Logic Notes

- Cash can be included or excluded from retirement projection.
- If cash is excluded, it should not affect projected retirement totals.
- Even if cash is excluded, it may still appear in Current Assets Today in the PDF.
- Emergency fund can be tracked separately.
- Cash should stay simple and should not clutter the retirement timeline if excluded.

## 14. Common Bugs And Fixes

### A. Website Does Not Open Locally

- Make sure `npm run dev` is still running.
- Check the localhost URL shown in Terminal.
- If port `5173` is busy, Vite may use a different port.

### B. iPad Cannot Access Local Website

- Make sure MacBook and iPad are on the same WiFi.
- Run:

```bash
npm run dev -- --host 0.0.0.0
```

- Use the Network URL shown in Terminal.

### C. `npm install` Shows Vulnerabilities

- Do not immediately run `npm audit fix --force`.
- First run:

```bash
npm run build
```

- If package updates are needed, create a backup branch first.

### D. PDF Export Breaks

- Check whether `html2pdf.js` or `jsPDF` dependencies changed.
- Test PDF export after any package update.
- The export layout lives in `src/components/ExportReport.jsx`.

### E. Number Input Keeps Forcing 0 Or 5

- Number inputs should allow empty string while editing.
- Defaults should only apply on blur or during calculations.
- Check `src/components/FormControls.jsx` and any place where fallback values are rendered directly into inputs.

### F. Expected Return Not Changing Projection

- Check the relevant projection helper in `src/utils/projections.js`.
- Make sure the expected return field is actually used in the calculation.
- Make sure memo dependencies include the relevant state.
- Policies and investments should use their own expected return assumptions.

### G. GitHub Has Accidental Changes

- Do not pull if you want to keep the local version.
- Commit the local version first.
- Only use this if you are sure:

```bash
git push --force-with-lease origin main
```

## 15. Future Improvement Ideas

- Add app password protection before using with real clients
- Add PWA offline support for iPad
- Improve PDF design
- Add a one-page summary view
- Add 3 key takeaways
- Add retirement status: On Track / Slight Gap / Major Gap
- Add action plan section
- Add next review date
- Improve annual review comparison
- Improve “what changed since last review”
- Add missing information checklist
- Add assumption confidence / what is not included
- Add better mobile and iPad layout testing

## 16. Privacy Notes

- Do not commit real client data to GitHub.
- Do not hardcode client names or financial details in the app.
- Store client PDF and JSON files securely.
- The website should not store client data online unless proper security is added.
- Prefer manual JSON import/export for client records.
- Treat exported JSON files as sensitive financial data.

## 17. Disclaimer

This calculator is for illustration and discussion only. It does not guarantee returns, CPF values, policy values, payouts, tax treatment, or future retirement outcomes. Actual results depend on CPF rules, policy terms, market performance, fees, withdrawals, inflation, and client circumstances.
