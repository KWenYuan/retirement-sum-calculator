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
import { Download, FileText, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/projections.js';

const COLORS = ['#15345f', '#c49a43', '#4d7ea8', '#78a083', '#d9a441'];

export function ScenarioTabs({ scenario, setScenario, scenarios }) {
  return (
    <div className="scenario-tabs" aria-label="Projection scenario">
      {Object.entries(scenarios).map(([key, item]) => (
        <button
          key={key}
          type="button"
          className={scenario === key ? 'active' : ''}
          onClick={() => setScenario(key)}
        >
          {item.label}
          <small>{item.returnRate}%</small>
        </button>
      ))}
    </div>
  );
}

export function Dashboard({
  profile,
  timeline,
  selectedBreakdown,
  selectedAge,
  setSelectedAge,
  retirementPoint,
  needs,
  startLater,
  ageDetails,
  advisorInsight,
  setAdvisorInsight,
  exportPdf,
  isExporting,
  exportError,
}) {
  const timelineEndAge = timeline[timeline.length - 1]?.age || profile.retirementAge;
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
        <button className="export-button" type="button" onClick={exportPdf} disabled={isExporting}>
          <Download size={18} />
          {isExporting ? 'Generating PDF...' : 'Export PDF'}
        </button>
      </section>

      {exportError && <div className="export-error">{exportError}</div>}

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
          <h2>Projected Assets by Age</h2>
          <span className="micro-copy">Click or drag the timeline below to inspect an age</span>
        </div>
        <div className="chart-height large">
          <ResponsiveContainer>
            <LineChart data={timeline} margin={{ top: 10, right: 18, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="#e6ebf2" vertical={false} />
              <XAxis dataKey="age" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => formatCurrency(value, true)} tickLine={false} axisLine={false} width={74} />
              <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={(label) => `Age ${label}`} />
              <Line type="monotone" dataKey="total" stroke="#15345f" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#c49a43' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <input
          className="age-slider"
          type="range"
          min={profile.currentAge}
          max={timelineEndAge}
          value={selectedAge}
          onChange={(event) => setSelectedAge(Number(event.target.value))}
        />
        <div className="timeline-readout">
          <strong>Age {selectedAge}</strong>
          <span>Total projected assets: {formatCurrency(selectedBreakdown.total)}</span>
        </div>
        <div className="selected-events-strip">
          <strong>At this age</strong>
          {[...ageDetails.milestones, ...ageDetails.incomeStreams].length === 0 ? (
            <span>No milestone or active income stream.</span>
          ) : (
            <div>
              {ageDetails.milestones.map((item) => (
                <span key={`${item.category}-${item.title}`}>{item.title}</span>
              ))}
              {ageDetails.incomeStreams.map((item) => (
                <span key={`${item.title}-${item.startAge}`}>{item.title}</span>
              ))}
            </div>
          )}
        </div>
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
