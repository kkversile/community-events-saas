import type { ReactNode } from 'react';
export function Card({children,className=''}:{children:ReactNode;className?:string}){return <div className={`card ${className}`}>{children}</div>}
export function PageHeader({title,subtitle,action}:{title:string;subtitle?:string;action?:ReactNode}){return <div className="page-header"><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>}
export function Stat({label,value,sub}:{label:string;value:string|number;sub?:string}){return <Card><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{sub&&<div className="stat-sub">{sub}</div>}</Card>}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'success'|'warning'|'danger'|'info'}){return <span className={`badge badge-${tone}`}>{children}</span>}
export function Spinner(){return <div className="spinner-wrap"><div className="spinner"/></div>}
export function Empty({title,description}:{title:string;description?:string}){return <div className="empty"><strong>{title}</strong>{description&&<span>{description}</span>}</div>}
