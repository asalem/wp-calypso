/**
 * External dependencies
 *
 * @format
 */

import PropTypes from 'prop-types';
import React, { Component, createElement } from 'react';
import { assign } from 'lodash';
import { noop } from 'lodash';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import {
	CountrySelect,
	StateSelect,
	Input,
	HiddenInput,
	FormFieldset,
} from 'my-sites/domains/components/form';
import FormPhoneMediaInput from 'components/forms/form-phone-media-input';
import { toIcannFormat } from 'components/phone-input/phone-number';
import { countries } from 'components/phone-input/data';

class ContactDetailsFormFields extends Component {
	static propTypes = {
		contactDetails: PropTypes.object.isRequired,
		countriesList: PropTypes.object.isRequired,
		doNotRender: PropTypes.arrayOf( PropTypes.string ),
		disabled: PropTypes.bool,
		eventFormName: PropTypes.string,
		isFieldInvalid: PropTypes.func,
		onFieldChange: PropTypes.func,
		className: PropTypes.string,
	};

	static defaultProps = {
		contactDetails: PropTypes.object.isRequired,
		countriesList: PropTypes.object.isRequired,
		doNotRender: [],
		disabled: false,
		eventFormName: '',
		className: '',
		isFieldInvalid: noop,
		onFieldChange: noop,
	};

	constructor( props, context ) {
		super( props, context );

		this.state = {
			countryCode: props.countryCode,
			phoneCountryCode: 'US',
		};
	}

	//shouldComponentUpdate( nextProps, nextState ) {}

	createField = ( fieldName, componentClass, props ) => {
		const shouldRenderComponent = this.props.doNotRender.indexOf( fieldName ) < 0;

		return shouldRenderComponent
			? createElement(
					componentClass,
					assign( {}, props, {
						labelClass: 'contact-details-form-fields__label',
						additionalClasses: 'contact-details-form-fields__field',
						eventFormName: this.props.eventFormName,
						disabled: this.props.disabled,
						isError: this.props.isFieldInvalid( fieldName ),
						name: fieldName,
						onBlur: this.handleFieldChange,
						onChange: this.handleFieldChange,
						value: this.getFieldValue( fieldName ),
					} )
				)
			: null;
	};

	getFieldValue = fieldName => {
		return this.props.card[ fieldName ];
	};

	handleFieldChange = event => {
		const { name, value } = event.target;
		// any manipulation here
		// ...
		this.props.onFieldChange( name, value );
	};

	handlePhoneChange = ( { value, countryCode } ) => {
		this.setState(
			{
				phoneCountryCode: countryCode,
			},
			() => {
				const newValue = toIcannFormat( value, countries[ countryCode ] );
				this.props.onFieldChange( 'phone', newValue );
			}
		);
	};

	render() {
		const { translate, className, countriesList, contactDetails } = this.props,
			countryCode = ( contactDetails || {} ).countryCode;

		return (
			<FormFieldset className={ `contact-details-form-fields ${ className }` }>
				<div className="contact-details-form-fields__name">
					{ this.createField( 'first-name', Input, {
						autoFocus: true,
						label: translate( 'First Name' ),
					} ) }

					{ this.createField( 'last-name', Input, {
						label: translate( 'Last Name' ),
					} ) }
				</div>

				<div className="contact-details-form-fields__organization">
					{ this.createField( 'organization', Input, {
						label: translate( 'Organization' ),
					} ) }
				</div>

				<div className="contact-details-form-fields__email">
					{ this.createField( 'email', Input, {
						label: translate( 'Email' ),
					} ) }
				</div>

				<div className="contact-details-form-fields__fax">
					{ this.createField( 'fax', Input, {
						label: translate( 'Fax' ),
					} ) }
				</div>

				<div className="contact-details-form-fields__phone">
					{ this.createField( 'phone', FormPhoneMediaInput, {
						label: translate( 'Phone' ),
						onChange: this.handlePhoneChange,
						countriesList,
						countryCode,
					} ) }
				</div>

				<div className="contact-details-form-fields__address">
					{ this.createField( 'address-1', Input, {
						maxLength: 40,
						label: translate( 'Address' ),
					} ) }

					{ this.createField( 'address-2', HiddenInput, {
						maxLength: 40,
						label: translate( 'Address Line 2' ),
						text: translate( '+ Add Address Line 2' ),
					} ) }
				</div>

				<div className="contact-details-form-fields__city">
					{ this.createField( 'city', Input, {
						label: translate( 'City' ),
					} ) }
				</div>

				<div className="contact-details-form-fields__state">
					{ this.createField( 'state', StateSelect, {
						label: translate( 'State' ),
						countryCode,
					} ) }
				</div>

				<div className="contact-details-form-fields__postal-code">
					{ this.createField( 'postal-code', Input, {
						label: translate( 'Postal Code' ),
					} ) }
				</div>

				<div className="contact-details-form-fields__country">
					{ this.createField( 'country-code', CountrySelect, {
						label: translate( 'Country' ),
						countriesList,
					} ) }
				</div>
			</FormFieldset>
		);
	}
}

export default localize( ContactDetailsFormFields );
