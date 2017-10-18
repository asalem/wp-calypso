/*eslint-disable*/
/*




Notes:




 */
/**
 * External dependencies
 *
 * @format
 */

import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';
import classNames from 'classnames';
import debugFactory from 'debug';
import {
	camelCase,
	deburr,
	first,
	head,
	includes,
	indexOf,
	intersection,
	isEqual,
	kebabCase,
	last,
	map,
	omit,
	pick,
	reduce,
} from 'lodash';

/**
 * Internal dependencies
 */
import { getContactDetailsCache } from 'state/selectors';
import { updateContactDetailsCache } from 'state/domains/management/actions';
import QueryContactDetailsCache from 'components/data/query-contact-details-cache';
import { CountrySelect, StateSelect, Input, HiddenInput } from 'my-sites/domains/components/form';
import PrivacyProtection from './privacy-protection';
import PaymentBox from './payment-box';
import { cartItems } from 'lib/cart-values';
import { forDomainRegistrations as countriesListForDomainRegistrations } from 'lib/countries-list';
import analytics from 'lib/analytics';
import formState from 'lib/form-state';
import {
	addPrivacyToAllDomains,
	removePrivacyFromAllDomains,
	setDomainDetails,
	addGoogleAppsRegistrationData,
} from 'lib/upgrades/actions';
import FormButton from 'components/forms/form-button';
import { countries } from 'components/phone-input/data';
import { toIcannFormat } from 'components/phone-input/phone-number';
import FormPhoneMediaInput from 'components/forms/form-phone-media-input';
import SecurePaymentFormPlaceholder from './secure-payment-form-placeholder.jsx';
import wp from 'lib/wp';
import ExtraInfoForm, {
	tldsWithAdditionalDetailsForms,
} from 'components/domains/registrant-extra-info';
import config from 'config';
// new component
import ContactDetailsFormFields from 'components/contact-details-form-fields';

const debug = debugFactory( 'calypso:my-sites:upgrades:checkout:domain-details' );
const wpcom = wp.undocumented(),
	countriesList = countriesListForDomainRegistrations();

export class DomainDetailsForm extends PureComponent {
	constructor( props, context ) {
		super( props, context );

		this.fieldNames = [
			'firstName',
			'lastName',
			'organization',
			'email',
			'phone',
			'address1',
			'address2',
			'city',
			'state',
			'postalCode',
			'countryCode',
			'fax',
		];

		this.googlAppsFieldNames = [ 'firstName', 'lastName', 'postalCode', 'countryCode' ];

		const steps = [ 'mainForm', ...this.getRequiredExtraSteps() ];
		debug( 'steps:', steps );

		this.state = {
			form: null,
			submissionCount: 0,
			phoneCountryCode: 'US',
			steps,
			currentStep: first( steps ),
		};
	}

	componentWillMount() {
		// eslint-disable-next-line
		// console.log( 'componentWillMount() this.props.contactDetails ', this.props.contactDetails );
		//
		const initialFields = pick( this.props.contactDetails, this.fieldNames );
		// eslint-disable-next-line
		console.log( 'componentWillMount() initialFields', initialFields );
		this.formStateController = formState.Controller( {
			fieldNames: this.fieldNames,
			//initialFields,
			loadFunction: this.loadFormStateFromRedux,
			sanitizerFunction: this.sanitize,
			validatorFunction: this.validate,
			onNewState: this.setFormState,
			onError: this.handleFormControllerError,
		} );

		// eslint-disable-next-line
		console.log( 'componentWillMount() this.state ', this.formStateController.getInitialState() );
		this.setState( {
			form: this.formStateController.getInitialState(),
		} );
	}

	componentDidMount() {
		analytics.pageView.record(
			'/checkout/domain-contact-information',
			'Checkout > Domain Contact Information'
		);
	}

	componentDidUpdate( prevProps, prevState ) {
		const previousFormValues = formState.getAllFieldValues( prevState.form );
		const currentFormValues = formState.getAllFieldValues( this.state.form );

		if ( ! isEqual( previousFormValues, currentFormValues ) ) {
			this.props.updateContactDetailsCache( this.getMainFieldValues() );
		}
	}

	loadFormStateFromRedux = fn => {
		// only load the properties relevant to the main form fields
		fn( null, pick( this.props.contactDetails, this.fieldNames ) );
	};

	validate = ( fieldValues, onComplete ) => {
		if ( this.needsOnlyGoogleAppsDetails() ) {
			wpcom.validateGoogleAppsContactInformation(
				fieldValues,
				this.generateValidationHandler( onComplete )
			);
			return;
		}

		const allFieldValues = this.getMainFieldValues();
		const domainNames = map( cartItems.getDomainRegistrations( this.props.cart ), 'meta' );
		wpcom.validateDomainContactInformation(
			allFieldValues,
			domainNames,
			this.generateValidationHandler( onComplete )
		);
	};

	sanitize = ( fieldValues, onComplete ) => {
		const sanitizedFieldValues = Object.assign( {}, fieldValues );
		this.fieldNames.forEach( fieldName => {
			if ( typeof fieldValues[ fieldName ] === 'string' ) {
				// TODO: Deep
				sanitizedFieldValues[ fieldName ] = deburr( fieldValues[ fieldName ].trim() );
				if ( fieldName === 'postalCode' ) {
					sanitizedFieldValues[ fieldName ] = sanitizedFieldValues[ fieldName ].toUpperCase();
				}
			}
		} );

		onComplete( sanitizedFieldValues );
	};

	setFormState = form => {
		if ( ! this.needsFax() ) {
			delete form.fax;
		}

		this.setState( { form } );
	};

	hasAnotherStep() {
		return this.state.currentStep !== last( this.state.steps );
	}

	switchToNextStep() {
		const newStep = this.state.steps[ indexOf( this.state.steps, this.state.currentStep ) + 1 ];
		debug( 'Switching to step: ' + newStep );
		this.setState( { currentStep: newStep } );
	}

	generateValidationHandler( onComplete ) {
		return ( error, data ) => {
			const messages = ( data && data.messages ) || {};
			onComplete( error, messages );
		};
	}

	needsOnlyGoogleAppsDetails() {
		return (
			cartItems.hasGoogleApps( this.props.cart ) &&
			! cartItems.hasDomainRegistration( this.props.cart )
		);
	}

	handleFormControllerError = error => {
		throw error;
	};

	getMainFieldValues() {
		const mainFieldValues = formState.getAllFieldValues( this.state.form );
		const phone = mainFieldValues.phone
			? toIcannFormat( mainFieldValues.phone, countries[ this.state.phoneCountryCode ] )
			: null;
		return {
			...mainFieldValues,
			phone,
		};
	}

	// if `domains/cctlds` is `true` in the config,
	// for every domain that requires additional steps, add it to this.state.steps
	getRequiredExtraSteps() {
		if ( ! config.isEnabled( 'domains/cctlds' ) ) {
			// All we need to do to disable everything is not show the .FR form
			return [];
		}
		return intersection( cartItems.getTlds( this.props.cart ), tldsWithAdditionalDetailsForms );
	}

	getNumberOfDomainRegistrations() {
		return cartItems.getDomainRegistrations( this.props.cart ).length;
	}

	needsFax() {
		return (
			this.props.contactDetails.countryCode === 'NL' && cartItems.hasTld( this.props.cart, 'nl' )
		);
	}

	allDomainRegistrationsSupportPrivacy() {
		return cartItems.hasOnlyDomainRegistrationsWithPrivacySupport( this.props.cart );
	}

	allDomainRegistrationsHavePrivacy() {
		return cartItems.getDomainRegistrationsWithoutPrivacy( this.props.cart ).length === 0;
	}

	handleRadioChange = enable => {
		this.setPrivacyProtectionSubscriptions( enable );
	};

	// new component methods
	handleFieldChange = ( { name, value, ...fieldProps } ) => {
		this.formStateController.handleFieldChange( {
			name,
			value,
			...fieldProps,
		} );
		// temp
		if ( fieldProps.phoneCountryCode ) {
			this.setState( {
				phoneCountryCode: fieldProps.phoneCountryCode,
			} );
		}
	};

	isFieldDisabled = fieldName => {
		return formState.isFieldDisabled( this.state.form, fieldName );
	};

	isFieldInvalid = fieldName => {
		return formState.isFieldInvalid( this.state.form, fieldName );
	};

	getFieldValue = fieldName => {
		return formState.getFieldValue( fieldName ) || '';
	};

	getFieldErrorMessages = fieldName => {
		// The keys are mapped to snake_case when going to API and camelCase when the response is parsed and we are using
		// kebab-case for HTML, so instead of using different variations all over the place, this accepts kebab-case and
		// converts it to camelCase which is the format stored in the formState.
		return ( formState.getFieldErrorMessages( this.state.form, camelCase( fieldName ) ) || [] )
			.join( '\n' );
	};

	handleSubmitButtonClick = event => {
		event.preventDefault();

		this.formStateController.handleSubmit( hasErrors => {
			this.recordSubmit();

			if ( hasErrors ) {
				//this.focusFirstError();
				return;
			}

			if ( this.hasAnotherStep() ) {
				return this.switchToNextStep();
			}

			this.finish();
		} );
	};

	recordSubmit() {
		const errors = formState.getErrorMessages( this.state.form ),
			tracksEventObject = reduce(
				formState.getErrorMessages( this.state.form ),
				( result, value, key ) => {
					result[ `error_${ key }` ] = value;
					return result;
				},
				{
					errors_count: ( errors && errors.length ) || 0,
					submission_count: this.state.submissionCount + 1,
				}
			);

		analytics.tracks.recordEvent( 'calypso_contact_information_form_submit', tracksEventObject );
		this.setState( { submissionCount: this.state.submissionCount + 1 } );
	}

	finish() {
		const allFieldValues = this.props.contactDetails;
		debug( 'finish: allFieldValues:', allFieldValues );
		setDomainDetails( allFieldValues );
		addGoogleAppsRegistrationData( allFieldValues );
	}

	setPrivacyProtectionSubscriptions( enable ) {
		if ( enable ) {
			addPrivacyToAllDomains();
		} else {
			removePrivacyFromAllDomains();
		}
	}

	renderExtraDetailsForm( tld ) {
		return <ExtraInfoForm tld={ tld }>{ this.renderSubmitButton() }</ExtraInfoForm>;
	}

	renderSubmitButton() {
		const continueText = this.hasAnotherStep()
			? this.props.translate( 'Continue' )
			: this.props.translate( 'Continue to Checkout' );

		return (
			<FormButton
				className="checkout__domain-details-form-submit-button"
				onClick={ this.handleSubmitButtonClick }
			>
				{ continueText }
			</FormButton>
		);
	}

	renderPrivacySection() {
		return (
			<PrivacyProtection
				allDomainsHavePrivacy={ this.allDomainRegistrationsHavePrivacy() }
				cart={ this.props.cart }
				countriesList={ countriesList }
				disabled={ formState.isSubmitButtonDisabled( this.state.form ) }
				fields={ this.state.form }
				onCheckboxChange={ this.handleCheckboxChange }
				onRadioSelect={ this.handleRadioChange }
				productsList={ this.props.productsList }
			/>
		);
	}

	renderDetailsForm() {
		const needsOnlyGoogleAppsDetails = this.needsOnlyGoogleAppsDetails();

		const fields = pick(
			this.props.contactDetails,
			needsOnlyGoogleAppsDetails ? this.googlAppsFieldNames : Object.keys( this.state.form )
		);
		const contactDetailsClassName = needsOnlyGoogleAppsDetails ? 'only-google-apps-details' : '';

		return (
			<form>
				<ContactDetailsFormFields
					eventFormName="Checkout Form"
					className={ contactDetailsClassName }
					fields={ fields }
					invalidFields={ formState.getInvalidFields( this.state.form ) }
					countriesList={ countriesList }
					onFieldChange={ this.handleFieldChange }
					isFieldDisabled={ this.isFieldDisabled }
					isFieldInvalid={ this.isFieldInvalid }
					getFieldErrorMessages={ this.getFieldErrorMessages }
				/>
				{ this.renderSubmitButton() }
			</form>
		);
	}

	renderCurrentForm() {
		const { currentStep } = this.state;

		return includes( tldsWithAdditionalDetailsForms, currentStep )
			? this.renderExtraDetailsForm( this.state.currentStep )
			: this.renderDetailsForm();
	}

	render() {
		const needsOnlyGoogleAppsDetails = this.needsOnlyGoogleAppsDetails(),
			classSet = classNames( {
				'domain-details': true,
				selected: true,
			} );

		// eslint-disable-next-line
		console.log( 'RENDER ME SEYMOUR' );

		let title;
		// TODO: gather up tld specific stuff
		if ( this.state.currentStep === 'fr' ) {
			title = this.props.translate( '.FR Registration' );
		} else if ( needsOnlyGoogleAppsDetails ) {
			title = this.props.translate( 'G Suite Account Information' );
		} else {
			title = this.props.translate( 'Domain Contact Information' );
		}

		return (
			<div>
				{ cartItems.hasDomainRegistration( this.props.cart ) &&
					this.allDomainRegistrationsSupportPrivacy() &&
					this.renderPrivacySection() }
				<PaymentBox currentPage={ this.state.currentStep } classSet={ classSet } title={ title }>
					{ this.renderCurrentForm() }
				</PaymentBox>
			</div>
		);
	}
}

export class DomainDetailsFormContainer extends PureComponent {
	render() {
		return (
			<div>
				<QueryContactDetailsCache />
				{ this.props.contactDetails ? (
					<DomainDetailsForm { ...this.props } />
				) : (
					<SecurePaymentFormPlaceholder />
				) }
			</div>
		);
	}
}

export default connect( state => ( { contactDetails: getContactDetailsCache( state ) } ), {
	updateContactDetailsCache,
} )( localize( DomainDetailsFormContainer ) );
