import { useEffect, useState } from "react";
import { investApi } from "../../lib/api.js";
import { inr } from "../../lib/format.js";
import { Badge, Modal, Field, Alert } from "../ui.jsx";
import {
  PLAN_TYPES,
  PLAN_CAPITAL,
  LOCK_IN_MONTHS_OPTIONS,
  LOCK_IN_SUB_CATEGORIES,
  planFormFromCategory,
  lockInCategoryLabel,
  lockInMonthsFromDays,
} from "../../lib/plan-types.js";

const PLAN_TYPES_LIST = PLAN_TYPES;

export default function AdminPlansPanel({ canManage }) {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLockIn, setFilterLockIn] = useState("");
  const base = { ...planFormFromCategory("STARTER", 12), settlementCycles: "MONTHLY", description: "", isActive: true };
  const [form, setForm] = useState(base);
  const [err, setErr] = useState("");

  const load = () => investApi("/admin/plans").then((d) => setPlans(d.plans)).catch(() => {});
  useEffect(() => { load(); }, []);

  const filtered = plans.filter((p) => {
    if (filterCategory && p.planType !== filterCategory) return false;
    if (filterLockIn && String(lockInMonthsFromDays(p.lockInDays)) !== filterLockIn) return false;
    return true;
  });

  const grouped = PLAN_TYPES_LIST.map((tier) => ({
    tier,
    plans: filtered.filter((p) => p.planType === tier),
  })).filter((g) => g.plans.length > 0);

  const onCategoryChange = (planType) => {
    const defaults = planFormFromCategory(planType, form.lockInMonths || 12);
    setForm((f) => ({ ...f, ...defaults, name: editing ? f.name : defaults.name }));
  };

  const onLockInChange = (lockInMonths) => {
    const m = Number(lockInMonths);
    const defaults = planFormFromCategory(form.planType, m);
    setForm((f) => ({ ...f, lockInMonths: m, lockInDays: defaults.lockInDays, name: editing ? f.name : defaults.name }));
  };

  const openNew = () => { setEditing(null); setForm(base); setErr(""); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p, lockInMonths: lockInMonthsFromDays(p.lockInDays) });
    setErr("");
    setOpen(true);
  };
  const save = async (e) => {
    e.preventDefault(); setErr("");
    const body = {
      ...form,
      lockInMonths: Number(form.lockInMonths),
      monthlyRoiPct: Number(form.monthlyRoiPct),
      profitSharePct: Number(form.profitSharePct),
    };
    try {
      if (editing) await investApi(`/admin/plans/${editing.id}`, { method: "PUT", body });
      else await investApi("/admin/plans", { method: "POST", body });
      setOpen(false); load();
    } catch (e2) { setErr(e2.message); }
  };
  const del = async (id) => { if (confirm("Delete plan?")) { await investApi(`/admin/plans/${id}`, { method: "DELETE" }); load(); } };

  return (
    <div>
      {canManage ? <button onClick={openNew} className="btn-primary mb-4">+ Create Plan</button> : <Alert type="info">You do not have permission to create, edit or delete plans.</Alert>}
      <div className="mb-4 flex flex-wrap gap-2">
        {PLAN_TYPES_LIST.map((t) => (
          <span key={t} className="badge bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{t}: {PLAN_CAPITAL[t].label}</span>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Field label="Filter category">
          <select className="input w-auto min-w-[10rem]" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {PLAN_TYPES_LIST.map((t) => <option key={t} value={t}>{t} — {PLAN_CAPITAL[t].label}</option>)}
          </select>
        </Field>
        <Field label="Filter lock-in (months)">
          <select className="input w-auto min-w-[10rem]" value={filterLockIn} onChange={(e) => setFilterLockIn(e.target.value)}>
            <option value="">All sub-categories</option>
            {LOCK_IN_SUB_CATEGORIES.map((m) => (
              <option key={m} value={String(m)}>{m} month{m > 1 ? "s" : ""}</option>
            ))}
          </select>
        </Field>
      </div>
      {grouped.map(({ tier, plans: tierPlans }) => (
        <div key={tier} className="mb-8">
          <h3 className="mb-3 font-bold text-foreground">{tier} • {PLAN_CAPITAL[tier].label}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tierPlans.map((p) => (
              <div key={p.id} className="card overflow-hidden">
                <div className="px-4 py-3 text-white" style={{ background: p.color }}>
                  <div className="flex justify-between"><b>{p.name}</b><span className="badge bg-white/20 text-white">{p.planType}</span></div>
                  <div className="text-xs text-white/80">{lockInCategoryLabel(p.lockInDays)} sub-category</div>
                </div>
                <div className="space-y-1 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Lock-in</span><b>{p.lockInDays} days</b></div>
                  <div className="flex justify-between"><span className="text-slate-400">Monthly / Annual ROI</span><b>{p.monthlyRoiPct}% / {p.annualRoiPct}%</b></div>
                  <div className="flex justify-between"><span className="text-slate-400">Min / Max</span><b>{inr(p.minInvestment)} – {inr(p.maxInvestment)}</b></div>
                  <div className="flex justify-between"><span className="text-slate-400">Active</span><Badge status={p.isActive ? "ACTIVE" : "REJECTED"} /></div>
                  {canManage && <div className="flex gap-2 pt-2"><button onClick={() => openEdit(p)} className="btn-outline flex-1 text-xs">Edit</button><button onClick={() => del(p.id)} className="btn-outline flex-1 text-xs text-red-500">Delete</button></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-center text-muted-foreground">No plans match filters.</p>}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Plan" : "Create Investment Plan"} wide>
        <form onSubmit={save} className="space-y-3">
          {err && <Alert type="error">{err}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan Category (by capital)">
              <select className="input" value={form.planType} onChange={(e) => onCategoryChange(e.target.value)}>
                {PLAN_TYPES_LIST.map((t) => <option key={t} value={t}>{t} — {PLAN_CAPITAL[t].label}</option>)}
              </select>
            </Field>
            <Field label="Lock-in Sub-category (months)">
              <select className="input" value={form.lockInMonths || lockInMonthsFromDays(form.lockInDays)} onChange={(e) => onLockInChange(e.target.value)}>
                {LOCK_IN_MONTHS_OPTIONS.map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""} ({m * 30} days)</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Profit Share % / month (= Monthly ROI)"><input className="input" type="number" step="0.1" value={form.monthlyRoiPct} onChange={(e) => setForm({ ...form, monthlyRoiPct: e.target.value, profitSharePct: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum Investment (auto from category)">
              <input className="input bg-slate-50 dark:bg-white/5" readOnly value={inr(form.minInvestment)} />
            </Field>
            <Field label="Maximum Investment (auto from category)">
              <input className="input bg-slate-50 dark:bg-white/5" readOnly value={inr(form.maxInvestment)} />
            </Field>
          </div>
          <p className="text-xs text-slate-400">Lock-in: {form.lockInDays} days ({lockInCategoryLabel(form.lockInDays)}) — capital range {PLAN_CAPITAL[form.planType]?.label}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Settlement Cycles"><select className="input" value={form.settlementCycles} onChange={(e) => setForm({ ...form, settlementCycles: e.target.value })}><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="WEEKLY,MONTHLY">Weekly & Monthly</option></select></Field>
            <Field label="Card Color"><input className="input h-10" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
          </div>
          <Field label="Description"><textarea className="input" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (shown to investors)</label>
          <p className="text-xs text-slate-400">Annual ROI auto-calculated as monthly × 12 = {Number(form.monthlyRoiPct || 0) * 12}%.</p>
          <button className="btn-gold w-full">{editing ? "Update Plan" : "Create Plan"}</button>
        </form>
      </Modal>
    </div>
  );
}
