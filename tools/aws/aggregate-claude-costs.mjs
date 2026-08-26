#!/usr/bin/env node

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';

const projectsDir = path.join(os.homedir(), '.claude', 'projects');

// AWS Bedrock pricing (us-east-1)
const PRICING = {
    'claude-sonnet-4-5': {
        input: 3.0 / 1000000,
        output: 15.0 / 1000000,
        cacheRead: 0.3 / 1000000,
        cacheWrite: 3.75 / 1000000
    },
    'claude-sonnet-4-6': {
        input: 3.0 / 1000000,
        output: 15.0 / 1000000,
        cacheRead: 0.3 / 1000000,
        cacheWrite: 3.75 / 1000000
    },
    'claude-haiku-4-5': {
        input: 0.8 / 1000000,
        output: 4.0 / 1000000,
        cacheRead: 0.08 / 1000000,
        cacheWrite: 1.0 / 1000000
    },
    'claude-opus-4-6': {
        input: 15.0 / 1000000,
        output: 75.0 / 1000000,
        cacheRead: 1.5 / 1000000,
        cacheWrite: 18.75 / 1000000
    }
};

function normalizeModelName(modelId) {
    if (modelId.includes('sonnet-4-6')) return 'claude-sonnet-4-6';
    if (modelId.includes('sonnet-4-5')) return 'claude-sonnet-4-5';
    if (modelId.includes('haiku-4-5')) return 'claude-haiku-4-5';
    if (modelId.includes('opus-4-6')) return 'claude-opus-4-6';
    return modelId;
}

function calculateCost(usage, modelName) {
    const pricing = PRICING[modelName];
    if (!pricing) return 0;

    const inputCost = (usage.inputTokens || 0) * pricing.input;
    const outputCost = (usage.outputTokens || 0) * pricing.output;
    const cacheReadCost = (usage.cacheReadInputTokens || 0) * pricing.cacheRead;
    const cacheWriteCost = (usage.cacheCreationInputTokens || 0) * pricing.cacheWrite;

    return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

async function parseJsonlFile(filePath) {
    const usage = {};
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            if (data.type === 'assistant' && data.message && data.message.usage) {
                const modelName = normalizeModelName(data.message.model || 'claude-sonnet-4-5');
                if (!usage[modelName]) {
                    usage[modelName] = {
                        inputTokens: 0,
                        outputTokens: 0,
                        cacheReadInputTokens: 0,
                        cacheCreationInputTokens: 0
                    };
                }
                usage[modelName].inputTokens += data.message.usage.input_tokens || 0;
                usage[modelName].outputTokens += data.message.usage.output_tokens || 0;
                usage[modelName].cacheReadInputTokens += data.message.usage.cache_read_input_tokens || 0;
                usage[modelName].cacheCreationInputTokens += data.message.usage.cache_creation_input_tokens || 0;
            }
        } catch {
            // Skip invalid JSON lines
        }
    }

    return usage;
}

async function aggregateAllProjects() {
    const allProjects = fs.readdirSync(projectsDir);
    const totalUsage = {};
    const projectUsage = {};

    for (const project of allProjects) {
        const projectPath = path.join(projectsDir, project);
        const stat = fs.statSync(projectPath);
        if (!stat.isDirectory()) continue;

        projectUsage[project] = {};
        const files = fs.readdirSync(projectPath);

        for (const file of files) {
            if (!file.endsWith('.jsonl')) continue;

            const filePath = path.join(projectPath, file);
            const usage = await parseJsonlFile(filePath);

            for (const [model, tokens] of Object.entries(usage)) {
                if (!totalUsage[model]) {
                    totalUsage[model] = {
                        inputTokens: 0,
                        outputTokens: 0,
                        cacheReadInputTokens: 0,
                        cacheCreationInputTokens: 0
                    };
                }
                if (!projectUsage[project][model]) {
                    projectUsage[project][model] = {
                        inputTokens: 0,
                        outputTokens: 0,
                        cacheReadInputTokens: 0,
                        cacheCreationInputTokens: 0
                    };
                }
                totalUsage[model].inputTokens += tokens.inputTokens;
                totalUsage[model].outputTokens += tokens.outputTokens;
                totalUsage[model].cacheReadInputTokens += tokens.cacheReadInputTokens;
                totalUsage[model].cacheCreationInputTokens += tokens.cacheCreationInputTokens;

                projectUsage[project][model].inputTokens += tokens.inputTokens;
                projectUsage[project][model].outputTokens += tokens.outputTokens;
                projectUsage[project][model].cacheReadInputTokens += tokens.cacheReadInputTokens;
                projectUsage[project][model].cacheCreationInputTokens += tokens.cacheCreationInputTokens;
            }
        }
    }

    return { totalUsage, projectUsage };
}

async function main() {
    console.log('Aggregating costs from all Claude Code projects...\n');

    const { totalUsage, projectUsage } = await aggregateAllProjects();

    let grandTotal = 0;

    console.log('=== TOTAL USAGE ACROSS ALL PROJECTS ===\n');

    for (const [model, tokens] of Object.entries(totalUsage)) {
        const cost = calculateCost(tokens, model);
        grandTotal += cost;

        console.log(`${model}:`);
        console.log(`  Input tokens:        ${tokens.inputTokens.toLocaleString()}`);
        console.log(`  Output tokens:       ${tokens.outputTokens.toLocaleString()}`);
        console.log(`  Cache read tokens:   ${tokens.cacheReadInputTokens.toLocaleString()}`);
        console.log(`  Cache write tokens:  ${tokens.cacheCreationInputTokens.toLocaleString()}`);
        console.log(`  Cost:                $${cost.toFixed(2)}\n`);
    }

    console.log(`GRAND TOTAL: $${grandTotal.toFixed(2)}\n`);

    console.log('=== COST BY PROJECT ===\n');

    const projectCosts = [];
    for (const [project, usage] of Object.entries(projectUsage)) {
        if (Object.keys(usage).length === 0) continue;

        let projectTotal = 0;
        for (const [model, tokens] of Object.entries(usage)) {
            projectTotal += calculateCost(tokens, model);
        }
        projectCosts.push({ project, cost: projectTotal });
    }

    projectCosts.sort((a, b) => b.cost - a.cost);

    for (const { project, cost } of projectCosts) {
        if (cost > 0) {
            console.log(`${project.padEnd(50)} $${cost.toFixed(2)}`);
        }
    }
}

main().catch(console.error);
