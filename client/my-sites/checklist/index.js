/**
 * External dependencies
 *
 * @format
 */

import page from 'page';

/**
 * Internal dependencies
 */
import { navigation, siteSelection, sites } from 'my-sites/controller';
import { show, thankYou } from './controller';

export default function() {
	page( '/checklist', siteSelection, sites );
	page( '/checklist/:site_id', siteSelection, navigation, show );
	page( '/checklist/thank-you/:site/:receiptId?', siteSelection, thankYou );
}
