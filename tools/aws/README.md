# AWS Tools

Utility scripts for monitoring AWS resource usage.

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) installed and configured (`aws configure`)
- Node.js 18+

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
node tools/aws/bedrock-usage.mjs

# Custom days
node tools/aws/bedrock-usage.mjs 7

# Custom days + concurrency
node tools/aws/bedrock-usage.mjs 14 8

# Custom days + concurrency + region
node tools/aws/bedrock-usage.mjs 14 8 eu-west-1

# All known Bedrock regions
node tools/aws/bedrock-usage.mjs 3 6 all

# Region via env var
BEDROCK_REGION=eu-west-1 node tools/aws/bedrock-usage.mjs
```

### Output

- **Per-user summary** - total calls and model breakdown for each IAM user/role, with `[service]` tags for non-human callers
- **Daily breakdown** - per-day call counts for human users only

## bedrock-logging-audit.mjs

Checks whether the current AWS account has any Bedrock prompt/response logging configured. Inspects model invocation logging, guardrails, VPC endpoints, CloudWatch log groups, and CloudTrail trails across all Bedrock regions.

### Usage

```bash
# Check all known Bedrock regions (default)
node tools/aws/bedrock-logging-audit.mjs

# Check specific regions only
node tools/aws/bedrock-logging-audit.mjs us-east-1,us-west-2
```

### Output

- **Per-region checks** - invocation logging (S3/CloudWatch), guardrails, VPC endpoints, and Bedrock-related CW log groups
- **CloudTrail check** - whether any trail has Bedrock data event selectors enabled
- **Summary** - clear verdict on whether prompt/response content is being captured
