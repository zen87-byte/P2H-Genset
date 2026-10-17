import React from "react";
import { Database } from "lucide-react";

export function Kpi({icon,label,value,note,critical=false}:{icon:React.ReactNode;label:string;value:string|number;note:string;critical?:boolean}) { return <div className={`kpi ${critical?"critical":""}`}><div className="kpi-top"><span>{label}</span><div>{icon}</div></div><strong>{value}</strong><small>{note}</small></div>; }
export function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="field"><span>{label}</span>{children}</label>; }
export function Empty({text}:{text:string}) { return <div className="empty"><Database size={20}/><span>{text}</span></div>; }
export function operationalLabel(s?:string) { return ({UNASSESSED:"Belum dinilai",OPERABLE:"Layak operasi",RESTRICTED:"Terbatas / evaluasi",NOT_OPERABLE:"Tidak layak operasi"} as Record<string,string>)[s||"UNASSESSED"]||"Belum dinilai"; }
export function statusLabel(s:string) { return ({OPEN:"Open",IN_PROGRESS:"In progress",WAITING_PART:"Waiting part",CLOSED:"Closed"} as Record<string,string>)[s]||s; }
