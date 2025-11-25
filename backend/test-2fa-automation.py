"""
Test 2FA Token Generation for Smokeball Automation

This script tests if the 2FA token can be generated automatically
using the SMOKEBALL_2FA_SECRET environment variable.

Usage:
    python test-2fa-automation.py

Requirements:
    - SMOKEBALL_2FA_SECRET must be set in .env file
    - pyotp must be installed: pip install pyotp
"""

import os
import sys
from dotenv import load_dotenv

try:
    import pyotp
except ImportError:
    print("[ERROR] pyotp not installed. Install with: pip install pyotp")
    sys.exit(1)

load_dotenv()

def test_2fa_generation():
    """Test 2FA token generation"""
    print("[TEST] Testing 2FA Token Generation")
    print("=" * 60)
    
    # Check if secret is configured
    two_factor_secret = os.getenv('SMOKEBALL_2FA_SECRET')
    
    if not two_factor_secret:
        print("[ERROR] SMOKEBALL_2FA_SECRET not found in environment variables")
        print("\n[INFO] To configure:")
        print("   1. Add SMOKEBALL_2FA_SECRET to your .env file")
        print("   2. The secret should be in base32 format")
        print("   3. You can get it from your authenticator app settings")
        return False
    
    print(f"[OK] Found SMOKEBALL_2FA_SECRET in environment")
    print(f"   Secret length: {len(two_factor_secret)} characters")
    print(f"   Secret preview: {two_factor_secret[:10]}...")
    
    # Try to generate TOTP code
    try:
        print("\n[INFO] Generating TOTP code...")
        totp = pyotp.TOTP(two_factor_secret)
        code = totp.now()
        
        print(f"[OK] Successfully generated 2FA code: {code}")
        print(f"   Code length: {len(code)} digits")
        
        # Generate a few codes to show they change over time
        print("\n[TEST] Testing code generation over time:")
        print("   (Codes should change every 30 seconds)")
        for i in range(3):
            code = totp.now()
            remaining_time = totp.interval - (int(totp.now()) % totp.interval)
            print(f"   Code {i+1}: {code} (valid for {remaining_time} more seconds)")
            if i < 2:
                import time
                time.sleep(1)
        
        print("\n[OK] 2FA token generation is working correctly!")
        print("\n[INFO] This means the Python automation script will be able to:")
        print("   - Automatically generate 2FA codes during login")
        print("   - Complete login without manual intervention")
        print("   - Run fully automated receipt creation")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to generate TOTP code: {e}")
        print("\n[TROUBLESHOOTING]")
        print("   - Verify SMOKEBALL_2FA_SECRET is in base32 format")
        print("   - Check that the secret matches your authenticator app")
        print("   - Ensure pyotp is installed: pip install pyotp")
        return False


def test_automation_2fa_integration():
    """Test if the automation script can access 2FA functionality"""
    print("\n" + "=" * 60)
    print("[TEST] Testing Automation Script 2FA Integration")
    print("=" * 60)
    
    try:
        # Import the automation class
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from smokeball_receipt_automation import SmokeBallReceiptAutomation
        
        print("[OK] Successfully imported SmokeBallReceiptAutomation")
        
        # Create instance
        automation = SmokeBallReceiptAutomation(test_mode=True)
        
        # Check if 2FA secret is configured
        if automation.credentials.get('two_factor_secret'):
            print("[OK] 2FA secret is configured in automation class")
            
            # Test TOTP generation method
            try:
                code = automation.generate_totp_code()
                print(f"[OK] generate_totp_code() works: {code}")
                return True
            except Exception as e:
                print(f"[ERROR] generate_totp_code() failed: {e}")
                return False
        else:
            print("[WARNING] 2FA secret not configured in automation class")
            print("   The automation will prompt for manual 2FA input")
            return False
            
    except ImportError as e:
        print(f"[ERROR] Failed to import automation script: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Error testing automation integration: {e}")
        return False


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("[START] Smokeball 2FA Automation Test")
    print("=" * 60 + "\n")
    
    # Test 1: Basic 2FA token generation
    test1_result = test_2fa_generation()
    
    # Test 2: Automation script integration
    test2_result = test_automation_2fa_integration()
    
    # Summary
    print("\n" + "=" * 60)
    print("[SUMMARY] Test Summary")
    print("=" * 60)
    print(f"   Basic 2FA Generation: {'[PASS]' if test1_result else '[FAIL]'}")
    print(f"   Automation Integration: {'[PASS]' if test2_result else '[FAIL]'}")
    
    if test1_result and test2_result:
        print("\n[SUCCESS] All tests passed! 2FA automation is ready to use.")
        sys.exit(0)
    else:
        print("\n[WARNING] Some tests failed. Please check the errors above.")
        sys.exit(1)

