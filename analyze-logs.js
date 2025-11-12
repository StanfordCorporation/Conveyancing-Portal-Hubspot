const fs = require('fs');

console.log('Reading logs file...');
const rawData = fs.readFileSync('logs_result (1).json', 'utf-8');

console.log('Parsing JSON...');
const logs = JSON.parse(rawData);

console.log(`Total log entries: ${Array.isArray(logs) ? logs.length : 'N/A - not an array'}`);
console.log('\n=== SMOKEBALL WORKFLOW ANALYSIS ===\n');

// Filter Smokeball-related logs
const smokeballLogs = logs.filter(log => {
    const str = JSON.stringify(log).toLowerCase();
    return str.includes('smokeball') || str.includes('workflow');
});

console.log(`Smokeball-related entries: ${smokeballLogs.length}`);

// Group by workflow steps
const workflowSteps = {
    step2_create_lead: [],
    step3_quote_sent: [],
    step4_matter_conversion: [],
    step5_completion: [],
    errors: [],
    other: []
};

smokeballLogs.forEach(log => {
    const logStr = JSON.stringify(log).toLowerCase();

    if (logStr.includes('error') || logStr.includes('failed')) {
        workflowSteps.errors.push(log);
    } else if (logStr.includes('step 2') || logStr.includes('create') && logStr.includes('lead')) {
        workflowSteps.step2_create_lead.push(log);
    } else if (logStr.includes('step 3') || logStr.includes('quote')) {
        workflowSteps.step3_quote_sent.push(log);
    } else if (logStr.includes('step 4') || logStr.includes('matter')) {
        workflowSteps.step4_matter_conversion.push(log);
    } else if (logStr.includes('step 5') || logStr.includes('completion')) {
        workflowSteps.step5_completion.push(log);
    } else {
        workflowSteps.other.push(log);
    }
});

// Print summary
console.log('\n--- Workflow Step Summary ---');
console.log(`Step 2 (Create Lead): ${workflowSteps.step2_create_lead.length} entries`);
console.log(`Step 3 (Quote Sent): ${workflowSteps.step3_quote_sent.length} entries`);
console.log(`Step 4 (Matter Conversion): ${workflowSteps.step4_matter_conversion.length} entries`);
console.log(`Step 5 (Completion): ${workflowSteps.step5_completion.length} entries`);
console.log(`Errors: ${workflowSteps.errors.length} entries`);
console.log(`Other: ${workflowSteps.other.length} entries`);

// Show recent errors
if (workflowSteps.errors.length > 0) {
    console.log('\n--- ERRORS FOUND ---');
    workflowSteps.errors.slice(-5).forEach((log, idx) => {
        console.log(`\nError ${idx + 1}:`);
        console.log(JSON.stringify(log, null, 2));
    });
}

// Show sample successful workflows
console.log('\n--- Sample Workflow Executions ---');
['step2_create_lead', 'step3_quote_sent', 'step4_matter_conversion', 'step5_completion'].forEach(step => {
    if (workflowSteps[step].length > 0) {
        console.log(`\n${step} (most recent):`);
        console.log(JSON.stringify(workflowSteps[step][workflowSteps[step].length - 1], null, 2).substring(0, 500));
    }
});

// Check for successful completions
const successfulWorkflows = logs.filter(log => {
    const str = JSON.stringify(log).toLowerCase();
    return str.includes('smokeball') && (str.includes('success') || str.includes('complete'));
});

console.log(`\n\n=== OVERALL STATUS ===`);
console.log(`Successful workflow executions: ${successfulWorkflows.length}`);
console.log(`Failed workflow executions: ${workflowSteps.errors.length}`);
console.log(`Success rate: ${((successfulWorkflows.length / (successfulWorkflows.length + workflowSteps.errors.length)) * 100).toFixed(2)}%`);
