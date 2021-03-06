/** @format */

/**
 * External dependencies
 */

import React from 'react';
import { localize } from 'i18n-calypso';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import Button from 'components/button';
import Card from 'components/card/compact';
import Header from './card/header';
import Property from './card/property';
import SubscriptionSettings from './card/subscription-settings';
import { composeAnalytics, recordGoogleEvent, recordTracksEvent } from 'state/analytics/actions';
import { transferStatus } from 'lib/domains/constants';
import support from 'lib/url/support';
import { restartInboundTransfer } from 'lib/domains';
import { fetchDomains } from 'lib/upgrades/actions';
import { errorNotice, successNotice } from 'state/notices/actions';
import VerticalNav from 'components/vertical-nav';
import VerticalNavItem from 'components/vertical-nav/item';
import { cancelPurchase as cancelPurchaseLink } from 'me/purchases/paths';

class Transfer extends React.PureComponent {
	state = {
		isRestartingTransfer: false,
	};

	render() {
		const { domain } = this.props;
		let content = this.getDomainDetailsCard();

		if ( domain.transferStatus === transferStatus.CANCELLED ) {
			content = this.getCancelledContent();
		}

		const path = cancelPurchaseLink( this.props.selectedSite.slug, domain.subscriptionId );

		return (
			<div className="edit__domain-details-card">
				<Header domain={ domain } />
				{ content }
				<VerticalNav>
					<VerticalNavItem path={ path }>
						{ this.props.translate( 'Cancel Transfer' ) }
					</VerticalNavItem>
				</VerticalNav>
			</div>
		);
	}

	handlePaymentSettingsClick = () => {
		this.props.paymentSettingsClick( this.props.domain );
	};

	restartTransfer = () => {
		const { domain, selectedSite, translate } = this.props;
		this.toggleRestartState();

		restartInboundTransfer( selectedSite.ID, domain.name, ( error, result ) => {
			if ( result ) {
				this.props.successNotice( translate( 'The transfer has been successfully restarted.' ), {
					duration: 5000,
				} );
				fetchDomains( selectedSite.ID );
			} else {
				this.props.errorNotice(
					error.message || translate( 'We were unable to restart the transfer.' ),
					{
						duration: 5000,
					}
				);
				this.toggleRestartState();
			}
		} );
	};

	toggleRestartState() {
		this.setState( { isRestartingTransfer: ! this.state.isRestartingTransfer } );
	}

	getCancelledContent() {
		const { domain, translate } = this.props;
		const { isRestartingTransfer } = this.state;

		return (
			<Card>
				<div>
					<h2 className="edit__transfer-text-fail">{ translate( 'Domain transfer failed' ) }</h2>
					<p>
						{ translate(
							'We were unable to complete the transfer of {{strong}}%(domain)s{{/strong}}. It could be ' +
								'a number of things that caused the transfer to fail like an invalid or missing authorization code, ' +
								'the domain is still locked, or your current domain provider denied the transfer. ' +
								'{{a}}Visit our support article{{/a}} for more detailed information about why it may have failed.',
							{
								components: {
									strong: <strong />,
									a: (
										<a
											href={ support.INCOMING_DOMAIN_TRANSFER_STATUSES_FAILED }
											rel="noopener noreferrer"
											target="_blank"
										/>
									),
								},
								args: { domain: domain.name },
							}
						) }
					</p>
				</div>
				<div>
					<Button
						className="edit__transfer-button-fail"
						onClick={ this.restartTransfer }
						busy={ isRestartingTransfer }
						disabled={ isRestartingTransfer }
					>
						{ isRestartingTransfer
							? translate( 'Restarting Transfer…' )
							: translate( 'Start Transfer Again' ) }
					</Button>
					<Button
						className="edit__transfer-button-fail edit__transfer-button-fail-margin"
						href={ support.CALYPSO_CONTACT }
					>
						{ this.props.translate( 'Contact Support' ) }
					</Button>
				</div>
			</Card>
		);
	}

	getDomainDetailsCard() {
		const { domain, selectedSite, translate } = this.props;

		return (
			<Card>
				<Property label={ translate( 'Type', { context: 'A type of domain.' } ) }>
					{ translate( 'Incoming Domain Transfer' ) }
				</Property>

				<SubscriptionSettings
					type={ domain.type }
					subscriptionId={ domain.subscriptionId }
					siteSlug={ selectedSite.slug }
					onClick={ this.handlePaymentSettingsClick }
				/>
			</Card>
		);
	}
}

const paymentSettingsClick = domain =>
	composeAnalytics(
		recordGoogleEvent(
			'Domain Management',
			`Clicked "Payment Settings" Button on a ${ domain.type } in Edit`,
			'Domain Name',
			domain.name
		),
		recordTracksEvent( 'calypso_domain_management_edit_payment_settings_click', {
			section: domain.type,
		} )
	);

export default connect( null, {
	errorNotice,
	paymentSettingsClick,
	successNotice,
} )( localize( Transfer ) );
