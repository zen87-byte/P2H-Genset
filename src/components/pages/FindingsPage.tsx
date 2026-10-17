"use client";

import { Download, Plus, Search } from "lucide-react";
import { Empty, Field, statusLabel } from "@/components/ui";

type Props = { ctx: Record<string, any> };

export function FindingsPage({ ctx }: Props) {
  const { dashboard, findings, history, user, page, setPage, setEditingFinding, masterGenerators, allGenerators, masterSiteId, setMasterSiteId, unitStatusDraft, setUnitStatusDraft, updateUnitStatus, inspection, canInspect, submitInspection, setInspectionField, actionSites, actionGenerators, setParam, setItem, setInspection, blankInspection, findingForm, setFindingForm, canManageFindings, exportCSV, createFinding, search, setSearch, filterStatus, setFilterStatus, visibleFindings, editingFinding, accountForm, setAccountForm, createAccount, accounts, assignmentDrafts, setAssignmentDrafts, saveAssignments, historySiteId, setHistorySiteId, historyPeriod, setHistoryPeriod, refresh, historyInspections, historyFindings, canReview, reviewNotes, setReviewNotes, reviewInspection, setInspectionDetail } = ctx;
  return (
    <section className="content">
            <div className="toolbar"><div><h2>Register temuan</h2><p>Temuan tersimpan di database; catatan CLOSED tetap tersedia di register dan histori.</p></div><button className="btn secondary" onClick={exportCSV}><Download size={16}/> Export CSV</button></div>
            <div className="panel"><div className="filters"><div className="searchbox"><Search size={16}/><input placeholder="Cari judul, unit, site, PIC..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="ALL">Semua status</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_PART">Waiting part</option><option value="CLOSED">Closed</option></select></div>
              <div className="table-wrap"><table><thead><tr><th>Temuan</th><th>Unit / site</th><th>Bahaya</th><th>Status</th><th>PIC / deadline</th><th>Aksi</th></tr></thead><tbody>{visibleFindings.map(f=><tr key={f.id}><td><b>{f.title}</b><small className="table-sub">{f.description}</small></td><td>{f.generator.assetCode}<small className="table-sub">{f.generator.site.name}</small></td><td><span className={`severity ${f.severity==="AA"?"aa":"a"}`}>{f.severity}</span></td><td><span className={`status status-${f.status.toLowerCase()}`}>{statusLabel(f.status)}</span></td><td>{f.assignedTo||"Belum ditugaskan"}<small className="table-sub">{f.deadline?new Date(f.deadline).toLocaleDateString("id-ID"):"Tanpa deadline"}</small></td><td>{canManageFindings&&<button className="btn small secondary" onClick={()=>setEditingFinding(f)}>Kelola</button>}</td></tr>)}</tbody></table>{visibleFindings.length===0&&<Empty text="Tidak ada temuan sesuai filter."/ >}</div>
            </div>
            {canManageFindings && <form className="panel form-panel" onSubmit={createFinding}><h3><Plus size={17}/> Tambah temuan manual</h3><div className="form-grid">
              <Field label="Unit genset"><select required value={findingForm.generatorId} onChange={e=>setFindingForm({...findingForm,generatorId:e.target.value})}><option value="">Pilih unit</option>{actionGenerators.map(g=><option key={g.id} value={g.id}>{g.assetCode} · {g.siteName}</option>)}</select></Field>
              <Field label="Judul temuan"><input required value={findingForm.title} onChange={e=>setFindingForm({...findingForm,title:e.target.value})}/></Field>
              <Field label="Tingkat bahaya"><select value={findingForm.severity} onChange={e=>setFindingForm({...findingForm,severity:e.target.value})}><option value="A">A</option><option value="AA">AA · STOP OPERASI</option></select></Field>
              <Field label="Pelapor"><input required value={findingForm.reporter} onChange={e=>setFindingForm({...findingForm,reporter:e.target.value})}/></Field>
              <Field label="PIC"><input value={findingForm.assignedTo} onChange={e=>setFindingForm({...findingForm,assignedTo:e.target.value})}/></Field>
              <Field label="Deadline"><input type="date" value={findingForm.deadline} onChange={e=>setFindingForm({...findingForm,deadline:e.target.value})}/></Field>
              <Field label="Deskripsi / risiko"><textarea required rows={3} value={findingForm.description} onChange={e=>setFindingForm({...findingForm,description:e.target.value})}/></Field>
            </div><div className="form-actions"><button className="btn primary" type="submit"><Plus size={16}/> Simpan temuan</button></div></form>}
          </section>
  );
}
