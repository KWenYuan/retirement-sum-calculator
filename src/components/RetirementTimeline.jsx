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
  const visibleAgeGroups = Object.entries(timeline.lumpSumsByAge || {}).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <section className="panel retirement-timeline-panel simple-retirement-timeline">
      <div className="section-header">
        <div>
          <h2>Retirement Timeline</h2>
          <p className="section-subtext">One line showing lump sums, income starts, and important retirement ages.</p>
        </div>
        <div className="timeline-selected-age">
          <span>Selected age</span>
          <strong>{selectedAge}</strong>
        </div>
      </div>

      <div className="single-timeline" aria-label="Retirement timeline">
        <div className="timeline-tooltip-layer">
          {visibleAgeGroups.map(([age, events]) => {
            const position = ((Number(age) - timeline.startAge) / span) * 100;
            const edgeClass = position < 8 ? 'edge-left' : position > 92 ? 'edge-right' : '';
            const tooltipStyle = edgeClass === 'edge-left'
              ? { left: 0 }
              : edgeClass === 'edge-right'
                ? { right: 0 }
                : { left: ageToPercent(Number(age)) };
            return (
              <button
                type="button"
                key={`tooltip-${age}`}
                className={`lump-tooltip ${edgeClass}`}
                style={tooltipStyle}
                onClick={() => setSelectedAge(Number(age))}
              >
                <span className="lump-card">
                  <b>Age {age}</b>
                  {events.slice(0, 3).map((event) => (
                    <small key={event.id}>{event.title}: {formatCurrency(event.amount)}</small>
                  ))}
                  {events.length > 3 && <small>+{events.length - 3} more</small>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="single-timeline-axis">
          {timeline.ticks.map((age) => (
            <button
              type="button"
              key={age}
              className={`single-age-marker ${Math.round(selectedAge) === age ? 'active' : ''}`}
              style={{ left: ageToPercent(age) }}
              onClick={() => setSelectedAge(age)}
            >
              <span />
              <b>{age}</b>
            </button>
          ))}

          {timeline.incomeStreams.map((stream, index) => (
            <button
              type="button"
              key={stream.id}
              className={`income-bracket level-${index % 3}`}
              style={{ left: stream.left, width: stream.width }}
              onClick={() => setSelectedAge(stream.startAge)}
              title={`${stream.title}: ${stream.description}`}
            >
              <span>{stream.title}</span>
              <small>{stream.startAge}-{stream.endAge} | {stream.duration} | {stream.exportAmount}</small>
            </button>
          ))}

          {visibleAgeGroups.map(([age, events], index) => {
            const position = ((Number(age) - timeline.startAge) / span) * 100;
            const edgeClass = position < 8 ? 'edge-left' : position > 92 ? 'edge-right' : '';
            return (
            <button
              type="button"
              key={age}
              className={`lump-group stack-${index % 2} ${edgeClass}`}
              style={{ left: ageToPercent(Number(age)) }}
              onClick={() => setSelectedAge(Number(age))}
              aria-label={`Milestones at age ${age}: ${events.map((event) => event.title).join(', ')}`}
            >
              <span className="lump-dot" />
            </button>
            );
          })}

          <button
            type="button"
            className="single-selected-marker"
            style={{ left: ageToPercent(selectedAge) }}
            onClick={() => setSelectedAge(selectedAge)}
            aria-label={`Selected age ${selectedAge}`}
          />
        </div>
      </div>

      <div className="age-detail-grid compact-age-details">
        <div className="age-detail-card">
          <div className="detail-title">
            <CircleDollarSign size={17} />
            <strong>Total Projected Assets at Age {selectedAge}</strong>
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
            <strong>Events at Age {selectedAge}</strong>
          </div>
          <div className="event-list">
            {ageDetails.milestones.length === 0 && ageDetails.incomeStreams.length === 0 && (
              <p className="empty-events">No milestone or active income stream at this age.</p>
            )}
            {ageDetails.milestones.map((item) => (
              <div className="event-item" key={item.id}>
                <span>{item.category} | Lump sum</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            ))}
            {ageDetails.incomeStreams.map((item) => (
              <div className="event-item income-event" key={item.id}>
                <span>Active income | Age {item.startAge}-{item.endAge}</span>
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

function BreakdownLine({ label, value, strong }) {
  return (
    <div className={strong ? 'strong' : ''}>
      <span>{label}</span>
      <strong>{formatCurrency(value)}</strong>
    </div>
  );
}
