<?php
/**
 * Plugin Name: Allow Anonymous Comments (REST API)
 * Description: Lets visitors post comments via the REST API without logging in.
 * Version:     1.0
 */
add_filter( 'rest_allow_anonymous_comments', '__return_true' );
