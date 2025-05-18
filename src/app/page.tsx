'use client';

import { useState } from "react";
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

export default function Home() {
  // Flatten all test cases for search/filter
  const allTestCases: TestCase[] = allTestCaseGroups.flatMap(g => g.testCases);

  const [stripeKey, setStripeKey] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [currency, setCurrency] = useState('usd');

  // Filtered test cases by search
  const filteredCases = allTestCases.filter(
    (tc) =>
      tc.name.toLowerCase().includes(search.toLowerCase()) ||
      tc.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setSelected((sel) =>
      sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id]
    );
  };

  // Helper to call the backend API for running a test case
  async function runTestCase(stripeKey: string, testCaseId: string, currency: string) {
    const res = await fetch('/api/run-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripeKey, testCaseId, currency }),
    });
    return res.json();
  }

  // Update runTest and runSelected to handle errors and log in red with emoji
  const runTest = async (id: string) => {
    setRunning(true);
    setLog(l => [...l, `Running test: ${id}`]);
    const result = await runTestCase(stripeKey, id, currency);
    if (result.error) {
      setLog(l => [...l, `<span class='text-red-400'>❌ Test failed: ${result.error}</span>`]);
    } else {
      setLog(l => [...l, `<span class='text-green-400'>✅ ${result.message || `Test completed: ${id}`}</span>`]);
    }
    setRunning(false);
  };

  const runSelected = async () => {
    setRunning(true);
    for (const id of selected) {
      setLog(l => [...l, `Running test: ${id}`]);
      const result = await runTestCase(stripeKey, id, currency);
      if (result.error) {
        setLog(l => [...l, `<span class='text-red-400'>❌ Test failed: ${result.error}</span>`]);
      } else {
        setLog(l => [...l, `<span class='text-green-400'>✅ ${result.message || `Test completed: ${id}`}</span>`]);
      }
    }
    setRunning(false);
  };

  // Helper: map Stripe object prefixes to dashboard URLs
  const STRIPE_DASHBOARD_URLS: Record<string, (id: string) => string> = {
    'cus_': (id) => `https://dashboard.stripe.com/test/customers/${id}`,
    'pi_': (id) => `https://dashboard.stripe.com/test/payments/${id}`,
    'acct_': (id) => `https://dashboard.stripe.com/test/connect/accounts/${id}`,
    'ch_': (id) => `https://dashboard.stripe.com/test/payments/${id}`,
    'in_': (id) => `https://dashboard.stripe.com/test/invoices/${id}`,
    'sub_': (id) => `https://dashboard.stripe.com/test/subscriptions/${id}`,
    'pm_': (id) => `https://dashboard.stripe.com/test/payment_methods/${id}`,
    'setup_': (id) => `https://dashboard.stripe.com/test/setup_intents/${id}`,
    'si_': (id) => `https://dashboard.stripe.com/test/setup_intents/${id}`,
    'tok_': (id) => `https://dashboard.stripe.com/test/tokens/${id}`,
    'ep_': (id) => `https://dashboard.stripe.com/test/express/${id}`,
    // Add more as needed
  };

  // Helper: linkify Stripe object IDs in a log line
  function linkifyStripeIds(line: string): string {
    // Regex for Stripe object IDs (common prefixes)
    const regex = /\b([a-z]{2,6}_[A-Za-z0-9]+)\b/g;
    return line.replace(regex, (match) => {
      for (const prefix in STRIPE_DASHBOARD_URLS) {
        if (match.startsWith(prefix)) {
          const url = STRIPE_DASHBOARD_URLS[prefix](match);
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-cyan-300 underline hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400">${match}</a>`;
        }
      }
      return match;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4 medium-glow">
        Stripe Test Lab
      </h1>
      <form className="mb-6 flex flex-col items-center gap-2 w-full max-w-md">
        <label
          htmlFor="stripe-key"
          className="text-lg font-medium"
        >
          Stripe Secret Key
        </label>
        <input
          id="stripe-key"
          type="password"
          className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 medium-glow"
          placeholder="sk_test_..."
          value={stripeKey}
          onChange={(e) => setStripeKey(e.target.value)}
          autoComplete="off"
        />
        <label htmlFor="currency" className="text-lg font-medium mt-2">
          Currency
        </label>
        <select
          id="currency"
          className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 medium-glow"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </form>
      <div className="mb-4 w-full max-w-2xl flex flex-col gap-2">
        <input
          type="text"
          className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 medium-glow"
          placeholder="Search test cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="w-full max-w-2xl bg-slate-900/80 rounded-lg p-4 shadow-lg mb-6">
        {allTestCaseGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <h2 className="text-xl font-semibold mb-2">{group.label}</h2>
            {/* Group by subcategory (category) */}
            {Array.from(new Set(group.testCases.map(tc => tc.category))).map(subcat => (
              <div key={subcat} className="mb-2">
                <h3 className="text-lg font-medium mb-1 text-cyan-300">{subcat}</h3>
                <ul className="space-y-2">
                  {group.testCases.filter(tc => tc.category === subcat && filteredCases.some(f => f.id === tc.id)).map(tc => (
                    <li
                      key={tc.id}
                      className="flex items-center gap-3 bg-slate-800/60 rounded p-3 hover:ring-2 hover:ring-cyan-400 transition-shadow"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(tc.id)}
                        onChange={() => handleSelect(tc.id)}
                        disabled={running}
                        className="accent-cyan-400"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">{tc.name}</div>
                        <div className="text-sm text-slate-300">{tc.description}</div>
                        {tc.docsUrl && (
                          <a
                            href={tc.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-300 underline text-xs"
                          >
                            Related docs
                          </a>
                        )}
                      </div>
                      <button
                        className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold medium-glow"
                        onClick={() => runTest(tc.id)}
                        disabled={running}
                      >
                        Run
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
        <button
          className="w-full mt-4 py-2 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed medium-glow"
          onClick={runSelected}
          disabled={selected.length === 0 || running}
        >
          Run Selected
        </button>
      </div>
      <div className="w-full max-w-2xl bg-black/70 rounded-lg p-4 shadow-inner min-h-[120px] font-mono text-xs overflow-y-auto">
        <div className="mb-2 font-bold text-cyan-300">Execution Log</div>
        <ul>
          {log.map((line, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: linkifyStripeIds(line) }} />
          ))}
        </ul>
      </div>
    </div>
  );
}
