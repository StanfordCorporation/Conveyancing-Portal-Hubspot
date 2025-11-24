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
            
            savingInProgress = true;
            const step = tour.getCurrentStep();
            const confirmButton = step.el.querySelector('.shepherd-button:not(.shepherd-button-secondary)');
            
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
          setTimeout(resolve, 100);
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
        setTimeout(resolve, 100);
      });
    }
  });

  return tour;
};

