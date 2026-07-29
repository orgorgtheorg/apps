# Chase ladder

The escalation the agent follows. Edit the timing, the wording, or the rungs — this file is the setting, not a hidden prompt.

## Rungs

### 1. Gentle — 0 to 6 days overdue

> Subject: Invoice [number] — [amount]
>
> Hi [name], quick nudge that invoice [number] for [amount] came due on [date]. I've attached it again in case it got buried. Anything you need from me?

### 2. Direct — 7 to 20 days

> Subject: Invoice [number] — now [n] days past due
>
> Hi [name], invoice [number] for [amount] was due [date] and is now [n] days past due. Could you let me know what date I should expect payment?

### 3. Firm — 21 to 44 days

> Subject: Invoice [number] — [n] days outstanding
>
> Hi [name], invoice [number] for [amount] has been outstanding [n] days against [terms] terms. I'd like to get this closed out this week — can you confirm a payment date, or tell me what's holding it up?

### 4. Phone call — 45+ days

No email. The agent flags the row and tells the user: this one needs a call, here's the history, here's what I'd say.

## Rules the agent must follow

- One chase per invoice per week; one message per client per day even if several invoices are due.
- A promise-to-pay pauses everything until the day after the promised date.
- A disputed invoice is frozen entirely.
- Never mention late fees, collections, or legal action unless the user's own terms include them and the user asked.
- Auto-send: off by default, set per client in the app.

## Terms

- **Payment terms**: <net 30 / due on receipt>
- **How the user refers to money**: <e.g. plainly; no "kindly">
