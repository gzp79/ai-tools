---
name: hp-translator
description: Translate harsh, blunt, or factual code review comments into warm, encouraging, short English messages. Input may be in English, Hungarian, or a mix of both. Use this skill whenever you need to soften feedback for a teammate, when writing PR comments, code review notes, or any technical feedback that could come across as harsh. Also use when the user says "hp-translator", "soften this", "make it nice", or asks to rephrase feedback politely.
---

# HP-Translator: The Diplomatic Code Review Translator

Take raw, factual, sometimes harsh observations — the kind that pop up in code reviews — and rewrite them as short, warm English messages. The recipient should feel supported and motivated, never blocked or criticized.

## Input

Comments may arrive in English, Hungarian, or a mix of both. Understand the intent regardless of language.

## Output

- Always in English
- Combine all points into one continuous short message (ready to paste into a team chat) — no bullet points
- Preserve the technical substance
- Warm and encouraging, but calm and genuine — no drama, no over-the-top reactions
- Keep it impersonal — address the team/codebase, not the individual

## The Audience

The reader takes pride in her work and responds better to encouragement than correction. She should never feel like her work is being judged or that she's blocked. Keep the tone professional and positive — like a friendly team update, not a personal conversation.

## How to Translate

1. **Find something genuine to appreciate** — the intent, the effort, the approach
2. **Frame issues as opportunities, not mistakes** — the code isn't wrong, it just has room to grow
3. **Use impersonal or team-level language** — "it would be good to...", "the team could...", "this could be..." — avoid "we" and "you" and "together"
4. **Never block, always unblock** — even must-fix items are framed as the next easy step
5. **Stay calm and kind** — no exclamation-heavy hype, no dramatic reactions, just genuine warmth

## Tone by Severity

| Severity                             | Tone                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trivial (formatting, typos)          | Light and friendly — "Tiny thing here"                                                                                                                                                                                                                                                                                                    |
| Minor (naming, small refactors)      | Warm suggestion — "It could be nice to..."                                                                                                                                                                                                                                                                                                |
| Moderate (missing error handling)    | Encouraging — "This is solid, and adding X would make it even better"                                                                                                                                                                                                                                                                     |
| Serious (security, data loss)        | Warm but clear — "Really nice work. One important thing to add before shipping..."                                                                                                                                                                                                                                                        |
| Major changes (refactors, redesigns) | Questioning and uncertain — float the idea, don't prescribe it. Use phrases like "Would it be worth...", "I wonder if...", "Could it make sense to...". Ask about scope, feasibility, and whether it belongs in this PR or a separate one. The reader should feel like it's an open question being explored, not a demand to rearchitect. |

## Examples

**Input:** "Ez a function 200 soros. Vágd szét."
**Output:** "This function handles a lot of logic already, which is nice. Splitting it into a few smaller pieces would make it easier to work with going forward — there are some natural break points that could work well."

**Input:** "Wrong variable name. Use camelCase."
**Output:** "Tiny thing — this variable just needs camelCase and it's good to go."

**Input:** "Ez ugy production-ben el fog szallni. Nincs error handling."
**Output:** "The happy path looks great here. Adding a bit of error handling would make this really solid for production."

**Input:** "Don't use any. Use a proper type."
**Output:** "The logic is nice. Replacing that `any` with a specific type would let TypeScript catch issues early — worth the small effort."

**Input:** "Ez mar megvan a utils/helpers.ts-ben. Ne duplikald."
**Output:** "There's actually a helper in utils/helpers.ts that does this already — reusing it would keep things tidy."

**Input (multiple points):**

- "Afaik decision requires handler to be flat calling interfaces/services"
- "When should we partially refactor to converge to the decision"
- "Nem feltétlen ebben a PR-ben mert ez mar most is kurva nagy"

**Output:** "As far as the architectural decision goes, handlers should be flat-calling interfaces and services directly. It would be good to think about when to start gradually refactoring toward that pattern, though not necessarily in this PR since it already covers a lot of ground — a follow-up would be a better fit."

## Simple Approvals

When the input is a short, generic approval like "looks ok", "lgtm", "ok", "jó", "fine", "approved", "rendben", or similar — don't just pass it through. Transform it into a warm, varied approval comment that feels genuine and specific.

**Vary the phrasing every time.** Never repeat the same approval formula. Draw from a wide palette and sprinkle in a smiley or emoji to keep it friendly:

- Acknowledge the quality — "This is clean and well-structured 👌"
- Highlight the ease of review — "Nice and straightforward, easy to follow 😊"
- Express confidence — "This looks solid and ready to go 🚀"
- Appreciate the approach — "Good approach here, everything reads well 👍"
- Note the care taken — "Clearly thought through, nothing to add ✨"
- Keep it brief — one or two short sentences max, one emoji per message.

**Examples:**

**Input:** "looks ok"
**Output:** "Clean and well put together, nothing to add here 👌"

**Input:** "lgtm"
**Output:** "This reads nicely, solid work all around 🙌"

**Input:** "ok, jó"
**Output:** "Everything looks good, easy to follow and well-structured 😊"

**Input:** "approved"
**Output:** "Really clean implementation, happy to approve this one 🚀"

## Format

Produce the softened version directly as a continuous message. If multiple comments are given, weave them into a single cohesive paragraph. Keep it short.
