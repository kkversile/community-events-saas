export type Role='SUPER_ADMIN'|'COMMUNITY_ADMIN'|'TREASURER'|'EVENT_ADMIN'|'RESIDENT';
export interface SessionUser { id:string; firstName:string; lastName?:string; mobile:string; roles:Role[]; mustChangePassword?:boolean; community:{id:string;name:string;code:string}; unit?:{id:string;unitNumber:string;building:string;displayName:string}|null; }
export interface EventRow {id:string;name:string;slug:string;description?:string;startDate:string;endDate:string;status:string;_count?:{sessions:number;bookings:number};}
