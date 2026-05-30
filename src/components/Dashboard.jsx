import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Database, Download, FileText, FolderUp, Trash2, TrendingUp } from 'lucide-react';
import {
  formatCurrency,
  isCashIncludedInProjection,
  projectCash,
  projectCpf,
  projectInvestment,
  projectPolicy,
  projectSrs,
} from '../utils/projections.js';

const COLORS = ['#15345f', '#c49a43', '#4d7ea8', '#78a083', '#d9a441'];
const SERIES_COLORS = {
  total: '#102a4c',
  cpf: '#4d7ea8',
  srs: '#2f855a',
  cash: '#7b8492',
  policy: ['#c49a43', '#d9a441', '#b7791f', '#f0b84a'],
  investment: ['#7b61a8', '#8f72c7', '#5f4b8b', '#a88bd8'],
};

export function Dashboard({
  profile,
  cpf,
  srs,
  policies,
  investments,
  cash,
  scenarioRate,
  timeline,
  selectedBreakdown,
  selectedAge,
  setSelectedAge,
  retirementPoint,
  needs,
  startLater,
  advisorInsight,
  setAdvisorInsight,
  exportPdf,
  exportClientData,
  importClientData,
  clearSavedData,
  isExporting,
  exportError,
  dataMessage,
  dataError,
}) {
  const [chartView, setChartView] = useState('total-components');
  const [highlightedSeries, setHighlightedSeries] = useState(null);
  const timelineEndAge = timeline[timeline.length - 1]?.age || profile.retirementAge;
  const { chartData, series } = useMemo(
    () => buildProjectionSeries({ profile, cpf, srs, policies, investments, cash, scenarioRate, timeline }),
    [profile, cpf, srs, policies, investments, cash, scenarioRate, timeline],
  );
  const visibleSeries = series.filter((item) => {
    if (chartView === 'total') return item.key === 'total';
    if (chartView === 'components') return item.key !== 'total';
    return true;
  });
  const breakdownData = [
    { name: 'CPF', value: selectedBreakdown.cpf },
    { name: 'SRS', value: selectedBreakdown.srs },
    { name: 'Policies', value: selectedBreakdown.policies },
    { name: 'Investments', value: selectedBreakdown.investments },
    { name: 'Cash', value: selectedBreakdown.cash },
  ].filter((item) => item.value > 0);
  const needData = [
    { name: 'Projected', value: retirementPoint.total },
    { name: 'Required', value: needs.requiredAmount },
  ];

  return (
    <main className="dashboard">
      <section className="hero-panel">
        <div>
          <p className="client-label">{profile.clientName || 'Client'}</p>
          <h1>Retirement projection at age {profile.retirementAge}</h1>
          <p className="hero-subtitle">A meeting-ready view of CPF, SRS, policies, investments and cash against the client’s retirement income target.</p>
        </div>
      </section>

      {exportError && <div className="export-error">{exportError}</div>}
      {dataError && <div className="export-error">{dataError}</div>}
      {dataMessage && <div className="data-message">{dataMessage}</div>}

      <section className="panel data-export-panel">
        <div>
          <h2>Data & Export</h2>
          <p>Export a client PDF report, or save and restore calculator inputs for future reviews.</p>
        </div>
        <div className="data-export-actions">
          <button className="export-button" type="button" onClick={exportPdf} disabled={isExporting}>
            <Download size={18} />
            {isExporting ? 'Generating PDF...' : 'Export PDF'}
          </button>
          <button className="ghost-button data-action-button" type="button" onClick={exportClientData}>
            <Database size={16} />
            Export Client Data
          </button>
          <button className="ghost-button data-action-button" type="button" onClick={importClientData}>
            <FolderUp size={16} />
            Import Client Data
          </button>
          <button className="ghost-button data-action-button subtle" type="button" onClick={clearSavedData}>
            <Trash2 size={16} />
            Clear Saved Data
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard label="Projected retirement amount" value={formatCurrency(retirementPoint.total)} tone="navy" />
        <MetricCard label="Required retirement amount" value={formatCurrency(needs.requiredAmount)} />
        <MetricCard
          label={needs.surplusShortfall >= 0 ? 'Projected surplus' : 'Projected shortfall'}
          value={formatCurrency(needs.surplusShortfall)}
          tone={needs.surplusShortfall >= 0 ? 'positive' : 'alert'}
        />
        <MetricCard label="Monthly investment to close gap" value={formatCurrency(needs.monthlyNeeded)} />
      </section>

      <section className="panel chart-panel">
        <div className="section-header">
          <div>
            <h2>Projected Assets by Age</h2>
            <span className="micro-copy">Click a legend item to highlight one projection line</span>
          </div>
          <div className="chart-mode-toggle" aria-label="Chart View">
            <span>Chart View</span>
            {[
              ['total', 'Total only'],
              ['components', 'Individual components'],
              ['total-components', 'Total + Individual'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={chartView === key ? 'active' : ''}
                onClick={() => setChartView(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="projection-chart-layout">
          <div className="chart-height large">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 18, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="#e6ebf2" vertical={false} />
                <XAxis dataKey="age" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => formatCurrency(value, true)} tickLine={false} axisLine={false} width={74} />
                <Tooltip content={<ProjectionTooltip series={series} />} />
                {visibleSeries.map((item) => {
                  const isHighlighted = !highlightedSeries || highlightedSeries === item.key;
                  return (
                    <Line
                      key={item.key}
                      type="monotone"
                      dataKey={item.key}
                      name={item.name}
                      stroke={highlightedSeries && !isHighlighted ? '#aeb9c8' : item.color}
                      strokeWidth={highlightedSeries === item.key ? 4 : item.key === 'total' ? 3 : 2}
                      strokeOpacity={isHighlighted ? 1 : 0.24}
                      dot={false}
                      activeDot={isHighlighted ? { r: 5, fill: item.color } : false}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="projection-legend">
            {series.map((item) => {
              const isVisible = visibleSeries.some((visible) => visible.key === item.key);
              const isHighlighted = highlightedSeries === item.key;
              return (
                <button
                  type="button"
                  key={item.key}
                  className={`${isHighlighted ? 'active' : ''} ${!isVisible ? 'muted' : ''}`}
                  onClick={() => setHighlightedSeries(isHighlighted ? null : item.key)}
                >
                  <span style={{ background: item.color }} />
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
        <input
          className="age-slider"
          type="range"
          min={profile.currentAge}
          max={timelineEndAge}
          value={selectedAge}
          onChange={(event) => setSelectedAge(Number(event.target.value))}
        />
      </section>

      <section className="dashboard-grid">
        <section className="panel">
          <div className="section-header">
            <h2>Asset Breakdown</h2>
            <span className="micro-copy">Age {selectedAge}</span>
          </div>
          <div className="chart-height">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={breakdownData} innerRadius={62} outerRadius={92} paddingAngle={3} dataKey="value">
                  {breakdownData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-list">
            {breakdownData.map((item, index) => (
              <div key={item.name}>
                <span style={{ background: COLORS[index % COLORS.length] }} />
                <p>{item.name}</p>
                <strong>{formatCurrency(item.value)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="section-header">
            <h2>Projected vs Required</h2>
          </div>
          <div className="chart-height">
            <ResponsiveContainer>
              <BarChart data={needData} margin={{ top: 12, right: 12, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="#e6ebf2" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => formatCurrency(value, true)} tickLine={false} axisLine={false} width={70} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell fill="#15345f" />
                  <Cell fill="#c49a43" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="need-summary">
            <div>
              <span>Future monthly income needed</span>
              <strong>{formatCurrency(needs.futureMonthlyIncome)}</strong>
            </div>
            <div>
              <span>Sustainable withdrawal rate</span>
              <strong>{profile.withdrawalRate}%</strong>
            </div>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Start Now vs Start Later</h2>
          <TrendingUp size={18} />
        </div>
        <div className="comparison-grid">
          {startLater.map((item) => (
            <div className="comparison-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{formatCurrency(item.value)}</strong>
              <p>{item.delay === 0 ? 'Baseline projection' : `${formatCurrency(item.difference)} vs starting now`}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel advisor-panel">
        <div className="section-header">
          <h2>Advisor Insight</h2>
          <FileText size={18} />
        </div>
        <textarea
          value={advisorInsight}
          onChange={(event) => setAdvisorInsight(event.target.value)}
          placeholder="Type your custom client notes here..."
        />
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <div className={`metric-card ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProjectionTooltip({ active, label, payload, series }) {
  if (!active || !payload?.length) return null;
  const values = new Map(payload.map((item) => [item.dataKey, item.value]));
  return (
    <div className="projection-tooltip">
      <strong>Age {label}</strong>
      {series.map((item) => (
        values.has(item.key) && (
          <div key={item.key}>
            <span><i style={{ background: item.color }} /> {item.name}</span>
            <b>{formatCurrency(values.get(item.key))}</b>
          </div>
        )
      ))}
    </div>
  );
}

function buildProjectionSeries({ profile, cpf, srs, policies, investments, cash, scenarioRate, timeline }) {
  const series = [{ key: 'total', name: 'Total', color: SERIES_COLORS.total }];
  if (cpf.enabled) series.push({ key: 'cpf', name: 'CPF', color: SERIES_COLORS.cpf });
  if (srs.enabled) series.push({ key: 'srs', name: 'SRS', color: SERIES_COLORS.srs });
  policies.forEach((policy, index) => {
    series.push({
      key: `policy_${policy.id}`,
      name: policy.name || `Policy ${index + 1}`,
      color: SERIES_COLORS.policy[index % SERIES_COLORS.policy.length],
    });
  });
  investments.forEach((investment, index) => {
    if (!investment.includeInTotal) return;
    series.push({
      key: `investment_${investment.id}`,
      name: investment.name || `Investment ${index + 1}`,
      color: SERIES_COLORS.investment[index % SERIES_COLORS.investment.length],
    });
  });
  if (isCashIncludedInProjection(cash)) series.push({ key: 'cash', name: 'Cash / Savings', color: SERIES_COLORS.cash });

  const chartData = timeline.map((point) => {
    const age = Number(point.age);
    const years = Math.max(0, age - Number(profile.currentAge));
    const row = { age, total: point.total };
    if (cpf.enabled) row.cpf = projectCpf(cpf, years);
    if (srs.enabled) row.srs = projectSrs(srs, Number(profile.currentAge), age);
    policies.forEach((policy) => {
      row[`policy_${policy.id}`] = projectPolicy(policy, Number(profile.currentAge), age, scenarioRate);
    });
    investments.forEach((investment) => {
      if (!investment.includeInTotal) return;
      row[`investment_${investment.id}`] = projectInvestment(investment, years, scenarioRate);
    });
    if (isCashIncludedInProjection(cash)) row.cash = projectCash(cash, years);
    return row;
  });

  return { chartData, series };
}
