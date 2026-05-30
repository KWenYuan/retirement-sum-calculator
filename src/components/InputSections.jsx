import { useState } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { NumberField, SelectField, TextField, Toggle } from './FormControls.jsx';
import {
  formatCurrency,
  projectInvestment,
  projectPolicy,
} from '../utils/projections.js';

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

export function CpfSection({ cpf, setCpf }) {
  const update = (key, value) => setCpf((current) => ({ ...current, [key]: value }));
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
          <details className="advanced-block">
            <summary>Advanced CPF assumptions</summary>
            <div className="form-grid compact input-compact-grid">
              <NumberField label="CPF annual interest" suffix="%" step={0.1} value={cpf.annualInterest} onChange={(value) => update('annualInterest', value)} />
              <NumberField label="FRS assumption" prefix="$" value={cpf.frsAmountAt55} onChange={(value) => update('frsAmountAt55', value)} />
              <NumberField label="CPF LIFE payout age" value={cpf.cpfLifePayoutStartAge} onChange={(value) => update('cpfLifePayoutStartAge', value)} />
              <NumberField label="CPF LIFE monthly payout" prefix="$" value={cpf.cpfLifeMonthlyPayout} onChange={(value) => update('cpfLifeMonthlyPayout', value)} />
              <Toggle label="Include CPF in retirement total" checked={cpf.includeInTotal} onChange={(value) => update('includeInTotal', value)} />
            </div>
          </details>
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
        <summary>Withdrawal settings</summary>
        <div className="form-grid compact input-compact-grid">
          <NumberField label="Expected annual interest" suffix="%" step={0.1} value={cash.annualInterest} onChange={(value) => update('annualInterest', value)} />
          <SelectField label="Timeline withdrawal type" value={cash.withdrawalType || 'Lump sum'} onChange={(value) => update('withdrawalType', value)} options={['Not shown on timeline', 'Lump sum', 'Monthly income', 'Yearly income']} />
          <NumberField label="Planned withdrawal age" value={cash.plannedWithdrawalAge} onChange={(value) => update('plannedWithdrawalAge', value)} />
          {(cash.withdrawalType === 'Monthly income' || cash.withdrawalType === 'Yearly income') && (
            <NumberField label="Withdrawal end age" value={cash.withdrawalEndAge} onChange={(value) => update('withdrawalEndAge', value)} />
          )}
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
        annualReturn: 5,
        useScenarioReturn: true,
        withdrawalAge: profile.retirementAge,
        withdrawalType: 'Lump sum',
        withdrawalEndAge: profile.retirementAge + 10,
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
        useScenarioReturn: true,
        riskLevel: 'Balanced',
        includeInTotal: true,
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
  const withdrawalAge = Number(policy.withdrawalAge) || Number(profile.retirementAge);
  const projectedValue = projectPolicy(policy, Number(profile.currentAge), withdrawalAge, scenarioRate);
  return (
    <div className="compact-item-card">
      <div className="compact-item-summary">
        <div>
          <strong>{policy.name || 'Policy'}</strong>
          <span>Premium: {formatCurrency(policy.premiumAmount)}/{frequencyShortLabel(policy.premiumFrequency)}</span>
          <span>Start age: {policy.startAge} | Withdrawal: {policy.withdrawalType || 'Lump sum'} at age {withdrawalAge}</span>
        </div>
        <div className="compact-item-value">
          <span>Projected</span>
          <strong>{formatCurrency(projectedValue)}</strong>
        </div>
      </div>
      <div className="compact-item-actions">
        <button type="button" className="ghost-button compact-action" onClick={() => setEditingId(isEditing ? null : policy.id)}><Pencil size={14} /> {isEditing ? 'Close' : 'Edit'}</button>
        <button type="button" className="ghost-button compact-action" onClick={() => duplicatePolicy(policy)}><Copy size={14} /> Duplicate</button>
        <button type="button" className="icon-button" onClick={() => removePolicy(policy.id)} aria-label="Delete policy"><Trash2 size={15} /></button>
      </div>
      {isEditing && (
        <div className="compact-edit-form">
          <div className="form-grid compact input-compact-grid">
            <TextField label="Policy name" value={policy.name} onChange={(value) => updatePolicy(policy.id, 'name', value)} />
            <TextField label="Policy type" value={policy.type} onChange={(value) => updatePolicy(policy.id, 'type', value)} />
            <NumberField label="Start age" value={policy.startAge} onChange={(value) => updatePolicy(policy.id, 'startAge', value)} />
            <NumberField label="Current value" prefix="$" value={policy.currentValue} onChange={(value) => updatePolicy(policy.id, 'currentValue', value)} />
            <NumberField label="Premium amount" prefix="$" value={policy.premiumAmount} onChange={(value) => updatePolicy(policy.id, 'premiumAmount', value)} />
            <SelectField label="Premium frequency" value={policy.premiumFrequency} onChange={(value) => updatePolicy(policy.id, 'premiumFrequency', value)} options={['monthly', 'quarterly', 'semi-annually', 'annually']} />
          </div>
          <details className="advanced-block">
            <summary>Advanced settings</summary>
            <div className="form-grid compact input-compact-grid">
              <TextField label="Start year" value={policy.startYear} onChange={(value) => updatePolicy(policy.id, 'startYear', value)} />
              <NumberField label="Premium term" suffix="years" value={policy.premiumTermYears} onChange={(value) => updatePolicy(policy.id, 'premiumTermYears', value)} />
              <NumberField label="Expected return" suffix="%" step={0.1} value={policy.annualReturn} onChange={(value) => updatePolicy(policy.id, 'annualReturn', value)} />
              <NumberField label="Withdrawal age" value={policy.withdrawalAge} onChange={(value) => updatePolicy(policy.id, 'withdrawalAge', value)} />
              <SelectField label="Withdrawal type" value={policy.withdrawalType || 'Lump sum'} onChange={(value) => updatePolicy(policy.id, 'withdrawalType', value)} options={['Lump sum', 'Monthly income', 'Yearly income']} />
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
  const withdrawalAge = Number(investment.plannedWithdrawalAge) || Number(profile.retirementAge);
  const yearsToWithdrawal = Math.max(0, withdrawalAge - Number(profile.currentAge));
  const projectedValue = projectInvestment(investment, yearsToWithdrawal, scenarioRate);
  return (
    <div className="compact-item-card">
      <div className="compact-item-summary">
        <div>
          <strong>{investment.name || 'Investment'}</strong>
          <span>Contribution: {formatCurrency(investment.monthlyContribution)}/month</span>
          <span>{investment.riskLevel} | {investment.withdrawalType || 'Lump sum'} at age {withdrawalAge}</span>
        </div>
        <div className="compact-item-value">
          <span>Projected</span>
          <strong>{formatCurrency(projectedValue)}</strong>
        </div>
      </div>
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
            <SelectField label="Risk level" value={investment.riskLevel} onChange={(value) => updateInvestment(investment.id, 'riskLevel', value)} options={['Conservative', 'Balanced', 'Growth']} />
            <Toggle label="Include in retirement total" checked={investment.includeInTotal} onChange={(value) => updateInvestment(investment.id, 'includeInTotal', value)} />
          </div>
          <details className="advanced-block">
            <summary>Withdrawal settings</summary>
            <div className="form-grid compact input-compact-grid">
              <SelectField label="Timeline withdrawal type" value={investment.withdrawalType || 'Lump sum'} onChange={(value) => updateInvestment(investment.id, 'withdrawalType', value)} options={['Not shown on timeline', 'Lump sum', 'Monthly income', 'Yearly income']} />
              <NumberField label="Planned withdrawal age" value={investment.plannedWithdrawalAge} onChange={(value) => updateInvestment(investment.id, 'plannedWithdrawalAge', value)} />
              {investment.withdrawalType !== 'Lump sum' && investment.withdrawalType !== 'Not shown on timeline' && (
                <NumberField label="Withdrawal end age" value={investment.withdrawalEndAge} onChange={(value) => updateInvestment(investment.id, 'withdrawalEndAge', value)} />
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
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
