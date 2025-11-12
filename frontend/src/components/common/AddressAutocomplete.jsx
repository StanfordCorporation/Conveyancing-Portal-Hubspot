import React, { useEffect, useRef } from 'react';

/**
 * AddressAutocomplete Component
 * 
 * Google Places Autocomplete input restricted to Queensland, Australia
 * 
 * Props:
 * - value: Current address value
 * - onChange: Callback when address is selected or changed
 * - placeholder: Input placeholder text
 * - className: CSS classes for styling
 * - id: Input element ID
 * - disabled: Whether input is disabled
 */
const AddressAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = 'Enter address',
  className = '',
  id,
  disabled = false
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    // Check if Google Places API is loaded
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn('[AddressAutocomplete] Google Places API not loaded yet');
      return;
    }

    // Initialize autocomplete only if not already initialized
    if (!autocompleteRef.current && inputRef.current) {
      try {
        // Queensland bounds (approximate)
        const queenslandBounds = {
          north: -10.0,  // Northern Queensland
          south: -29.0,  // Southern Queensland/NSW border
          east: 154.0,   // Eastern coast
          west: 138.0    // Western Queensland
        };

        // Initialize Google Places Autocomplete
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            componentRestrictions: { country: 'AU' }, // Restrict to Australia
            bounds: queenslandBounds,                  // Prefer Queensland
            strictBounds: false,                       // Allow nearby results
            fields: ['formatted_address', 'address_components', 'geometry'],
            types: ['address']                         // Only address results
          }
        );

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          
          if (place && place.formatted_address) {
            // Update parent component with selected address
            onChange(place.formatted_address);
            console.log('[AddressAutocomplete] Address selected:', place.formatted_address);
          }
        });

        console.log('[AddressAutocomplete] Initialized successfully');
      } catch (error) {
        console.error('[AddressAutocomplete] Error initializing:', error);
      }
    }

    // Cleanup function
    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []); // Run once on mount

  // Handle manual input changes (typing without selecting from dropdown)
  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      value={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      autoComplete="off"
    />
  );
};

export default AddressAutocomplete;

