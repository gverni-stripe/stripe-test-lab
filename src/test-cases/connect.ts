import Stripe from "stripe";
import { TestCaseGroup } from "./types";

// Template for account individual information
// const ACCOUNT_INDIVIDUAL_TEMPLATE = {
//   dob: { day: 1, month: 1, year: 1901 }, // Use 1901-01-01 for successful verification
//   first_name: "John",
//   last_name: "Doe",
//   email: "john.doe@example.com",
//   phone: "0000000000", // Test phone number for successful validation
//   address: {
//     line1: "address_full_match", // Test address token for successful verification
//     city: "San Francisco",
//     state: "CA",
//     postal_code: "94105",
//     country: "US",
//   },
//   id_number: "000000000", // Test SSN for successful verification
// };

// Template for person information (for custom accounts)
const PERSON_TEMPLATE = {
  dob: { day: 1, month: 1, year: 1901 }, // Use 1901-01-01 for successful verification
  first_name: "Jane",
  last_name: "Smith",
  email: "jane.smith@example.com",
  phone: "0000000000", // Test phone number for successful validation
  address: {
    line1: "address_full_match", // Test address token for successful verification
    city: "San Francisco",
    state: "CA",
    postal_code: "94105",
    country: "US",
  },
  id_number: "000000000", // Test SSN for successful verification
  relationship: {
    director: true,
    executive: true,
    owner: true,
    percent_ownership: 50,
    representative: true,
    title: "CEO",
  },
  verification: {
    document: {
      front: "file_identity_document_success",
    },
  },
  metadata: {
    application: "Created with https://stripe-test-lab.vercel.app/",
  },
};

// Template for business information
// const BUSINESS_TEMPLATE = {
//   name: "Test Business LLC",
//   tax_id: "000000000", // Test business tax ID for successful verification
//   url: "https://example.com",
//   phone: "0000000000",
//   address: {
//     line1: "address_full_match", // Test address for successful verification
//     city: "San Francisco",
//     state: "CA",
//     postal_code: "94105",
//     country: "US",
//   },
//   structure: "llc" as const,
//   industry: "software_publishing",
//   product_description: "Software development services",
// };

const COMPANY_TEMPLATE = {
  business_profile: {
    mcc: "5734",
    name: "Connected Account",
    product_description: "Product Description",
    url: "https://accessible.stripe.com",
    support_phone: "+44345 300 0000",
  },
  business_type: "company" as const,
  company: {
    address: {
      city: "London",
      country: "GB",
      line1: "21 Old Street",
      postal_code: "EC1M 7AD",
      state: undefined,
    },
    name: "Connected Account (DBA)",
    phone: "+447400123456",
    tax_id: "12345678",
  },
  default_currency: "gbp",
  capabilities: {
    card_payments: {
      requested: true,
    },
    transfers: {
      requested: true,
    },
  },
  external_account: "btok_gb_gbp",
  metadata: {
    application: "Created with https://stripe-test-lab.vercel.app/",
  },
};

// Helper function to create account data based on account type
function createAccountData(
  accountType: string,
  country: string
): Stripe.AccountCreateParams {
  const accountData: Stripe.AccountCreateParams = {
    country: country,
    email: `test+${Date.now()}@example.com`,
    ...COMPANY_TEMPLATE,
  };

  if (accountType === "pns") {
    accountData.controller = {
      losses: { payments: "stripe" },
      fees: { payer: "application" },
      requirement_collection: "stripe",
      stripe_dashboard: { type: "none" },
    };
  } else {
    accountData.type = accountType as "express" | "standard" | "custom";
    if (accountType === "custom") {
      accountData.tos_acceptance = {
        date: Math.floor(Date.now() / 1000),
        ip: "127.0.0.1",
      };
    }
  }

  return accountData;
}

export const connect: TestCaseGroup = {
  label: "Connect",
  testCases: [
    // --- Account Creation Tests ---
    {
      id: "connect-create-account",
      name: "Create Connected Account",
      description: "Create a connected account with the specified type.",
      category: "Account Creation",
      docsUrl: "https://docs.stripe.com/connect/testing",
      handler: async (
        stripe: Stripe,
        params: { currency: string; accountType: string; country: string }
      ) => {
        // Step 1 - Create Account
        const accountData = createAccountData(
          params.accountType,
          params.country
        );
        const account = await stripe.accounts.create(accountData);

        // Step 2 - Create Person
        await stripe.accounts.createPerson(account.id, PERSON_TEMPLATE);

        // Step 3 - Confirm Onwerhsip Declaration
        await stripe.accounts.update(account.id, {
          company: {
            owners_provided: true,
            directors_provided: true,
            executives_provided: true,
            ownership_declaration: {
              ip: "127.0.0.1",
              date: 1715193372,
            },
          },
        });

        let message = `${params.accountType} account created: ${account.id}`;

        // Step 4 - For requirement_collection: "stripe" create an account link to complete onboarding
        if (accountData.controller?.requirement_collection === "stripe") {
          const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: "https://example.com/refresh",
            return_url: "https://example.com/return",
            type: "account_onboarding",
          });
          message += `\nClick on the link to complete onboarding: ${accountLink.url}`;
        }

        return { message };
      },
    },

    // // --- Account-Level Identity Verification Tests ---
    // {
    //   id: 'connect-account-setup-individual',
    //   name: 'Setup Account Individual Information',
    //   description: 'Set up individual information for account-level verification.',
    //   category: 'Account Verification',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#identity-verification',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     // Create account first
    //     const accountData = createAccountData(params.accountType, params.country);
    //     const account = await stripe.accounts.create(accountData);

    //     // Update with individual information
    //     const updatedAccount = await stripe.accounts.update(account.id, {
    //       individual: ACCOUNT_INDIVIDUAL_TEMPLATE,
    //       ...(params.accountType === 'custom' && {
    //         business_type: 'individual',
    //         tos_acceptance: {
    //           date: Math.floor(Date.now() / 1000),
    //           ip: '127.0.0.1',
    //         },
    //       }),
    //     });

    //     return { message: `Account ${updatedAccount.id} updated with individual info. Verification status: ${updatedAccount.individual?.verification?.status || 'unknown'}` };
    //   },
    // },

    // {
    //   id: 'connect-account-identity-doc-success',
    //   name: 'Account Identity Document - Success',
    //   description: 'Test successful identity document verification for account using file_identity_document_success token.',
    //   category: 'Account Verification',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#test-file-tokens',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     // Create account with individual info
    //     const accountData = createAccountData(params.accountType, params.country);
    //     accountData.individual = ACCOUNT_INDIVIDUAL_TEMPLATE;
    //     if (params.accountType === 'custom' || params.accountType === 'pns') {
    //       accountData.business_type = 'individual';
    //       accountData.tos_acceptance = {
    //         date: Math.floor(Date.now() / 1000),
    //         ip: '127.0.0.1',
    //       };
    //     }
    //     const account = await stripe.accounts.create(accountData);

    //     // Upload identity document using success token
    //     const updatedAccount = await stripe.accounts.update(account.id, {
    //       individual: {
    //         verification: {
    //           document: {
    //             front: 'file_identity_document_success',
    //           },
    //         },
    //       },
    //     });

    //     return { message: `Account ${updatedAccount.id} identity document uploaded successfully. Verification status: ${updatedAccount.individual?.verification?.status || 'unknown'}` };
    //   },
    // },

    // {
    //   id: 'connect-account-identity-doc-failure',
    //   name: 'Account Identity Document - Failure',
    //   description: 'Test failed identity document verification for account using file_identity_document_failure token.',
    //   category: 'Account Verification',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#test-file-tokens',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     // Create account with individual info
    //     const accountData = createAccountData(params.accountType, params.country);
    //     accountData.individual = ACCOUNT_INDIVIDUAL_TEMPLATE;
    //     if (params.accountType === 'custom' || params.accountType === 'pns') {
    //       accountData.business_type = 'individual';
    //       accountData.tos_acceptance = {
    //         date: Math.floor(Date.now() / 1000),
    //         ip: '127.0.0.1',
    //       };
    //     }
    //     const account = await stripe.accounts.create(accountData);

    //     // Upload identity document using failure token
    //     const updatedAccount = await stripe.accounts.update(account.id, {
    //       individual: {
    //         verification: {
    //           document: {
    //             front: 'file_identity_document_failure',
    //           },
    //         },
    //       },
    //     });

    //     return { message: `Account ${updatedAccount.id} identity document upload failed as expected. Verification status: ${updatedAccount.individual?.verification?.status || 'unknown'}` };
    //   },
    // },

    // // --- Person-Level Identity Verification Tests ---
    // {
    //   id: 'connect-person-create',
    //   name: 'Create Person for Custom Account',
    //   description: 'Create a person (representative) for a custom account.',
    //   category: 'Person Verification',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#identity-verification',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     // Create custom account with business info
    //     const accountData = createAccountData('custom', params.country);
    //     accountData.business_type = 'company';
    //     accountData.company = BUSINESS_TEMPLATE;
    //     accountData.tos_acceptance = {
    //       date: Math.floor(Date.now() / 1000),
    //       ip: '127.0.0.1',
    //     };
    //     const account = await stripe.accounts.create(accountData);

    //     // Create person
    //     const person = await stripe.accounts.createPerson(account.id, PERSON_TEMPLATE);

    //     return { message: `Person ${person.id} created for account ${account.id}. Verification status: ${person.verification?.status || 'unknown'}` };
    //   },
    // },

    // {
    //   id: 'connect-person-identity-doc-success',
    //   name: 'Person Identity Document - Success',
    //   description: 'Test successful identity document verification for person using file_identity_document_success token.',
    //   category: 'Person Verification',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#test-file-tokens',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     // Create custom account with business info
    //     const account = await stripe.accounts.create({
    //       type: 'custom',
    //       country: params.country,
    //       email: `test+${Date.now()}@example.com`,
    //       business_type: 'company',
    //       company: BUSINESS_TEMPLATE,
    //       capabilities: {
    //         card_payments: { requested: true },
    //         transfers: { requested: true },
    //       },
    //       tos_acceptance: {
    //         date: Math.floor(Date.now() / 1000),
    //         ip: '127.0.0.1',
    //       },
    //     });

    //     // Create person
    //     const person = await stripe.accounts.createPerson(account.id, PERSON_TEMPLATE);

    //     // Upload identity document using success token
    //     const updatedPerson = await stripe.accounts.updatePerson(account.id, person.id, {
    //       verification: {
    //         document: {
    //           front: 'file_identity_document_success',
    //         },
    //       },
    //     });

    //     return { message: `Person ${updatedPerson.id} identity document uploaded successfully. Verification status: ${updatedPerson.verification?.status || 'unknown'}` };
    //   },
    // },

    // {
    //   id: 'connect-person-identity-doc-failure',
    //   name: 'Person Identity Document - Failure',
    //   description: 'Test failed identity document verification for person using file_identity_document_failure token.',
    //   category: 'Person Verification',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#test-file-tokens',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     // Create custom account with business info
    //     const account = await stripe.accounts.create({
    //       type: 'custom',
    //       country: params.country,
    //       email: `test+${Date.now()}@example.com`,
    //       business_type: 'company',
    //       company: BUSINESS_TEMPLATE,
    //       capabilities: {
    //         card_payments: { requested: true },
    //         transfers: { requested: true },
    //       },
    //       tos_acceptance: {
    //         date: Math.floor(Date.now() / 1000),
    //         ip: '127.0.0.1',
    //       },
    //     });

    //     // Create person
    //     const person = await stripe.accounts.createPerson(account.id, PERSON_TEMPLATE);

    //     // Upload identity document using failure token
    //     const updatedPerson = await stripe.accounts.updatePerson(account.id, person.id, {
    //       verification: {
    //         document: {
    //           front: 'file_identity_document_failure',
    //         },
    //       },
    //     });

    //     return { message: `Person ${updatedPerson.id} identity document upload failed as expected. Verification status: ${updatedPerson.verification?.status || 'unknown'}` };
    //   },
    // },

    // // --- Other Test Cases ---
    // {
    //   id: 'connect-test-dates-of-birth',
    //   name: 'Test Different Dates of Birth',
    //   description: 'Test various dates of birth for verification conditions.',
    //   category: 'Verification Tests',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#test-dates-of-birth',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     const testDates = [
    //       { date: { day: 1, month: 1, year: 1901 }, expected: 'successful' },
    //       { date: { day: 1, month: 1, year: 1902 }, expected: 'immediate successful' },
    //       { date: { day: 1, month: 1, year: 1900 }, expected: 'OFAC alert' },
    //     ];

    //     const results = [];
    //     for (const testDate of testDates) {
    //       const account = await stripe.accounts.create({
    //         type: params.accountType as 'express' | 'standard' | 'custom',
    //         country: params.country,
    //         email: `test+${Date.now()}@example.com`,
    //         individual: {
    //           ...ACCOUNT_INDIVIDUAL_TEMPLATE,
    //           dob: testDate.date,
    //         },
    //         ...(params.accountType === 'custom' && {
    //           business_type: 'individual',
    //           capabilities: {
    //             card_payments: { requested: true },
    //             transfers: { requested: true },
    //           },
    //           tos_acceptance: {
    //             date: Math.floor(Date.now() / 1000),
    //             ip: '127.0.0.1',
    //           },
    //         }),
    //       });

    //       results.push(`DOB ${testDate.date.year}-${testDate.date.month}-${testDate.date.day} (${testDate.expected}): ${account.id}`);
    //     }

    //     return { message: `Tested dates of birth: ${results.join(', ')}` };
    //   },
    // },

    // {
    //   id: 'connect-test-addresses',
    //   name: 'Test Different Addresses',
    //   description: 'Test various addresses for verification conditions.',
    //   category: 'Verification Tests',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#test-addresses',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     const testAddresses = [
    //       { line1: 'address_full_match', expected: 'successful' },
    //       { line1: 'address_no_match', expected: 'unsuccessful' },
    //       { line1: 'address_line1_no_match', expected: 'partial match unsuccessful' },
    //     ];

    //     const results = [];
    //     for (const testAddress of testAddresses) {
    //       const account = await stripe.accounts.create({
    //         type: params.accountType as 'express' | 'standard' | 'custom',
    //         country: params.country,
    //         email: `test+${Date.now()}@example.com`,
    //         individual: {
    //           ...ACCOUNT_INDIVIDUAL_TEMPLATE,
    //           address: {
    //             ...ACCOUNT_INDIVIDUAL_TEMPLATE.address,
    //             line1: testAddress.line1,
    //           },
    //         },
    //         ...(params.accountType === 'custom' && {
    //           business_type: 'individual',
    //           capabilities: {
    //             card_payments: { requested: true },
    //             transfers: { requested: true },
    //           },
    //           tos_acceptance: {
    //             date: Math.floor(Date.now() / 1000),
    //             ip: '127.0.0.1',
    //           },
    //         }),
    //       });

    //       results.push(`Address ${testAddress.line1} (${testAddress.expected}): ${account.id}`);
    //     }

    //     return { message: `Tested addresses: ${results.join(', ')}` };
    //   },
    // },

    // {
    //   id: 'connect-test-id-numbers',
    //   name: 'Test Different ID Numbers',
    //   description: 'Test various personal ID numbers for verification conditions.',
    //   category: 'Verification Tests',
    //   docsUrl: 'https://docs.stripe.com/connect/testing#test-personal-id-numbers',
    //   handler: async (stripe: Stripe, params: { currency: string; accountType: string; country: string }) => {
    //     const testIdNumbers = [
    //       { id: '000000000', expected: 'successful' },
    //       { id: '111111111', expected: 'identity mismatch' },
    //       { id: '222222222', expected: 'immediate successful' },
    //     ];

    //     const results = [];
    //     for (const testId of testIdNumbers) {
    //       const account = await stripe.accounts.create({
    //         type: params.accountType as 'express' | 'standard' | 'custom',
    //         country: params.country,
    //         email: `test+${Date.now()}@example.com`,
    //         individual: {
    //           ...ACCOUNT_INDIVIDUAL_TEMPLATE,
    //           id_number: testId.id,
    //         },
    //         ...(params.accountType === 'custom' && {
    //           business_type: 'individual',
    //           capabilities: {
    //             card_payments: { requested: true },
    //             transfers: { requested: true },
    //           },
    //           tos_acceptance: {
    //             date: Math.floor(Date.now() / 1000),
    //             ip: '127.0.0.1',
    //           },
    //         }),
    //       });

    //       results.push(`ID ${testId.id} (${testId.expected}): ${account.id}`);
    //     }

    //     return { message: `Tested ID numbers: ${results.join(', ')}` };
    //   },
    // },
  ],
};
