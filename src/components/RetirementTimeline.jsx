import { CalendarClock, CircleDollarSign } from 'lucide-react';
import { formatCurrency } from '../utils/projections.js';

const timelineNote = 'CPF projections, FRS amounts, CPF LIFE payouts, policy values, withdrawals and investment returns are simplified estimates for illustration only. Actual values depend on CPF rules, policy terms, market returns, fees, withdrawals, taxation and prevailing regulations.';

export function RetirementTimeline({
  timeline,
  selectedAge,
  setSelectedAge,
  selectedBreakdown,
  ageDetails,
}) {
  const span = Math.max(1, timeline.endAge - timeline.startAge);
  const ageToPercent = (age) => `${Math.min(100, Math.max(0, ((age - timeline.startAge) / span) * 100))}%`;

  return (
    <section className="panel retirement-timeline-panel">
      <div className="section-header">
        <div>
          <h2>Retirement Timeline</h2>
          <p className="section-subtext">See when assets mature, become available, or begin paying income.</p>
        </div>
        <div className="timeline-selected-age">
          <span>Selected age</span>
          <strong>{selectedAge}</strong>
        </div>
      </div>

      <div className="age-axis" aria-label="Retirement age axis">
        {timeline.ticks.map((age) => (
          <button
            type="button"
            key={age}
            className={Math.round(selectedAge) === age ? 'active' : ''}
            style={{ left: ageToPercent(age) }}
            onClick={() => setSelectedAge(age)}
          >
            <span />
            {age}
          </button>
        ))}
        <button
          type="button"
          className="selected-age-marker"
          style={{ left: ageToPercent(selectedAge) }}
          onClick={() => setSelectedAge(selectedAge)}
          aria-label={`Selected age ${selectedAge}`}
        />
      </div>

      <div className="retirement-timeline-scroll">
        {timeline.rows.map((row) => (
          <TimelineRow key={row.id} row={row} setSelectedAge={setSelectedAge} />
        ))}
      </div>

      <div className="age-detail-grid">
        <div className="age-detail-card">
          <div className="detail-title">
            <CircleDollarSign size={17} />
            <strong>Projected Assets at Age {selectedAge}</strong>
          </div>
          <div className="mini-breakdown">
            <BreakdownLine label="CPF" value={selectedBreakdown.cpf} />
            <BreakdownLine label="SRS" value={selectedBreakdown.srs} />
            <BreakdownLine label="Policies" value={selectedBreakdown.policies} />
            <BreakdownLine label="Investments" value={selectedBreakdown.investments} />
            <BreakdownLine label="Cash" value={selectedBreakdown.cash} />
            <BreakdownLine label="Total" value={selectedBreakdown.total} strong />
          </div>
        </div>

        <div className="age-detail-card">
          <div className="detail-title">
            <CalendarClock size={17} />
            <strong>Events and Income Streams</strong>
          </div>
          <div className="event-list">
            {ageDetails.milestones.length === 0 && ageDetails.incomeStreams.length === 0 && (
              <p className="empty-events">No milestone or active income stream at this age.</p>
            )}
            {ageDetails.milestones.map((item) => (
              <div className="event-item" key={`${item.category}-${item.title}-${item.age}`}>
                <span>{item.category}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            ))}
            {ageDetails.incomeStreams.map((item) => (
              <div className="event-item income-event" key={`${item.title}-${item.startAge}-${item.endAge}`}>
                <span>Active income</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="timeline-note">{timelineNote}</p>
    </section>
  );
}

function TimelineRow({ row, setSelectedAge }) {
  const hasBar = row.startAge !== row.endAge;
  return (
    <div className={`timeline-row ${row.type}`}>
      <div className="timeline-row-label">
        <strong>{row.title}</strong>
        {row.subtitle && <span>{row.subtitle}</span>}
      </div>
      <div className="timeline-track">
        {hasBar ? (
          <button
            type="button"
            className="timeline-bar"
            style={{ left: row.left, width: row.width }}
            onClick={() => setSelectedAge(row.endAge)}
            title={`${row.title}, age ${row.startAge}-${row.endAge}`}
          >
            {row.type === 'policy' && (
              <span className="premium-segment" style={{ width: row.premiumWidth }} />
            )}
          </button>
        ) : null}
        <button
          type="button"
          className="timeline-dot"
          style={{ left: row.left }}
          onClick={() => setSelectedAge(row.endAge)}
          title={row.milestoneLabel || row.title}
        />
        {row.milestoneLabel && (
          <button
            type="button"
            className="timeline-milestone-label"
            style={{ left: row.left }}
            onClick={() => setSelectedAge(row.endAge)}
          >
            {row.milestoneLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function BreakdownLine({ label, value, strong }) {
  return (
    <div className={strong ? 'strong' : ''}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}
