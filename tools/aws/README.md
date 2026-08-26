# AWS Tools

Utility scripts for monitoring AWS resource usage.

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) installed and configured (`aws configure`)
- Node.js 18+ and [pnpm](https://pnpm.io/)
- Install dependencies once from the `tools/` dir: `pnpm install`

> The commands below are run from the `tools/` directory. Trailing arguments are
> forwarded to the script (e.g. `pnpm bedrock-usage 7`).

### useful aws commands

- See available profiles: `aws configure list-profiles`
- AWS SSO, login: `aws sso login --profile my-profile`
- Confirm which account you are currently using: `aws sts get-caller-identity`
- Run with dedicated profile: `$env:AWS_PROFILE = "my-profile"; aws sts get-caller-identity`

## bedrock-usage.mjs

Fetches AWS Bedrock API invocation history from CloudTrail and prints a usage summary broken down by user, model, and day. Fetches per-day chunks in parallel for speed.

### Usage

```bash
# Default: last 3 days, us-east-1, 6 parallel workers
pnpm bedrock-usage

# Custom days
pnpm bedrock-usage 7

# Custom days + concurrency
pnpm bedrock-usage 14 8

# Custom days + concurrency + region
pnpm bedrock-usage 14 8 eu-west-1

# All known Bedrock regions
pnpm bedrock-usage 3 6 all

# Region via env var
BEDROCK_REGION=eu-west-1 pnpm bedrock-usage
```

### Output

- **Per-user summary** - total calls and model breakdown for each IAM user/role, with `[service]` tags for non-human callers
- **Daily breakdown** - per-day call counts for human users only

## bedrock-logging-audit.mjs

Checks whether the current AWS account has any Bedrock prompt/response logging configured. Inspects model invocation logging, guardrails, VPC endpoints, CloudWatch log groups, and CloudTrail trails across all Bedrock regions.

### Usage

```bash
# Check all known Bedrock regions (default)
pnpm bedrock-logging-audit

# Check specific regions only
pnpm bedrock-logging-audit us-east-1,us-west-2
```

### Output

- **Per-region checks** - invocation logging (S3/CloudWatch), guardrails, VPC endpoints, and Bedrock-related CW log groups
- **CloudTrail check** - whether any trail has Bedrock data event selectors enabled
- **Summary** - clear verdict on whether prompt/response content is being captured

## aggregate-claude-costs.mjs

Estimates your local Claude Code spend by parsing the session logs under
`~/.claude/projects/**/*.jsonl`. It sums input/output/cache tokens per model and
applies hard-coded AWS Bedrock (us-east-1) pricing to compute a cost. No AWS
credentials or network calls are needed — it reads local files only.

> Pricing and the recognized model list are hard-coded in the script (Sonnet 4.5/4.6,
> Haiku 4.5, Opus 4.6). Unknown models are counted at $0, so update `PRICING` and
> `normalizeModelName` when new models appear.

### Usage

```bash
pnpm aggregate-claude-costs
```

### Output

- **Total usage across all projects** - per-model token counts and estimated cost
- **Grand total** - summed estimated cost across every model
- **Cost by project** - per-project totals, sorted highest first (zero-cost projects hidden)
