import Shepherd from 'shepherd.js';

/**
 * Create interactive guided tour for Primary Seller fields
 * Each step allows editing and requires confirmation before proceeding
 * onFieldConfirm is async and saves the field to HubSpot
 */
export const createPrimarySellerTour = (onFieldConfirm) => {
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      cancelIcon: {
        enabled: true
      },
      scrollTo: { behavior: 'smooth', block: 'center' },
      classes: 'shepherd-theme-primary-seller',
      canClickTarget: true // Allow clicking on highlighted fields
    }
  });

  // Add progress indicator to show step count
  // Shepherd doesn't have built-in progress, so we'll add it manually
  const totalSteps = 8; // Welcome + 6 fields + completion
  
  // Helper to wrap step text with progress indicator
  const addProgressToText = (text, stepIndex) => {
    const progress = ((stepIndex + 1) / totalSteps) * 100;
    return `
      <div class="shepherd-progress-container">
        <div class="shepherd-progress-bar-container">
          <div class="shepherd-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="shepherd-progress-text">${stepIndex + 1} of ${totalSteps}</div>
      </div>
      <div class="shepherd-step-content">${text}</div>
    `;
  };

  // Helper function to create a field step with save functionality
  const createFieldStep = (id, elementSelector, text, fieldName, stepIndex) => {
    let savingInProgress = false;
    
    return {
      id: id,
      attachTo: {
        element: elementSelector,
        on: 'bottom'
      },
      text: addProgressToText(text, stepIndex),
      buttons: [
        {
          text: 'Previous',
          action: tour.back,
          classes: 'shepherd-button-secondary'
        },
        {
          text: 'Confirm',
          action: async function() {
            if (savingInProgress) return; // Prevent double-clicks
            
            // Validate residential address field - must not be empty or placeholder
            if (fieldName === 'residential-address') {
              const inputElement = document.querySelector('[data-tour-target="residential-address"]');
              if (inputElement) {
                const addressValue = (inputElement.value || '').trim();
                // List of invalid placeholder values
                const invalidValues = ['', 'N/A', 'n/a', 'N/a', 'TBD', 'tbd', 'To Be Determined', 'to be determined'];
                const isValid = addressValue && !invalidValues.includes(addressValue);
                
                if (!isValid) {
                  // Show error message and prevent proceeding
                  const step = tour.getCurrentStep();
                  const stepContent = step.el.querySelector('.shepherd-text');
                  if (stepContent) {
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'shepherd-validation-error';
                    errorMessage.style.cssText = 'color: #ef4444; margin-top: 8px; font-size: 14px; font-weight: 500;';
                    errorMessage.textContent = '⚠️ Residential address is required. Please enter your address before proceeding.';
                    
                    // Remove any existing error message
                    const existingError = stepContent.querySelector('.shepherd-validation-error');
                    if (existingError) {
                      existingError.remove();
                    }
                    
                    stepContent.appendChild(errorMessage);
                    
                    // Remove error message after 5 seconds
                    setTimeout(() => {
                      if (errorMessage.parentNode) {
                        errorMessage.remove();
                      }
                    }, 5000);
                  }
                  return; // Don't proceed to next step
                }
              }
            }
            
            savingInProgress = true;
            const step = tour.getCurrentStep();
            const confirmButton = step.el.querySelector('.shepherd-button:not(.shepherd-button-secondary)');
            
            // Remove any validation error message before proceeding
            if (fieldName === 'residential-address') {
              const stepContent = step.el.querySelector('.shepherd-text');
              if (stepContent) {
                const existingError = stepContent.querySelector('.shepherd-validation-error');
                if (existingError) {
                  existingError.remove();
                }
              }
            }
            
            if (confirmButton) {
              const originalText = confirmButton.textContent;
              confirmButton.textContent = 'Saving...';
              confirmButton.disabled = true;
              confirmButton.style.opacity = '0.6';
              confirmButton.style.cursor = 'not-allowed';
              
              try {
                // Small delay to ensure React has updated the DOM with the latest input value
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Save the field to HubSpot
                if (onFieldConfirm) {
                  await onFieldConfirm(fieldName);
                }
                
                // Re-enable button
                confirmButton.textContent = originalText;
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
                savingInProgress = false;
                
                // Move to next step
                tour.next();
              } catch (error) {
                // Re-enable button on error
                confirmButton.textContent = originalText;
                confirmButton.disabled = false;
                confirmButton.style.opacity = '1';
                confirmButton.style.cursor = 'pointer';
                savingInProgress = false;
                // Don't proceed to next step on error
                console.error(`[Tour] Error saving ${fieldName}:`, error);
              }
            } else {
              // Fallback if button not found
              // Note: Validation for residential-address already handled above
              savingInProgress = false;
              if (onFieldConfirm) {
                try {
                  await onFieldConfirm(fieldName);
                  tour.next();
                } catch (error) {
                  console.error(`[Tour] Error saving ${fieldName}:`, error);
                }
              } else {
                tour.next();
              }
            }
          }
        }
      ],
      beforeShowPromise: function() {
        return new Promise((resolve) => {
          setTimeout(() => {
            // For residential address step, ensure Google Places autocomplete dropdown is accessible
            if (fieldName === 'residential-address') {
              // Set high z-index for Google Places autocomplete container
              const style = document.createElement('style');
              style.id = 'shepherd-pac-fix';
              style.textContent = `
                .pac-container {
                  z-index: 10001 !important;
                  position: fixed !important;
                }
                .pac-item {
                  cursor: pointer;
                  pointer-events: auto !important;
                }
              `;
              // Remove existing style if present
              const existingStyle = document.getElementById('shepherd-pac-fix');
              if (existingStyle) {
                existingStyle.remove();
              }
              document.head.appendChild(style);
              
              // Also ensure the overlay doesn't block the dropdown
              const overlay = document.querySelector('.shepherd-modal-overlay-container');
              if (overlay) {
                overlay.style.pointerEvents = 'none';
              }
              
              // Re-enable pointer events on the input and its container
              const inputElement = document.querySelector('[data-tour-target="residential-address"]');
              if (inputElement) {
                inputElement.style.zIndex = '10002';
                inputElement.style.position = 'relative';
                const inputParent = inputElement.closest('.shepherd-element');
                if (inputParent) {
                  inputParent.style.zIndex = '10002';
                  inputParent.style.pointerEvents = 'auto';
                }
              }
              
              // Monitor for pac-container creation and ensure it has correct z-index
              const observer = new MutationObserver(() => {
                const pacContainer = document.querySelector('.pac-container');
                if (pacContainer) {
                  pacContainer.style.zIndex = '10001';
                  pacContainer.style.position = 'fixed';
                }
              });
              
              observer.observe(document.body, {
                childList: true,
                subtree: true
              });
              
              // Clean up observer after a delay
              setTimeout(() => {
                observer.disconnect();
              }, 5000);
            }
            resolve();
          }, 100);
        });
      }
    };
  };

  // Step 1: Welcome
  tour.addStep({
    id: 'welcome',
    text: addProgressToText('Let\'s review your primary seller information. We\'ll guide you through each field and explain what you need to enter and why it matters for legal compliance.', 0),
    buttons: [
      {
        text: 'Start Tour',
        action: tour.next
      }
    ]
  });

  // Step 2: First Name
  tour.addStep(createFieldStep(
    'first-name',
    '[data-tour-target="first-name"]',
    'Enter your first name exactly as it appears on your identification documents, then select Confirm to continue.',
    'first-name',
    1
  ));

  // Step 3: Last Name
  tour.addStep(createFieldStep(
    'last-name',
    '[data-tour-target="last-name"]',
    'Update your last name to match your identification documents, then press Confirm to proceed.',
    'last-name',
    2
  ));

  // Step 4: Middle Name (CRITICAL)
  tour.addStep(createFieldStep(
    'middle-name',
    '[data-tour-target="middle-name"]',
    'Enter your full legal middle name exactly as shown on your ID and property title. When done, select Confirm.',
    'middle-name',
    3
  ));

  // Step 5: Email Address
  tour.addStep(createFieldStep(
    'email',
    '[data-tour-target="email"]',
    'Provide a valid email address. This is required for electronic delivery of legally binding documents. Click Confirm once entered.',
    'email',
    4
  ));

  // Step 6: Mobile Phone
  tour.addStep(createFieldStep(
    'mobile',
    '[data-tour-target="mobile"]',
    'Enter your mobile number. It\'s needed for urgent settlement updates and verification requirements. Select Confirm to continue.',
    'mobile',
    5
  ));

  // Step 7: Client Residential Address (CRITICAL)
  tour.addStep(createFieldStep(
    'residential-address',
    '[data-tour-target="residential-address"]',
    'Enter your residential address exactly as it appears on your ID. This is required for AML compliance and legal document service. When finished, press Confirm.',
    'residential-address',
    6
  ));

  // Step 8: Final - Guide to Information Reviewed button
  tour.addStep({
    id: 'complete',
    attachTo: {
      element: '[data-tour-target="information-reviewed-btn"]',
      on: 'top'
    },
    text: addProgressToText('All fields have been reviewed. Click \'Information Reviewed ✓\' to proceed to the next step.', 7),
    buttons: [
      {
        text: 'Previous',
        action: tour.back,
        classes: 'shepherd-button-secondary'
      },
      {
        text: 'Finish',
        action: tour.complete
      }
    ],
    beforeShowPromise: function() {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Cleanup autocomplete fixes when leaving residential address step
          const style = document.getElementById('shepherd-pac-fix');
          if (style) {
            style.remove();
          }
          const overlay = document.querySelector('.shepherd-modal-overlay-container');
          if (overlay) {
            overlay.style.pointerEvents = '';
          }
          resolve();
        }, 100);
      });
    }
  });

  // Add tour event listeners to handle cleanup
  tour.on('show', (event) => {
    const step = event.step;
    // If leaving residential address step, cleanup
    if (step.id !== 'residential-address') {
      const style = document.getElementById('shepherd-pac-fix');
      if (style) {
        style.remove();
      }
      const overlay = document.querySelector('.shepherd-modal-overlay-container');
      if (overlay) {
        overlay.style.pointerEvents = '';
      }
    }
  });

  tour.on('complete', () => {
    // Cleanup on tour completion
    const style = document.getElementById('shepherd-pac-fix');
    if (style) {
      style.remove();
    }
    const overlay = document.querySelector('.shepherd-modal-overlay-container');
    if (overlay) {
      overlay.style.pointerEvents = '';
    }
  });

  tour.on('cancel', () => {
    // Cleanup on tour cancellation
    const style = document.getElementById('shepherd-pac-fix');
    if (style) {
      style.remove();
    }
    const overlay = document.querySelector('.shepherd-modal-overlay-container');
    if (overlay) {
      overlay.style.pointerEvents = '';
    }
  });

  return tour;
};

