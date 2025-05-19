# Stripe Test Lab – Project Requirements Document

## Overview

Stripe Test Lab is a full stack application built with the latest Next.js (for Vercel) and TypeScript. It enables users to input their Stripe secret keys and run a curated set of Stripe test cases, grouped by Core Payments, Connect, and Billing. The app provides a modern, searchable UI for selecting and executing test cases, with results and feedback for each.

---

## Requirements Table

| Requirement ID | Description | User Story |
|---|---|---|
| REQ-001 | The app must be built with Next.js (latest) and TypeScript, optimized for Vercel deployment. | As a developer, I want the app to use modern frameworks and be easily deployable to Vercel, so I can maintain and scale it efficiently. |
| REQ-002 | The home page must prompt the user to enter their Stripe secret key(s) securely. | As a user, I want to provide my Stripe secret key(s) in a secure way, so I can run test cases against my Stripe account. |
| REQ-003 | The app must present a categorized list of test cases, grouped into Core Payments, Connect, and Billing. | As a user, I want to see all available test cases organized by category, so I can easily find the tests I need. |
| REQ-004 | Each test case must have a checkbox for multi-select and a button to run the test individually. | As a user, I want to select multiple test cases to run in batch, or run a single test case directly, so I have flexibility in my testing workflow. |
| REQ-005 | The app must provide a search bar at the top of the test case list to filter test cases by name or description. | As a user, I want to quickly search for specific test cases, so I can find and execute them efficiently. |
| REQ-006 | The app must fetch and display all Core Payments test cases as detailed in the Stripe Testing documentation. | As a user, I want to run core payment scenarios (e.g., successful payment, declined card, fraud, 3D Secure, refunds, disputes, etc.), so I can validate my integration. |
| REQ-007 | The app must fetch and display all Connect test cases as detailed in the Stripe Connect Testing documentation. | As a user, I want to run Connect scenarios (e.g., account creation, verification, payouts, capability errors, etc.), so I can test my platform workflows. |
| REQ-008 | The app must fetch and display all Billing test cases as detailed in the Stripe Billing Testing documentation. | As a user, I want to run Billing scenarios (e.g., subscription lifecycle, payment failures, trials, invoicing, test clocks, etc.), so I can ensure my billing logic works. |
| REQ-009 | The app must allow users to execute selected test cases and display the results (success, failure, error details). | As a user, I want to see the outcome of each test case I run, so I can debug and verify my Stripe integration. |
| REQ-010 | There must be a button at the end of the test case list that allows the user to run all selected test cases. The button should only be enabled when at least one test case is selected. | As a user, I want a convenient way to run all selected test cases at once, and I want the button to be enabled only when I have selected at least one test case, so I don't accidentally trigger empty runs. |
| REQ-011 | When test execution is in progress, a log must be provided to the user that shows the progress of the test(s) in real time. | As a user, I want to see a live log of the test execution progress, so I can monitor what is happening and diagnose issues as they occur. |
| REQ-012 | The app must handle and display errors gracefully, including invalid keys, API errors, and test failures. | As a user, I want clear feedback when something goes wrong, so I can take corrective action. |
| REQ-013 | The app must not store Stripe secret keys or sensitive data beyond the session, and must follow security best practices. | As a user, I want to be confident that my sensitive information is handled securely and not persisted. |
| REQ-014 | The UI must be modern, responsive, and accessible, following best practices for usability and accessibility. I'd like it to have glowing effects around the components. | As a user, I want a pleasant and accessible experience on any device, so I can use the app effectively. |
| REQ-015 | The app must provide documentation or tooltips for each test case and a link to related stripe docs, describing what it does and any special instructions. | As a user, I want to understand what each test case does before running it, so I can make informed choices. |
| REQ-016 | The app must support running multiple test cases in parallel and display progress for batch runs. | As a user, I want to run several test cases at once and track their progress, so I can save time during testing. |
| REQ-017 | The app must be easily extensible to add new test cases or categories in the future. | As a developer, I want to add or update test cases without major refactoring, so the app can evolve with Stripe’s API. |
| REQ-018 | The app should prompt the user for which currency they want to create payment in. A dropdown list of all available currency should be displayed under the secret key | As a user, I want to select which currency to create payments in. This setting will apply to all the payments that gets generated |


