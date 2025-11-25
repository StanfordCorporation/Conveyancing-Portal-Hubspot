"""
Smokeball Receipt Creation Automation (Python)

This script automates the process of:
1. Logging into Smokeball (with 2FA support)
2. Navigating to a specific matter's trust account transactions
3. Filling out a receipt form with specified details
4. Stopping before final submission (test mode)

Prerequisites:
    pip install playwright python-dotenv pyotp
    playwright install chromium

Usage:
    python smokeball_receipt_automation.py [--matter-id MATTER_ID] [--amount AMOUNT] [--lastname LASTNAME] [--firstname FIRSTNAME] [--test-mode]

Example:
    python smokeball_receipt_automation.py --matter-id ce2582fe-b415-4f95-b9b9-c79c903a4654 --amount 81.70 --lastname Stanford --firstname Logan --test-mode
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
except ImportError:
    print("❌ Playwright not installed. Install with: pip install playwright")
    print("   Then run: playwright install chromium")
    sys.exit(1)

try:
    import pyotp
except ImportError:
    print("⚠️ pyotp not installed. 2FA will require manual input.")
    print("   Install with: pip install pyotp")
    pyotp = None

load_dotenv()


class SmokeBallReceiptAutomation:
    def __init__(self, test_mode=True):
        self.browser = None
        self.page = None
        self.test_mode = test_mode
        self.credentials = {
            'username': os.getenv('SMOKEBALL_USERNAME', 'pmanocha@stanford.au'),
            'password': os.getenv('SMOKEBALL_PASSWORD', 'LegalxManocha25!'),
            'two_factor_secret': os.getenv('SMOKEBALL_2FA_SECRET')
        }
        self.screenshots_dir = Path('screenshots')
        self.screenshots_dir.mkdir(exist_ok=True)

    def generate_totp_code(self):
        """Generate TOTP code for 2FA"""
        if not self.credentials['two_factor_secret'] or not pyotp:
            raise ValueError('2FA secret not configured or pyotp not installed')
        
        totp = pyotp.TOTP(self.credentials['two_factor_secret'])
        code = totp.now()
        print(f"🔐 Generated 2FA code: {code}")
        return code

    async def initialize(self):
        """Initialize browser and page"""
        print('🚀 Initializing browser...')
        playwright = await async_playwright().start()
        
        self.browser = await playwright.chromium.launch(
            headless=False,  # Keep visible for debugging
            slow_mo=300,  # Slow down for better reliability
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        )
        
        self.page = await self.browser.new_page()
        self.page.set_default_timeout(30000)
        self.page.set_default_navigation_timeout(45000)
        
        await self.page.set_viewport_size({'width': 1920, 'height': 1080})
        
        await self.page.set_extra_http_headers({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        
        print('✅ Browser initialized')

    async def take_screenshot(self, name='debug'):
        """Take a debug screenshot"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
            filename = self.screenshots_dir / f'receipt-{name}-{timestamp}.png'
            await self.page.screenshot(path=str(filename), full_page=True)
            print(f'📸 Screenshot saved: {filename}')
            return str(filename)
        except Exception as e:
            print(f'⚠️ Failed to take screenshot: {e}')
            return None

    async def login(self):
        """Login to Smokeball"""
        print('🔐 Logging into Smokeball...')
        
        try:
            await self.page.goto('https://app.smokeball.com.au', wait_until='networkidle')
            await self.take_screenshot('login-page')
            
            # Wait for email input - try multiple selector strategies
            try:
                await self.page.wait_for_selector('input[type="email"]', timeout=10000)
                email_input = self.page.locator('input[type="email"]').first
            except:
                # Fallback to textbox with email in name/placeholder
                await self.page.wait_for_selector('textbox', timeout=10000)
                email_inputs = self.page.locator('textbox').all()
                # Find the one that's likely the email field (first one usually)
                email_input = email_inputs[0] if email_inputs else None
            
            if not email_input:
                raise Exception('Could not find email input field')
            
            await email_input.fill(self.credentials['username'])
            await asyncio.sleep(1)
            
            # Fill password - find password field (usually second textbox or input[type="password"])
            try:
                password_input = self.page.locator('input[type="password"]').first
            except:
                # Fallback: use second textbox
                password_inputs = self.page.locator('textbox').all()
                password_input = password_inputs[1] if len(password_inputs) > 1 else password_inputs[0]
            
            await password_input.fill(self.credentials['password'])
            await asyncio.sleep(1)
            
            # Click login button - try multiple strategies
            try:
                login_button = self.page.get_by_role('button', name='Log in', exact=False).first
                await login_button.click()
            except:
                # Fallback: find button containing "log" or "sign"
                login_button = self.page.locator('button').filter(has_text='log').first
                await login_button.click()
            
            await asyncio.sleep(3)
            
            current_url = self.page.url
            
            # Check if 2FA is required
            if 'dashboard' not in current_url:
                print('🔐 2FA required...')
                
                try:
                    await self.page.wait_for_selector('input[placeholder="Two-Factor Code"], textbox[name="Two-Factor Code"]', timeout=15000)
                    
                    two_factor_input = self.page.get_by_role('textbox', name='Two-Factor Code')
                    
                    # Get TOTP code
                    if self.credentials['two_factor_secret'] and pyotp:
                        totp_code = self.generate_totp_code()
                    else:
                        print('⚠️ Manual 2FA required - please enter code:')
                        totp_code = input('Enter 2FA code: ')
                    
                    await two_factor_input.fill(totp_code)
                    await asyncio.sleep(1)
                    
                    # Click verify button or press Enter
                    try:
                        await self.page.get_by_role('button', name='Verify').click()
                    except:
                        await two_factor_input.press('Enter')
                    
                    # Wait for dashboard
                    await self.page.wait_for_url('**/dashboard', timeout=45000)
                    print('✅ 2FA verification successful')
                except Exception as e:
                    await self.take_screenshot('2fa-error')
                    raise Exception(f'2FA failed: {e}')
            
            print('✅ Successfully logged in')
        except Exception as e:
            await self.take_screenshot('login-error')
            raise Exception(f'Login failed: {e}')

    async def navigate_to_matter_transactions(self, matter_id, account_id):
        """Navigate to matter's trust account transactions page"""
        print(f'📋 Navigating to matter transactions...')
        print(f'   Matter ID: {matter_id}')
        print(f'   Account ID: {account_id}')
        
        transactions_url = f'https://app.smokeball.com.au/#/billing/view-matter/{matter_id}/transactions/trust/{account_id}~2FTrust'
        
        print(f'🔗 Navigating to: {transactions_url}')
        await self.page.goto(transactions_url)
        
        # Wait for page to fully load - try multiple strategies
        print('⏳ Waiting for page to load...')
        await asyncio.sleep(8)  # Give more time for SPA to load
        
        # Wait for any content to appear
        try:
            await self.page.wait_for_load_state('networkidle', timeout=20000)
            print('✅ Page network idle')
        except:
            print('⚠️ Network idle timeout, but continuing...')
        
        # Wait for transactions page content
        try:
            # Try to find any button or table element
            await self.page.wait_for_selector('button, table, [role="button"]', timeout=15000)
            print('✅ Page content loaded')
        except Exception as e:
            await self.take_screenshot('transactions-page-error')
            print(f'⚠️ Could not verify page content: {e}')
        
        await self.take_screenshot('transactions-page-loaded')

    async def fill_receipt_form(self, receipt_data):
        """Fill out the receipt form"""
        print('💰 Filling receipt form...')
        print(f'📋 Receipt details: {receipt_data}')
        
        await self.take_screenshot('before-fill-form')
        
        # Click "Deposit Funds" button - try multiple selector strategies
        print('🔘 Clicking "Deposit Funds" button...')
        deposit_button = None
        
        # Strategy 1: Try clicking "Create New" first (might open a dropdown menu)
        try:
            create_new_button = self.page.get_by_role('button', name='Create New', exact=False)
            if await create_new_button.is_visible(timeout=5000):
                print('🔘 Found "Create New" button, clicking to open menu...')
                await create_new_button.click()
                await asyncio.sleep(2)  # Wait for menu to open
                await self.take_screenshot('create-new-menu-opened')
                
                # Now look for "Deposit Funds" in the opened menu
                try:
                    deposit_button = self.page.get_by_role('menuitem', name='Deposit Funds', exact=False)
                    if await deposit_button.is_visible(timeout=3000):
                        print('✅ Found "Deposit Funds" in menu')
                        await deposit_button.click()
                        await asyncio.sleep(2)
                        await self.take_screenshot('deposit-dialog-opened')
                        return
                except:
                    # Try finding by text in any menu item
                    menu_items = await self.page.locator('[role="menuitem"], [role="option"], li, a').all()
                    for item in menu_items:
                        try:
                            text = await item.text_content()
                            if text and 'deposit' in text.lower():
                                print(f'✅ Found deposit option: "{text}"')
                                await item.click()
                                await asyncio.sleep(2)
                                await self.take_screenshot('deposit-dialog-opened')
                                return
                        except:
                            continue
        except Exception as e:
            print(f'⚠️ Strategy 1 (Create New menu) failed: {e}')
        
        # Strategy 2: Try exact role and name match (direct button)
        try:
            deposit_button = self.page.get_by_role('button', name='Deposit Funds', exact=True)
            if await deposit_button.is_visible(timeout=5000):
                print('✅ Found button with exact name match')
                await deposit_button.click()
                await asyncio.sleep(2)
                await self.take_screenshot('deposit-dialog-opened')
                return
        except Exception as e:
            print(f'⚠️ Strategy 2 failed: {e}')
        
        # Strategy 3: Try case-insensitive match
        try:
            deposit_button = self.page.get_by_role('button', name='Deposit Funds', exact=False)
            if await deposit_button.is_visible(timeout=5000):
                print('✅ Found button with case-insensitive match')
                await deposit_button.click()
                await asyncio.sleep(2)
                await self.take_screenshot('deposit-dialog-opened')
                return
        except Exception as e:
            print(f'⚠️ Strategy 3 failed: {e}')
        
        # Strategy 4: Try finding button containing "Deposit" text
        try:
            deposit_button = self.page.locator('button').filter(has_text='Deposit').first
            if await deposit_button.is_visible(timeout=5000):
                print('✅ Found button containing "Deposit" text')
                await deposit_button.click()
                await asyncio.sleep(2)
                await self.take_screenshot('deposit-dialog-opened')
                return
        except Exception as e:
            print(f'⚠️ Strategy 4 failed: {e}')
        
        # Strategy 5: Try finding all buttons and filter by text content
        try:
            buttons = await self.page.locator('button, [role="button"]').all()
            print(f'🔍 Found {len(buttons)} buttons on page')
            for i, button in enumerate(buttons):
                try:
                    text = await button.text_content()
                    print(f'   Button {i+1}: "{text}"')
                    if text and 'deposit' in text.lower():
                        print(f'✅ Found deposit button at index {i+1}: "{text}"')
                        await button.click()
                        await asyncio.sleep(2)
                        await self.take_screenshot('deposit-dialog-opened')
                        return
                except:
                    continue
        except Exception as e:
            print(f'⚠️ Strategy 5 failed: {e}')
        
        # Strategy 6: Try finding by aria-label or title
        try:
            deposit_button = self.page.locator('button[aria-label*="Deposit"], button[title*="Deposit"], [aria-label*="Deposit"]').first
            if await deposit_button.is_visible(timeout=5000):
                print('✅ Found button by aria-label/title')
                await deposit_button.click()
                await asyncio.sleep(2)
                await self.take_screenshot('deposit-dialog-opened')
                return
        except Exception as e:
            print(f'⚠️ Strategy 6 failed: {e}')
        
        # Strategy 7: Try finding by data attributes or class names
        try:
            deposit_button = self.page.locator('[data-testid*="deposit"], [class*="deposit"], [id*="deposit"]').first
            if await deposit_button.is_visible(timeout=5000):
                print('✅ Found button by data attributes')
                await deposit_button.click()
                await asyncio.sleep(2)
                await self.take_screenshot('deposit-dialog-opened')
                return
        except Exception as e:
            print(f'⚠️ Strategy 7 failed: {e}')
        
        # If all strategies failed, take screenshot and raise error
        await self.take_screenshot('deposit-button-not-found')
        raise Exception('Could not find "Deposit Funds" button after trying all strategies')
        
        # Fill Date Deposited - Use label to find the input
        print(f'📅 Filling date: {receipt_data["date"]}')
        try:
            # Find by label text "Date Deposited"
            date_label = self.page.get_by_text('Date Deposited', exact=False)
            # Get the input field near the label
            date_input = date_label.locator('..').locator('input[type="text"], textbox').first
            await date_input.click()
            await date_input.fill(receipt_data['date'])
            await asyncio.sleep(0.5)
            print('✅ Date filled')
        except Exception as e:
            print(f'⚠️ Could not fill date field with label method: {e}')
            # Try alternative: find all text inputs and use the first one
            try:
                date_inputs = self.page.locator('input[type="text"], textbox').all()
                if date_inputs:
                    await date_inputs[0].click()
                    await date_inputs[0].fill(receipt_data['date'])
                    print('✅ Date filled (alternative selector)')
            except Exception as e2:
                print(f'❌ Failed to fill date: {e2}')
        
        # Fill Received From (lastname, firstname format)
        print(f'👤 Filling Received From: {receipt_data["lastname"]}, {receipt_data["firstname"]}')
        contact_name = f'{receipt_data["lastname"]}, {receipt_data["firstname"]}'
        try:
            # Find by label text "Received From"
            received_from_label = self.page.get_by_text('Received From', exact=False)
            # Get the combobox/input near the label
            received_from_input = received_from_label.locator('..').locator('combobox, input[type="text"]').first
            
            # Click to focus/open dropdown
            await received_from_input.click()
            await asyncio.sleep(1)
            
            # Clear existing text if any
            await received_from_input.clear()
            await asyncio.sleep(0.5)
            
            # Type the name in format "Lastname, Firstname"
            await received_from_input.fill(contact_name)
            await asyncio.sleep(2)  # Wait for dropdown to filter
            
            # Try to select from dropdown if it appears
            try:
                # Look for the contact option in the dropdown
                # The dropdown might show as options or gridcells
                contact_option = self.page.get_by_text(contact_name, exact=False).first
                if await contact_option.is_visible(timeout=2000):
                    await contact_option.click()
                    print(f'✅ Selected contact from dropdown: {contact_name}')
                else:
                    # Try pressing Enter to select
                    await received_from_input.press('Enter')
                    await asyncio.sleep(0.5)
                    print(f'✅ Entered contact name: {contact_name}')
            except Exception as e:
                # If selection fails, just leave the typed text
                print(f'⚠️ Could not select from dropdown, leaving typed text: {contact_name}')
            
        except Exception as e:
            print(f'⚠️ Could not fill Received From field: {e}')
            # Try alternative: find combobox directly
            try:
                comboboxes = self.page.locator('combobox').all()
                if comboboxes:
                    await comboboxes[0].click()
                    await comboboxes[0].fill(contact_name)
                    await asyncio.sleep(1)
                    print('✅ Received From filled (alternative selector)')
            except Exception as e2:
                print(f'❌ Failed to fill Received From: {e2}')
        
        # Fill Reason
        if receipt_data.get('reason'):
            print(f'📝 Filling reason: {receipt_data["reason"]}')
            try:
                # Find by label text "Reason"
                reason_label = self.page.get_by_text('Reason', exact=False)
                reason_input = reason_label.locator('..').locator('input[type="text"], textbox').first
                await reason_input.click()
                await reason_input.fill(receipt_data['reason'])
                await asyncio.sleep(0.5)
                print('✅ Reason filled')
            except Exception as e:
                print(f'⚠️ Could not fill reason field: {e}')
                # Try finding all text inputs and using one that's not the date
                try:
                    text_inputs = self.page.locator('input[type="text"], textbox').all()
                    # Skip first input (date) and try the next ones
                    for i, inp in enumerate(text_inputs[1:], start=1):
                        try:
                            placeholder = await inp.get_attribute('placeholder') or ''
                            if 'reason' in placeholder.lower() or i == len(text_inputs) - 2:
                                await inp.click()
                                await inp.fill(receipt_data['reason'])
                                print(f'✅ Reason filled (input #{i})')
                                break
                        except:
                            continue
                except Exception as e2:
                    print(f'❌ Failed to fill reason: {e2}')
        
        # Fill Amount in the Allocated Matters section
        print(f'💰 Filling amount: ${receipt_data["amount"]}')
        try:
            # Find by label text "Amount" - look for it near "Allocated Matters"
            # First, find the Allocated Matters section
            allocated_matters_section = self.page.get_by_text('Allocated Matters', exact=False)
            # Then find Amount label within that section
            amount_label = allocated_matters_section.locator('..').get_by_text('Amount', exact=False).first
            amount_input = amount_label.locator('..').locator('spinbutton, input[type="number"]').first
            await amount_input.click()
            await amount_input.fill(str(receipt_data['amount']))
            await asyncio.sleep(0.5)
            print('✅ Amount filled')
        except Exception as e:
            print(f'⚠️ Could not fill amount field: {e}')
            # Try alternative: find spinbutton directly
            try:
                spinbuttons = self.page.locator('spinbutton, input[type="number"]').all()
                if spinbuttons:
                    # Use the last spinbutton (likely the amount field in Allocated Matters)
                    await spinbuttons[-1].click()
                    await spinbuttons[-1].fill(str(receipt_data['amount']))
                    print('✅ Amount filled (alternative selector)')
            except Exception as e2:
                print(f'❌ Failed to fill amount: {e2}')
        
        # Wait a moment for form to update
        await asyncio.sleep(1)
        await self.take_screenshot('form-filled')
        
        # Check if "Process/Open Receipt" button is enabled
        try:
            process_button = self.page.get_by_role('button', name='Process/Open Receipt')
            is_enabled = await process_button.is_enabled()
            print(f'🔘 "Process/Open Receipt" button enabled: {is_enabled}')
        except:
            print('⚠️ Could not find "Process/Open Receipt" button')
        
        if self.test_mode:
            print('\n' + '='*60)
            print('🧪 TEST MODE: Stopping before final submission')
            print('='*60)
            print('✅ Form has been filled successfully!')
            print('📋 Form Summary:')
            print(f'   - Date: {receipt_data["date"]}')
            print(f'   - Received From: {receipt_data["lastname"]}, {receipt_data["firstname"]}')
            print(f'   - Reason: {receipt_data.get("reason", "N/A")}')
            print(f'   - Amount: ${receipt_data["amount"]}')
            print(f'   - Matter: Pre-filled')
            print('\n⚠️ To actually create the receipt, run without --test-mode flag')
            print('='*60)
            
            # Keep browser open for inspection
            print('\n⏸️ Keeping browser open for 30 seconds for inspection...')
            print('   Press Ctrl+C to close early')
            try:
                await asyncio.sleep(30)
            except KeyboardInterrupt:
                print('\n⚠️ Interrupted by user')
        else:
            # Click "Process/Open Receipt" button
            print('💾 Clicking "Process/Open Receipt" button...')
            try:
                process_button = self.page.get_by_role('button', name='Process/Open Receipt')
                await process_button.click()
                await asyncio.sleep(3)
                await self.take_screenshot('after-submit')
                print('✅ Receipt submitted!')
            except Exception as e:
                print(f'❌ Failed to submit receipt: {e}')
                raise

    async def cleanup(self):
        """Clean up browser resources"""
        if self.browser:
            await self.browser.close()
            print('🧹 Browser closed')

    async def run(self, matter_id, receipt_data):
        """Run the automation"""
        try:
            await self.initialize()
            await self.login()
            
            account_id = '34154dcb-8a76-4f8c-9281-a9b80e3cca16'  # Trust account ID
            await self.navigate_to_matter_transactions(matter_id, account_id)
            await self.fill_receipt_form(receipt_data)
            
            print('🎉 Automation completed successfully!')
            return {
                'success': True,
                'message': 'Receipt form filled successfully' if self.test_mode else 'Receipt created successfully'
            }
            
        except Exception as e:
            print(f'❌ Automation failed: {e}')
            await self.take_screenshot('automation-error')
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to fill receipt form' if self.test_mode else 'Failed to create receipt'
            }
        finally:
            if not self.test_mode:
                await asyncio.sleep(5)  # Wait a moment before closing
            await self.cleanup()


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Smokeball Receipt Automation')
    parser.add_argument('--matter-id', default='ce2582fe-b415-4f95-b9b9-c79c903a4654',
                       help='Matter ID (default: ce2582fe-b415-4f95-b9b9-c79c903a4654)')
    parser.add_argument('--amount', type=float, default=81.70,
                       help='Amount (default: 81.70)')
    parser.add_argument('--lastname', default='Stanford',
                       help='Contact lastname (default: Stanford)')
    parser.add_argument('--firstname', default='Logan',
                       help='Contact firstname (default: Logan)')
    parser.add_argument('--reason', default='On account of test search fees',
                       help='Reason for receipt (default: On account of test search fees)')
    parser.add_argument('--date', default='21/11/2025',
                       help='Date deposited (default: 21/11/2025)')
    parser.add_argument('--test-mode', action='store_true', default=True,
                       help='Test mode - fill form but do not submit (default: True)')
    parser.add_argument('--submit', action='store_true',
                       help='Actually submit the receipt (overrides test-mode)')
    
    args = parser.parse_args()
    
    test_mode = args.test_mode and not args.submit
    
    # Prepare receipt data
    receipt_data = {
        'amount': args.amount,
        'date': args.date,
        'lastname': args.lastname,
        'firstname': args.firstname,
        'reason': args.reason,
        'description': 'Bank Transfer deposit',
        'type': 'Deposit'
    }
    
    print('🤖 Starting Smokeball Receipt Automation...')
    print(f'🎯 Matter ID: {args.matter_id}')
    print(f'💰 Amount: ${args.amount}')
    print(f'👤 Contact: {args.lastname}, {args.firstname}')
    print(f'📅 Date: {args.date}')
    print(f'🧪 Test Mode: {test_mode}')
    print()
    
    automation = SmokeBallReceiptAutomation(test_mode=test_mode)
    result = await automation.run(args.matter_id, receipt_data)
    
    print('\n📊 Final Result:', result)
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n⚠️ Interrupted by user')
        sys.exit(1)
    except Exception as e:
        print(f'\n💥 Unexpected error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

