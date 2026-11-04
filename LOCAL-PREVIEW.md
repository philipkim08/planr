# Shared guests and trip balances preview

Run `npm run dev:demo` from this project, then open:

- Shared plan: http://127.0.0.1:5174/trip/local-preview
- Editor: http://127.0.0.1:5174/edit/local-preview/local-preview-edit

This command uses a sample trip in `data/local-demo.json`, its own API on port 3002, and a frontend on port 5174. It does not load the production Supabase connection. Stop it with Ctrl+C. Sample edits persist between runs. To reset only this sample, stop the command, delete `data/local-demo.json`, and run the command again.

Try these flows:

1. Select your name from the existing guests when opening the shared plan.
2. Open Trip guests to add someone. Matching names suggest existing guests; capitalization does not create another guest.
3. Open Dessert payments, add an expense, and expand Split. Everyone starts checked. Uncheck anyone who did not participate, or use Select all / Clear all. Equal and custom amounts both work.
4. Edit an existing expense after adding a guest. The original split stays selected; the new guest is available but unchecked.
5. Open View balances and switch between This day and Entire trip. The trip view nets debts across all days. It also works when the currently selected day has no expenses.

Existing plans import their names into the shared roster and preserve their saved splits. Different spellings already present in old data (such as Yumin and Yumin Park) are not automatically merged. The roster is based on shared trust: selecting a name is not identity verification. Balances are suggested repayments, not a record of money transferred.

Rollback point: local branch `backup/before-trip-guests-2026-11-01`. These changes are local only until explicitly pushed. Normal `npm run dev` still uses the project's configured database, which may be production; use the demo command for isolated testing.

## Repayments and spending summary

Open **View balances → Entire trip**. Check a repayment under **Still to pay** only after the money has been sent. It moves to **Marked paid**, reduces the remaining balances, and survives a reload. Uncheck it to undo. This is shared, self-reported tracking; it does not transfer money or verify a bank payment.

**Spending by person** shows each guest's upfront spending, own share, remaining balance, and recorded money sent/received. Repayments are not added to trip spending. Day balances remain before-repayment breakdowns; check-offs live only at trip level to avoid counting the same payment twice.

Expense edits preserve recorded repayments and recalculate what remains, including any resulting overpayment. Each check-off records the full suggested repayment; partial repayment entry is not included in this first pass. Incomplete splits must be fixed before recording repayments.

Rollback for this pass: `backup/before-repayment-tracking-2026-11-03`. No Supabase schema migration is needed. Validation: `node --test src/*.test.js server/*.test.js` (includes an isolated local HTTP server test). Trip writes are queued within one server process; this does not provide coordination across multiple server instances.
