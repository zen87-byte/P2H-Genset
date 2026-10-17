"use client";

import { Activity, AlertTriangle, ClipboardCheck, Gauge, ShieldAlert, Wrench } from "lucide-react";
import { Empty, Field, Kpi, operationalLabel, statusLabel } from "@/components/ui";

type Props = { ctx: Record<string, any> };

export function DashboardPage({ ctx }: Props) {
  const { dashboard, user, page, setPage, setEditingFinding, masterGenerators, allGenerators, masterSiteId, setMasterSiteId } = ctx;
  return (
    <section className="content">
            <div className="welcome"><div><span className="eyebrow light">MONITORING HARIAN</span><h2>Pastikan setiap genset siap beroperasi.</h2><p>Ringkasan inspeksi P2H, status temuan, dan unit yang membutuhkan perhatian.</p></div><div className="welcome-icon"><Activity size={42}/></div></div>
            <div className="kpi-grid">
              <Kpi icon={<ClipboardCheck/>} label="P2H selesai hari ini" value={`${dashboard?.inspections??0} / ${dashboard?.target??0}`} note="Target 2 shift per unit eligible" />
              <Kpi icon={<Gauge/>} label="Unit genset terdaftar" value={dashboard?.generators??0} note="Master asset database" />
              <Kpi icon={<Wrench/>} label="Temuan terbuka" value={dashboard?.openFindings??0} note="Tidak termasuk CLOSED" />
              <Kpi icon={<ShieldAlert/>} label="Temuan kritis AA" value={dashboard?.critical??0} note="Ikuti prosedur STOP OPERASI" critical />
            </div>
            <div className="two-col">
              <div className="panel"><div className="panel-heading"><div><h3>Progress P2H per site</h3><p>Inspeksi hari ini dibanding target</p></div><span className="mini-label">HARI INI</span></div>
                <div className="site-progress">{(dashboard?.bySite||[]).map(s=><div className="progress-row" key={s.id}><div className="progress-label"><b>{s.name}</b><span>{s.count} / {s.target}</span></div><div className="progress-track"><div style={{width:`${s.target?Math.min(100,s.count/s.target*100):0}%`}}/></div></div>)}</div>
              </div>
              <div className="panel attention"><div className="panel-heading"><div><h3>Temuan yang perlu perhatian</h3><p>Temuan aktif, prioritas AA ditampilkan lebih dulu</p></div><AlertTriangle size={19}/></div>
                {dashboard?.attention?.length ? dashboard.attention.map(f=><div className="attention-item" key={f.id}><span className={`severity ${f.severity==="AA"?"aa":"a"}`}>{f.severity}</span><div><b>{f.title}</b><small>{f.generator.assetCode} · {f.generator.site.name} · {statusLabel(f.status)}</small></div><button onClick={()=>{setEditingFinding(f);setPage("Temuan & Tindak Lanjut")}}>Detail</button></div>) : <Empty text="Tidak ada temuan aktif. Semoga karena memang beres, bukan karena lupa input."/ >}
              </div>
            </div>
            <div className="panel"><div className="panel-heading"><div><h3>Master unit genset</h3><p>Status operasional dihitung dari hasil P2H terakhir yang disetujui pengawas</p></div><span className="mini-label">{masterGenerators.length} UNIT</span></div>
              <div className="filters"><Field label="Filter site"><select value={masterSiteId} onChange={e=>setMasterSiteId(e.target.value)}><option value="ALL">Semua site</option>{dashboard?.sites.map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></Field></div>
              <div className="table-wrap"><table><thead><tr><th>Asset code</th><th>Site</th><th>Model</th><th>Target P2H</th><th>Status operasional</th><th>Dasar status</th></tr></thead><tbody>{masterGenerators.map(g=><tr key={g.id}><td className="mono">{g.assetCode}</td><td>{g.siteName}</td><td>{g.model||"Belum diisi"}</td><td><span className="status status-open">{g.isEligible?"Eligible P2H":"Non-eligible P2H"}</span></td><td><span className={`status ${g.operationalStatus==="OPERABLE"?"status-closed":g.operationalStatus==="NOT_OPERABLE"?"status-open":"status-pending"}`}>{operationalLabel(g.operationalStatus)}</span></td><td>{g.operationalStatusNote||"Belum ada hasil P2H yang disetujui"}{g.operationalStatusUpdatedAt&&<small className="table-sub">Diperbarui {new Date(g.operationalStatusUpdatedAt).toLocaleString("id-ID")}{g.operationalStatusUpdatedBy?` · ${g.operationalStatusUpdatedBy}`:""}</small>}</td></tr>)}</tbody></table></div>
              {allGenerators.some(g=>g.assetCode==="BC-GE-P-23")&&<p className="footnote">Catatan master data: kode BC-GE-P-23 terduplikasi di daftar sumber (Binungan dan Sambarata). Seed hanya memasukkan satu entri sampai kode resmi diverifikasi.</p>}
            </div>
            <div className="panel"><div className="panel-heading"><div><h3>Riwayat status operasional</h3><p>Perubahan status terbaru beserta alasan dan pihak yang mencatat</p></div></div><div className="table-wrap"><table><thead><tr><th>Waktu</th><th>Unit / site</th><th>Status sebelumnya</th><th>Status baru</th><th>Alasan / referensi</th><th>Diubah oleh</th></tr></thead><tbody>{allGenerators.flatMap(g=>(g.statusLogs||[]).map(log=>({...log,assetCode:g.assetCode,siteName:g.siteName}))).sort((a,b)=>new Date(b.changedAt).getTime()-new Date(a.changedAt).getTime()).slice(0,20).map(log=><tr key={log.id}><td>{new Date(log.changedAt).toLocaleString("id-ID")}</td><td>{log.assetCode}<small className="table-sub">{log.siteName}</small></td><td>{operationalLabel(log.previousStatus)}</td><td>{operationalLabel(log.newStatus)}</td><td>{log.note||"—"}</td><td>{log.changedBy}</td></tr>)}</tbody></table>{allGenerators.every(g=>!(g.statusLogs||[]).length)&&<Empty text="Belum ada perubahan status operasional yang tercatat."/>}</div></div>
          </section>
  );
}
