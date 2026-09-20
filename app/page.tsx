import Link from 'next/link';
export default function Home(){return <main style={{maxWidth:650,margin:'13vh auto',padding:24}}><h1>YouCan IP Protection</h1><p>Remote rules, per-store licensing and a small client-side installation snippet.</p><Link href="/dashboard">Open dashboard →</Link><p style={{color:'#666'}}>Visual client-side blocking only. Deploy behind a trusted reverse proxy.</p></main>}
