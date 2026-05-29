import { useMemo, useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { BriefcaseBusiness, Calculator, ShieldCheck } from 'lucide-react';
import { Dashboard, ScenarioTabs } from './components/Dashboard.jsx';
import { ExportReport } from './components/ExportReport.jsx';
import { RetirementTimeline } from './components/RetirementTimeline.jsx';
import {
  CashSection,
  CpfSection,
  InvestmentsSection,
  PoliciesSection,
  ProfileSection,
  SrsSection,
} from './components/InputSections.jsx';
import {
  SCENARIOS,
  defaultCash,
  defaultCpf,
  defaultProfile,
  defaultSrs,
  starterInvestments,
  starterPolicies,
} from './data/defaults.js';
import {
  buildRetirementTimeline,
  buildTimeline,
  calculateAtAge,
  calculateNeeds,
  formatCurrency,
  getAgeTimelineDetails,
  getRetirementTimelineEndAge,
  startLaterComparison,
} from './utils/projections.js';

const disclaimer = 'This calculator is for illustration and discussion purposes only. Figures are based on assumptions entered and are not guaranteed. Actual returns, CPF rules, SRS treatment, policy values, fees, withdrawals, taxation and market conditions may differ. Please refer to official policy documents and CPF/SRS guidelines where applicable.';

export default function App() {
  const [profile, setProfile] = useState(defaultProfile);
  const [cpf, setCpf] = useState(defaultCpf);
  const [srs, setSrs] = useState(defaultSrs);
  const [policies, setPolicies] = useState(starterPolicies);
  const [investments, setInvestments] = useState(starterInvestments);
  const [cash, setCash] = useState(defaultCash);
  const [scenario, setScenario] = useState('balanced');
  const [selectedAge, setSelectedAge] = useState(defaultProfile.retirementAge);
  const [advisorInsight, setAdvisorInsight] = useState('Client has strong income but most wealth is held in cash. Main opportunity is to improve long-term compounding and reduce inflation drag.');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const exportReportRef = useRef(null);

  const scenarioRate = SCENARIOS[scenario].returnRate;
  const retirementTimelineEndAge = getRetirementTimelineEndAge(profile);
  const projectionState = { profile, cpf, srs, policies, investments, cash, scenarioRate, timelineEndAge: retirementTimelineEndAge };
  const timeline = useMemo(() => buildTimeline(projectionState), [profile, cpf, srs, policies, investments, cash, scenarioRate]);
  const retirementTimeline = useMemo(() => buildRetirementTimeline(projectionState), [profile, cpf, srs, policies, investments, cash, scenarioRate]);
  const clampedSelectedAge = Math.min(Math.max(selectedAge, profile.currentAge), retirementTimelineEndAge);
  const selectedBreakdown = useMemo(
    () => calculateAtAge({ ...projectionState, age: clampedSelectedAge }),
    [profile, cpf, srs, policies, investments, cash, scenarioRate, clampedSelectedAge],
  );
  const retirementPoint = useMemo(
    () => calculateAtAge({ ...projectionState, age: profile.retirementAge }),
    [profile, cpf, srs, policies, investments, cash, scenarioRate],
  );
  const needs = useMemo(() => calculateNeeds(profile, retirementPoint.total), [profile, retirementPoint.total]);
  const startLater = useMemo(() => startLaterComparison(projectionState), [profile, cpf, srs, policies, investments, cash, scenarioRate]);
  const ageDetails = useMemo(
    () => getAgeTimelineDetails(retirementTimeline, clampedSelectedAge),
    [retirementTimeline, clampedSelectedAge],
  );

  const exportDate = new Date().toLocaleDateString('en-CA');

  const exportPdf = async () => {
    if (!exportReportRef.current || isExporting) return;
    setIsExporting(true);
    setExportError('');
    const options = {
      margin: 10,
      filename: buildReportFilename(profile.clientName, exportDate),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid-break'], before: ['.page-break'] },
    };

    try {
      await html2pdf().set(options).from(exportReportRef.current).save();
    } catch (error) {
      console.error('PDF export failed:', error);
      setExportError('PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Calculator size={24} /></div>
          <div>
            <strong>Retirement Projection Studio</strong>
            <span>Private advisor calculator</span>
          </div>
        </div>

        <div className="sidebar-card">
          <div>
            <BriefcaseBusiness size={18} />
            <span>Scenario</span>
          </div>
          <ScenarioTabs scenario={scenario} setScenario={setScenario} scenarios={SCENARIOS} />
        </div>

        <ProfileSection profile={profile} setProfile={setProfile} />
        <CpfSection cpf={cpf} setCpf={setCpf} />
        <SrsSection srs={srs} setSrs={setSrs} />
        <CashSection cash={cash} setCash={setCash} />
        <PoliciesSection policies={policies} setPolicies={setPolicies} />
        <InvestmentsSection investments={investments} setInvestments={setInvestments} />
      </aside>

      <div className="report-surface">
        <Dashboard
          profile={profile}
          timeline={timeline}
          selectedBreakdown={selectedBreakdown}
          selectedAge={clampedSelectedAge}
          setSelectedAge={setSelectedAge}
          retirementPoint={retirementPoint}
          needs={needs}
          startLater={startLater}
          ageDetails={ageDetails}
          advisorInsight={advisorInsight}
          setAdvisorInsight={setAdvisorInsight}
          exportPdf={exportPdf}
          isExporting={isExporting}
          exportError={exportError}
        />

        <div className="dashboard timeline-placement">
          <RetirementTimeline
            timeline={retirementTimeline}
            selectedAge={clampedSelectedAge}
            setSelectedAge={setSelectedAge}
            selectedBreakdown={selectedBreakdown}
            ageDetails={ageDetails}
          />
        </div>

        <section className="pdf-summary">
          <h2>Client Summary</h2>
          <div className="summary-grid">
            <SummaryItem label="Client name" value={profile.clientName} />
            <SummaryItem label="Date" value={new Date().toLocaleDateString('en-SG')} />
            <SummaryItem label="Current age" value={profile.currentAge} />
            <SummaryItem label="Retirement age" value={profile.retirementAge} />
            <SummaryItem label="Projected retirement amount" value={formatCurrency(retirementPoint.total)} />
            <SummaryItem label="Required retirement amount" value={formatCurrency(needs.requiredAmount)} />
            <SummaryItem label="Surplus / shortfall" value={formatCurrency(needs.surplusShortfall)} />
            <SummaryItem label="Advisor insight" value={advisorInsight} />
          </div>
        </section>

        <footer className="disclaimer">
          <ShieldCheck size={18} />
          <p>{disclaimer}</p>
        </footer>
      </div>

      <div className="export-report-host" aria-hidden="true">
        <div ref={exportReportRef}>
          <ExportReport
            profile={profile}
            cpf={cpf}
            srs={srs}
            policies={policies}
            investments={investments}
            cash={cash}
            scenario={SCENARIOS[scenario].label}
            scenarioRate={scenarioRate}
            retirementPoint={retirementPoint}
            needs={needs}
            retirementTimeline={retirementTimeline}
            advisorInsight={advisorInsight}
            disclaimer={disclaimer}
            exportDate={exportDate}
          />
        </div>
      </div>
    </div>
  );
}

function buildReportFilename(clientName, exportDate) {
  const cleanName = clientName
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanName ? `${cleanName}-` : ''}Retirement-Summary-${exportDate}.pdf`;
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
