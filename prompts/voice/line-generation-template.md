# Per-line generation template

Use the approved locale narrator prompt as the persistent voice direction, then supply one line at a time.

```text
Semantic ID: <VOICE-ID>
Locale: <hu | en>
Context: <global | location | hint | resident | parent | mission intro | mission step | success>
Energy: <1–5>
Exact spoken text: "<TEXT>"

Delivery note:
<ONE SHORT LINE-SPECIFIC NOTE; OMIT WHEN THE SHARED BRIEF IS ENOUGH>

Output constraints:
Speak the exact text once. Do not add, paraphrase, repeat, spell, sing, whisper,
or announce the semantic ID. Do not add an audible watermark, generator tag,
spoken brand or service name, promotional tag, sonic signature, or authorship credit.
Clean dry mono voice only.
```

Do not put acting directions inside the exact spoken text. Keep punctuation natural and verify that the generator does not read quotation marks or metadata aloud.
