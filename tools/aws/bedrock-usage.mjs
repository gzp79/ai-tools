#!/usr/bin/env node

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const DAYS = parseInt(process.argv[2] || '3', 10);
const CONCURRENCY = parseInt(process.argv[3] || '6', 10);
const REGION_ARG = process.argv[4] || process.env.BEDROCK_REGION || 'us-east-1';

// Known regions where Bedrock is available
const BEDROCK_REGIONS = [
    'us-east-1',
    'us-east-2',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-central-1',
    'eu-north-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-south-1',
    'ca-central-1',
    'sa-east-1'
];

const REGIONS = REGION_ARG === 'all' ? BEDROCK_REGIONS : [REGION_ARG];
const multiRegion = REGIONS.length > 1;

const now = Date.now();
const startDate = new Date(now - DAYS * 24 * 60 * 60 * 1000);
const endDate = new Date(now);

// Per-day chunks
const chunks = [];
for (let d = new Date(startDate); d < endDate; d = new Date(d.getTime() + 86400000)) {
    const chunkEnd = new Date(Math.min(d.getTime() + 86400000, endDate.getTime()));
    chunks.push({
        start: d.toISOString().slice(0, 19) + 'Z',
        end: chunkEnd.toISOString().slice(0, 19) + 'Z',
        label: d.toISOString().slice(0, 10)
    });
}

// Flat work queue: all (region × day) pairs
const workQueue = REGIONS.flatMap((region, regionIdx) =>
    chunks.map((chunk, chunkIdx) => ({ region, regionIdx, chunk, chunkIdx }))
);

const clockStart = Date.now();
function ts() {
    return `${((Date.now() - clockStart) / 1000).toFixed(1)}s`;
}

// ── ANSI display ──────────────────────────────────────────────────────────────

const workerCount = Math.min(CONCURRENCY, workQueue.length);
const CHAR = { waiting: '░', active: '▒', done: '█' };

const regionChunkState = REGIONS.map(() => Array(chunks.length).fill('waiting'));
const regionDone = Array(REGIONS.length).fill(0);
const regionActive = Array(REGIONS.length).fill(0);
const workerStatus = Array(workerCount).fill('idle');

function regionChar(ri) {
    if (regionDone[ri] === chunks.length) return CHAR.done;
    if (regionActive[ri] > 0 || regionDone[ri] > 0) return CHAR.active;
    return CHAR.waiting;
}

// Layout (top to bottom): [regions bar?] + region day bars + worker lines
const totalLines = (multiRegion ? 1 : 0) + REGIONS.length + workerCount;
let initialized = false;

function redraw() {
    const lines = [];
    if (multiRegion) {
        lines.push('  regions: ' + REGIONS.map((_, ri) => regionChar(ri)).join(''));
    }
    for (let ri = 0; ri < REGIONS.length; ri++) {
        const label = multiRegion ? REGIONS[ri].padEnd(16) : 'days:           ';
        const bar = regionChunkState[ri].map((s) => CHAR[s]).join('');
        lines.push(`  ${label} ${bar}`);
    }
    for (let wi = 0; wi < workerCount; wi++) {
        lines.push(`  worker ${wi + 1}: ${workerStatus[wi]}`);
    }

    if (!initialized) {
        process.stderr.write(lines.join('\n') + '\n');
        initialized = true;
    } else {
        process.stderr.write(`\x1b[${totalLines}A` + lines.map((l) => `\r\x1b[2K${l}`).join('\n') + '\n');
    }
}

function setWorker(workerIdx, status) {
    workerStatus[workerIdx] = status;
    redraw();
}

function setChunkState(regionIdx, chunkIdx, state) {
    regionChunkState[regionIdx][chunkIdx] = state;
    redraw();
}

// ── Fetch logic ───────────────────────────────────────────────────────────────

async function withRetry(fn, workerIdx, label) {
    for (let attempt = 0; ; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (err.message?.includes('AccessDeniedException')) return null;
            if (!err.message?.includes('ThrottlingException') || attempt >= 6) throw err;
            const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 30000);
            setWorker(workerIdx, `${label} — throttled, retry ${attempt + 1} in ${(delay / 1000).toFixed(1)}s`);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
}

function fmtRemaining(lastEventTime, chunkStart) {
    const remainingMs = new Date(lastEventTime) - new Date(chunkStart);
    if (remainingMs <= 0) return '0h left';
    const h = remainingMs / 3600000;
    return h >= 1 ? `${h.toFixed(1)}h left` : `${(h * 60).toFixed(0)}m left`;
}

async function fetchItem({ region, regionIdx, chunk, chunkIdx }, workerIdx) {
    const label = multiRegion ? `${region} ${chunk.label}` : chunk.label;

    regionActive[regionIdx]++;
    setChunkState(regionIdx, chunkIdx, 'active');
    setWorker(workerIdx, `${label} — fetching...`);

    const events = [];
    let nextToken = null;
    let page = 0;

    for (;;) {
        const args = [
            'cloudtrail',
            'lookup-events',
            '--region',
            region,
            '--lookup-attributes',
            'AttributeKey=EventSource,AttributeValue=bedrock.amazonaws.com',
            '--start-time',
            chunk.start,
            '--end-time',
            chunk.end,
            '--max-results',
            '50',
            '--output',
            'json'
        ];
        if (nextToken) args.push('--next-token', nextToken);

        const res = await withRetry(
            () => execFileAsync('aws', args, { maxBuffer: 50 * 1024 * 1024 }),
            workerIdx,
            label
        );
        if (!res) {
            regionActive[regionIdx]--;
            regionDone[regionIdx]++;
            setChunkState(regionIdx, chunkIdx, 'done');
            setWorker(workerIdx, `${label} — skipped (access denied)`);
            return [];
        }
        const result = JSON.parse(res.stdout);
        const pageEvents = result.Events || [];
        events.push(...pageEvents);
        page++;

        if (!pageEvents.length || !result.NextToken) break;
        nextToken = result.NextToken;
        const lastTime = pageEvents[pageEvents.length - 1]?.EventTime || chunk.end;
        setWorker(
            workerIdx,
            `${label} — page ${page + 1}, ${events.length} events, ${fmtRemaining(lastTime, chunk.start)}`
        );
    }

    regionActive[regionIdx]--;
    regionDone[regionIdx]++;
    setChunkState(regionIdx, chunkIdx, 'done');
    setWorker(workerIdx, `${label} — done (${events.length} events)`);
    return events;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`Fetching Bedrock usage (${DAYS} days, ${REGION_ARG}, ${CONCURRENCY} workers)\n`);

redraw(); // initial draw

const allResults = new Array(workQueue.length);
let qi = 0;

await Promise.all(
    Array.from({ length: workerCount }, async (_, workerIdx) => {
        while (qi < workQueue.length) {
            const idx = qi++;
            allResults[idx] = await fetchItem(workQueue[idx], workerIdx);
        }
        setWorker(workerIdx, 'done');
    })
);

process.stderr.write(`\n\nAll done in ${ts()}\n\n`);

// ── Aggregate ─────────────────────────────────────────────────────────────────

const allEvents = allResults.flat();
const userModel = {},
    userTotal = {},
    datesByUser = {},
    daily = {},
    userRegions = {};

for (const event of allEvents) {
    const u = event.Username || 'unknown';
    const ct = JSON.parse(event.CloudTrailEvent || '{}');
    const m = ct.requestParameters?.modelId;
    if (!m) continue;
    const d = (event.EventTime || '').slice(0, 10);
    const r = ct.awsRegion || event.AwsRegion || '';

    const k = u + '|' + m;
    userModel[k] = (userModel[k] || 0) + 1;
    userTotal[u] = (userTotal[u] || 0) + 1;
    if (!datesByUser[u]) datesByUser[u] = new Set();
    datesByUser[u].add(d);
    daily[d + '|' + u] = (daily[d + '|' + u] || 0) + 1;
    if (!userRegions[u]) userRegions[u] = new Set();
    if (r) userRegions[u].add(r);
}

const humanUsers = Object.keys(userTotal).filter(
    (u) => !u.startsWith('aws-go-sdk') && u !== 'ConfigResourceCompositionSession'
);
const allUsers = Object.keys(userTotal).sort((a, b) => userTotal[b] - userTotal[a]);

const invocationCount = Object.values(userTotal).reduce((a, b) => a + b, 0);
console.log(`Total events: ${allEvents.length} (${invocationCount} with model)`);
console.log('');

if (!allUsers.length) {
    console.log('No model invocations found in this time range.');
    process.exit(0);
}

for (const user of allUsers) {
    const dates = [...datesByUser[user]].sort();
    const isHuman = humanUsers.includes(user);
    const tag = isHuman ? '' : ' [service]';
    const regions = userRegions[user] ? [...userRegions[user]].sort().join(', ') : '';
    const regionStr = regions && multiRegion ? `  [${regions}]` : '';
    console.log(
        `=== ${user}${tag} === (${userTotal[user]} calls, ${dates[0]} to ${dates[dates.length - 1]})${regionStr}`
    );

    const models = {};
    for (const [k, v] of Object.entries(userModel)) {
        const [uu, mm] = k.split('|');
        if (uu === user) models[mm] = v;
    }
    for (const [model, count] of Object.entries(models).sort((a, b) => b[1] - a[1])) {
        const short = model.includes('.') ? model.split('.').slice(-1)[0] : model;
        console.log(`  ${short.padEnd(50)} ${String(count).padStart(6)}`);
    }
    console.log('');
}

console.log('=== DAILY BREAKDOWN (human users) ===');
const days = [...new Set(Object.keys(daily).map((k) => k.split('|')[0]))].sort();
for (const day of days) {
    const parts = humanUsers
        .sort((a, b) => userTotal[b] - userTotal[a])
        .map((u) => {
            const c = daily[day + '|' + u];
            return c ? `${u}:${c}` : null;
        })
        .filter(Boolean)
        .join(', ');
    if (parts) console.log(`  ${day}  ${parts}`);
}
