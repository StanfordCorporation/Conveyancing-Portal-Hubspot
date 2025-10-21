<?php
/**
 * Enqueue Scripts and Styles
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Enqueue Client Portal Scripts
function cp_enqueue_client_portal_scripts() {
    if (is_page('client-portal')) {
        // Read asset manifest
        $manifest_path = CP_PLUGIN_DIR . 'assets/client-portal/asset-manifest.json';

        if (file_exists($manifest_path)) {
            $manifest = json_decode(file_get_contents($manifest_path), true);

            // Enqueue main JS
            if (isset($manifest['files']['main.js'])) {
                wp_enqueue_script(
                    'cp-client-portal-js',
                    CP_PLUGIN_URL . 'assets/client-portal/' . $manifest['files']['main.js'],
                    [],
                    CP_VERSION,
                    true
                );
            }

            // Enqueue main CSS
            if (isset($manifest['files']['main.css'])) {
                wp_enqueue_style(
                    'cp-client-portal-css',
                    CP_PLUGIN_URL . 'assets/client-portal/' . $manifest['files']['main.css'],
                    [],
                    CP_VERSION
                );
            }

            // Pass WordPress data to React
            wp_localize_script('cp-client-portal-js', 'cpData', [
                'apiUrl' => get_option('cp_api_url', ''),
                'siteUrl' => get_site_url(),
                'nonce' => wp_create_nonce('cp_nonce')
            ]);
        }
    }
}
add_action('wp_enqueue_scripts', 'cp_enqueue_client_portal_scripts');

// Enqueue Agent Portal Scripts
function cp_enqueue_agent_portal_scripts() {
    if (is_page('agent-portal')) {
        // Read asset manifest
        $manifest_path = CP_PLUGIN_DIR . 'assets/agent-portal/asset-manifest.json';

        if (file_exists($manifest_path)) {
            $manifest = json_decode(file_get_contents($manifest_path), true);

            // Enqueue main JS
            if (isset($manifest['files']['main.js'])) {
                wp_enqueue_script(
                    'cp-agent-portal-js',
                    CP_PLUGIN_URL . 'assets/agent-portal/' . $manifest['files']['main.js'],
                    [],
                    CP_VERSION,
                    true
                );
            }

            // Enqueue main CSS
            if (isset($manifest['files']['main.css'])) {
                wp_enqueue_style(
                    'cp-agent-portal-css',
                    CP_PLUGIN_URL . 'assets/agent-portal/' . $manifest['files']['main.css'],
                    [],
                    CP_VERSION
                );
            }

            // Pass WordPress data to React
            wp_localize_script('cp-agent-portal-js', 'cpData', [
                'apiUrl' => get_option('cp_api_url', ''),
                'siteUrl' => get_site_url(),
                'nonce' => wp_create_nonce('cp_nonce')
            ]);
        }
    }
}
add_action('wp_enqueue_scripts', 'cp_enqueue_agent_portal_scripts');

// Remove default WordPress styles/scripts from portal pages
function cp_dequeue_default_scripts() {
    if (is_page(['client-portal', 'agent-portal'])) {
        // Remove WordPress default styles that might conflict
        wp_dequeue_style('wp-block-library');
        wp_dequeue_style('wp-block-library-theme');
        wp_dequeue_style('global-styles');
    }
}
add_action('wp_enqueue_scripts', 'cp_dequeue_default_scripts', 100);
