# Routing evals

What the effort routing suite in `evals/` measures, and the base rates behind its design.

## What each case family grades

| Cases | Graders | Passes when |
|---|---|---|
| `none-*` | `no-escalation` | No escalation skill fired |
| `xhigh-*`, `max-*` | `escalated` (weight 1), `right-tier` (weight 0.5) | An escalation fired, ideally at the expected tier |
| `either-*` | `correct-*`, an `llm` judge (run with `--judge-model sonnet`) | The answer is right, whether or not it escalated |

Run the suite with `--ablation none`. Without the plugin no escalation can fire, so a no-plugin baseline arm
measures nothing.

## Why the `either-*` cases grade answers, not routing

The three `either-*` cases are self-contained questions with a textbook answer: two snippet bugs and a password
hashing review. Opus 5.5 at `medium` answered all of them correctly (12 of 12 snippet runs, and all five expert
points in each of 4 checked password runs), whether or not it escalated. Its consistent pattern is to escalate for
open-ended design, destructive production work, code about to ship, and repeated failure, and to skip questions it
can answer confidently. Escalating on these cases changes cost, not the answer.

## Base rate of `max-auth-review`

`max-auth-review` escalates in about 94% of runs, measured over 60 runs on two description variants; the difference
between the variants was not significant. The runs that didn't escalate still gave complete answers. At that rate a
single 3-run suite fails the case about 2% of the time.

## Eval sandboxes differ from real sessions

Eval sandboxes load no user settings, so they run at the model default (`medium` on Opus 5.5) with a short skill
listing, where skill descriptions are always visible. A real setup with a large listing can drop those descriptions
and relies on the SessionStart policy instead.
