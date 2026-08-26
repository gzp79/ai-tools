#!/usr/bin/env node
/**
 * Checks whether this AWS account has any Bedrock prompt/response logging
 * configured: model invocation logging, guardrails, VPC endpoints, and
 * CloudTrail trails.
 *
 * Usage:
 *   node tools/aws/bedrock-logging-audit.mjs
 *   node tools/aws/bedrock-logging-audit.mjs us-east-1,us-west-2
 */
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const REGION_ARG = process.argv[2] || 'all';

const BEDROCK_REGIONS = [
    'us-east-1',
    'us-east-2',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-central-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-south-1',
    'ca-central-1'
];

const REGIONS = REGION_ARG === 'all' ? BEDROCK_REGIONS : REGION_ARG.split(',').map((r) => r.trim());

// ── helpers ───────────────────────────────────────────────────────────────────

async function aws(args) {
    try {
        const res = await execFileAsync('aws', [...args, '--output', 'json'], {
            maxBuffer: 10 * 1024 * 1024
        });
        return res.stdout ? JSON.parse(res.stdout) : null;
    } catch (err) {
        const msg = err.stderr || err.message || '';
        if (
            msg.includes('AccessDeniedException') ||
            msg.includes('UnauthorizedAccess') ||
            msg.includes('is not authorized')
        ) {
            return { _accessDenied: true, _msg: msg.split('\n')[0] };
        }
        if (msg.includes('could not be found') || msg.includes('does not exist')) {
            return null;
        }
        throw err;
    }
}

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

// ── main ──────────────────────────────────────────────────────────────────────

const identity = await aws(['sts', 'get-caller-identity']);
console.log(BOLD('\n=== AWS Identity ==='));
if (identity && !identity._accessDenied) {
    console.log(`  Account: ${identity.Account}`);
    console.log(`  ARN:     ${identity.Arn}`);
} else {
    console.log('  (could not determine identity)');
}

console.log(BOLD(`\n=== Checking ${REGIONS.length} region(s) ===`));

const findings = { logging: [], guardrails: [], vpcEndpoints: [] };

for (const region of REGIONS) {
    console.log(CYAN(`\n--- ${region} ---`));

    // invocation logging
    process.stdout.write('  Invocation logging:  ');
    const loggingRes = await aws(['bedrock', 'get-model-invocation-logging-configuration', '--region', region]);
    if (!loggingRes || loggingRes._accessDenied) {
        console.log(loggingRes?._accessDenied ? YELLOW('access denied') : GREEN('none'));
    } else {
        const cfg = loggingRes.loggingConfig;
        const cwEnabled = cfg?.cloudWatchConfig?.enabled === true;
        const s3Bucket = cfg?.s3Config?.bucketName;
        const largeData = cfg?.largeDataDeliveryS3Config?.bucketName;
        if (cwEnabled || s3Bucket || largeData) {
            findings.logging.push(region);
            console.log(RED('ACTIVE'));
            if (cwEnabled) console.log(`       CloudWatch: ${cfg.cloudWatchConfig?.logGroupName || '(default)'}`);
            if (s3Bucket)
                console.log(`       S3: ${s3Bucket}${cfg.s3Config?.keyPrefix ? '/' + cfg.s3Config.keyPrefix : ''}`);
            if (largeData) console.log(`       Large-data S3: ${largeData}`);
            const captured = ['text', 'image', 'video'].filter((k) => cfg[`${k}DataDeliveryEnabled`] === true);
            if (captured.length) console.log(`       Content captured: ${captured.join(', ')}`);
        } else {
            console.log(GREEN('none'));
        }
    }

    // guardrails
    process.stdout.write('  Guardrails:          ');
    const guardrailsRes = await aws(['bedrock', 'list-guardrails', '--region', region]);
    if (!guardrailsRes || guardrailsRes._accessDenied) {
        console.log(guardrailsRes?._accessDenied ? YELLOW('access denied') : GREEN('none'));
    } else {
        const list = guardrailsRes.guardrails || [];
        if (list.length) {
            findings.guardrails.push(region);
            console.log(RED(`${list.length} found`));
            for (const g of list) console.log(`       ${g.name} (${g.id}) — ${g.status}`);
        } else {
            console.log(GREEN('none'));
        }
    }

    // VPC endpoints
    process.stdout.write('  VPC endpoints:       ');
    const vpcRes = await aws([
        'ec2',
        'describe-vpc-endpoints',
        '--filters',
        `Name=service-name,Values=com.amazonaws.${region}.bedrock-runtime,com.amazonaws.${region}.bedrock`,
        '--region',
        region
    ]);
    if (!vpcRes || vpcRes._accessDenied) {
        console.log(vpcRes?._accessDenied ? YELLOW('access denied') : GREEN('none'));
    } else {
        const eps = vpcRes.VpcEndpoints || [];
        if (eps.length) {
            findings.vpcEndpoints.push(region);
            console.log(YELLOW(`${eps.length} endpoint(s)`));
            for (const ep of eps) console.log(`       ${ep.VpcEndpointId} (${ep.State})`);
        } else {
            console.log(GREEN('none'));
        }
    }
}

// CloudTrail
console.log(CYAN('\n--- CloudTrail ---'));
let anyBedrockTrailEvents = false;
const trailsRes = await aws(['cloudtrail', 'list-trails', '--region', 'us-east-1']);
if (!trailsRes || trailsRes._accessDenied) {
    console.log(`  ${YELLOW('~')} Could not list trails`);
} else {
    const trails = trailsRes.Trails || [];
    if (!trails.length) {
        console.log(`  ${GREEN('✓')} No trails in this account`);
    }
    for (const trail of trails) {
        const arn = trail.TrailARN;
        const homeRegion = trail.HomeRegion || 'us-east-1';
        process.stdout.write(`  ${arn}  `);
        const selRes = await aws(['cloudtrail', 'get-event-selectors', '--trail-name', arn, '--region', homeRegion]);
        if (!selRes || selRes._accessDenied) {
            console.log(YELLOW('org-level or access denied'));
        } else {
            const advanced = selRes.AdvancedEventSelectors || [];
            const hasBedrockSelectors = advanced.some((s) =>
                (s.FieldSelectors || []).some(
                    (f) => f.Field === 'eventSource' && (f.Equals || []).includes('bedrock.amazonaws.com')
                )
            );
            if (hasBedrockSelectors) {
                anyBedrockTrailEvents = true;
                console.log(RED('Bedrock data events captured'));
            } else {
                console.log(GREEN('no Bedrock data event selectors'));
            }
        }
    }
}

// ── summary ───────────────────────────────────────────────────────────────────

console.log(BOLD('\n=== SUMMARY ==='));

const anyLogging = findings.logging.length || findings.guardrails.length || anyBedrockTrailEvents;

if (!anyLogging) {
    console.log(GREEN('\nNo prompt/response logging found in this AWS account.'));
    console.log('Your Claude Code session content is NOT captured by AWS-side infrastructure.');
} else {
    console.log(RED('\nLogging or filtering is active:'));
    if (findings.logging.length) console.log(`  Model invocation logging: ${findings.logging.join(', ')}`);
    if (findings.guardrails.length) console.log(`  Guardrails:               ${findings.guardrails.join(', ')}`);
    if (anyBedrockTrailEvents) console.log('  CloudTrail data events:   yes');
}

if (findings.vpcEndpoints.length) {
    console.log(YELLOW(`\nVPC endpoints present in: ${findings.vpcEndpoints.join(', ')}`));
    console.log('Traffic may route through a private network — check for any inspection proxies.');
}

console.log('\nNote: Anthropic logs prompts on their side per their privacy policy,');
console.log('independent of what is configured here.\n');
