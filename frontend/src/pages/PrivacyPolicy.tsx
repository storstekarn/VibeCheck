interface PrivacyPolicyProps {
  onBack: () => void;
}

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  const sections: Section[] = [
    {
      id: 'controller',
      title: '1. Data Controller',
      content: (
        <p>
          VibeCheck is operated by <strong className="text-ink">Synergy Minds</strong>, a company based in Sweden.
          For any questions about how we handle your data, contact us at{' '}
          <a
            href="mailto:patrik.strandberg@synergyminds.se"
            className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2"
          >
            patrik.strandberg@synergyminds.se
          </a>
          .
        </p>
      ),
    },
    {
      id: 'collect',
      title: '2. What We Collect',
      content: (
        <>
          <p className="mb-3">
            When you run a scan, we log the following for analytics and service improvement:
          </p>
          <ul className="space-y-2">
            {[
              'The domain of the scanned URL (e.g. example.com — not the full path)',
              'The number and types of bugs found',
              'The number of pages scanned',
              'The scan timestamp',
              'Whether AI-generated or template fix prompts were used',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-brand text-xs flex-shrink-0" aria-hidden="true">◆</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      id: 'not-collect',
      title: "3. What We Don't Collect",
      content: (
        <>
          <p className="mb-3">We do <strong className="text-ink">not</strong> collect or store:</p>
          <ul className="space-y-2">
            {[
              'Any personal data from the website being scanned',
              'Any content or text from the scanned pages',
              'Information about the scanned site\'s users or visitors',
              'User accounts, names, or email addresses',
              'Cookies — VibeCheck sets no cookies of its own',
              'Browser fingerprints or device identifiers',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-brand text-xs flex-shrink-0" aria-hidden="true">◆</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      id: 'legal-basis',
      title: '4. Legal Basis for Processing',
      content: (
        <p>
          We process analytics data on the basis of <strong className="text-ink">legitimate interest</strong> (Article 6(1)(f) GDPR) — specifically,
          to understand how VibeCheck is used and to improve the service. The data is aggregated and
          not linked to any individual user.
        </p>
      ),
    },
    {
      id: 'retention',
      title: '5. Data Retention',
      content: (
        <p>
          Analytics logs are retained for a maximum of <strong className="text-ink">30 days</strong>, after which
          they are automatically deleted. We do not archive or sell this data.
        </p>
      ),
    },
    {
      id: 'third-parties',
      title: '6. Third-Party Services',
      content: (
        <>
          <p className="mb-4">
            VibeCheck is hosted on <strong className="text-ink">Railway</strong> (railway.app), a US-based
            infrastructure provider. As part of normal HTTP server operation, Railway may log request
            metadata such as IP addresses, request paths, and timestamps for infrastructure and
            security purposes. These logs are governed by Railway's own privacy policy and are separate
            from VibeCheck's analytics. Railway participates in the EU–US Data Privacy Framework,
            providing an appropriate legal basis for any transatlantic data transfer.
          </p>
          <p>
            No other third-party analytics, advertising, or tracking services are used by VibeCheck.
          </p>
        </>
      ),
    },
    {
      id: 'rights',
      title: '7. Your Rights Under GDPR',
      content: (
        <>
          <p className="mb-3">
            As a data subject under the GDPR, you have the following rights:
          </p>
          <ul className="space-y-2">
            {[
              { right: 'Right of access', desc: 'Request a copy of any data we hold about you' },
              { right: 'Right to erasure', desc: 'Request deletion of your data ("right to be forgotten")' },
              { right: 'Right to object', desc: 'Object to processing based on legitimate interest' },
              { right: 'Right to restriction', desc: 'Request that we limit how we use your data' },
              { right: 'Right to portability', desc: 'Receive your data in a machine-readable format' },
            ].map(({ right, desc }) => (
              <li key={right} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-brand text-xs flex-shrink-0" aria-hidden="true">◆</span>
                <span>
                  <strong className="text-ink">{right}</strong> — {desc}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            To exercise any of these rights, contact us at{' '}
            <a
              href="mailto:patrik.strandberg@synergyminds.se"
              className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2"
            >
              patrik.strandberg@synergyminds.se
            </a>
            . We will respond within 30 days.
          </p>
        </>
      ),
    },
    {
      id: 'supervisory',
      title: '8. Right to Lodge a Complaint',
      content: (
        <p>
          If you believe we are processing your data unlawfully, you have the right to lodge a complaint
          with the Swedish supervisory authority:{' '}
          <strong className="text-ink">Integritetsskyddsmyndigheten (IMY)</strong>.{' '}
          You can reach them at{' '}
          <a
            href="https://www.imy.se"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2"
          >
            www.imy.se
          </a>
          .
        </p>
      ),
    },
    {
      id: 'contact',
      title: '9. Contact',
      content: (
        <div className="space-y-1">
          <p><strong className="text-ink">Synergy Minds</strong></p>
          <p>Sweden</p>
          <p>
            <a
              href="mailto:patrik.strandberg@synergyminds.se"
              className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2"
            >
              patrik.strandberg@synergyminds.se
            </a>
          </p>
          <p>
            <a
              href="https://synergyminds.se"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2"
            >
              synergyminds.se
            </a>
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen app-bg font-body text-ink flex flex-col">
      {/* Top bar */}
      <header className="border-b border-line px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-ink-dim hover:text-ink transition-colors"
          aria-label="Back to VibeCheck"
        >
          <span aria-hidden="true">←</span>
          Back
        </button>
        <div className="w-px h-4 bg-line" aria-hidden="true" />
        <span className="text-sm font-display font-bold text-ink">
          Vibe<span className="text-brand">Check</span>
        </span>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <div className="mb-10 animate-fade-up">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/20 bg-brand/5 text-brand text-xs font-code mb-4 tracking-wider"
            aria-hidden="true"
          >
            ◆ LEGAL
          </div>
          <h1 className="text-3xl font-display font-extrabold text-ink mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-ink-faint font-code">
            Last updated: February 2026 &nbsp;·&nbsp; Applies to vibecheck.app
          </p>
        </div>

        <div className="mb-8 p-4 rounded-xl bg-raised border border-line text-sm text-ink-dim leading-relaxed animate-fade-up">
          VibeCheck is a free QA scanning tool. We believe in radical transparency about data.
          This policy explains exactly what we collect, why, and how long we keep it — in plain language.
        </div>

        <div className="space-y-10">
          {sections.map(({ id, title, content }, i) => (
            <section
              key={id}
              id={id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <h2 className="text-base font-display font-bold text-ink mb-3 pb-2 border-b border-line">
                {title}
              </h2>
              <div className="text-sm text-ink-dim leading-relaxed space-y-2">
                {content}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-xs text-ink-faint tracking-widest uppercase font-code border-t border-line">
        © {new Date().getFullYear()}{' '}
        <a
          href="https://synergyminds.se"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-dim hover:text-ink transition-colors"
        >
          Synergy Minds
        </a>
        {' '}· All rights reserved
      </footer>
    </div>
  );
}
