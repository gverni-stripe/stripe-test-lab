import Stripe from "stripe";

// Template for person information (for custom accounts)
export const PERSON_TEMPLATE = {
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

// Base template with common attributes
export const BASE_COMPANY_TEMPLATE = {
  business_profile: {
    mcc: "5734",
    product_description: "Product Description",
    url: "https://accessible.stripe.com",
    support_phone: "0000000000",
  },
  business_type: "company" as const,
  company: {
    name: "Company Name",
    phone: "0000000000",
    tax_id: "000000000",
    address: {
      line1: "address_full_match", // Stripe test token for successful address verification
    },
  },
  capabilities: {
    card_payments: {
      requested: true,
    },
    transfers: {
      requested: true,
    },
  },
  metadata: {
    application: "Created with https://stripe-test-lab.vercel.app/",
  },
};

// Country-specific configurations
export const COUNTRY_CONFIGS: Record<string, Partial<Stripe.AccountCreateParams>> = {
  US: {
    external_account: "btok_us_usd",
    company: {
      address: {
        city: "San Francisco",
        state: "CA",
        postal_code: "94105",
        country: "US",
      },
    },
  },
  CA: {
    external_account: "btok_ca_cad",
    company: {
      address: {
        city: "Toronto",
        state: "ON",
        postal_code: "M5H 2N2",
        country: "CA",
      },
    },
  },
  GB: {
    external_account: "btok_gb_gbp",
    company: {
      address: {
        city: "London",
        postal_code: "EC1M 7AD",
        country: "GB",
      },
    },
  },
  AU: {
    external_account: "btok_au_aud",
    company: {
      address: {
        city: "Sydney",
        state: "NSW",
        postal_code: "2000",
        country: "AU",
      },
      registration_number: "000000000",
    },
  },
  DE: {
    external_account: "btok_de_eur",
    company: {
      address: {
        city: "Berlin",
        postal_code: "10115",
        country: "DE",
      },
      tax_id: "HRA 58343 FL",
    },
  },
  FR: {
    external_account: "btok_fr_eur",
    company: {
      address: {
        city: "Paris",
        postal_code: "75001",
        country: "FR",
      },
    },
  },
  IT: {
    external_account: "btok_it_eur",
    company: {
      address: {
        city: "Milan",
        postal_code: "20121",
        country: "IT",
      },
    },
  },
  ES: {
    external_account: "btok_es_eur",
    company: {
      address: {
        city: "Madrid",
        postal_code: "28001",
        country: "ES",
      },
    },
  },
  NL: {
    external_account: "btok_nl_eur",
    company: {
      address: {
        city: "Amsterdam",
        postal_code: "1012 JS",
        country: "NL",
      },
    },
  },
  SE: {
    external_account: "btok_se_sek",
    company: {
      address: {
        city: "Stockholm",
        postal_code: "111 29",
        country: "SE",
      },
    },
  },
  DK: {
    external_account: "btok_dk_dkk",
    company: {
      address: {
        city: "Copenhagen",
        postal_code: "1050",
        country: "DK",
      },
    },
  },
  NO: {
    external_account: "btok_no_nok",
    company: {
      address: {
        city: "Oslo",
        postal_code: "0150",
        country: "NO",
      },
    },
  },
  FI: {
    external_account: "btok_fi_eur",
    company: {
      address: {
        city: "Helsinki",
        postal_code: "00100",
        country: "FI",
      },
    },
  },
  JP: {
    external_account: "btok_jp_jpy",
    company: {
      address: {
        city: "Tokyo",
        postal_code: "100-0001",
        country: "JP",
      },
    },
  },
  SG: {
    external_account: "btok_sg_sgd",
    company: {
      address: {
        city: "Singapore",
        postal_code: "018989",
        country: "SG",
      },
    },
  },
};

// Helper function to create account data based on account type
export function createAccountData(
  accountType: string,
  country: string
): Stripe.AccountCreateParams {
  // Start with base template
  const accountData: Stripe.AccountCreateParams = {
    country: country,
    email: `test+${Date.now()}@example.com`,
    ...BASE_COMPANY_TEMPLATE,
  };

  // Apply country-specific configuration
  const countryConfig = COUNTRY_CONFIGS[country];
  if (countryConfig) {
    // Apply external account
    if (countryConfig.external_account) {
      accountData.external_account = countryConfig.external_account;
    }
    
    // Apply company-specific overrides with deep merge
    if (countryConfig.company && accountData.company) {
      // Deep merge company data to preserve nested properties
      if (countryConfig.company.address && accountData.company.address) {
        accountData.company.address = {
          ...accountData.company.address,
          ...countryConfig.company.address,
        };
      }
      
      // Apply other company properties
      Object.assign(accountData.company, {
        ...countryConfig.company,
        address: accountData.company.address, // Use the merged address
      });
    }
  }

  // Set dynamic business profile name
  if (accountData.business_profile) {
    accountData.business_profile.name = `${accountType} ${country} Account`;
  }

  if (accountType === "pns") {
    accountData.controller = {
      losses: { payments: "stripe" },
      fees: { payer: "application" },
      requirement_collection: "stripe",
      stripe_dashboard: { type: "none" },
    };
  } else {
    accountData.type = accountType as "express" | "custom";
    if (accountType === "custom") {
      accountData.tos_acceptance = {
        date: Math.floor(Date.now() / 1000),
        ip: "127.0.0.1",
      };
    }
  }

  return accountData;
} 