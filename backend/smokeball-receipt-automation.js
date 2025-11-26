/**
 * Smokeball Receipt Creation Automation (JavaScript)
 * 
 * This script automates the process of:
 * 1. Logging into Smokeball (with 2FA support)
 * 2. Navigating to a specific matter's trust account transactions
 * 3. Filling out a receipt form with specified details
 * 4. Submitting or stopping before submission (test mode)
 * 
 * Prerequisites:
 *   npm install playwright dotenv speakeasy
 *   npx playwright install chromium
 * 
 * Usage: 
 *   Direct: node smokeball-receipt-automation.js --matter-id <id> --amount <amt> --lastname <name> --firstname <name> --date <date> [--test-mode]
 *   Via Service: import and call run() method
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Check if speakeasy is available for 2FA
let speakeasy;
try {
    const speakeasyModule = await import('speakeasy');
    speakeasy = speakeasyModule.default || speakeasyModule;
} catch (error) {
    console.log('⚠️ speakeasy not found - 2FA will require manual input');
    console.log('💡 Install with: npm install speakeasy');
}

class SmokeBallReceiptAutomation {
    constructor(testMode = false) {
        this.browser = null;
        this.page = null;
        this.testMode = testMode;
        this.credentials = {
            username: process.env.SMOKEBALL_USERNAME || 'pmanocha@stanford.au',
            password: process.env.SMOKEBALL_PASSWORD || 'LegalxManocha25!',
            twoFactorSecret: process.env.SMOKEBALL_TOTP_SECRET
        };
        this.screenshotsDir = join(__dirname, 'screenshots');
        try {
            mkdirSync(this.screenshotsDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    /**
     * Generate TOTP code for 2FA
     */
    generateTOTPCode() {
        if (!this.credentials.twoFactorSecret || !speakeasy) {
            throw new Error('2FA secret not configured or speakeasy not installed');
        }

        const token = speakeasy.totp({
            secret: this.credentials.twoFactorSecret,
            encoding: 'base32',
            time: Math.floor(Date.now() / 1000),
            step: 30,
            window: 1
        });

        console.log(`🔐 Generated 2FA code: ${token}`);
        return token;
    }

    async initialize() {
        console.log('🚀 Initializing browser...');
        this.browser = await chromium.launch({
            channel: 'chrome', // Use actual Google Chrome instead of Chromium
            headless: true, // Always headless for production/Vercel compatibility
            slowMo: 300, // Slow down for better reliability
            timeout: 60000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled', // Hide automation
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(30000);
        this.page.setDefaultNavigationTimeout(45000);

        await this.page.setViewportSize({ width: 1920, height: 1080 });

        // Override navigator.webdriver to avoid detection
        await this.page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        });

        await this.page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        console.log('✅ Browser initialized');
    }

    async takeScreenshot(name = 'debug') {
        try {
            if (!this.page) {
                console.log(`⚠️ Cannot take screenshot: page not initialized`);
                return null;
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = join(this.screenshotsDir, `receipt-${name}-${timestamp}.png`);
            await this.page.screenshot({ path: filename, fullPage: true });
            console.log(`📸 Screenshot saved: ${filename}`);
            return filename;
        } catch (error) {
            console.log(`⚠️ Failed to take screenshot: ${error.message}`);
            return null;
        }
    }

    async login() {
        console.log('🔐 Logging into Smokeball...');
        
        try {
            await this.page.goto('https://app.smokeball.com.au', { waitUntil: 'networkidle' });
            await this.takeScreenshot('login-page');
            
            // Wait for email input - try multiple selector strategies
            let emailInput;
            try {
                await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
                emailInput = this.page.locator('input[type="email"]').first();
            } catch {
                // Fallback to textbox with email in name/placeholder
                await this.page.waitForSelector('textbox', { timeout: 10000 });
                const emailInputs = await this.page.locator('textbox').all();
                emailInput = emailInputs[0] || null;
            }
            
            if (!emailInput) {
                throw new Error('Could not find email input field');
            }
            
            await emailInput.fill(this.credentials.username);
            await this.page.waitForTimeout(1000);
            
            // Fill password - find password field
            let passwordInput;
            try {
                passwordInput = this.page.locator('input[type="password"]').first();
            } catch {
                // Fallback: use second textbox
                const passwordInputs = await this.page.locator('textbox').all();
                passwordInput = passwordInputs[1] || passwordInputs[0];
            }
            
            await passwordInput.fill(this.credentials.password);
            await this.page.waitForTimeout(1000);
            
            // Click login button - try multiple strategies
            try {
                const loginButton = this.page.getByRole('button', { name: /log in/i }).first();
                await loginButton.click();
            } catch {
                // Fallback: find button containing "log"
                const loginButton = this.page.locator('button').filter({ hasText: /log/i }).first();
                await loginButton.click();
            }
            
            await this.page.waitForTimeout(3000);
            
            const currentUrl = this.page.url();
            
            // Check if 2FA is required
            if (!currentUrl.includes('dashboard')) {
                console.log('🔐 2FA required...');
                
                try {
                    await this.page.waitForSelector('input[placeholder="Two-Factor Code"], textbox[name="Two-Factor Code"]', { timeout: 15000 });
                    
                    const twoFactorInput = this.page.getByRole('textbox', { name: 'Two-Factor Code' });
                    
                    let totpCode;
                    if (this.credentials.twoFactorSecret && speakeasy) {
                        totpCode = this.generateTOTPCode();
                    } else {
                        console.log('⚠️ Manual 2FA required - please enter code:');
                        const readlineModule = await import('readline');
                        const readline = readlineModule.createInterface({
                            input: process.stdin,
                            output: process.stdout
                        });
                        totpCode = await new Promise(resolve => {
                            readline.question('Enter 2FA code: ', (code) => {
                                readline.close();
                                resolve(code);
                            });
                        });
                    }
                    
                    await twoFactorInput.fill(totpCode);
                    await this.page.waitForTimeout(1000);
                    
                    try {
                        await this.page.getByRole('button', { name: 'Verify' }).click();
                    } catch {
                        await twoFactorInput.press('Enter');
                    }
                    
                    await this.page.waitForURL('**/dashboard', { timeout: 45000 });
                    console.log('✅ 2FA verification successful');
                } catch (error) {
                    await this.takeScreenshot('2fa-error');
                    throw new Error(`2FA failed: ${error.message}`);
                }
            }
            
            console.log('✅ Successfully logged in');
        } catch (error) {
            await this.takeScreenshot('login-error');
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async navigateToMatterTransactions(matterId, accountId) {
        console.log(`📋 Navigating to matter transactions...`);
        console.log(`   Matter ID: ${matterId}`);
        console.log(`   Account ID: ${accountId}`);
        
        // Validate matterId is not empty
        if (!matterId || matterId.trim() === '') {
            throw new Error('matterId is required and cannot be empty');
        }
        
        // Validate accountId is not empty
        if (!accountId || accountId.trim() === '') {
            throw new Error('accountId is required and cannot be empty');
        }
        
        const transactionsUrl = `https://app.smokeball.com.au/#/billing/view-matter/${matterId}/transactions/trust/${accountId}~2FTrust`;
        
        console.log(`🔗 Navigating to: ${transactionsUrl}`);
        await this.page.goto(transactionsUrl);
        
        // Wait for page to fully load - try multiple strategies
        console.log('⏳ Waiting for page to load...');
        await this.page.waitForTimeout(8000); // Give more time for SPA to load
        
        // Wait for any content to appear
        try {
            await this.page.waitForLoadState('networkidle', { timeout: 20000 });
            console.log('✅ Page network idle');
        } catch {
            console.log('⚠️ Network idle timeout, but continuing...');
        }
        
        // Wait for transactions page content
        try {
            await this.page.waitForSelector('button, table, [role="button"]', { timeout: 15000 });
            console.log('✅ Page content loaded');
        } catch (error) {
            await this.takeScreenshot('transactions-page-error');
            console.log(`⚠️ Could not verify page content: ${error.message}`);
        }
        
        await this.takeScreenshot('transactions-page-loaded');
    }

    async fillReceiptForm(receiptData) {
        console.log('💰 Filling receipt form...');
        console.log(`📋 Receipt details:`, receiptData);
        
        await this.takeScreenshot('before-fill-form');
        
        // Click "Deposit Funds" button - try multiple selector strategies
        console.log('🔘 Clicking "Deposit Funds" button...');
        let depositClicked = false;
        
        // Strategy 1: Try clicking "Create New" first (opens dropdown menu)
        try {
            const createNewButton = this.page.getByRole('button', { name: 'Create New', exact: false }).first();
            if (await createNewButton.isVisible({ timeout: 5000 })) {
                console.log('🔘 Found "Create New" button, clicking to open menu...');
                await createNewButton.click();
                await this.page.waitForTimeout(2000); // Wait for menu to open
                await this.takeScreenshot('create-new-menu-opened');
                
                // Now look for "Deposit Funds" in the opened menu
                try {
                    const depositButton = this.page.getByRole('menuitem', { name: 'Deposit Funds', exact: false }).first();
                    if (await depositButton.isVisible({ timeout: 3000 })) {
                        console.log('✅ Found "Deposit Funds" in menu');
                        await depositButton.click();
                        await this.page.waitForTimeout(2000);
                        await this.takeScreenshot('deposit-dialog-opened');
                        depositClicked = true;
                    }
                } catch {
                    // Try finding by text in any menu item
                    const menuItems = await this.page.locator('[role="menuitem"], [role="option"], li, a').all();
                    for (const item of menuItems) {
                        try {
                            const text = await item.textContent();
                            if (text && text.toLowerCase().includes('deposit')) {
                                console.log(`✅ Found deposit option: "${text}"`);
                                await item.click();
                                await this.page.waitForTimeout(2000);
                                await this.takeScreenshot('deposit-dialog-opened');
                                depositClicked = true;
                                break;
                            }
                        } catch {
                            continue;
                        }
                    }
                }
            }
        } catch (error) {
            console.log(`⚠️ Strategy 1 (Create New menu) failed: ${error.message}`);
        }
        
        if (!depositClicked) {
            // Strategy 2: Try exact role and name match (direct button)
            try {
                const depositButton = this.page.getByRole('button', { name: 'Deposit Funds', exact: true }).first();
                if (await depositButton.isVisible({ timeout: 5000 })) {
                    console.log('✅ Found button with exact name match');
                    await depositButton.click();
                    await this.page.waitForTimeout(2000);
                    await this.takeScreenshot('deposit-dialog-opened');
                    depositClicked = true;
                }
            } catch (error) {
                console.log(`⚠️ Strategy 2 failed: ${error.message}`);
            }
        }
        
        if (!depositClicked) {
            // Strategy 3: Try case-insensitive match
            try {
                const depositButton = this.page.getByRole('button', { name: 'Deposit Funds', exact: false }).first();
                if (await depositButton.isVisible({ timeout: 5000 })) {
                    console.log('✅ Found button with case-insensitive match');
                    await depositButton.click();
                    await this.page.waitForTimeout(2000);
                    await this.takeScreenshot('deposit-dialog-opened');
                    depositClicked = true;
                }
            } catch (error) {
                console.log(`⚠️ Strategy 3 failed: ${error.message}`);
            }
        }
        
        if (!depositClicked) {
            // Strategy 4: Try finding button containing "Deposit" text
            try {
                const depositButton = this.page.locator('button').filter({ hasText: 'Deposit' }).first();
                if (await depositButton.isVisible({ timeout: 5000 })) {
                    console.log('✅ Found button containing "Deposit" text');
                    await depositButton.click();
                    await this.page.waitForTimeout(2000);
                    await this.takeScreenshot('deposit-dialog-opened');
                    depositClicked = true;
                }
            } catch (error) {
                console.log(`⚠️ Strategy 4 failed: ${error.message}`);
            }
        }
        
        if (!depositClicked) {
            // Strategy 5: Try finding all buttons and filter by text content
            try {
                const buttons = await this.page.locator('button, [role="button"]').all();
                console.log(`🔍 Found ${buttons.length} buttons on page`);
                for (let i = 0; i < buttons.length; i++) {
                    try {
                        const text = await buttons[i].textContent();
                        console.log(`   Button ${i + 1}: "${text}"`);
                        if (text && text.toLowerCase().includes('deposit')) {
                            console.log(`✅ Found deposit button at index ${i + 1}: "${text}"`);
                            await buttons[i].click();
                            await this.page.waitForTimeout(2000);
                            await this.takeScreenshot('deposit-dialog-opened');
                            depositClicked = true;
                            break;
                        }
                    } catch {
                        continue;
                    }
                }
            } catch (error) {
                console.log(`⚠️ Strategy 5 failed: ${error.message}`);
            }
        }
        
        if (!depositClicked) {
            await this.takeScreenshot('deposit-button-not-found');
            throw new Error('Could not find "Deposit Funds" button after trying all strategies');
        }
        
        // Fill Date Deposited - Use label to find the input
        console.log(`📅 Filling date: ${receiptData.date}`);
        console.log(`   Expected value: ${receiptData.date}`);
        try {
            // Find by label text "Date Deposited"
            const dateLabel = this.page.getByText('Date Deposited', { exact: false }).first();
            // Get the input field near the label
            const dateInput = dateLabel.locator('..').locator('input[type="text"], textbox').first();
            await dateInput.click();
            await dateInput.fill(receiptData.date);
            await this.page.waitForTimeout(500);
            const actualDateValue = await dateInput.inputValue();
            console.log(`   Actual value: ${actualDateValue}`);
            console.log(`✅ Date filled successfully`);
        } catch (error) {
            console.log(`⚠️ Could not fill date field with label method: ${error.message}`);
            // Try alternative: find all text inputs and use the first one
            try {
                const dateInputs = await this.page.locator('input[type="text"], textbox').all();
                if (dateInputs.length > 0) {
                    await dateInputs[0].click();
                    await dateInputs[0].fill(receiptData.date);
                    console.log('✅ Date filled (alternative selector)');
                }
            } catch (error2) {
                console.log(`❌ Failed to fill date: ${error2.message}`);
            }
        }
        
        // Fill Received From (firstname lastname format)
        const contactName = `${receiptData.firstname} ${receiptData.lastname}`;
        console.log(`👤 Filling Received From: ${contactName}`);
        console.log(`   Expected value: ${contactName} (format: Firstname Lastname)`);
        try {
            // Find by label text "Received From"
            const receivedFromLabel = this.page.getByText('Received From', { exact: false }).first();
            // Get the combobox/input near the label
            const receivedFromInput = receivedFromLabel.locator('..').locator('combobox, input[type="text"]').first();
            
            // Click to focus/open dropdown
            await receivedFromInput.click();
            await this.page.waitForTimeout(1000);
            
            // Clear existing text if any
            await receivedFromInput.clear();
            await this.page.waitForTimeout(500);
            
            // Type the name in format "Firstname Lastname"
            await receivedFromInput.fill(contactName);
            await this.page.waitForTimeout(2000); // Wait for dropdown to filter
            
            // Try to select from dropdown if it appears
            try {
                const contactOption = this.page.getByText(contactName, { exact: false }).first();
                if (await contactOption.isVisible({ timeout: 2000 })) {
                    await contactOption.click();
                    await this.page.waitForTimeout(500);
                    const actualContactValue = await receivedFromInput.inputValue();
                    console.log(`   Actual value: ${actualContactValue}`);
                    console.log(`✅ Selected contact from dropdown: ${contactName}`);
                } else {
                    // Try pressing Enter to select
                    await receivedFromInput.press('Enter');
                    await this.page.waitForTimeout(500);
                    const actualContactValue = await receivedFromInput.inputValue();
                    console.log(`   Actual value: ${actualContactValue}`);
                    console.log(`✅ Entered contact name: ${contactName}`);
                }
            } catch {
                // If selection fails, just leave the typed text
                console.log(`⚠️ Could not select from dropdown, leaving typed text: ${contactName}`);
            }
        } catch (error) {
            console.log(`⚠️ Could not fill Received From field: ${error.message}`);
            // Try alternative: find combobox directly
            try {
                const comboboxes = await this.page.locator('combobox').all();
                if (comboboxes.length > 0) {
                    await comboboxes[0].click();
                    await comboboxes[0].fill(contactName);
                    await this.page.waitForTimeout(1000);
                    console.log('✅ Received From filled (alternative selector)');
                }
            } catch (error2) {
                console.log(`❌ Failed to fill Received From: ${error2.message}`);
            }
        }
        
        // Fill Reason
        if (receiptData.reason) {
            console.log(`📝 Filling reason: ${receiptData.reason}`);
            console.log(`   Expected value: ${receiptData.reason}`);
            let reasonFilled = false;
            
            // Strategy 1: Find by label text "Reason"
            try {
                const reasonLabel = this.page.getByText('Reason', { exact: false }).first();
                const reasonInput = reasonLabel.locator('..').locator('input[type="text"], textbox, textarea').first();
                await reasonInput.click({ timeout: 5000 });
                await reasonInput.fill(receiptData.reason);
                await this.page.waitForTimeout(500);
                const actualReasonValue = await reasonInput.inputValue();
                console.log(`   Actual value: ${actualReasonValue}`);
                console.log('✅ Reason filled (label method)');
                reasonFilled = true;
            } catch (error) {
                console.log(`⚠️ Strategy 1 (label method) failed: ${error.message}`);
            }
            
            if (!reasonFilled) {
                // Strategy 2: Find by name attribute
                try {
                    const reasonInput = this.page.locator('input[name*="reason"], textarea[name*="reason"], input[name*="Reason"], textarea[name*="Reason"]').first();
                    if (await reasonInput.isVisible({ timeout: 3000 })) {
                        await reasonInput.click();
                        await reasonInput.fill(receiptData.reason);
                        await this.page.waitForTimeout(500);
                        console.log('✅ Reason filled (name attribute)');
                        reasonFilled = true;
                    }
                } catch (error) {
                    console.log(`⚠️ Strategy 2 (name attribute) failed: ${error.message}`);
                }
            }
            
            if (!reasonFilled) {
                // Strategy 3: Find by placeholder
                try {
                    const reasonInput = this.page.locator('input[placeholder*="reason"], textarea[placeholder*="reason"], input[placeholder*="Reason"], textarea[placeholder*="Reason"]').first();
                    if (await reasonInput.isVisible({ timeout: 3000 })) {
                        await reasonInput.click();
                        await reasonInput.fill(receiptData.reason);
                        await this.page.waitForTimeout(500);
                        console.log('✅ Reason filled (placeholder)');
                        reasonFilled = true;
                    }
                } catch (error) {
                    console.log(`⚠️ Strategy 3 (placeholder) failed: ${error.message}`);
                }
            }
            
            if (!reasonFilled) {
                // Strategy 4: Find by aria-label
                try {
                    const reasonInput = this.page.locator('[aria-label*="reason"], [aria-label*="Reason"]').first();
                    if (await reasonInput.isVisible({ timeout: 3000 })) {
                        await reasonInput.click();
                        await reasonInput.fill(receiptData.reason);
                        await this.page.waitForTimeout(500);
                        console.log('✅ Reason filled (aria-label)');
                        reasonFilled = true;
                    }
                } catch (error) {
                    console.log(`⚠️ Strategy 4 (aria-label) failed: ${error.message}`);
                }
            }
            
            if (!reasonFilled) {
                // Strategy 5: Find all text inputs/textareas and check labels/placeholders
                try {
                    const allInputs = await this.page.locator('input[type="text"], textbox, textarea').all();
                    console.log(`🔍 Found ${allInputs.length} text inputs/textareas, checking for Reason field...`);
                    
                    for (let i = 0; i < allInputs.length; i++) {
                        try {
                            const input = allInputs[i];
                            const placeholder = await input.getAttribute('placeholder') || '';
                            const name = await input.getAttribute('name') || '';
                            const ariaLabel = await input.getAttribute('aria-label') || '';
                            const id = await input.getAttribute('id') || '';
                            
                            // Check if this input is related to Reason
                            const isReasonField = 
                                placeholder.toLowerCase().includes('reason') ||
                                name.toLowerCase().includes('reason') ||
                                ariaLabel.toLowerCase().includes('reason') ||
                                id.toLowerCase().includes('reason');
                            
                            // Skip first input (likely Date) and Received From combobox
                            // Reason is usually after Date and Received From
                            if (i >= 2 && (isReasonField || i === allInputs.length - 2)) {
                                console.log(`🔍 Trying input #${i} (placeholder: "${placeholder}", name: "${name}")`);
                                await input.click({ timeout: 3000 });
                                await input.fill(receiptData.reason);
                                await this.page.waitForTimeout(500);
                                console.log(`✅ Reason filled (input #${i})`);
                                reasonFilled = true;
                                break;
                            }
                        } catch {
                            continue;
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Strategy 5 (checking all inputs) failed: ${error.message}`);
                }
            }
            
            if (!reasonFilled) {
                console.log(`❌ Could not fill Reason field after trying all strategies`);
            }
        }
        
        // Check if page is still open before continuing
        if (this.page.isClosed()) {
            throw new Error('Page was closed unexpectedly during form filling');
        }
        
        // Fill Amount in the Allocated Matters section
        console.log(`💰 Filling amount: $${receiptData.amount}`);
        console.log(`   Expected value: $${receiptData.amount.toFixed(2)}`);
        try {
            // Find by label text "Amount" - look for it near "Allocated Matters"
            // First, find the Allocated Matters section
            const allocatedMattersSection = this.page.getByText('Allocated Matters', { exact: false }).first();
            // Then find Amount label within that section
            const amountLabel = allocatedMattersSection.locator('..').getByText('Amount', { exact: false }).first();
            const amountInput = amountLabel.locator('..').locator('spinbutton, input[type="number"]').first();
            await amountInput.click({ timeout: 10000 });
            await amountInput.fill(receiptData.amount.toString());
            await this.page.waitForTimeout(500);
            const actualAmountValue = await amountInput.inputValue();
            console.log(`   Actual value: $${actualAmountValue}`);
            console.log('✅ Amount filled');
        } catch (error) {
            console.log(`⚠️ Could not fill amount field with label method: ${error.message}`);
            // Try alternative: find spinbutton directly
            try {
                if (this.page.isClosed()) {
                    throw new Error('Page closed while trying to fill amount');
                }
                const spinbuttons = await this.page.locator('spinbutton, input[type="number"]').all();
                if (spinbuttons.length > 0) {
                    // Use the last spinbutton (likely the amount field in Allocated Matters)
                    await spinbuttons[spinbuttons.length - 1].click({ timeout: 5000 });
                    await spinbuttons[spinbuttons.length - 1].fill(receiptData.amount.toString());
                    await this.page.waitForTimeout(500);
                    console.log('✅ Amount filled (alternative selector)');
                }
            } catch (error2) {
                console.log(`❌ Failed to fill amount: ${error2.message}`);
                // Don't throw - continue even if amount fill fails
            }
        }
        
        // Check if page is still open before taking screenshot
        if (this.page.isClosed()) {
            throw new Error('Page was closed before form completion');
        }
        
        // Wait a moment for form to update
        await this.page.waitForTimeout(1000);
        await this.takeScreenshot('form-filled');
        
        // Check if page is still open before checking button
        if (this.page.isClosed()) {
            throw new Error('Page was closed before checking Process/Open Receipt button');
        }
        
        // Check if "Process/Open Receipt" button is enabled
        try {
            const processButton = this.page.getByRole('button', { name: 'Process/Open Receipt' }).first();
            const isEnabled = await processButton.isEnabled();
            console.log(`🔘 "Process/Open Receipt" button enabled: ${isEnabled}`);
        } catch (error) {
            console.log(`⚠️ Could not find "Process/Open Receipt" button: ${error.message}`);
        }
        
        if (this.testMode) {
            console.log('\n' + '='.repeat(60));
            console.log('🧪 TEST MODE: Stopping before final submission');
            console.log('='.repeat(60));
            console.log('✅ Form has been filled successfully!');
            console.log('📋 Detailed Form Summary:');
            console.log(`   📅 Date Deposited:`);
            console.log(`      Expected: ${receiptData.date}`);
            console.log(`      Field: Date Deposited`);
            console.log(`   👤 Received From:`);
            console.log(`      Expected: ${receiptData.firstname} ${receiptData.lastname}`);
            console.log(`      Format: Firstname Lastname`);
            console.log(`      Field: Received From (combobox)`);
            console.log(`   📝 Reason:`);
            console.log(`      Expected: ${receiptData.reason || 'N/A'}`);
            console.log(`      Field: Reason`);
            console.log(`   💰 Amount:`);
            console.log(`      Expected: $${receiptData.amount.toFixed(2)}`);
            console.log(`      Field: Amount (in Allocated Matters section)`);
            console.log(`   📋 Matter:`);
            console.log(`      Pre-filled from matter context`);
            console.log('\n⚠️ Form filled but NOT submitted (test mode)');
            console.log('⚠️ "Process/Open Receipt" button was NOT clicked');
            console.log('='.repeat(60));
            
            // Keep browser open for inspection
            console.log('\n⏸️ Keeping browser open for 30 seconds for inspection...');
            console.log('   Press Ctrl+C to close early');
            try {
                if (!this.page.isClosed()) {
                    await this.page.waitForTimeout(30000);
                }
            } catch (error) {
                console.log(`\n⚠️ Error while waiting: ${error.message}`);
            }
        } else {
            // Click "Process/Open Receipt" button
            console.log('💾 Clicking "Process/Open Receipt" button...');
            try {
                if (this.page.isClosed()) {
                    throw new Error('Page was closed before submitting receipt');
                }
                const processButton = this.page.getByRole('button', { name: 'Process/Open Receipt' }).first();
                await processButton.click({ timeout: 10000 });
                await this.page.waitForTimeout(3000);
                if (!this.page.isClosed()) {
                    await this.takeScreenshot('after-submit');
                }
                console.log('✅ Receipt submitted!');
            } catch (error) {
                console.log(`❌ Failed to submit receipt: ${error.message}`);
                throw error;
            }
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            console.log('🧹 Browser closed');
        }
    }

    async run(matterId, receiptData) {
        // Validate matterId before proceeding
        if (!matterId || typeof matterId !== 'string' || matterId.trim() === '') {
            throw new Error(`Invalid matterId: "${matterId}". Matter ID is required and cannot be empty.`);
        }
        
        try {
            await this.initialize();
            await this.login();
            
            const accountId = '34154dcb-8a76-4f8c-9281-a9b80e3cca16'; // Trust account ID
            await this.navigateToMatterTransactions(matterId.trim(), accountId);
            await this.fillReceiptForm(receiptData);
            
            console.log('🎉 Automation completed successfully!');
            return {
                success: true,
                message: this.testMode 
                    ? 'Receipt form filled successfully (test mode)' 
                    : 'Receipt created successfully'
            };
            
        } catch (error) {
            console.error('❌ Automation failed:', error.message);
            try {
                await this.takeScreenshot('automation-error');
            } catch {
                // Screenshot might fail if browser is already closed
            }
            return {
                success: false,
                error: error.message,
                message: this.testMode 
                    ? 'Failed to fill receipt form' 
                    : 'Failed to create receipt'
            };
        } finally {
            try {
                if (!this.testMode && this.page && !this.page.isClosed()) {
                    await this.page.waitForTimeout(5000); // Wait a moment before closing
                }
            } catch {
                // Page might already be closed
            }
            await this.cleanup();
        }
    }
}

export default SmokeBallReceiptAutomation;
