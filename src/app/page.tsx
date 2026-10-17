"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ClipboardCheck, Download, FileClock, Gauge, LayoutDashboard, Plus, RefreshCw, Search, ShieldAlert, Wrench, X, CheckCircle2, Database, LoaderCircle } from "lucide-react";
import { CHECKLIST } from "@/lib/checklist";
import { DashboardPage } from "@/components/pages/DashboardPage";
import { InspectionPage } from "@/components/pages/InspectionPage";
import { FindingsPage } from "@/components/pages/FindingsPage";
import { UserManagementPage } from "@/components/pages/UserManagementPage";
import { HistoryPage } from "@/components/pages/HistoryPage";
import { Field, operationalLabel, statusLabel } from "@/components/ui";

type Site = { id: string; code: string; name: string; generators: Generator[] };
type Generator = { id: string; assetCode: string; model: string | null; unitName: string | null; siteId: string; isEligible: boolean; operationalStatus?: "UNASSESSED"|"OPERABLE"|"RESTRICTED"|"NOT_OPERABLE"; operationalStatusNote?: string|null; operationalStatusUpdatedAt?: string|null; operationalStatusUpdatedBy?: string|null; statusLogs?:{id:string;previousStatus:string;newStatus:string;note:string|null;changedBy:string;changedAt:string}[] };
type Finding = { id: string; title: string; description: string; severity: "A"|"AA"; status: string; reporter: string; assignedTo: string|null; deadline: string|null; correctiveAction: string|null; closureNotes: string|null; createdAt: string; generator: Generator & { site: Site } };
type Dashboard = { date: string; sites: Site[]; generators: number; inspections: number; target: number; openFindings: number; critical: number; attention: Finding[]; bySite: {id:string;name:string;count:number;target:number}[] };
type Role = "TECHNICIAN" | "SUPERVISOR" | "ADMIN";
type SessionUser = {id:string;name:string;username:string;role:Role;siteIds?:string[]};
type Page = "Dashboard" | "Inspeksi Harian P2H" | "Temuan & Tindak Lanjut" | "History" | "Manajemen Akun";

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" });
const blankInspection = () => ({
  inspector: "", inspectionDate: today, shift: "I", siteId: "", generatorId: "", model: "", hmStart: "", hmEnd: "",
  notes: "", signatureName: "", items: Object.fromEntries(CHECKLIST.flatMap(s => s.items.map(i => [i.code, {result:"", notes:""}]))),
  parameters: { radiatorEmpty:"", radiatorLoaded:"", oilEmpty:"", oilLoaded:"", rpmEmpty:"", rpmLoaded:"", loadEmpty:"", loadLoaded:"", voltageEmpty:"", voltageLoaded:"", batteryEmpty:"", batteryLoaded:"" }
});

export default function Home() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [user, setUser] = useState<SessionUser|null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [login, setLogin] = useState({username:"",password:""});
  const [accountForm, setAccountForm] = useState<{name:string;username:string;password:string;role:string;siteIds:string[]}>({name:"",username:"",password:"",role:"TECHNICIAN",siteIds:[]});
  const [accounts, setAccounts] = useState<any[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState("daily");
  const [historySiteId, setHistorySiteId] = useState("ALL");
  const [masterSiteId, setMasterSiteId] = useState("ALL");
  const [inspectionDetail, setInspectionDetail] = useState<any|null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string,string[]>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string,string>>({});
  const [dashboard, setDashboard] = useState<Dashboard|null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [history, setHistory] = useState<any>({ inspections: [], findings: [] });
  const [dbStatus, setDbStatus] = useState("Memeriksa koneksi...");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [inspection, setInspection] = useState<any>(blankInspection());
  const [findingForm, setFindingForm] = useState({ generatorId:"", title:"", description:"", severity:"A", reporter:"", assignedTo:"", deadline:"" });
  const [editingFinding, setEditingFinding] = useState<Finding|null>(null);

  async function api(url: string, options?: RequestInit) {
    const response = await fetch(url, { ...options, headers: { "Content-Type":"application/json", ...(options?.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detailMessages: string[] = [];
      if (Array.isArray(data.details?.formErrors)) detailMessages.push(...data.details.formErrors);
      if (data.details?.fieldErrors && typeof data.details.fieldErrors === "object") {
        for (const [field, messages] of Object.entries(data.details.fieldErrors as Record<string, unknown>)) {
          if (Array.isArray(messages)) detailMessages.push(`${field}: ${messages.join(", ")}`);
        }
      }
      if (Array.isArray(data.issues)) {
        detailMessages.push(...data.issues.map((issue: any) =>
          `${Array.isArray(issue.path) && issue.path.length ? issue.path.join(".") : "Form"}: ${issue.message}`
        ));
      }
      const detailsText = detailMessages.length ? `\n\nDetail validasi:\n• ${detailMessages.join("\n• ")}` : "";
      throw new Error(`${data.error || `Request gagal (${response.status})`}${detailsText}`);
    }
    return data;
  }
  async function refresh() {
    setLoading(true);
    try {
      const [d, f, h, health] = await Promise.all([
        api("/api/dashboard"), api("/api/findings"), api("/api/history"), api("/api/health")
      ]);
      setDashboard(d); setFindings(f); setHistory(h); setDbStatus(health.database === "connected" ? "Supabase terhubung" : "Database bermasalah");
    } catch (e) {
      setDbStatus("Database belum terhubung");
      setNotice(e instanceof Error ? e.message : "Gagal mengambil data dari server.");
    } finally { setLoading(false); }
  }
  useEffect(() => { (async()=>{try{const d=await api("/api/auth/me");setUser(d.user);}catch{}finally{setAuthChecked(true);}})(); }, []);
  useEffect(() => { if(user) { setInspection((p:any)=>({...p,inspector:user.name})); refresh(); } }, [user]);
  useEffect(() => { if(user?.role==="ADMIN" && page==="Manajemen Akun") loadAccounts(); }, [user,page]);

  async function doLogin(e:React.FormEvent){e.preventDefault();try{const d=await api("/api/auth/login",{method:"POST",body:JSON.stringify(login)});setUser(d.user);setNotice("");}catch(e){setNotice(e instanceof Error?e.message:"Login gagal.");}}
  async function doLogout(){await api("/api/auth/logout",{method:"POST"}).catch(()=>{});setUser(null);setDashboard(null);setFindings([]);setHistory({inspections:[],findings:[]});setPage("Dashboard");}
  async function loadAccounts(){try{setAccounts(await api("/api/users"));}catch(e){setNotice(e instanceof Error?e.message:"Gagal memuat akun.");}}
  async function createAccount(e:React.FormEvent){e.preventDefault();try{await api("/api/users",{method:"POST",body:JSON.stringify(accountForm)});setAccountForm({name:"",username:"",password:"",role:"TECHNICIAN",siteIds:[]});setNotice("Akun berhasil dibuat.");await loadAccounts();}catch(e){setNotice(e instanceof Error?e.message:"Gagal membuat akun.");}}
  async function saveAssignments(id:string){try{await api("/api/users",{method:"PATCH",body:JSON.stringify({id,siteIds:assignmentDrafts[id]||[]})});setNotice("Penugasan site diperbarui.");await loadAccounts();}catch(e){setNotice(e instanceof Error?e.message:"Gagal memperbarui penugasan.");}}
  async function reviewInspection(id:string,decision:"APPROVED"|"REJECTED"){try{await api("/api/inspections/review",{method:"PATCH",body:JSON.stringify({id,decision,notes:reviewNotes[id]||""})});setNotice(decision==="APPROVED"?"Inspeksi disetujui.":"Inspeksi ditolak.");await refresh();}catch(e){setNotice(e instanceof Error?e.message:"Gagal memproses inspeksi.");}}

  const allGenerators = dashboard?.sites.flatMap(s => s.generators.map(g => ({...g, siteName:s.name}))) || [];
  const masterGenerators = allGenerators.filter(g=>masterSiteId==="ALL"||g.siteId===masterSiteId);
  const actionGenerators = allGenerators.filter(g=>user?.role==="ADMIN"||(user?.siteIds||[]).includes(g.siteId));
  const actionSites = (dashboard?.sites||[]).filter(s=>user?.role==="ADMIN"||(user?.siteIds||[]).includes(s.id));
  const historyInspections = (history.inspections||[]).filter((i:any)=>withinPeriod(i.inspectionDate,historyPeriod)&&(historySiteId==="ALL"||i.siteId===historySiteId));
  const historyFindings = (history.findings||[]).filter((f:any)=>withinPeriod(f.createdAt,historyPeriod)&&(historySiteId==="ALL"||f.generator.siteId===historySiteId));
  const visibleFindings = useMemo(() => findings.filter(f => {
    const match = `${f.title} ${f.description} ${f.generator.assetCode} ${f.generator.site.name} ${f.assignedTo || ""}`.toLowerCase().includes(search.toLowerCase());
    return match && (filterStatus === "ALL" || f.status === filterStatus);
  }), [findings, search, filterStatus]);

  function setInspectionField(key:string, value:any) { setInspection((p:any) => ({...p, [key]:value})); }
  function setParam(key:string, value:string) { setInspection((p:any) => ({...p, parameters:{...p.parameters,[key]: value === "" ? null : Number(value)}})); }
  function setItem(code:string, key:string, value:string) { setInspection((p:any) => ({...p, items:{...p.items,[code]:{...p.items[code],[key]:value}}})); }

  async function submitInspection(e: React.FormEvent) {
    e.preventDefault();
    const items = CHECKLIST.flatMap(s => s.items.map(i => ({ itemCode:i.code, result:inspection.items[i.code].result, notes:inspection.items[i.code].notes })));
    if (items.some(i => !i.result)) { setNotice("Semua 30 item checklist wajib dijawab."); return; }
    if (!inspection.siteId || !inspection.generatorId) { setNotice("Pilih site dan unit genset."); return; }
    try {
      await api("/api/inspections", { method:"POST", body:JSON.stringify({
        inspector:inspection.inspector, inspectionDate:inspection.inspectionDate, shift:inspection.shift,
        siteId:inspection.siteId, generatorId:inspection.generatorId, model:inspection.model,
        hmStart:inspection.hmStart === "" ? null : Number(inspection.hmStart),
        hmEnd:inspection.hmEnd === "" ? null : Number(inspection.hmEnd),
        notes:inspection.notes, signatureName:inspection.signatureName,
        items, parameters:Object.fromEntries(Object.entries(inspection.parameters).map(([k,v]) => [k,v === "" ? null : v]))
      })});
      setNotice("Inspeksi P2H berhasil disimpan ke database. Temuan otomatis dibuat untuk item RUSAK/PERBAIKI.");
      setInspection({...blankInspection(), inspector:user.name}); await refresh(); setPage("Dashboard");
    } catch(e) { setNotice(e instanceof Error ? e.message : "Gagal menyimpan inspeksi."); }
  }

  async function createFinding(e:React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/findings",{method:"POST",body:JSON.stringify({
        ...findingForm, deadline:findingForm.deadline ? new Date(`${findingForm.deadline}T00:00:00+08:00`).toISOString() : null
      })});
      setFindingForm({generatorId:"",title:"",description:"",severity:"A",reporter:"",assignedTo:"",deadline:""});
      setNotice("Temuan berhasil disimpan."); await refresh();
    } catch(e) { setNotice(e instanceof Error ? e.message : "Gagal menyimpan temuan."); }
  }

  async function saveFinding(e:React.FormEvent) {
    e.preventDefault(); if (!editingFinding) return;
    try {
      await api("/api/findings",{method:"PATCH",body:JSON.stringify({id:editingFinding.id,changes:{
        status:editingFinding.status, assignedTo:editingFinding.assignedTo, deadline:editingFinding.deadline ? new Date(editingFinding.deadline).toISOString() : null,
        correctiveAction:editingFinding.correctiveAction, closureNotes:editingFinding.closureNotes,
        title:editingFinding.title, description:editingFinding.description, severity:editingFinding.severity
      }})});
      setEditingFinding(null); setNotice("Perubahan temuan berhasil disimpan."); await refresh();
    } catch(e) { setNotice(e instanceof Error ? e.message : "Gagal memperbarui temuan."); }
  }


  function downloadCsv(filename:string, headers:string[], rows:any[][]) {
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}));
    const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
  }
  function exportHistoryInspectionsCSV() {
    const rows=historyInspections.map((i:any)=>[
      new Date(i.inspectionDate).toLocaleDateString("id-ID"),i.shift,i.generator?.site?.code,i.generator?.site?.name,i.generator?.assetCode,i.inspector,
      i.hmStart,i.hmEnd,i.approvalStatus,i.reviewNotes,i.notes,
      i.radiatorEmpty,i.radiatorLoaded,i.oilEmpty,i.oilLoaded,i.rpmEmpty,i.rpmLoaded,i.loadEmpty,i.loadLoaded,i.voltageEmpty,i.voltageLoaded,i.batteryEmpty,i.batteryLoaded,
      (i.items||[]).map((x:any)=>`${x.itemCode}: ${x.result}${x.notes?` (${x.notes})`:""}`).join(" | ")
    ]);
    downloadCsv(`genset-care-history-inspeksi-${today}.csv`,["Tanggal","Shift","Kode Site","Site","Nomor Unit","Teknisi","HM Awal","HM Akhir","Approval","Catatan Pengawas","Catatan Umum","Radiator Kosong","Radiator Berbeban","Oil Pressure Kosong","Oil Pressure Berbeban","RPM Kosong","RPM Berbeban","Load Kosong","Load Berbeban","Voltage Kosong","Voltage Berbeban","Battery Kosong","Battery Berbeban","Hasil Checklist dan Catatan Item"],rows);
  }
  function exportHistoryFindingsCSV() {
    const rows=historyFindings.map((f:any)=>[new Date(f.createdAt).toLocaleString("id-ID"),f.generator?.site?.code,f.generator?.site?.name,f.generator?.assetCode,f.title,f.description,f.severity,f.status,f.reporter,f.assignedTo,f.deadline?new Date(f.deadline).toLocaleDateString("id-ID"):"",f.correctiveAction,f.closureNotes,f.closedAt?new Date(f.closedAt).toLocaleString("id-ID"):""]);
    downloadCsv(`genset-care-history-temuan-${today}.csv`,["Dibuat","Kode Site","Site","Nomor Unit","Judul","Deskripsi","Bahaya","Status","Pelapor","PIC","Deadline","Tindakan Korektif","Catatan Penutupan","Waktu Ditutup"],rows);
  }

  function exportCSV() {
    const headers = ["Judul","Severity","Status","Unit","Site","Pelapor","PIC","Deadline","Tindakan Korektif","Catatan Penutupan","Dibuat","Ditutup"];
    const rows = findings.map(f => [f.title,f.severity,f.status,f.generator.assetCode,f.generator.site.name,f.reporter,f.assignedTo||"",f.deadline||"",f.correctiveAction||"",f.closureNotes||"",f.createdAt,(f as any).closedAt||""]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"})); a.download=`genset-care-temuan-${today}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  if (!authChecked) return <div className="login-screen"><div className="login-card"><div className="brand-mark"><Gauge size={26}/></div><h1>GENSET CARE</h1><p>Memeriksa sesi pengguna...</p></div></div>;
  if (!user) return <div className="login-screen"><form className="login-card" onSubmit={doLogin}><div className="brand-mark"><Gauge size={26}/></div><h1>GENSET CARE</h1><p>Berau Coal · Electrification</p>{notice&&<div className="notice">{notice}</div>}<Field label="Username"><input autoComplete="username" required value={login.username} onChange={e=>setLogin({...login,username:e.target.value})}/></Field><Field label="Password"><input type="password" autoComplete="current-password" required value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/></Field><button className="btn primary login-submit">Masuk</button><small>Akun dibuat oleh administrator. Tidak ada akun demo dengan password bawaan.</small></form></div>;
  const canInspect = user.role === "TECHNICIAN";
  const canManageFindings = user.role === "SUPERVISOR";
  const canReview = user.role === "SUPERVISOR";
  const ctx = { dashboard, findings, history, user, page, setPage, setEditingFinding, masterGenerators, allGenerators, masterSiteId, setMasterSiteId, operationalLabel, statusLabel, inspection, canInspect, submitInspection, setInspectionField, actionSites, actionGenerators, setParam, setItem, setInspection, blankInspection, findingForm, setFindingForm, canManageFindings, exportCSV, createFinding, search, setSearch, filterStatus, setFilterStatus, visibleFindings, editingFinding, accountForm, setAccountForm, createAccount, accounts, assignmentDrafts, setAssignmentDrafts, saveAssignments, historySiteId, setHistorySiteId, historyPeriod, setHistoryPeriod, refresh, historyInspections, historyFindings, exportHistoryInspectionsCSV, exportHistoryFindingsCSV, canReview, reviewNotes, setReviewNotes, reviewInspection, setInspectionDetail };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Gauge size={25}/></div><div><b>GENSET CARE</b><small>Maintenance Management</small></div></div>
      <div className="org">BERAU COAL <span>• ELECTRIFICATION</span></div>
      <nav>{([["Dashboard",LayoutDashboard],["History",FileClock],["Inspeksi Harian P2H",ClipboardCheck],["Temuan & Tindak Lanjut",Wrench],...(user.role==="ADMIN"?[["Manajemen Akun",Database] as const]:[])] as const).map(([label,Icon])=><button key={label} className={`nav-item ${page===label?"active":""}`} onClick={()=>setPage(label as Page)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="connection"><span className={`dot ${dbStatus==="Supabase terhubung"?"ok":"bad"}`}/><div><b>{dbStatus}</b><small>Database status</small></div><button title="Refresh" onClick={refresh}><RefreshCw size={15}/></button></div><small className="version">GENSET CARE · P2H</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">BERAU COAL ELECTRIFICATION / P2H</div><h1>{page}</h1><p>Program Pemeliharaan Harian genset</p></div><div className="top-actions"><span className="date-pill">{new Date().toLocaleDateString("id-ID",{weekday:"short",day:"2-digit",month:"short",year:"numeric",timeZone:"Asia/Makassar"})}</span><span className="date-pill">{user.name} · {({TECHNICIAN:"Teknisi",SUPERVISOR:"Pengawas",ADMIN:"Admin"} as any)[user.role]}</span><button className="btn secondary" onClick={refresh}><RefreshCw size={15}/> Refresh</button><button className="btn secondary" onClick={doLogout}>Keluar</button></div></header>
      {notice && <div className="notice"><span>{notice}</span><button onClick={()=>setNotice("")}><X size={16}/></button></div>}
      {loading && <div className="loading"><LoaderCircle className="spin" size={17}/> Mengambil data dari database...</div>}

      {page==="Dashboard" && <DashboardPage ctx={ctx} />}

      {page==="Inspeksi Harian P2H" && <InspectionPage ctx={ctx} />}

      {page==="Temuan & Tindak Lanjut" && <FindingsPage ctx={ctx} />}

      {page==="Manajemen Akun" && <UserManagementPage ctx={ctx} />}

      {page==="History" && <HistoryPage ctx={ctx} />}

      </main>
    {inspectionDetail && <div className="modal-backdrop" onClick={()=>setInspectionDetail(null)}><div className="modal inspection-detail-modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><div><h2>Detail inspeksi P2H</h2><p>{inspectionDetail.generator.assetCode} · {inspectionDetail.generator.site.name} · Shift {inspectionDetail.shift}</p></div><button className="icon-btn" onClick={()=>setInspectionDetail(null)}><X size={19}/></button></div><div className="detail-grid"><div><b>Tanggal</b><span>{new Date(inspectionDetail.inspectionDate).toLocaleDateString("id-ID")}</span></div><div><b>Teknisi</b><span>{inspectionDetail.inspector}</span></div><div><b>HM awal / akhir</b><span>{inspectionDetail.hmStart??"—"} / {inspectionDetail.hmEnd??"—"}</span></div><div><b>Status approval</b><span>{({PENDING:"Menunggu persetujuan",APPROVED:"Disetujui",REJECTED:"Ditolak"} as any)[inspectionDetail.approvalStatus]||"—"}</span></div><div className="detail-wide"><b>Catatan umum / serah terima</b><p>{inspectionDetail.notes||"Tidak ada catatan umum."}</p></div><div className="detail-wide"><b>Catatan pengawas</b><p>{inspectionDetail.reviewNotes||"Tidak ada catatan pengawas."}</p></div></div><h3>Parameter genset</h3><div className="table-wrap"><table><thead><tr><th>Parameter</th><th>Kosongan</th><th>Berbeban</th></tr></thead><tbody>{[["Radiator","radiatorEmpty","radiatorLoaded"],["Oil pressure","oilEmpty","oilLoaded"],["RPM","rpmEmpty","rpmLoaded"],["Load","loadEmpty","loadLoaded"],["Voltage","voltageEmpty","voltageLoaded"],["Battery","batteryEmpty","batteryLoaded"]].map(([label,a,b])=><tr key={label}><td>{label}</td><td>{inspectionDetail[a]??"—"}</td><td>{inspectionDetail[b]??"—"}</td></tr>)}</tbody></table></div><h3>Checklist dan catatan item</h3><div className="table-wrap"><table><thead><tr><th>Kode / item</th><th>Bahaya</th><th>Hasil</th><th>Catatan</th></tr></thead><tbody>{inspectionDetail.items.map((item:any)=><tr key={item.id}><td>{item.itemCode}<small className="table-sub">{item.description}</small></td><td>{item.hazard}</td><td>{item.result}</td><td>{item.notes||"—"}</td></tr>)}</tbody></table></div></div></div>}
    {editingFinding && canManageFindings && <div className="modal-backdrop" onClick={()=>setEditingFinding(null)}><form className="modal" onSubmit={saveFinding} onClick={e=>e.stopPropagation()}><div className="modal-header"><div><h2>Kelola temuan</h2><p>{editingFinding.generator.assetCode} · {editingFinding.generator.site.name}</p></div><button type="button" className="icon-btn" onClick={()=>setEditingFinding(null)}><X size={19}/></button></div>
      {editingFinding.status==="CLOSED"&&<div className="notice warning">Temuan CLOSED tersimpan permanen di register. Status tidak dapat dibuka kembali melalui form ini.</div>}
      <Field label="Judul"><input required value={editingFinding.title} onChange={e=>setEditingFinding({...editingFinding,title:e.target.value})}/></Field>
      <Field label="Deskripsi / risiko"><textarea rows={3} value={editingFinding.description} onChange={e=>setEditingFinding({...editingFinding,description:e.target.value})}/></Field>
      <div className="form-grid"><Field label="Bahaya"><select value={editingFinding.severity} onChange={e=>setEditingFinding({...editingFinding,severity:e.target.value as "A"|"AA"})}><option value="A">A</option><option value="AA">AA</option></select></Field><Field label="Status"><select disabled={editingFinding.status==="CLOSED"} value={editingFinding.status} onChange={e=>setEditingFinding({...editingFinding,status:e.target.value})}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_PART">Waiting part</option><option value="CLOSED">Closed</option></select></Field></div>
      <Field label="PIC"><input value={editingFinding.assignedTo||""} onChange={e=>setEditingFinding({...editingFinding,assignedTo:e.target.value})}/></Field>
      <Field label="Deadline"><input type="date" value={editingFinding.deadline?editingFinding.deadline.slice(0,10):""} onChange={e=>setEditingFinding({...editingFinding,deadline:e.target.value?new Date(`${e.target.value}T00:00:00+08:00`).toISOString():null})}/></Field>
      <Field label="Tindakan korektif"><textarea rows={3} value={editingFinding.correctiveAction||""} onChange={e=>setEditingFinding({...editingFinding,correctiveAction:e.target.value})}/></Field>
      <Field label="Catatan penutupan (wajib jika status CLOSED)"><textarea rows={3} value={editingFinding.closureNotes||""} onChange={e=>setEditingFinding({...editingFinding,closureNotes:e.target.value})}/></Field>
      <div className="form-actions"><button type="button" className="btn secondary" onClick={()=>setEditingFinding(null)}>Batal</button><button className="btn primary" type="submit">Simpan perubahan</button></div>
    </form></div>}
  </div>;
}

function withinPeriod(dateValue:string, period:string){const d=new Date(dateValue);const now=new Date();const start=new Date(now);if(period==="daily")start.setHours(0,0,0,0);else if(period==="weekly")start.setDate(start.getDate()-6);else if(period==="monthly")start.setMonth(start.getMonth()-1);else if(period==="3month")start.setMonth(start.getMonth()-3);else if(period==="6month")start.setMonth(start.getMonth()-6);else start.setFullYear(start.getFullYear()-1);return d>=start&&d<=now;}
