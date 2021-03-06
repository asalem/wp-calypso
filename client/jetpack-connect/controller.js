/** @format */
/**
 * External Dependencies
 */
import React from 'react';
import ReactDom from 'react-dom';
import Debug from 'debug';
import page from 'page';
import { get, isEmpty } from 'lodash';
import { translate } from 'i18n-calypso';

/**
 * Internal Dependencies
 */
import analytics from 'lib/analytics';
import CheckoutData from 'components/data/checkout';
import i18nUtils from 'lib/i18n-utils';
import JetpackConnect from './main';
import JetpackConnectAuthorizeForm from './authorize-form';
import JetpackNewSite from './jetpack-new-site/index';
import jetpackSSOForm from './sso';
import Plans from './plans';
import PlansLanding from './plans-landing';
import route from 'lib/route';
import userFactory from 'lib/user';
import { JETPACK_CONNECT_QUERY_SET } from 'state/action-types';
import { renderWithReduxStore } from 'lib/react-helpers';
import { setDocumentHeadTitle as setTitle } from 'state/document-head/actions';
import { setSection } from 'state/ui/actions';
import {
	PLAN_JETPACK_PREMIUM,
	PLAN_JETPACK_PERSONAL,
	PLAN_JETPACK_BUSINESS,
	PLAN_JETPACK_PREMIUM_MONTHLY,
	PLAN_JETPACK_PERSONAL_MONTHLY,
	PLAN_JETPACK_BUSINESS_MONTHLY,
} from 'lib/plans/constants';
import { storePlan } from './persistence-utils';

/**
 * Module variables
 */
const debug = new Debug( 'calypso:jetpack-connect:controller' );
const userModule = userFactory();
const analyticsPageTitleByType = {
	install: 'Jetpack Install',
	personal: 'Jetpack Connect Personal',
	premium: 'Jetpack Connect Premium',
	pro: 'Jetpack Install Pro',
};

const removeSidebar = context => {
	ReactDom.unmountComponentAtNode( document.getElementById( 'secondary' ) );

	context.store.dispatch(
		setSection(
			{ name: 'jetpackConnect' },
			{
				hasSidebar: false,
			}
		)
	);
};

const jetpackNewSiteSelector = context => {
	removeSidebar( context );
	renderWithReduxStore(
		React.createElement( JetpackNewSite, {
			path: context.path,
			context: context,
			locale: context.params.locale,
		} ),
		document.getElementById( 'primary' ),
		context.store
	);
};

const getPlanSlugFromFlowType = ( type, interval = 'yearly' ) => {
	const planSlugs = {
		yearly: {
			personal: PLAN_JETPACK_PERSONAL,
			premium: PLAN_JETPACK_PREMIUM,
			pro: PLAN_JETPACK_BUSINESS,
		},
		monthly: {
			personal: PLAN_JETPACK_PERSONAL_MONTHLY,
			premium: PLAN_JETPACK_PREMIUM_MONTHLY,
			pro: PLAN_JETPACK_BUSINESS_MONTHLY,
		},
	};

	return get( planSlugs, [ interval, type ], '' );
};

export default {
	redirectWithoutLocaleifLoggedIn( context, next ) {
		if ( userModule.get() && i18nUtils.getLocaleFromPath( context.path ) ) {
			const urlWithoutLocale = i18nUtils.removeLocaleFromPath( context.path );
			debug( 'redirectWithoutLocaleifLoggedIn to %s', urlWithoutLocale );
			return page.redirect( urlWithoutLocale );
		}

		next();
	},

	saveQueryObject( context, next ) {
		if ( ! isEmpty( context.query ) && context.query.redirect_uri ) {
			debug( 'set initial query object', context.query );
			context.store.dispatch( {
				type: JETPACK_CONNECT_QUERY_SET,
				queryObject: context.query,
			} );
			page.redirect( context.pathname );
		}

		next();
	},

	newSite( context ) {
		analytics.pageView.record( '/jetpack/new', 'Add a new site (Jetpack)' );
		jetpackNewSiteSelector( context );
	},

	connect( context ) {
		const { path, pathname, params } = context;
		const { type = false, interval } = params;
		const analyticsPageTitle = get( type, analyticsPageTitleByType, 'Jetpack Connect' );

		debug( 'entered connect flow with params %o', params );

		const planSlug = getPlanSlugFromFlowType( type, interval );
		planSlug && storePlan( planSlug );

		analytics.pageView.record( pathname, analyticsPageTitle );

		removeSidebar( context );

		userModule.fetch();

		renderWithReduxStore(
			React.createElement( JetpackConnect, {
				context,
				locale: params.locale,
				path,
				type,
				url: context.query.url,
				userModule,
			} ),
			document.getElementById( 'primary' ),
			context.store
		);
	},

	authorizeForm( context ) {
		const analyticsBasePath = 'jetpack/connect/authorize',
			analyticsPageTitle = 'Jetpack Authorize';

		removeSidebar( context );

		let interval = context.params.interval;
		let locale = context.params.locale;
		if ( context.params.localeOrInterval ) {
			if ( [ 'monthly', 'yearly' ].indexOf( context.params.localeOrInterval ) >= 0 ) {
				interval = context.params.localeOrInterval;
			} else {
				locale = context.params.localeOrInterval;
			}
		}

		analytics.pageView.record( analyticsBasePath, analyticsPageTitle );
		renderWithReduxStore(
			<JetpackConnectAuthorizeForm path={ context.path } interval={ interval } locale={ locale } />,
			document.getElementById( 'primary' ),
			context.store
		);
	},

	sso( context ) {
		const analyticsBasePath = '/jetpack/sso',
			analyticsPageTitle = 'Jetpack SSO';

		removeSidebar( context );

		userModule.fetch();

		analytics.pageView.record( analyticsBasePath, analyticsPageTitle );

		renderWithReduxStore(
			React.createElement( jetpackSSOForm, {
				path: context.path,
				locale: context.params.locale,
				userModule: userModule,
				siteId: context.params.siteId,
				ssoNonce: context.params.ssoNonce,
			} ),
			document.getElementById( 'primary' ),
			context.store
		);
	},

	plansLanding( context ) {
		const analyticsPageTitle = 'Plans';
		const basePath = route.sectionify( context.path );
		const analyticsBasePath = basePath + '/:site';

		removeSidebar( context );

		context.store.dispatch( setTitle( translate( 'Plans', { textOnly: true } ) ) );

		analytics.tracks.recordEvent( 'calypso_plans_view' );
		analytics.pageView.record( analyticsBasePath, analyticsPageTitle );

		renderWithReduxStore(
			<PlansLanding
				context={ context }
				destinationType={ context.params.destinationType }
				interval={ context.params.interval }
				basePlansPath={ '/jetpack/connect/store' }
				url={ context.query.site }
			/>,
			document.getElementById( 'primary' ),
			context.store
		);
	},

	plansSelection( context ) {
		const analyticsPageTitle = 'Plans';
		const basePath = route.sectionify( context.path );
		const analyticsBasePath = basePath + '/:site';

		removeSidebar( context );

		// FIXME: Auto-converted from the Flux setTitle action. Please use <DocumentHead> instead.
		context.store.dispatch( setTitle( translate( 'Plans', { textOnly: true } ) ) );

		analytics.tracks.recordEvent( 'calypso_plans_view' );
		analytics.pageView.record( analyticsBasePath, analyticsPageTitle );

		renderWithReduxStore(
			<CheckoutData>
				<Plans
					context={ context }
					destinationType={ context.params.destinationType }
					basePlansPath={ '/jetpack/connect/plans' }
					interval={ context.params.interval }
				/>
			</CheckoutData>,
			document.getElementById( 'primary' ),
			context.store
		);
	},
};
