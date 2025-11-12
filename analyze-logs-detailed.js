const fs = require('fs');

const rawData = fs.readFileSync('logs_result (1).json', 'utf-8');
const logs = JSON.parse(rawData);

console.log('=== DETAILED SMOKEBALL WORKFLOW ANALYSIS ===\n');

// Find webhook entries
const webhookEntries = logs.filter(log =>
    log.requestPath && log.requestPath.includes('/api/smokeball/webhook')
);

console.log(`Total Smokeball webhook calls: ${webhookEntries.length}`);

// Group by status code
const statusCodes = {};
webhookEntries.forEach(log => {
    const code = log.responseStatusCode || 'unknown';
    statusCodes[code] = (statusCodes[code] || 0) + 1;
});

console.log('\nWebhook Status Codes:');
Object.entries(statusCodes).sort().forEach(([code, count]) => {
    console.log(`  ${code}: ${count} requests`);
});

// Find successful vs failed
const successful = webhookEntries.filter(log =>
    log.responseStatusCode === 200 || log.responseStatusCode === 201
);

const failed = webhookEntries.filter(log =>
    log.responseStatusCode >= 400 || log.level === 'error'
);

console.log(`\nSuccessful webhook calls: ${successful.length}`);
console.log(`Failed webhook calls: ${failed.length}`);

// Analyze error messages
console.log('\n=== ERROR DETAILS ===');
const errorMessages = logs.filter(log =>
    log.level === 'error' &&
    (log.requestPath?.includes('smokeball') || log.message?.toLowerCase().includes('smokeball'))
);

errorMessages.forEach((err, idx) => {
    console.log(`\nError ${idx + 1} [${err.TimeUTC}]:`);
    console.log(`  Path: ${err.requestPath}`);
    console.log(`  Status: ${err.responseStatusCode}`);
    console.log(`  Message: ${err.message?.substring(0, 300)}...`);
});

// Check specific workflow steps
console.log('\n\n=== WORKFLOW STEP TRACKING ===');

const step2Logs = logs.filter(log => {
    const msg = log.message?.toLowerCase() || '';
    return msg.includes('step 2') || (msg.includes('smokeball') && msg.includes('lead'));
});

const step3Logs = logs.filter(log => {
    const msg = log.message?.toLowerCase() || '';
    return msg.includes('step 3') || (msg.includes('smokeball') && msg.includes('quote'));
});

const step4Logs = logs.filter(log => {
    const msg = log.message?.toLowerCase() || '';
    return msg.includes('step 4') || (msg.includes('smokeball') && msg.includes('matter'));
});

const step5Logs = logs.filter(log => {
    const msg = log.message?.toLowerCase() || '';
    return msg.includes('step 5') || (msg.includes('smokeball') && msg.includes('settlement'));
});

console.log(`Step 2 (Create Lead on Quote Requested): ${step2Logs.length} executions`);
console.log(`Step 3 (Update Quote Sent): ${step3Logs.length} executions`);
console.log(`Step 4 (Convert to Matter on Accept): ${step4Logs.length} executions`);
console.log(`Step 5 (Settlement/Completion): ${step5Logs.length} executions`);

// Show recent Step 2 executions
if (step2Logs.length > 0) {
    console.log('\n--- Recent Step 2 Executions ---');
    step2Logs.slice(-3).forEach((log, idx) => {
        console.log(`\nExecution ${idx + 1} [${log.TimeUTC}]:`);
        console.log(`  Message: ${log.message?.substring(0, 200)}`);
        console.log(`  Status: ${log.responseStatusCode}`);
    });
}

// Show recent Step 4 executions
if (step4Logs.length > 0) {
    console.log('\n--- Recent Step 4 Executions ---');
    step4Logs.slice(-3).forEach((log, idx) => {
        console.log(`\nExecution ${idx + 1} [${log.TimeUTC}]:`);
        console.log(`  Message: ${log.message?.substring(0, 200)}`);
        console.log(`  Status: ${log.responseStatusCode}`);
    });
}

// Check for timeline/webhook integration
const timelineErrors = logs.filter(log =>
    log.message?.includes('timeline.js') || log.message?.includes('authenticateAgentJWT')
);

if (timelineErrors.length > 0) {
    console.log('\n\n=== CRITICAL ISSUE FOUND ===');
    console.log('Timeline/Auth middleware issue detected:');
    console.log(`  Occurrences: ${timelineErrors.length}`);
    console.log(`  Error: ${timelineErrors[0].message?.substring(0, 300)}`);
}

console.log('\n\n=== SUMMARY ===');
console.log('✅ Smokeball webhook integration is active');
console.log(`✅ ${successful.length} successful webhook calls processed`);
console.log(`❌ ${failed.length} failed webhook calls`);
console.log(`⚠️  ${errorMessages.length} errors logged`);

if (failed.length === 0 && errorMessages.length <= 2) {
    console.log('\n🎉 Overall Status: HEALTHY - Workflows are functioning correctly');
} else if (errorMessages.length > 5) {
    console.log('\n⚠️  Overall Status: NEEDS ATTENTION - Multiple errors detected');
} else {
    console.log('\n⚙️  Overall Status: MOSTLY WORKING - Some errors present');
}
