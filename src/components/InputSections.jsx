import { useState } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { NumberField, SelectField, TextField, Toggle } from './FormControls.jsx';
import {
  calculateCpfAge55Transfer,
  formatCurrency,
  getCpfRetirementSums,
  getSelectedCpfRetirementSum,
  getInvestmentStructure,
  getPolicyStructure,
  projectInvestmentAccumulatedAtAge,
  projectPolicyAccumulatedAtAge,
} from '../utils/projections.js';

const POLICY_STRUCTURES = [
  'Endowment / maturity plan',
  'Investment policy with fixed premium commitment',
  'Investment policy with ongoing premium',
  'Retirement income policy',
  'Lump sum withdrawal policy',
  'Custom',
];

export function ProfileSection({ profile, setProfile }) {
  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  return (
    <>
      <AccordionSection title="Client Profile" defaultOpen>
        <div className="form-grid compact input-compact-grid">
          <TextField label="Client name" value={profile.clientName} onChange={(value) => update('clientName', value)} />
          <NumberField label="Current age" value={profile.currentAge} onChange={(value) => update('currentAge', value)} />
          <NumberField label="Retirement age" value={profile.retirementAge} onChange={(value) => update('retirementAge', value)} />
          <NumberField label="Monthly income" prefix="$" value={profile.monthlyIncome} onChange={(value) => update('monthlyIncome', value)} />
          <NumberField label="Monthly expenses" prefix="$" value={profile.monthlyExpenses} onChange={(value) => update('monthlyExpenses', value)} />
          <NumberField label="Monthly savings" prefix="$" value={profile.monthlySavings} onChange={(value) => update('monthlySavings', value)} />
        </div>
      </AccordionSection>

      <AccordionSection title="Retirement Goal">
        <div className="form-grid compact input-compact-grid">
          <NumberField label="Desired monthly income" prefix="$" value={profile.desiredMonthlyIncome} onChange={(value) => update('desiredMonthlyIncome', value)} />
          <NumberField label="Inflation rate" suffix="%" step={0.1} value={profile.inflationRate} onChange={(value) => update('inflationRate', value)} />
          <NumberField label="Retirement duration" suffix="years" value={profile.retirementDuration} onChange={(value) => update('retirementDuration', value)} />
          <NumberField label="Withdrawal rate" suffix="%" step={0.1} value={profile.withdrawalRate} onChange={(value) => update('withdrawalRate', value)} />
          <NumberField label="General return rate" suffix="%" step={0.1} value={profile.generalReturnRate} onChange={(value) => update('generalReturnRate', value)} />
        </div>
      </AccordionSection>
    </>
  );
}

export function CpfSection({ cpf, setCpf, profile }) {
  const update = (key, value) => setCpf((current) => ({ ...current, [key]: value }));
  const cpfSums = getCpfRetirementSums(cpf, profile);
  const selectedSum = getSelectedCpfRetirementSum(cpf, profile);
  const cpf55Transfer = calculateCpfAge55Transfer(cpf, profile);
  return (
    <AccordionSection title="CPF" action={<Toggle label="Enabled" checked={cpf.enabled} onChange={(value) => update('enabled', value)} />}>
      {cpf.enabled && (
        <>
          <div className="form-grid compact input-compact-grid">
            <NumberField label="CPF OA" prefix="$" value={cpf.oaBalance} onChange={(value) => update('oaBalance', value)} />
            <NumberField label="CPF SA" prefix="$" value={cpf.saBalance} onChange={(value) => update('saBalance', value)} />
            <NumberField label="CPF MA" prefix="$" value={cpf.maBalance} onChange={(value) => update('maBalance', value)} />
            <NumberField label="Monthly CPF contribution" prefix="$" value={cpf.monthlyContribution} onChange={(value) => update('monthlyContribution', value)} />
          </div>
          <div className="policy-derived-panel cpf-sum-panel">
            <span>Client turns 55 in: <strong>{cpfSums.yearTurning55}</strong></span>
            <span>Estimated BRS: <strong>{formatCurrency(cpfSums.brs)}</strong></span>
            <span>Estimated FRS: <strong>{formatCurrency(cpfSums.frs)}</strong></span>
            <span>Estimated ERS: <strong>{formatCurrency(cpfSums.ers)}</strong></span>
            <span>Selected retirement sum assumption: <strong>{selectedSum.retirementSumType}</strong></span>
            <span>Selected retirement sum amount: <strong>{formatCurrency(selectedSum.selectedRetirementSumAmount)}</strong></span>
            {cpf55Transfer && (
              <>
                <span>Projected OA at 55: <strong>{formatCurrency(cpf55Transfer.projectedOa)}</strong></span>
                <span>Projected SA at 55: <strong>{formatCurrency(cpf55Transfer.projectedSa)}</strong></span>
                <span>Projected OA + SA at 55: <strong>{formatCurrency(cpf55Transfer.projectedOaSa)}</strong></span>
                <span>Estimated RA set aside: <strong>{formatCurrency(cpf55Transfer.raSetAside)}</strong></span>
                <span>Estimated withdrawable at 55: <strong>{formatCurrency(cpf55Transfer.withdrawableAmount)}</strong></span>
                <span>Estimated {cpf55Transfer.shortfall > 0 ? 'shortfall' : 'excess'}: <strong>{formatCurrency(cpf55Transfer.shortfall || cpf55Transfer.excess)}</strong></span>
              </>
            )}
          </div>
          <p className="field-helper">CPF assumptions are managed in <code>cpfRules.js</code>.</p>
        </>
      )}
    </AccordionSection>
  );
}

export function SrsSection({ srs, setSrs }) {
  const update = (key, value) => setSrs((current) => ({ ...current, [key]: value }));
  return (
    <AccordionSection title="SRS" action={<Toggle label="Enabled" checked={srs.enabled} onChange={(value) => update('enabled', value)} />}>
      {srs.enabled && (
        <div className="form-grid compact input-compact-grid">
          <NumberField label="Current SRS balance" prefix="$" value={srs.currentBalance} onChange={(value) => update('currentBalance', value)} />
          <NumberField label="Annual SRS contribution" prefix="$" value={srs.annualContribution} onChange={(value) => update('annualContribution', value)} />
          <NumberField label="SRS return assumption" suffix="%" step={0.1} value={srs.annualReturn} onChange={(value) => update('annualReturn', value)} />
          <NumberField label="Withdrawal start age" value={srs.withdrawalStartAge} onChange={(value) => update('withdrawalStartAge', value)} />
          <NumberField label="Withdrawal duration" suffix="years" value={srs.withdrawalDurationYears} onChange={(value) => update('withdrawalDurationYears', value)} />
          <SelectField label="Withdrawal frequency" value={srs.withdrawalFrequency} onChange={(value) => update('withdrawalFrequency', value)} options={['monthly', 'yearly']} />
        </div>
      )}
    </AccordionSection>
  );
}

export function CashSection({ cash, setCash }) {
  const update = (key, value) => setCash((current) => ({ ...current, [key]: value }));
  const isIncluded = cash.includeCashInProjection !== false;
  return (
    <AccordionSection
      title="Cash / Savings"
      action={!isIncluded && <span className="excluded-badge">Excluded</span>}
    >
      <div className="form-grid compact input-compact-grid">
        <Toggle label="Include in projection" checked={isIncluded} onChange={(value) => update('includeCashInProjection', value)} />
        <NumberField label="Current cash savings" prefix="$" value={cash.currentSavings} onChange={(value) => update('currentSavings', value)} />
        <NumberField label="Monthly cash savings" prefix="$" value={cash.monthlySavings} onChange={(value) => update('monthlySavings', value)} />
        <NumberField label="Emergency fund" prefix="$" value={cash.emergencyFund} onChange={(value) => update('emergencyFund', value)} />
      </div>
      <details className="advanced-block">
        <summary>Cash assumptions</summary>
        <div className="form-grid compact input-compact-grid">
          <NumberField label="Expected annual interest" suffix="%" step={0.1} value={cash.annualInterest} onChange={(value) => update('annualInterest', value)} />
          <Toggle label="Include emergency fund" checked={cash.includeEmergencyFund} onChange={(value) => update('includeEmergencyFund', value)} />
        </div>
      </details>
      {!isIncluded && <p className="excluded-note">Cash / Savings is currently excluded from retirement projections.</p>}
    </AccordionSection>
  );
}

export function PoliciesSection({ policies, setPolicies, profile, scenarioRate }) {
  const [editingId, setEditingId] = useState(null);
  const addPolicy = () => {
    const id = crypto.randomUUID();
    setPolicies((current) => [
      ...current,
      {
        id,
        name: 'New Policy',
        type: 'Investment-linked',
        startAge: profile.retirementAge - 25,
        startYear: '',
        currentValue: 0,
        premiumAmount: 500,
        premiumFrequency: 'monthly',
        premiumTermYears: 10,
        policyStructure: 'Investment policy with fixed premium commitment',
        premiumCommitmentTerm: 10,
        continuePremiumsAfterCommitment: false,
        continuedPremiumEndAge: profile.retirementAge,
        annualReturn: 5,
        useScenarioReturn: true,
        holdingUntilAge: profile.retirementAge,
        withdrawalAge: profile.retirementAge,
        withdrawalStartAge: profile.retirementAge,
        withdrawalType: 'Lump sum',
        withdrawalEndAge: profile.retirementAge + 10,
        showClientExplanation: false,
      },
    ]);
    setEditingId(id);
  };
  const updatePolicy = (id, key, value) => setPolicies((current) => current.map((policy) => (
    policy.id === id ? { ...policy, [key]: value } : policy
  )));
  const duplicatePolicy = (policy) => {
    const id = crypto.randomUUID();
    setPolicies((current) => [...current, { ...policy, id, name: `${policy.name || 'Policy'} copy` }]);
    setEditingId(id);
  };
  const removePolicy = (id) => {
    setPolicies((current) => current.filter((policy) => policy.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <AccordionSection title="Policies" action={<button className="ghost-button compact-action" type="button" onClick={addPolicy}><Plus size={15} /> Add</button>}>
      <div className="compact-item-list">
        {policies.map((policy) => (
          <PolicyCard
            key={policy.id}
            policy={policy}
            isEditing={editingId === policy.id}
            setEditingId={setEditingId}
            updatePolicy={updatePolicy}
            duplicatePolicy={duplicatePolicy}
            removePolicy={removePolicy}
            profile={profile}
            scenarioRate={scenarioRate}
          />
        ))}
      </div>
    </AccordionSection>
  );
}

export function InvestmentsSection({ investments, setInvestments, profile, scenarioRate }) {
  const [editingId, setEditingId] = useState(null);
  const addInvestment = () => {
    const id = crypto.randomUUID();
    setInvestments((current) => [
      ...current,
      {
        id,
        name: 'New Investment',
        currentValue: 0,
        monthlyContribution: 1000,
        annualReturn: 5,
        useScenarioReturn: false,
        includeInTotal: true,
        withdrawalStartAge: profile.retirementAge,
        plannedWithdrawalAge: profile.retirementAge,
        withdrawalType: 'Lump sum',
        withdrawalEndAge: profile.retirementAge + 10,
      },
    ]);
    setEditingId(id);
  };
  const updateInvestment = (id, key, value) => setInvestments((current) => current.map((investment) => (
    investment.id === id ? { ...investment, [key]: value } : investment
  )));
  const duplicateInvestment = (investment) => {
    const id = crypto.randomUUID();
    setInvestments((current) => [...current, { ...investment, id, name: `${investment.name || 'Investment'} copy` }]);
    setEditingId(id);
  };
  const removeInvestment = (id) => {
    setInvestments((current) => current.filter((investment) => investment.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <AccordionSection title="Investments" action={<button className="ghost-button compact-action" type="button" onClick={addInvestment}><Plus size={15} /> Add</button>}>
      <div className="compact-item-list">
        {investments.map((investment) => (
          <InvestmentCard
            key={investment.id}
            investment={investment}
            isEditing={editingId === investment.id}
            setEditingId={setEditingId}
            updateInvestment={updateInvestment}
            duplicateInvestment={duplicateInvestment}
            removeInvestment={removeInvestment}
            profile={profile}
            scenarioRate={scenarioRate}
          />
        ))}
      </div>
    </AccordionSection>
  );
}

function PolicyCard({ policy, isEditing, setEditingId, updatePolicy, duplicatePolicy, removePolicy, profile, scenarioRate }) {
  const structure = getPolicyStructure(policy, Number(profile.retirementAge));
  const projectedValue = projectPolicyAccumulatedAtAge(policy, Number(profile.currentAge), structure.withdrawalStartAge || structure.holdingUntilAge, scenarioRate);
  const payout = getPolicyPayoutSummary(policy, projectedValue, structure);
  const explanation = getPolicyExplanation(policy, projectedValue, structure);
  const premiumSummary = getPolicyPremiumSummary(policy, structure);
  return (
    <div className="compact-item-card">
      <div className="compact-item-summary">
        <div>
          <strong>{policy.name || 'Policy'}</strong>
          <span>{premiumSummary.label}</span>
          <span>Premium period: Age {structure.startAge}-{structure.premiumEndAge}</span>
          {policy.startYear && <span>Start year: {policy.startYear}</span>}
          <span>Holding period: Age {structure.premiumEndAge}-{structure.holdingUntilAge}</span>
          <span>Withdrawal: {payout.label}</span>
        </div>
        <div className="compact-item-value">
          <span>Projected</span>
          <strong>{formatCurrency(projectedValue)}</strong>
        </div>
      </div>
      <div className="policy-phase-badges">
        <span>Paying premiums: Age {structure.startAge}-{structure.premiumEndAge}</span>
        {structure.holdingUntilAge > structure.premiumEndAge && <span>Compounding: Age {structure.premiumEndAge}-{structure.holdingUntilAge}</span>}
        <span>{payout.badge}</span>
      </div>
      <div className="policy-mini-timeline">
        <div className="policy-mini-line">
          <span />
          <span />
          <span />
        </div>
        <div className="policy-mini-labels">
          <b>Age {structure.startAge}</b>
          <b>Age {structure.premiumEndAge}</b>
          <b>Age {structure.holdingUntilAge}</b>
        </div>
        <div className="policy-mini-phases">
          <span>Pay premiums</span>
          <span>Let policy grow</span>
          <span>{structure.withdrawalType === 'Keep invested / no withdrawal yet' ? 'Keep invested' : 'Withdraw'}</span>
        </div>
      </div>
      <div className="compact-item-actions">
        <button type="button" className="ghost-button compact-action" onClick={() => setEditingId(isEditing ? null : policy.id)}><Pencil size={14} /> {isEditing ? 'Close' : 'Edit'}</button>
        <button type="button" className="ghost-button compact-action" onClick={() => updatePolicy(policy.id, 'showClientExplanation', !policy.showClientExplanation)}>Explanation</button>
        <button type="button" className="ghost-button compact-action" onClick={() => duplicatePolicy(policy)}><Copy size={14} /> Duplicate</button>
        <button type="button" className="icon-button" onClick={() => removePolicy(policy.id)} aria-label="Delete policy"><Trash2 size={15} /></button>
      </div>
      {policy.showClientExplanation && <p className="policy-explanation">{explanation}</p>}
      {isEditing && (
        <div className="compact-edit-form">
          <div className="form-grid compact input-compact-grid">
            <SelectField label="Policy structure" value={policy.policyStructure || 'Custom'} onChange={(value) => applyPolicyTemplate(policy, updatePolicy, value, profile)} options={POLICY_STRUCTURES} />
            <TextField label="Policy name" value={policy.name} onChange={(value) => updatePolicy(policy.id, 'name', value)} />
            <NumberField label="Start age" value={policy.startAge} onChange={(value) => updatePolicy(policy.id, 'startAge', value)} />
            <NumberField label="Premium amount" prefix="$" value={policy.premiumAmount} onChange={(value) => updatePolicy(policy.id, 'premiumAmount', value)} />
            <NumberField label="Premium commitment" suffix="years" value={policy.premiumCommitmentTerm ?? policy.premiumTermYears} onChange={(value) => updatePolicy(policy.id, 'premiumCommitmentTerm', value)} />
            <NumberField label="Expected return" suffix="%" step={0.1} value={policy.annualReturn} onChange={(value) => updatePolicy(policy.id, 'annualReturn', value)} />
            <NumberField label="Withdrawal age" value={policy.withdrawalStartAge ?? policy.withdrawalAge} onChange={(value) => {
              updatePolicy(policy.id, 'withdrawalStartAge', value);
              updatePolicy(policy.id, 'withdrawalAge', value);
              updatePolicy(policy.id, 'holdingUntilAge', value);
            }} />
            <SelectField label="Withdrawal type" value={policy.withdrawalType || 'Lump sum'} onChange={(value) => updatePolicy(policy.id, 'withdrawalType', value)} options={['Lump sum', 'Monthly income', 'Yearly income', 'Keep invested / no withdrawal yet']} />
          </div>
          <div className="policy-derived-panel">
            <span>Premium commitment ends: <strong>{structure.commitmentEndAge}</strong></span>
            <span>Projected premium end age: <strong>{structure.premiumEndAge}</strong></span>
            <span>Growth after commitment: <strong>{structure.postCommitmentGrowthYears} years</strong></span>
            {payout.amount && <span>Estimated payout: <strong>{payout.amount}</strong></span>}
          </div>
          <details className="advanced-block">
            <summary>Advanced policy settings</summary>
            <div className="form-grid compact input-compact-grid">
              <TextField label="Policy type" value={policy.type} onChange={(value) => updatePolicy(policy.id, 'type', value)} />
              <NumberField label="Current value" prefix="$" value={policy.currentValue} onChange={(value) => updatePolicy(policy.id, 'currentValue', value)} />
              <SelectField label="Premium frequency" value={policy.premiumFrequency} onChange={(value) => updatePolicy(policy.id, 'premiumFrequency', value)} options={['monthly', 'quarterly', 'semi-annually', 'annually']} />
              <TextField label="Start year" value={policy.startYear} onChange={(value) => updatePolicy(policy.id, 'startYear', value)} />
              <Toggle label="Continue premiums after commitment" checked={Boolean(policy.continuePremiumsAfterCommitment)} onChange={(value) => updatePolicy(policy.id, 'continuePremiumsAfterCommitment', value)} />
              {policy.continuePremiumsAfterCommitment && (
                <NumberField label="Continue premiums until age" value={policy.continuedPremiumEndAge ?? structure.holdingUntilAge} onChange={(value) => updatePolicy(policy.id, 'continuedPremiumEndAge', value)} />
              )}
              <NumberField label="Holding until age" value={policy.holdingUntilAge ?? structure.withdrawalStartAge} onChange={(value) => updatePolicy(policy.id, 'holdingUntilAge', value)} />
              {(policy.withdrawalType === 'Monthly income' || policy.withdrawalType === 'Yearly income') && (
                <NumberField label="Withdrawal end age" value={policy.withdrawalEndAge} onChange={(value) => updatePolicy(policy.id, 'withdrawalEndAge', value)} />
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function InvestmentCard({ investment, isEditing, setEditingId, updateInvestment, duplicateInvestment, removeInvestment, profile, scenarioRate }) {
  const structure = getInvestmentStructure(investment, Number(profile.retirementAge), Number(profile.retirementDuration));
  const projectedValue = projectInvestmentAccumulatedAtAge(investment, Number(profile.currentAge), structure.withdrawalStartAge, scenarioRate);
  const payout = getInvestmentPayoutSummary(projectedValue, structure);
  return (
    <div className="compact-item-card">
      <div className="compact-item-summary">
        <div>
          <strong>{investment.name || 'Investment'}</strong>
          <span>Contribution: {formatCurrency(investment.monthlyContribution)}/month</span>
          <span>Withdrawal: {payout.label}</span>
          {!investment.includeInTotal && <span>Excluded from retirement total</span>}
        </div>
        <div className="compact-item-value">
          <span>Projected at age {structure.withdrawalStartAge}</span>
          <strong>{formatCurrency(projectedValue)}</strong>
        </div>
      </div>
      {payout.amount && (
        <div className="policy-derived-panel investment-derived-panel">
          <span>Estimated payout: <strong>{payout.amount}</strong></span>
          <span>Duration: <strong>{payout.duration}</strong></span>
        </div>
      )}
      <div className="compact-item-actions">
        <button type="button" className="ghost-button compact-action" onClick={() => setEditingId(isEditing ? null : investment.id)}><Pencil size={14} /> {isEditing ? 'Close' : 'Edit'}</button>
        <button type="button" className="ghost-button compact-action" onClick={() => duplicateInvestment(investment)}><Copy size={14} /> Duplicate</button>
        <button type="button" className="icon-button" onClick={() => removeInvestment(investment.id)} aria-label="Delete investment"><Trash2 size={15} /></button>
      </div>
      {isEditing && (
        <div className="compact-edit-form">
          <div className="form-grid compact input-compact-grid">
            <TextField label="Investment name" value={investment.name} onChange={(value) => updateInvestment(investment.id, 'name', value)} />
            <NumberField label="Current value" prefix="$" value={investment.currentValue} onChange={(value) => updateInvestment(investment.id, 'currentValue', value)} />
            <NumberField label="Monthly contribution" prefix="$" value={investment.monthlyContribution} onChange={(value) => updateInvestment(investment.id, 'monthlyContribution', value)} />
            <NumberField label="Expected return" suffix="%" step={0.1} value={investment.annualReturn} onChange={(value) => updateInvestment(investment.id, 'annualReturn', value)} />
            <Toggle label="Include in retirement total" checked={investment.includeInTotal} onChange={(value) => updateInvestment(investment.id, 'includeInTotal', value)} />
          </div>
          <details className="advanced-block">
            <summary>Withdrawal settings</summary>
            <div className="form-grid compact input-compact-grid">
              <SelectField label="Withdrawal type" value={structure.withdrawalType} onChange={(value) => updateInvestment(investment.id, 'withdrawalType', value)} options={['Lump sum', 'Monthly income', 'Yearly income', 'Keep invested / no withdrawal']} />
              <NumberField label="Withdrawal start age" value={investment.withdrawalStartAge ?? investment.plannedWithdrawalAge ?? ''} onChange={(value) => {
                updateInvestment(investment.id, 'withdrawalStartAge', value);
                updateInvestment(investment.id, 'plannedWithdrawalAge', value);
              }} />
              {(structure.withdrawalType === 'Monthly income' || structure.withdrawalType === 'Yearly income') && (
                <NumberField label="Withdrawal end age" value={investment.withdrawalEndAge ?? ''} onChange={(value) => updateInvestment(investment.id, 'withdrawalEndAge', value)} />
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function getInvestmentPayoutSummary(projectedValue, structure) {
  if (structure.withdrawalType === 'Keep invested / no withdrawal') {
    return {
      label: `Keep invested from age ${structure.withdrawalStartAge}`,
      amount: '',
      duration: 'No payout selected',
    };
  }
  if (structure.withdrawalType === 'Monthly income') {
    const monthly = projectedValue / (structure.withdrawalDuration * 12);
    return {
      label: `${formatCurrency(monthly)}/month from age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`,
      amount: `${formatCurrency(monthly)}/month`,
      duration: `${structure.withdrawalDuration} years`,
    };
  }
  if (structure.withdrawalType === 'Yearly income') {
    const yearly = projectedValue / structure.withdrawalDuration;
    return {
      label: `${formatCurrency(yearly)}/year from age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`,
      amount: `${formatCurrency(yearly)}/year`,
      duration: `${structure.withdrawalDuration} years`,
    };
  }
  return {
    label: `Lump sum at age ${structure.withdrawalStartAge}`,
    amount: formatCurrency(projectedValue),
    duration: 'One-time',
  };
}

function AccordionSection({ title, action, children, defaultOpen = false }) {
  return (
    <details className="input-accordion panel" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        {action && <div className="accordion-action" onClick={(event) => event.preventDefault()}>{action}</div>}
      </summary>
      <div className="accordion-content">{children}</div>
    </details>
  );
}

function frequencyShortLabel(frequency) {
  if (frequency === 'monthly') return 'month';
  if (frequency === 'quarterly') return 'quarter';
  if (frequency === 'semi-annually') return 'half-year';
  return 'year';
}

function getPolicyPremiumSummary(policy, structure) {
  const premium = `${formatCurrency(policy.premiumAmount)}/${frequencyShortLabel(policy.premiumFrequency)}`;
  if (policy.continuePremiumsAfterCommitment) {
    return {
      label: `Premium: ${premium} until age ${structure.premiumEndAge}`,
    };
  }
  return {
    label: `Premium: ${premium} for ${structure.premiumCommitmentTerm} years`,
  };
}

function applyPolicyTemplate(policy, updatePolicy, structure, profile) {
  updatePolicy(policy.id, 'policyStructure', structure);
  if (structure === 'Investment policy with ongoing premium') {
    updatePolicy(policy.id, 'continuePremiumsAfterCommitment', true);
    updatePolicy(policy.id, 'continuedPremiumEndAge', profile.retirementAge);
  }
  if (structure === 'Retirement income policy') {
    updatePolicy(policy.id, 'withdrawalType', 'Monthly income');
    updatePolicy(policy.id, 'withdrawalStartAge', profile.retirementAge);
    updatePolicy(policy.id, 'withdrawalAge', profile.retirementAge);
    updatePolicy(policy.id, 'holdingUntilAge', profile.retirementAge);
    updatePolicy(policy.id, 'withdrawalEndAge', profile.retirementAge + 10);
  }
  if (structure === 'Lump sum withdrawal policy' || structure === 'Endowment / maturity plan') {
    updatePolicy(policy.id, 'withdrawalType', 'Lump sum');
    updatePolicy(policy.id, 'withdrawalStartAge', profile.retirementAge);
    updatePolicy(policy.id, 'withdrawalAge', profile.retirementAge);
    updatePolicy(policy.id, 'holdingUntilAge', profile.retirementAge);
  }
}

function getPolicyPayoutSummary(policy, projectedValue, structure) {
  if (structure.withdrawalType === 'Keep invested / no withdrawal yet') {
    return { label: `Keep invested until age ${structure.holdingUntilAge}`, badge: 'No withdrawal selected', amount: '' };
  }
  if (structure.withdrawalType === 'Monthly income') {
    const monthly = projectedValue / (structure.withdrawalDuration * 12);
    return {
      label: `${formatCurrency(monthly)}/month from age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`,
      badge: `Income phase: Age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`,
      amount: `${formatCurrency(monthly)}/month`,
    };
  }
  if (structure.withdrawalType === 'Yearly income') {
    const yearly = projectedValue / structure.withdrawalDuration;
    return {
      label: `${formatCurrency(yearly)}/year from age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`,
      badge: `Income phase: Age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`,
      amount: `${formatCurrency(yearly)}/year`,
    };
  }
  return {
    label: `Lump sum at age ${structure.withdrawalStartAge}`,
    badge: `Lump sum: Age ${structure.withdrawalStartAge}`,
    amount: formatCurrency(projectedValue),
  };
}

function getPolicyExplanation(policy, projectedValue, structure) {
  const premium = `${formatCurrency(policy.premiumAmount)}/${frequencyShortLabel(policy.premiumFrequency)}`;
  const premiumPhrase = policy.continuePremiumsAfterCommitment
    ? `You contribute ${premium} from age ${structure.startAge} to ${structure.premiumEndAge}.`
    : `You contribute ${premium} for ${structure.premiumCommitmentTerm} years from age ${structure.startAge} to ${structure.commitmentEndAge}.`;
  if (structure.withdrawalType === 'Monthly income' || structure.withdrawalType === 'Yearly income') {
    const payout = getPolicyPayoutSummary(policy, projectedValue, structure).amount;
    return `${premiumPhrase} The policy is then assumed to stay invested until age ${structure.withdrawalStartAge}. The projected value is converted into an estimated payout of ${payout} over ${structure.withdrawalDuration} years.`;
  }
  if (structure.withdrawalType === 'Keep invested / no withdrawal yet') {
    return `${premiumPhrase} After that, the policy is assumed to remain invested through age ${structure.holdingUntilAge}, with no withdrawal selected yet.`;
  }
  return `${premiumPhrase} After that, the policy is assumed to stay invested until age ${structure.withdrawalStartAge}. Based on the selected return assumption, the projected lump sum at age ${structure.withdrawalStartAge} is ${formatCurrency(projectedValue)}.`;
}
