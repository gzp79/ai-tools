import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillPath = join(__dirname, '..', '..', '.claude', 'skills', 'hp-translator', 'SKILL.md');
const skillContent = readFileSync(skillPath, 'utf-8');

const PORT = 3033;
const MODEL = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

const client = new AnthropicBedrock();

async function callClaude(text) {
    const [comment, instructions] = text.split(/\n\s*---\s*\n/, 2);
    const userMessage = instructions
        ? `Translate the following comment:\n<comment>${comment.trim()}</comment>\n\nAdditional instructions: ${instructions.trim()}`
        : `Translate the following comment:\n<comment>${text.trim()}</comment>`;

    const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: skillContent,
        messages: [{ role: 'user', content: userMessage }]
    });
    const block = response.content.find((b) => b.type === 'text');
    return block?.text ?? '';
}

const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/hp-translator') {
        let body = '';
        for await (const chunk of req) body += chunk;

        try {
            const { text } = JSON.parse(body);
            if (!text) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing "text" field' }));
                return;
            }
            const result = await callClaude(text);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ result }));
        } catch (e) {
            console.error('[hp-translator error]', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`HP-Translator server running on http://localhost:${PORT}`);
    console.log('POST /hp-translator with { "text": "your comment" }');
});
