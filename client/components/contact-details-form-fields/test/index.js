/**
 * @format
 * @jest-environment jsdom
 */

/**
 * External dependencies
 */
import React from 'react';
import { shallow } from 'enzyme';

/**
 * Internal dependencies
 */
import { ContactDetailsFormFields } from '../';

jest.mock( 'i18n-calypso', () => ( {
	localize: x => x,
} ) );

describe( 'ContactDetailsFormFields', () => {
	const defaultProps = {
		contactDetails: {
			firstName: 'Osso',
			lastName: 'Buco',
			organization: 'Il pagliaccio del comune',
			email: 'osso@buco.com',
			phone: '+3398067382',
			address1: 'Via Strada Bella',
			address2: '',
			city: 'Piccolo Villagio',
			state: 'AG',
			postalCode: '12345',
			countryCode: 'IT',
			fax: '+3398067382',
		},
	};

	describe( 'default fields', () => {
		test( 'should render', () => {
			const wrapper = shallow( <ContactDetailsFormFields { ...defaultProps } /> );
			expect( wrapper ).toMatchSnapshot();
		} );
	} );

	describe( 'Google Apps Form UI state', () => {
		test( 'should not render GAppsFieldset in place of the default contact fields by default', () => {
			const wrapper = shallow( <ContactDetailsFormFields { ...defaultProps } /> );

			expect( wrapper.find( 'GAppsFields' ) ).toHaveLength( 0 );
			expect( wrapper.find( 'RegionAddressFieldsets' ) ).toHaveLength( 1 );
		} );

		test( 'should render GAppsFieldset in place of default contact fields', () => {
			const wrapper = shallow(
				<ContactDetailsFormFields { ...defaultProps } needsOnlyGoogleAppsDetails={ true } />
			);

			expect( wrapper.find( 'GAppsFieldset' ) ).toHaveLength( 1 );
			expect( wrapper.find( 'RegionAddressFieldsets' ) ).toHaveLength( 0 );
		} );
	} );

	describe( 'Country selection', () => {
		test( 'should not render address fieldset when a country code is not available', () => {
			const wrapper = shallow( <ContactDetailsFormFields /> );

			expect( wrapper.find( 'RegionAddressFieldsets' ) ).toHaveLength( 0 );
		} );

		test( 'should not render address fieldset when no country selected', () => {
			const wrapper = shallow(
				<ContactDetailsFormFields contactDetails={ { countryCode: '' } } />
			);

			expect( wrapper.find( 'RegionAddressFieldsets' ) ).toHaveLength( 0 );
		} );

		test( 'should render address fieldset when a valid countryCode is selected', () => {
			const wrapper = shallow( <ContactDetailsFormFields { ...defaultProps } /> );
			expect( wrapper.find( 'RegionAddressFieldsets' ) ).toHaveLength( 1 );
		} );
	} );

	describe( 'label text', () => {
		test( 'should render submit button text', () => {
			const wrapper = shallow(
				<ContactDetailsFormFields
					{ ...defaultProps }
					labelTexts={ { submitText: 'Click it yo!' } }
				/>
			);
			expect(
				wrapper
					.find( '.contact-details-form-fields__submit-button' )
					.render()
					.text()
			).toEqual( 'Click it yo!' );
		} );
	} );
} );
