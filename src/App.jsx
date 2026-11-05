import React, { useEffect, useState } from 'react';
import { Pickaxe, Home, Gift, Users, UserRound, Zap, Copy, RefreshCw } from 'lucide-react';
import { api } from './api';

const fmt = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
const duration = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 3600)}h ${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}m ${String(total % 60).padStart(2, '0')}s`;
};

export default function App() {
  const [tab, setTab] = useState('Home');
  const [data, setData] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  async function load() {
    try {
      setData(await api('/dashboard/'));
      setReferrals(await api('/referrals/'));
      setTasks(await api('/tasks/'));
      setLeaderboard(await api('/leaderboard/'));
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!data?.active_mining) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [data?.active_mining]);

  async function act(path) {
    setBusy(true); setMessage('');
    try { await api(path, 'POST'); await load(); setMessage('Updated successfully'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  const user = data?.user;
  const session = data?.active_mining;
  const remaining = session ? new Date(session.ends_at).getTime() - now : 0;
  const locked = Boolean(session && remaining > 0);
  const nav = [['Home', Home], ['Mining', Pickaxe], ['Tasks', Gift], ['Friends', Users], ['Profile', UserRound]];

  return <div className="shell">
    <header><div className="logo"><Pickaxe /><span><b>CURSE</b><small>MINING NETWORK</small></span></div><span className="avatar">{(user?.first_name || 'N')[0]}</span></header>
    {import.meta.env.VITE_DEMO_MODE === 'true' && <aside>DEMO PREVIEW - SAMPLE ACCOUNT</aside>}
    {message && <p className="msg">{message}</p>}
    {!data ? <p className="loading"><RefreshCw /> Loading dashboard...</p> : <main>
      {tab === 'Home' && <>
        <div className="welcome"><small>WELCOME BACK</small><h1>{user?.first_name || 'Miner'} 👋</h1><p>Your mining journey continues.</p></div>
        <section className="balance"><small>TOTAL TOKEN BALANCE</small><h2>{fmt(user?.balance)} <i>NEX</i></h2><p><Zap size={14} /> {fmt(user?.total_earned)} total earned <span>Virtual points</span></p></section>
        <div className="stats"><article><small>MINING RATE</small><b>{data.mining_rate_per_hour} <i>NEX/hr</i></b></article><article><small>REFERRALS</small><b>{data.referral_count}</b></article></div>
        <section className="panel"><div className="split"><div><small>YOUR MINING SESSION</small><h3>{session ? 'Mining in progress' : 'Ready to mine?'}</h3></div><em className={session ? 'active' : ''}>{session ? 'ACTIVE' : 'INACTIVE'}</em></div>
          <div className="pick"><Pickaxe /><b>{session ? 'ACTIVE' : 'NEX'}</b></div>
          <p className="muted">{session ? (locked ? `Mining locked - ${duration(remaining)} remaining` : 'Session complete - ready to release rewards') : `Earn virtual tokens for ${data.mining_duration_hours} hours.`}</p>
          <button onClick={() => act(session ? '/mining/claim/' : '/mining/start/')} disabled={busy || locked}>{session ? (locked ? 'Locked until complete' : 'Claim rewards') : 'Start Mining'}</button>
        </section>
        <section className="panel"><h3>Recent activity</h3>{data.transactions?.length ? data.transactions.slice(0, 5).map((item) => <p className="tx" key={item.id}><span>{item.tx_type.replaceAll('_', ' ')}</span><b>+{fmt(item.amount)} NEX</b></p>) : <p className="muted">Your transactions will appear here.</p>}</section>
      </>}
      {tab === 'Mining' && <section className="panel page"><small>MINING CENTER</small><h1>Mining</h1><h2>{data.mining_rate_per_hour} NEX / hour</h2><p className="muted">Session duration: {data.mining_duration_hours} hours</p><button onClick={() => act(session ? '/mining/claim/' : '/mining/start/')} disabled={busy || locked}>{session ? (locked ? `Locked ${duration(remaining)}` : 'Claim rewards') : 'Start mining'}</button></section>}
      {tab === 'Tasks' && <section className="page"><small>EARN MORE</small><h1>Tasks & rewards</h1><div className="task"><div><b>Daily check-in</b><p>{data.daily_claimed ? 'Already claimed today' : 'Claim your daily reward'}</p><strong>+{fmt(data.daily_reward)} NEX</strong></div><button onClick={() => act('/rewards/daily/claim/')} disabled={busy || data.daily_claimed}>{data.daily_claimed ? 'Claimed today' : 'Claim'}</button></div>{tasks.map((task) => <div className="task" key={task.id}><div><b>{task.title}</b><p>{task.description}</p><strong>+{fmt(task.reward)} NEX</strong></div><button disabled={busy || task.completed} onClick={() => act(`/tasks/${task.id}/claim/`)}>{task.completed ? 'Done' : 'Claim'}</button></div>)}</section>}
      {tab === 'Friends' && <section className="page"><small>GROW TOGETHER</small><h1>Invite friends</h1><div className="panel center"><h2>{referrals?.referral_count || 0}</h2><p>Successful referrals</p></div><div className="copy"><span>{referrals?.referral_link}</span><button onClick={() => navigator.clipboard?.writeText(referrals?.referral_link || '')}><Copy /></button></div><button onClick={() => window.Telegram?.WebApp?.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(referrals?.referral_link || '')}`)}>Invite on Telegram</button><h3>Top miners</h3>{leaderboard.map((item) => <p className="tx" key={item.rank}><span>#{item.rank} {item.username}</span><b>{fmt(item.total_earned)} NEX</b></p>)}</section>}
      {tab === 'Profile' && <section className="page"><small>YOUR ACCOUNT</small><h1>Profile</h1><div className="profile"><div className="avatar big">{(user?.first_name || 'N')[0]}</div><h3>{user?.first_name} {user?.last_name}</h3><p>@{user?.username || 'telegram_user'}</p></div>{[['Telegram ID', user?.telegram_id], ['Referral code', user?.referral_code], ['Balance', `${fmt(user?.balance)} NEX`], ['Total earned', `${fmt(user?.total_earned)} NEX`], ['Joined', user?.created_at && new Date(user.created_at).toLocaleDateString()]].map(([label, value]) => <p className="tx" key={label}><span>{label}</span><b>{value}</b></p>)}</section>}
    </main>}
    <nav>{nav.map(([name, Icon]) => <button className={tab === name ? 'sel' : ''} key={name} onClick={() => setTab(name)}><Icon /><small>{name}</small></button>)}</nav>
    <footer>Virtual points only - No blockchain withdrawals enabled</footer>
  </div>;
}
