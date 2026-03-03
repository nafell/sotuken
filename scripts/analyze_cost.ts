
import * as fs from 'fs';
import * as path from 'path';

// Price definitions (JPY per 1M tokens)
const PRICES = {
    'gpt-5-chat': { input: 195.20, output: 1561.55 },
    'gpt-5-mini': { input: 39.04, output: 312.31 },
    'gpt-4.1': { input: 312.31, output: 1249.24 },
    'gpt-4.1-mini': { input: 62.47, output: 249.85 },
    'model-router': { input: 62.47, output: 249.85 },
};

// Model Configs
const CONFIGS = {
    'A': ['gpt-5-chat', 'gpt-5-chat', 'gpt-5-chat'],
    'B': ['gpt-5-mini', 'gpt-5-mini', 'gpt-5-mini'],
    'C': ['gpt-5-chat', 'gpt-4.1', 'gpt-4.1'],
    'D': ['gpt-5-chat', 'gpt-5-mini', 'gpt-5-mini'],
    'E': ['model-router', 'model-router', 'model-router'],
};

interface Row {
    config: string;
    stage: number;
    input: number;
    output: number;
    latency: number;
}

function parseCSV(filePath: string): Row[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const rows: Row[] = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Handle quotes handling roughly (assuming simple csv)
        const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
        if (parts.length < 5) continue;

        const config = parts[1];
        const stage = parseInt(parts[2]);
        const input = parseInt(parts[3]);
        const output = parseInt(parts[4]);
        const latency = parseInt(parts[5]);

        if (!CONFIGS[config]) continue;

        rows.push({ config, stage, input, output, latency });
    }
    return rows;
}

function calculateCost(row: Row): number {
    const models = CONFIGS[row.config];
    const modelId = models[row.stage - 1];
    const price = PRICES[modelId] || PRICES['model-router'];

    const inputCost = (row.input / 1_000_000) * price.input;
    const outputCost = (row.output / 1_000_000) * price.output;
    return inputCost + outputCost;
}

function analyze() {
    const csvPath = path.join(process.cwd(), 'docs/research/d/batch_c091dbda-9320-48a3-843f-28e69530ac4c (2).csv');
    const rows = parseCSV(csvPath);

    const stats = {};

    for (const config of Object.keys(CONFIGS)) {
        const configRows = rows.filter(r => r.config === config);
        // Group by stage
        const s1 = configRows.filter(r => r.stage === 1);
        const s2 = configRows.filter(r => r.stage === 2);
        const s3 = configRows.filter(r => r.stage === 3);

        const count = Math.max(s1.length, s2.length, s3.length);

        // Calculate total cost
        let totalCost = 0;
        let totalLatency = 0;

        configRows.forEach(r => {
            totalCost += calculateCost(r);
            totalLatency += r.latency;
        });

        const meanCost = count > 0 ? totalCost / count : 0;
        const meanLatency = configRows.length > 0 ? totalLatency / configRows.length : 0; // Avg per stage? Or sum per trial?
        // Thesis says LAT is "Stage1-3 Total". 
        // If meanLatency per stage is X, then Trial Latency is 3*X (roughly).

        // Better: Sum of averages
        const avgLatS1 = s1.reduce((a, b) => a + b.latency, 0) / (s1.length || 1);
        const avgLatS2 = s2.reduce((a, b) => a + b.latency, 0) / (s2.length || 1);
        const avgLatS3 = s3.reduce((a, b) => a + b.latency, 0) / (s3.length || 1);
        const trialLatencyMean = avgLatS1 + avgLatS2 + avgLatS3;

        // Median Estimations
        const costS1 = s1.map(r => calculateCost(r)).sort((a, b) => a - b);
        const costS2 = s2.map(r => calculateCost(r)).sort((a, b) => a - b);
        const costS3 = s3.map(r => calculateCost(r)).sort((a, b) => a - b);

        const medianS1 = costS1[Math.floor(costS1.length / 2)] || 0;
        const medianS2 = costS2[Math.floor(costS2.length / 2)] || 0;
        const medianS3 = costS3[Math.floor(costS3.length / 2)] || 0;
        const trialCostMedianEst = medianS1 + medianS2 + medianS3;

        // Latency Median Estimation
        const latS1 = s1.map(r => r.latency).sort((a, b) => a - b);
        const latS2 = s2.map(r => r.latency).sort((a, b) => a - b);
        const latS3 = s3.map(r => r.latency).sort((a, b) => a - b);

        const medLatS1 = latS1[Math.floor(latS1.length / 2)] || 0;
        const medLatS2 = latS2[Math.floor(latS2.length / 2)] || 0;
        const medLatS3 = latS3[Math.floor(latS3.length / 2)] || 0;
        const trialLatMedianEst = medLatS1 + medLatS2 + medLatS3;

        stats[config] = {
            count,
            totalCost,
            meanCost,
            itemizedMeanCost: (totalCost / count).toFixed(2),
            trialCostMedianEst: trialCostMedianEst.toFixed(2),
            trialLatMedianEst: trialLatMedianEst.toFixed(0),
            s1Count: s1.length
        };
    }

    console.log(JSON.stringify(stats, null, 2));
}

analyze();
