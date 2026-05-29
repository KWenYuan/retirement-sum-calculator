import {
  formatCurrency,
  projectCash,
  projectCpfOaSa,
  projectInvestment,
  projectPolicy,
  projectSrs,
} from '../utils/projections.js';

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function ExportReport({
  profile,
  cpf,
  srs,
  policies,
  investments,
  cash,
  scenario,
  scenarioRate,
  retirementPoint,
  needs,
  retirementTimeline,
  advisorInsight,
  disclaimer,
  exportDate,
}) {
  const assetBreakdown = [
    ['CPF', retirementPoint.cpf],
    ['SRS', retirementPoint.srs],
    ['Investment policies', retirementPoint.policies],
    ['Personal investments', retirementPoint.investments],
    ['Cash / savings', retirementPoint.cash],
    ['Total projected retirement amount', retirementPoint.total],
  ];
  const timelineRows = buildMilestoneRows({
    profile,
    cpf,
    srs,
    policies,
    investments,
    cash,
    scenarioRate,
    retirementTimeline,
  });
  const cpf55 = buildCpf55Summary(profile, cpf);
  const srsSummary = buildSrsSummary(profile, srs);
  const personalInvestmentRows = investments.map((investment) => {
    const withdrawalAge = asNumber(investment.plannedWithdrawalAge) || asNumber(profile.retirementAge);
    const value = projectInvestment(
      investment,
      Math.max(0, withdrawalAge - asNumber(profile.currentAge)),
      scenarioRate,
    );
    return [
      investment.name || 'Investment',
      investment.riskLevel,
      withdrawalAge,
      formatCurrency(value),
    ];
  });
  const cashWithdrawalAge = asNumber(cash.plannedWithdrawalAge) || asNumber(profile.retirementAge);
  const cashProjectedValue = projectCash(cash, Math.max(0, cashWithdrawalAge - asNumber(profile.currentAge)));

  return (
    <article className="export-report">
      <header className="export-cover avoid-break">
        <p>Retirement Projection Summary</p>
        <h1>{profile.clientName || 'Client'}</h1>
        <div className="export-meta">
          <span>Date of export: {exportDate}</span>
          <span>Scenario: {scenario} ({scenarioRate}% return assumption)</span>
        </div>
      </header>

      <section className="export-section avoid-break">
        <h2>Key Assumptions</h2>
        <div className="export-summary-grid">
          <SummaryBox label="Current age" value={profile.currentAge} />
          <SummaryBox label="Retirement age" value={profile.retirementAge} />
          <SummaryBox label="Desired monthly income" value={formatCurrency(profile.desiredMonthlyIncome)} />
          <SummaryBox label="Inflation rate" value={`${profile.inflationRate}%`} />
          <SummaryBox label="Retirement duration" value={`${profile.retirementDuration} years`} />
          <SummaryBox label="Withdrawal rate" value={`${profile.withdrawalRate}%`} />
        </div>
      </section>

      <section className="export-section avoid-break">
        <h2>Retirement Outcome</h2>
        <div className="export-kpi-grid">
          <SummaryBox label="Projected retirement amount" value={formatCurrency(retirementPoint.total)} />
          <SummaryBox label="Required retirement amount" value={formatCurrency(needs.requiredAmount)} />
          <SummaryBox label="Surplus / shortfall" value={formatCurrency(needs.surplusShortfall)} />
          <SummaryBox label="Monthly investment to close gap" value={formatCurrency(needs.monthlyNeeded)} />
        </div>
      </section>

      <section className="export-section avoid-break">
        <h2>Asset Breakdown at Retirement</h2>
        <SimpleTable
          headers={['Asset type', 'Projected value']}
          rows={assetBreakdown.map(([label, value]) => [label, formatCurrency(value)])}
        />
      </section>

      <section className="export-section avoid-break">
        <h2>CPF 55 Milestone</h2>
        <SimpleTable
          headers={['Item', 'Estimate']}
          rows={[
            ['Projected OA + SA at age 55', formatCurrency(cpf55.oaSa)],
            ['FRS amount set aside', formatCurrency(cpf55.frs)],
            [cpf55.excess >= 0 ? 'Estimated excess withdrawable' : 'Estimated FRS shortfall', formatCurrency(Math.abs(cpf55.excess))],
          ]}
        />
      </section>

      <section className="export-section avoid-break">
        <h2>CPF LIFE Income</h2>
        <SimpleTable
          headers={['Start age', 'Estimated monthly payout']}
          rows={[[cpf.cpfLifePayoutStartAge, formatCurrency(cpf.cpfLifeMonthlyPayout)]]}
        />
      </section>

      {srs.enabled && (
        <section className="export-section avoid-break">
          <h2>SRS Withdrawal Summary</h2>
          <SimpleTable
            headers={['Start age', 'Duration', 'Projected value', 'Estimated withdrawal']}
            rows={[[
              srsSummary.startAge,
              `${srsSummary.duration} years`,
              formatCurrency(srsSummary.projectedValue),
              `${formatCurrency(srsSummary.annualWithdrawal)}/year or ${formatCurrency(srsSummary.monthlyWithdrawal)}/month`,
            ]]}
          />
        </section>
      )}

      <section className="export-section page-break">
        <h2>Retirement Timeline Summary</h2>
        <SimpleTable headers={['Age', 'Event', 'Estimated amount / income']} rows={timelineRows} />
      </section>

      <section className="export-section avoid-break">
        <h2>Policy Maturity / Withdrawal Milestones</h2>
        <SimpleTable
          headers={['Policy', 'Start age', 'Premium end age', 'Available age', 'Projected value']}
          rows={policies.map((policy) => {
            const startAge = asNumber(policy.startAge);
            const premiumEndAge = startAge + asNumber(policy.premiumTermYears);
            const withdrawalAge = asNumber(policy.withdrawalAge) || premiumEndAge;
            const projectedValue = projectPolicy(policy, asNumber(profile.currentAge), withdrawalAge, scenarioRate);
            return [
              policy.name || 'Policy',
              startAge,
              premiumEndAge,
              withdrawalAge,
              formatCurrency(projectedValue),
            ];
          })}
        />
      </section>

      <section className="export-section avoid-break">
        <h2>Personal Investment Summary</h2>
        <SimpleTable
          headers={['Investment', 'Risk level', 'Available age', 'Projected value']}
          rows={personalInvestmentRows}
          emptyMessage="No personal investments entered."
        />
      </section>

      <section className="export-section avoid-break">
        <h2>Cash / Savings Summary</h2>
        <SimpleTable
          headers={['Item', 'Estimate']}
          rows={[
            ['Available age', cashWithdrawalAge],
            ['Projected accessible cash / savings', formatCurrency(cashProjectedValue)],
            ['Emergency fund included', cash.includeEmergencyFund ? 'Yes' : 'No'],
          ]}
        />
      </section>

      <section className="export-section avoid-break">
        <h2>Advisor Insight</h2>
        <p className="export-note">{advisorInsight || 'No advisor insight entered.'}</p>
      </section>

      <section className="export-section avoid-break">
        <h2>Disclaimer</h2>
        <p className="export-disclaimer">{disclaimer}</p>
      </section>
    </article>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="export-summary-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SimpleTable({ headers, rows, emptyMessage = 'No records entered.' }) {
  return (
    <table className="export-table">
      <thead>
        <tr>
          {headers.map((header) => <th key={header}>{header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length}>{emptyMessage}</td>
          </tr>
        ) : rows.map((row, index) => (
          <tr key={`${row.join('-')}-${index}`}>
            {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildCpf55Summary(profile, cpf) {
  const oaSa = projectCpfOaSa(cpf, profile.currentAge, 55);
  const frs = asNumber(cpf.frsAmountAt55);
  return {
    oaSa,
    frs,
    excess: oaSa - frs,
  };
}

function buildSrsSummary(profile, srs) {
  const startAge = asNumber(srs.withdrawalStartAge) || asNumber(srs.withdrawalAge);
  const duration = Math.max(1, asNumber(srs.withdrawalDurationYears) || 1);
  const projectedValue = projectSrs(srs, asNumber(profile.currentAge), startAge);
  const annualWithdrawal = projectedValue / duration;
  return {
    startAge,
    duration,
    projectedValue,
    annualWithdrawal,
    monthlyWithdrawal: annualWithdrawal / 12,
  };
}

function buildMilestoneRows({ profile, cpf, srs, policies, investments, cash, scenarioRate, retirementTimeline }) {
  const rows = [];
  retirementTimeline.milestones.forEach((milestone) => {
    rows.push([milestone.age, milestone.title, milestone.description]);
  });
  retirementTimeline.incomeStreams.forEach((stream) => {
    rows.push([stream.startAge, `${stream.title} starts`, stream.description]);
  });

  if (cpf.enabled && !rows.some((row) => row[1] === 'CPF LIFE starts')) {
    rows.push([
      asNumber(cpf.cpfLifePayoutStartAge) || 65,
      'CPF LIFE starts',
      `${formatCurrency(cpf.cpfLifeMonthlyPayout)}/month`,
    ]);
  }

  const uniqueRows = new Map();
  rows.forEach((row) => uniqueRows.set(row.join('|'), row));
  return [...uniqueRows.values()].sort((a, b) => asNumber(a[0]) - asNumber(b[0]));
}
