<?php
/**
 * Plugin Name: Conveyancing Portal Integration
 * Plugin URI: https://yoursite.com
 * Description: Integrates Client and Agent portals built with React for conveyancing workflow management
 * Version: 1.0.0
 * Author: Your Firm Name
 * Author URI: https://yoursite.com
 * License: GPL v2 or later
 * Text Domain: conveyancing-portal
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('CP_VERSION', '1.0.0');
define('CP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('CP_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once CP_PLUGIN_DIR . 'includes/enqueue-scripts.php';
require_once CP_PLUGIN_DIR . 'includes/shortcodes.php';

// Activation hook
register_activation_hook(__FILE__, 'cp_activate_plugin');

function cp_activate_plugin() {
    // Create pages if they don't exist
    cp_create_portal_pages();

    // Flush rewrite rules
    flush_rewrite_rules();
}

function cp_create_portal_pages() {
    // Check if Client Portal page exists
    $client_portal = get_page_by_path('client-portal');
    if (!$client_portal) {
        wp_insert_post([
            'post_title'    => 'Client Portal',
            'post_content'  => '[client_portal]',
            'post_status'   => 'publish',
            'post_type'     => 'page',
            'post_name'     => 'client-portal'
        ]);
    }

    // Check if Agent Portal page exists
    $agent_portal = get_page_by_path('agent-portal');
    if (!$agent_portal) {
        wp_insert_post([
            'post_title'    => 'Agent Portal',
            'post_content'  => '[agent_portal]',
            'post_status'   => 'publish',
            'post_type'     => 'page',
            'post_name'     => 'agent-portal'
        ]);
    }
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'cp_deactivate_plugin');

function cp_deactivate_plugin() {
    // Flush rewrite rules
    flush_rewrite_rules();
}
