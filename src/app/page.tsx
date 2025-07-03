'use client';

import { useState, useRef, useEffect } from "react";
import { allTestCaseGroups } from '../test-cases';
import { TestCase } from '../test-cases/types';

// TODO: Replace with dynamic fetch from Stripe docs or local config
const CURRENCIES = [
  { code: 'usd', label: 'USD ($)' },
  { code: 'eur', label: 'EUR (€)' },
  { code: 'gbp', label: 'GBP (£)' },
  { code: 'aud', label: 'AUD (A$)' },
  { code: 'cad', label: 'CAD (C$)' },
  { code: 'jpy', label: 'JPY (¥)' },
  { code: 'sgd', label: 'SGD (S$)' },
  { code: 'inr', label: 'INR (₹)' },
];

const ACCOUNT_TYPES = [
  { value: 'custom', label: 'Custom' },
  { value: 'express', label: 'Express' },
  { value: 'pns', label: 'PNS' },
];

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'IT', label: 'Italy' },
  { code: 'ES', label: 'Spain' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'SE', label: 'Sweden' },
  { code: 'DK', label: 'Denmark' },
  { code: 'NO', label: 'Norway' },
  { code: 'FI', label: 'Finland' },
  { code: 'JP', label: 'Japan' },
  { code: 'SG', label: 'Singapore' },
];

export default function Home() {
  // Flatten all test cases for search/filter
  const allTestCases: TestCase[] = allTestCaseGroups.flatMap(g => g.testCases);

  const [stripeKey, setStripeKey] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [currency, setCurrency] = useState('usd');
  const [accountType, setAccountType] = useState('custom');
  const [country, setCountry] = useState('US');
  const [connectPayment, setConnectPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('direct');
  const [applicationFee, setApplicationFee] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (log.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [log]);

  // Filtered test cases by search
  const filteredCases = allTestCases.filter(
    (tc) =>
      tc.name.toLowerCase().includes(search.toLowerCase()) ||
      tc.description.toLowerCase().includes(search.toLowerCase())
  );

  // Helper function to check if a test case can be run
  const canRunTest = (testCase: TestCase) => {
    // If Connect payment is enabled, check if destination account ID is provided for core payment tests
    if (connectPayment && !destinationAccountId.trim()) {
      // Find the group this test case belongs to
      const group = allTestCaseGroups.find(g => g.testCases.some(tc => tc.id === testCase.id));
      if (group && group.label === 'Core Payments') {
        return false;
      }
    }
    return true;
  };

  // Helper function to check if any selected tests can be run
  const canRunSelectedTests = () => {
    const selectedTestCases = allTestCases.filter(tc => selected.includes(tc.id));
    return selectedTestCases.some(tc => canRunTest(tc));
  };

  const handleSelect = (id: string) => {
    setSelected((sel) =>
      sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]
    );
  };

  // Helper to call the backend API for running a test case
  async function runTestCase(stripeKey: string, testCaseId: string, currency: string, accountType: string, country: string) {
    const res = await fetch('/api/run-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        stripeKey, 
        testCaseId, 
        currency, 
        accountType, 
        country,
        connectPayment,
        paymentMethod,
        applicationFee,
        destinationAccountId
      }),
    });
    return res.json();
  }

  // Update runTest and runSelected to handle errors and log in red with emoji
  const runTest = async (id: string) => {
    setRunning(true);
    setLog(l => [...l, `Running test: ${id}`]);
    const result = await runTestCase(stripeKey, id, currency, accountType, country);
    if (result.error) {
      setLog(l => [...l, `<span class='text-red-400'>❌ Test failed: ${result.error}</span>`]);
    } else {
      setLog(l => [...l, `<span class='text-green-400'>✅ ${result.message || `Test completed: ${id}`}</span>`]);
    }
    setRunning(false);
  };

  const runSelected = async () => {
    setRunning(true);
    const selectedTestCases = allTestCases.filter(tc => selected.includes(tc.id));
    const runnableTests = selectedTestCases.filter(tc => canRunTest(tc));
    const skippedTests = selectedTestCases.filter(tc => !canRunTest(tc));

    // Log skipped tests
    for (const tc of skippedTests) {
      setLog(l => [...l, `<span class='text-yellow-400'>⚠️ Skipped test: ${tc.id} (Connect payment enabled but destination account ID missing)</span>`]);
    }

    // Run the tests that can be run
    for (const tc of runnableTests) {
      setLog(l => [...l, `Running test: ${tc.id}`]);
      const result = await runTestCase(stripeKey, tc.id, currency, accountType, country);
      if (result.error) {
        setLog(l => [...l, `<span class='text-red-400'>❌ Test failed: ${result.error}</span>`]);
      } else {
        setLog(l => [...l, `<span class='text-green-400'>✅ ${result.message || `Test completed: ${tc.id}`}</span>`]);
      }
    }
    setLog(l => [...l, "<span class='text-cyan-300'>🎉 All runnable selected test cases have been executed.</span>"]);
    setRunning(false);
  };

  // Group/subgroup selection helpers
  const handleGroupSelect = (groupLabel: string, checked: boolean) => {
    const group = allTestCaseGroups.find(g => g.label === groupLabel);
    if (!group) return;
    const groupIds = group.testCases.map(tc => tc.id).filter(id => filteredCases.some(f => f.id === id));
    setSelected(sel => checked
      ? Array.from(new Set([...sel, ...groupIds]))
      : sel.filter(id => !groupIds.includes(id))
    );
  };
  const handleSubgroupSelect = (groupLabel: string, subcat: string, checked: boolean) => {
    const group = allTestCaseGroups.find(g => g.label === groupLabel);
    if (!group) return;
    const subIds = group.testCases.filter(tc => tc.category === subcat && filteredCases.some(f => f.id === tc.id)).map(tc => tc.id);
    setSelected(sel => checked
      ? Array.from(new Set([...sel, ...subIds]))
      : sel.filter(id => !subIds.includes(id))
    );
  };

  // Helper: map Stripe object prefixes to dashboard URLs
  const STRIPE_DASHBOARD_URLS: Record<string, (id: string) => string> = {
    'cus_': (id) => `https://dashboard.stripe.com/test/customers/${id}`,
    'pi_': (id) => `https://dashboard.stripe.com/test/payments/${id}`,
    'acct_': (id) => `https://dashboard.stripe.com/test/connect/accounts/${id}`,
    'ch_': (id) => `https://dashboard.stripe.com/test/payments/${id}`,
    'in_': (id) => `https://dashboard.stripe.com/test/invoices/${id}`,
    'sub_': (id) => `https://dashboard.stripe.com/test/subscriptions/${id}`,
    'rfnd_': (id) => `https://dashboard.stripe.com/test/refunds/${id}`,
    'dp_': (id) => `https://dashboard.stripe.com/test/disputes/${id}`,
  };

  // Parse log entry for color, emoji, and clickable Stripe IDs (no dangerouslySetInnerHTML)
  function renderLogEntry(entry: string) {
    // Regex for <span class='text-...'>...</span>
    const spanRegex = /<span class='(text-[^']+)'>([\s\S]*?)<\/span>/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    while ((match = spanRegex.exec(entry)) !== null) {
      if (match.index > lastIndex) {
        parts.push(linkifyStripeIdsReact(entry.slice(lastIndex, match.index)));
      }
      parts.push(
        <span key={parts.length} className={match[1]}>{linkifyStripeIdsReact(match[2])}</span>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < entry.length) {
      parts.push(linkifyStripeIdsReact(entry.slice(lastIndex)));
    }
    return <>{parts}</>;
  }

  // React version of linkifyStripeIds
  function linkifyStripeIdsReact(line: string): React.ReactNode {
    const nodes: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // First, find all URLs and Stripe IDs with their positions
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const stripeIdRegex = /\b([a-z]{2,5}_[a-zA-Z0-9]+)\b/g;
    
    const items: Array<{type: 'url' | 'stripe', start: number, end: number, text: string, url?: string}> = [];
    
    // Find URLs
    let urlMatch;
    while ((urlMatch = urlRegex.exec(line)) !== null) {
      items.push({
        type: 'url',
        start: urlMatch.index,
        end: urlMatch.index + urlMatch[0].length,
        text: urlMatch[0]
      });
    }
    
    // Find Stripe IDs that are NOT part of URLs
    let stripeMatch;
    stripeIdRegex.lastIndex = 0; // Reset regex
    while ((stripeMatch = stripeIdRegex.exec(line)) !== null) {
      const id = stripeMatch[1];
      const start = stripeMatch.index;
      const end = stripeMatch.index + id.length;
      
      // Check if this Stripe ID is inside a URL
      const isInsideUrl = items.some(item => 
        item.type === 'url' && start >= item.start && end <= item.end
      );
      
      if (!isInsideUrl) {
        // Check if this Stripe ID has a dashboard URL
        let dashboardUrl: string | null = null;
        for (const prefix in STRIPE_DASHBOARD_URLS) {
          if (id.startsWith(prefix)) {
            dashboardUrl = STRIPE_DASHBOARD_URLS[prefix](id);
            break;
          }
        }
        
        if (dashboardUrl) {
          items.push({
            type: 'stripe',
            start,
            end,
            text: id,
            url: dashboardUrl
          });
        }
      }
    }
    
    // Sort items by start position
    items.sort((a, b) => a.start - b.start);
    
    // Build the React nodes
    items.forEach(item => {
      // Add text before this item
      if (item.start > currentIndex) {
        nodes.push(line.slice(currentIndex, item.start));
      }
      
      // Add the link
      nodes.push(
        <a
          key={nodes.length}
          href={item.type === 'url' ? item.text : item.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-cyan-300 hover:text-cyan-400"
        >
          {item.text}
        </a>
      );
      
      currentIndex = item.end;
    });
    
    // Add remaining text
    if (currentIndex < line.length) {
      nodes.push(line.slice(currentIndex));
    }
    
    return nodes;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white flex flex-col">
      {/* Fixed Left Sidebar - Settings */}
      <div className="fixed left-0 top-0 h-screen w-80 bg-slate-900/95 border-r border-slate-600 p-6 flex flex-col z-10">
        <div className="mb-6 font-bold text-cyan-300 text-lg">Settings</div>
        
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="stripe-key" className="form-label">
              Stripe Secret Key
            </label>
            <input
              id="stripe-key"
              type="password"
              className="input-field"
              placeholder="sk_test_..."
              value={stripeKey}
              onChange={(e) => setStripeKey(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Divider under Stripe Secret Key */}
          <div className="divider"></div>

          <div>
            <label htmlFor="currency" className="form-label">
              Payment currency
            </label>
            <select
              id="currency"
              className="select-input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center form-label">
              <input
                id="connect-payment"
                type="checkbox"
                checked={connectPayment}
                onChange={(e) => setConnectPayment(e.target.checked)}
                className="checkbox-cyan"
              />
              Connect Payment
            </label>
          </div>

          {/* Conditional Connect Payment options */}
          {connectPayment && (
            <>
              <div>
                <label htmlFor="payment-method" className="form-label">
                  Payment Type
                </label>
                <select
                  id="payment-method"
                  className="select-input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="direct">Direct Charge</option>
                  <option value="destination">Destination Charge</option>
                  <option value="separate">Separate charge and transfer</option>
                </select>
              </div>

              <div>
                <label htmlFor="application-fee" className="form-label">
                  Application fee
                </label>
                <input
                  id="application-fee"
                  type="text"
                  className="input-field"
                  placeholder="0"
                  value={applicationFee}
                  onChange={(e) => {
                    // Only allow numeric characters
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setApplicationFee(value);
                  }}
                />
              </div>

              <div>
                <label htmlFor="destination-account-id" className="form-label">
                  Destination account id
                </label>
                <input
                  id="destination-account-id"
                  type="text"
                  className="input-field"
                  placeholder="acct_..."
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Divider */}
          <div className="divider"></div>

          <div>
            <label htmlFor="account-type" className="form-label">
              Connect Account Type
            </label>
            <select
              id="account-type"
              className="select-input"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="country" className="form-label">
              Connected Account Country
            </label>
            <select
              id="country"
              className="select-input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-80 flex-1 flex flex-col pb-64">
        <div className="flex-1 flex flex-col items-center p-6">
          <h1 className="text-5xl font-bold mb-6 text-glow">
            Stripe Test Lab
          </h1>

          <div className="mb-4 w-full max-w-2xl flex flex-col gap-2">
            <input
              type="text"
              className="input-field"
              placeholder="Search test cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full max-w-2xl bg-slate-900/80 rounded-lg p-4 shadow-lg mb-6">
            {/* Run Selected button at the top */}
            <button
              className="button-primary mb-4"
              onClick={runSelected}
              disabled={selected.length === 0 || running || !stripeKey || !canRunSelectedTests()}
            >
              Run Selected
            </button>
            {allTestCaseGroups.map((group) => {
              const groupIds = group.testCases.map(tc => tc.id).filter(id => filteredCases.some(f => f.id === id));
              const allGroupSelected = groupIds.length > 0 && groupIds.every(id => selected.includes(id));
              const someGroupSelected = groupIds.some(id => selected.includes(id));
              return (
                <div key={group.label} className="mb-4">
                  <div className="group-header">
                    <input
                      type="checkbox"
                      checked={allGroupSelected}
                      ref={el => { if (el) el.indeterminate = !allGroupSelected && someGroupSelected; }}
                      onChange={e => handleGroupSelect(group.label, e.target.checked)}
                      className="checkbox-cyan"
                      disabled={running || groupIds.length === 0}
                    />
                    <h2 className="group-title">{group.label}</h2>
                  </div>
                  {/* Group by subcategory (category) */}
                  {Array.from(new Set(group.testCases.map(tc => tc.category))).map(subcat => {
                    const subIds = group.testCases.filter(tc => tc.category === subcat && filteredCases.some(f => f.id === tc.id)).map(tc => tc.id);
                    const allSubSelected = subIds.length > 0 && subIds.every(id => selected.includes(id));
                    const someSubSelected = subIds.some(id => selected.includes(id));
                    return (
                      <div key={subcat} className="mb-2">
                        <div className="flex items-center mb-1 ml-2"> {/* Reduced subgroup indent */}
                          <input
                            type="checkbox"
                            checked={allSubSelected}
                            ref={el => { if (el) el.indeterminate = !allSubSelected && someSubSelected; }}
                            onChange={e => handleSubgroupSelect(group.label, subcat, e.target.checked)}
                            className="checkbox-cyan"
                            disabled={running || subIds.length === 0}
                          />
                          <h3 className="subgroup-title">{subcat}</h3>
                        </div>
                        <ul className="space-y-2">
                          {group.testCases.filter(tc => tc.category === subcat && filteredCases.some(f => f.id === tc.id)).map(tc => (
                            <li
                              key={tc.id}
                              className="test-case-item"
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(tc.id)}
                                onChange={() => handleSelect(tc.id)}
                                disabled={running}
                                className="checkbox-cyan-solo"
                              />
                              <div className="flex-1">
                                <div className="font-semibold">{tc.name}</div>
                                <div className="text-sm text-slate-300">{tc.description}</div>
                                {tc.docsUrl && (
                                  <a
                                    href={tc.docsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-cyan"
                                  >
                                    Related docs
                                  </a>
                                )}
                              </div>
                              <button
                                className="button-small"
                                onClick={() => runTest(tc.id)}
                                disabled={running || !stripeKey || !canRunTest(tc)}
                              >
                                Run
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Run Selected button at the bottom */}
            <button
              className="button-primary mt-4"
              onClick={runSelected}
              disabled={selected.length === 0 || running || !stripeKey || !canRunSelectedTests()}
            >
              Run Selected
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Execution Log */}
      <div className="fixed bottom-0 left-80 right-0 h-60 bg-black/90 border-t border-slate-600 p-4 z-10">
        <div className="h-full flex flex-col">
          <div className="mb-2 font-bold text-cyan-300 text-lg">Execution Log</div>
          <div className="flex-1 rounded p-4 overflow-y-auto text-sm font-mono log-glow bg-black/50">
            {log.map((entry, i) => (
              <div key={i}>{renderLogEntry(entry)}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
