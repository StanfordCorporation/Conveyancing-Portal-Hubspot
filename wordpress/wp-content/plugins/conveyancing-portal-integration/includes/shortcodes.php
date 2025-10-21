<?php
/**
 * Shortcode Definitions
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Client Portal Shortcode
function client_portal_shortcode($atts) {
    // Extract attributes
    $atts = shortcode_atts([
        'class' => '',
    ], $atts, 'client_portal');

    // Return the root div where React will mount
    return '<div id="client-portal-root" class="' . esc_attr($atts['class']) . '"></div>';
}
add_shortcode('client_portal', 'client_portal_shortcode');

// Agent Portal Shortcode
function agent_portal_shortcode($atts) {
    // Extract attributes
    $atts = shortcode_atts([
        'class' => '',
    ], $atts, 'agent_portal');

    // Return the root div where React will mount
    return '<div id="agent-portal-root" class="' . esc_attr($atts['class']) . '"></div>';
}
add_shortcode('agent_portal', 'agent_portal_shortcode');

// Remove default page wrappers for portal pages
function cp_body_class($classes) {
    if (is_page(['client-portal', 'agent-portal'])) {
        $classes[] = 'conveyancing-portal-page';
        $classes[] = 'no-sidebar';
    }
    return $classes;
}
add_filter('body_class', 'cp_body_class');
