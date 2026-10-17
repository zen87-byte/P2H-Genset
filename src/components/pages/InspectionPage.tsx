"use client";

import { CheckCircle2, ShieldAlert } from "lucide-react";
import { CHECKLIST } from "@/lib/checklist";
import { Empty, Field } from "@/components/ui";

type Props = { ctx: Record<string, any> };

export function InspectionPage({ ctx }: Props) {
  const { dashboard, findings, history, user, page, setPage, setEditingFinding, masterGenerators, allGenerators, masterSiteId, setMasterSiteId, unitStatusDraft, setUnitStatusDraft, updateUnitStatus, inspection, canInspect, submitInspection, setInspectionField, actionSites, actionGenerators, setParam, setItem, setInspection, blankInspection, findingForm, setFindingForm, canManageFindings, exportCSV, createFinding, search, setSearch, filterStatus, setFilterStatus, visibleFindings, editingFinding, accountForm, setAccountForm, createAccount, accounts, assignmentDrafts, setAssignmentDrafts, saveAssignments, historySiteId, setHistorySiteId, historyPeriod, setHistoryPeriod, refresh, historyInspections, historyFindings, canReview, reviewNotes, setReviewNotes, reviewInspection, setInspectionDetail } = ctx;
  return (
    <section className="content">
            <div className="form-intro"><div><h2>Form Inspeksi Harian Genset</h2><p>Isi semua item checklist sesuai formulir P2H yang diberikan.</p></div><span className="mini-label">30 ITEM CHECKLIST</span></div>
            {canInspect ? <form onSubmit={submitInspection} className="panel form-panel">
              <h3>A. Informasi umum</h3><div className="form-grid">
                <Field label="Nama mekanik / inspector"><input required value={user.name} readOnly /></Field>
                <Field label="Hari / tanggal"><input type="date" required value={inspection.inspectionDate} onChange={e=>setInspectionField("inspectionDate",e.target.value)} /></Field>
                <Field label="Shift"><select value={inspection.shift} onChange={e=>setInspectionField("shift",e.target.value)}><option value="I">Shift I</option><option value="II">Shift II</option></select></Field>
                <Field label="Job site"><select required value={inspection.siteId} onChange={e=>{setInspectionField("siteId",e.target.value);setInspectionField("generatorId","");}}><option value="">Pilih site</option>{actionSites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
                <Field label="Nomor unit"><select required value={inspection.generatorId} onChange={e=>setInspectionField("generatorId",e.target.value)}><option value="">Pilih unit</option>{actionGenerators.filter(g=>g.siteId===inspection.siteId).map(g=><option key={g.id} value={g.id}>{g.assetCode} {g.unitName?`· ${g.unitName}`:""}</option>)}</select></Field>
                <Field label="Nama / model unit"><select required value={inspection.model} onChange={e=>setInspectionField("model",e.target.value)}><option value="">Pilih model</option>{["Komatsu","Weichai","Cummins","Caterpillar"].map(m=><option key={m}>{m}</option>)}</select></Field>
                <Field label="HM/KM awal"><input type="number" min="0" step="0.1" value={inspection.hmStart} onChange={e=>setInspectionField("hmStart",e.target.value)} /></Field>
                <Field label="HM/KM akhir"><input type="number" min="0" step="0.1" value={inspection.hmEnd} onChange={e=>setInspectionField("hmEnd",e.target.value)} /></Field>
              </div>
              <div className="section-title"><h3>B. Checklist inspeksi</h3><span>Semua item wajib dijawab</span></div>
              {CHECKLIST.map(section=><div className="check-section" key={section.code}><div className="check-section-title">{section.title}<span>{section.items.length} item</span></div>
                <div className="check-list">{section.items.map((item,index)=><div className="check-item" key={item.code}><div className="check-number">{index+1}</div><div className="check-description"><b>{item.description}</b><small>{item.code}</small></div><span className={`severity ${item.hazard==="AA"?"aa":"a"}`}>{item.hazard}</span><div className="result-options">{(["BAIK","RUSAK","PERBAIKI"] as const).map(result=><label key={result} className={inspection.items[item.code].result===result?`chosen ${result.toLowerCase()}`:""}><input type="radio" required name={item.code} checked={inspection.items[item.code].result===result} onChange={()=>setItem(item.code,"result",result)}/>{result}</label>)}</div><input className="item-note" placeholder="Catatan (opsional)" value={inspection.items[item.code].notes} onChange={e=>setItem(item.code,"notes",e.target.value)}/></div>)}</div>
              </div>)}
              <div className="section-title"><h3>C. Parameter panel genset</h3><span>Isi sesuai kondisi pengukuran</span></div>
              <p className="muted-note">Kolom kosong dan berbeban mengikuti formulir kertas. Batas normal harus mengacu pada SOP/OEM unit.</p>
              <div className="table-wrap"><table className="parameter-table"><thead><tr><th>Parameter</th><th>Satuan</th><th>Kosongan</th><th>Berbeban</th></tr></thead><tbody>{[
                ["Temperatur radiator","°C","radiatorEmpty","radiatorLoaded"],["Oil pressure","psi","oilEmpty","oilLoaded"],["RPM generator","rpm","rpmEmpty","rpmLoaded"],["Load","kW","loadEmpty","loadLoaded"],["Voltage L-L","VAC","voltageEmpty","voltageLoaded"],["Voltage battery","VDC","batteryEmpty","batteryLoaded"]
              ].map(([label,unit,a,b])=><tr key={label}><td>{label}</td><td>{unit}</td><td><input type="number" step="any" value={inspection.parameters[a]} onChange={e=>setParam(a,e.target.value)} /></td><td><input type="number" step="any" value={inspection.parameters[b]} onChange={e=>setParam(b,e.target.value)} /></td></tr>)}</tbody></table></div>
              <div className="form-grid extra-fields"><Field label="Info tambahan dan tindak lanjut"><textarea rows={3} value={inspection.notes} onChange={e=>setInspectionField("notes",e.target.value)} /></Field><Field label="Nama penandatangan mekanik/electrician"><input value={inspection.signatureName} onChange={e=>setInspectionField("signatureName",e.target.value)} /></Field></div>
              <div className="safety-note"><ShieldAlert size={19}/><div><b>Pengingat keselamatan</b><p>Kode bahaya AA: unit harus diperbaiki sebelum dioperasikan (STOP OPERASI). Status aplikasi bukan pengganti izin kerja atau keputusan resmi pengawas.</p></div></div>
              <div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setInspection({...blankInspection(), inspector:user.name})}>Reset form</button><button className="btn primary" type="submit"><CheckCircle2 size={16}/> Simpan inspeksi P2H</button></div>
            </form> : <div className="panel"><p>Form inspeksi dapat diisi oleh teknisi. Akun lu memiliki akses baca saja untuk bagian ini.</p></div>}
          </section>
  );
}
