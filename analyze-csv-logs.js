const fs = require('fs');
const csv = require('csvtojson');

console.log('Analyzing CSV logs...\n');

csv()
  .fromFile('logs_result.csv')
  .then((logs) => {
    console.log(`Total log entries: ${logs.length}\n`);

    // Group by endpoint
    const endpoints = {};
    const errors = [];
    const warnings = [];
    const successful = [];

    logs.forEach(log => {
      const path = log.requestPath?.split('?')[0] || 'unknown';
      const method = log.requestMethod || 'unknown';
      const key = `${method} ${path}`;

      if (!endpoints[key]) {
        endpoints[key] = {
          total: 0,
          success: 0,
          errors: 0,
          warnings: 0,
          statuses: {}
        };
      }

      endpoints[key].total++;

      const status = parseInt(log.responseStatusCode);
      if (!isNaN(status)) {
        endpoints[key].statuses[status] = (endpoints[key].statuses[status] || 0) + 1;
        if (status >= 200 && status < 300) {
          endpoints[key].success++;
        } else if (status >= 400) {
          endpoints[key].errors++;
        }
      }

      // Track error and warning messages
      if (log.level === 'error') {
        errors.push({
          time: log.TimeUTC,
          path: path,
          message: log.message?.substring(0, 150)
        });
        endpoints[key].errors++;
      }

      if (log.level === 'warning') {
        warnings.push({
          time: log.TimeUTC,
          path: path,
          message: log.message?.substring(0, 150)
        });
        endpoints[key].warnings++;
      }

      if (log.message?.includes('✅')) {
        successful.push({
          time: log.TimeUTC,
          path: path,
          message: log.message?.substring(0, 100)
        });
      }
    });

    // Print endpoint summary
    console.log('=== ENDPOINT SUMMARY ===\n');
    Object.entries(endpoints)
      .filter(([key]) => !key.includes('unknown') && key !== ' ')
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20)
      .forEach(([endpoint, stats]) => {
        const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
        const status = stats.errors > 0 ? '❌' : stats.warnings > 0 ? '⚠️' : '✅';
        console.log(`${status} ${endpoint}`);
        console.log(`   Total: ${stats.total} | Success: ${stats.success} (${successRate}%) | Errors: ${stats.errors} | Warnings: ${stats.warnings}`);
        if (Object.keys(stats.statuses).length > 0) {
          console.log(`   Status codes:`, stats.statuses);
        }
        console.log();
      });

    // Print unique error types
    console.log('\n=== ERROR ANALYSIS ===\n');
    const errorPatterns = {};
    errors.forEach(err => {
      // Extract error pattern
      let pattern = 'Unknown';
      const msg = err.message || '';

      if (msg.includes('Smokeball') && msg.includes('403')) {
        pattern = 'Smokeball 403 - Permission Denied';
      } else if (msg.includes('Smokeball') && msg.includes('404')) {
        pattern = 'Smokeball 404 - Not Found';
      } else if (msg.includes('HubSpot') && msg.includes('400')) {
        pattern = 'HubSpot 400 - Validation Error';
      } else if (msg.includes('HubSpot') && msg.includes('404')) {
        pattern = 'HubSpot 404 - Not Found';
      } else if (msg.includes('Property values were not valid')) {
        pattern = 'HubSpot Property Validation';
      } else if (msg.includes('timeline.js') || msg.includes('authenticateAgentJWT')) {
        pattern = 'Timeline Import Error';
      } else if (msg.includes('bankaccounts')) {
        pattern = 'Smokeball Bank Account Access';
      } else if (msg.includes('Token') || msg.includes('JWT')) {
        pattern = 'Authentication Error';
      } else if (msg) {
        pattern = msg.substring(0, 50) + '...';
      }

      errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1;
    });

    console.log('Error Breakdown:');
    Object.entries(errorPatterns)
      .sort((a, b) => b[1] - a[1])
      .forEach(([pattern, count]) => {
        console.log(`  ${count}x - ${pattern}`);
      });

    // Print workflow-specific analysis
    console.log('\n\n=== WORKFLOW ANALYSIS ===\n');

    // Smokeball workflows
    const smokeballLogs = logs.filter(log =>
      log.message?.toLowerCase().includes('smokeball') ||
      log.requestPath?.includes('smokeball')
    );
    console.log(`Smokeball-related logs: ${smokeballLogs.length}`);

    const smokeballErrors = smokeballLogs.filter(log => log.level === 'error');
    console.log(`Smokeball errors: ${smokeballErrors.length}`);

    if (smokeballErrors.length > 0) {
      console.log('\nRecent Smokeball errors:');
      smokeballErrors.slice(-3).forEach(err => {
        console.log(`  [${err.TimeUTC}] ${err.message?.substring(0, 120)}`);
      });
    }

    // Payment processing
    const paymentLogs = logs.filter(log =>
      log.message?.toLowerCase().includes('payment') ||
      log.message?.toLowerCase().includes('stripe') ||
      log.requestPath?.includes('stripe')
    );
    console.log(`\nPayment-related logs: ${paymentLogs.length}`);
    const paymentErrors = paymentLogs.filter(log => log.level === 'error');
    console.log(`Payment errors: ${paymentErrors.length}`);

    // Auth
    const authLogs = logs.filter(log =>
      log.message?.includes('Auth') ||
      log.requestPath?.includes('/auth/')
    );
    const authSuccess = authLogs.filter(log => log.message?.includes('✅ Token verified'));
    console.log(`\nAuthentication logs: ${authLogs.length}`);
    console.log(`Successful auth: ${authSuccess.length}`);

    // Client dashboard
    const dashboardLogs = logs.filter(log =>
      log.requestPath?.includes('/api/client/')
    );
    const dashboardSuccess = dashboardLogs.filter(log =>
      log.responseStatusCode === '200'
    );
    console.log(`\nClient dashboard requests: ${dashboardLogs.length}`);
    console.log(`Successful: ${dashboardSuccess.length}`);

    // Agent portal
    const agentLogs = logs.filter(log =>
      log.requestPath?.includes('/api/agent/') ||
      log.requestPath?.includes('/api/agencies/')
    );
    console.log(`\nAgent portal requests: ${agentLogs.length}`);

    console.log('\n\n=== OVERALL STATUS ===\n');
    console.log(`Total requests: ${logs.length}`);
    console.log(`Total errors: ${errors.length}`);
    console.log(`Total warnings: ${warnings.length}`);
    console.log(`Error rate: ${((errors.length / logs.length) * 100).toFixed(2)}%`);

    // Working features
    console.log('\n✅ WORKING FEATURES:');
    if (authSuccess.length > 0) console.log('  - User authentication (JWT)');
    if (dashboardSuccess.length > 0) console.log('  - Client dashboard / property viewing');
    if (logs.some(l => l.message?.includes('Property search fields determined'))) {
      console.log('  - Quote calculation and breakdown');
    }
    if (logs.some(l => l.message?.includes('Lead conversion initiated'))) {
      console.log('  - Smokeball lead conversion (initial request)');
    }

    // Broken features
    console.log('\n❌ BROKEN/ISSUES:');
    if (errorPatterns['Smokeball Bank Account Access']) {
      console.log('  - Smokeball bank account access (403 permission error)');
    }
    if (errorPatterns['HubSpot Property Validation']) {
      console.log('  - HubSpot property validation (some property updates)');
    }
    if (paymentErrors.length > 0) {
      console.log('  - Payment receipting to Smokeball trust account');
    }
  })
  .catch(err => {
    console.error('Error parsing CSV:', err);
    console.log('\nTrying alternative analysis...');

    // Fallback: simple text analysis
    const content = fs.readFileSync('logs_result.csv', 'utf-8');
    const lines = content.split('\n');

    console.log(`Total lines: ${lines.length}`);

    const errorLines = lines.filter(l => l.includes('"error"'));
    console.log(`Error lines: ${errorLines.length}`);

    const smokeballLines = lines.filter(l => l.toLowerCase().includes('smokeball'));
    console.log(`Smokeball mentions: ${smokeballLines.length}`);

    const bankAccountErrors = lines.filter(l => l.includes('bankaccounts') && l.includes('403'));
    console.log(`Bank account 403 errors: ${bankAccountErrors.length}`);
  });
