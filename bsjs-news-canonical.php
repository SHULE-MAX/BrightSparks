<?php
/**
 * Plugin Name: Point Blog Posts at the News Pages
 * Description: Tells Google that the proper home of a blog post is its page under /news/, not the WordPress address. Stops the same story competing with itself in search results.
 * Version:     1.0
 *
 * WHY THIS EXISTS
 * Every published post appears twice on this site: once at its WordPress
 * address, and once as a built page under /news/<slug>/ that carries the
 * article structured data, the byline and the timestamps Google News looks for.
 * Two addresses holding the same story means Google has to choose between them,
 * and it may not choose the better one.
 *
 * This plugin settles it. Each WordPress post now names its /news/ page as the
 * canonical version, so the ranking belongs to that page. The WordPress copy
 * stays reachable — nothing is hidden or removed — it simply stops competing.
 *
 * HOW TO INSTALL
 * Upload this file to wp-content/plugins/ and activate "Point Blog Posts at
 * the News Pages" in the WordPress admin.
 *
 * The slug is worked out the same way build-news.mjs and news.html work it out,
 * from the post title. All three have to agree or the link will point nowhere,
 * so if that rule is ever changed, change it here too.
 */

defined( 'ABSPATH' ) || exit;

const BSJS_SITE_URL = 'https://brightsparksjunior.ac.ug';

/**
 * Turns a headline into the address its news page lives at.
 * Mirrors slugify() in build-news.mjs and in news.html.
 */
function bsjs_news_slug( $title ) {
	$slug = strtolower( html_entity_decode( $title, ENT_QUOTES, 'UTF-8' ) );
	$slug = str_replace( '&', 'and', $slug );
	$slug = preg_replace( '/[^a-z0-9\s-]/', '', $slug );
	$slug = preg_replace( '/\s+/', '-', $slug );
	$slug = preg_replace( '/-+/', '-', $slug );
	return trim( $slug, '-' );
}

function bsjs_news_url( $post ) {
	$slug = bsjs_news_slug( $post->post_title );
	return $slug ? BSJS_SITE_URL . '/news/' . $slug . '/' : '';
}

/* Replace the canonical link WordPress writes into the page head. */
add_filter( 'get_canonical_url', function ( $canonical, $post ) {
	if ( ! $post || 'post' !== $post->post_type ) {
		return $canonical;
	}
	$url = bsjs_news_url( $post );
	return $url ? $url : $canonical;
}, 10, 2 );

/* Yoast and Rank Math write their own canonical and ignore the filter above. */
add_filter( 'wpseo_canonical', 'bsjs_news_canonical_for_seo_plugins' );
add_filter( 'rank_math/frontend/canonical', 'bsjs_news_canonical_for_seo_plugins' );

function bsjs_news_canonical_for_seo_plugins( $canonical ) {
	if ( ! is_singular( 'post' ) ) {
		return $canonical;
	}
	$url = bsjs_news_url( get_post() );
	return $url ? $url : $canonical;
}

/* Keep the WordPress copies out of the sitemap as well, so the only addresses
   submitted to Google are the ones under /news/. */
add_filter( 'wp_sitemaps_post_types', function ( $post_types ) {
	unset( $post_types['post'] );
	return $post_types;
} );
