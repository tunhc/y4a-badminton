const { useState, useEffect, useRef } = React;

/* ---------- helpers ---------- */
const fmt = (n) => (n || 0).toLocaleString('vi-VN');
const roundK = (n) => Math.round(n / 1000) * 1000;
const COLORS = ['#7CFF6B','#ffc24b','#6bd6ff','#ff8f6b','#c98bff','#6bffb0','#ff6b9d','#e0ff6b','#6b8fff'];
const initials = (name) => {
  const parts = name.replace(/[.]/g,' ').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
};

const DEFAULT_MEMBERS = ['Q.Anh','C.Tú','Kiệt Võ','Kim Cheese','Rin','Hòa Ngô','Thiện','Bạn Q.Anh','Bạn Kiệt Võ'];
const HOST = 'Q.Anh';

function freshWeek(members, seed) {
  const players = {};
  members.forEach((m) => { players[m] = { playing: false, paid: false }; });
  if (seed) {
    members.slice(0, 8).forEach((m) => { players[m] = { playing: true, paid: m === HOST }; });
    players[HOST].paid = true;
  }
  return { shuttle: seed ? 250000 : 0, court: seed ? 350000 : 0, players };
}

function freshState() {
  const members = [...DEFAULT_MEMBERS];
  return {
    monthIdx: 5, // June
    year: 2026,
    members,
    weeks: [freshWeek(members, true), freshWeek(members, false), freshWeek(members, false), freshWeek(members, false)],
  };
}

const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const STORE_KEY = 'chiacau_v1';

/* ---------- icons ---------- */
const I = {
  qr: <svg viewBox="0 0 24 24" fill="none"><path d="M4 4h6v6H4V4zM14 4h6v6h-6V4zM4 14h6v6H4v-6z" stroke="#072a0c" strokeWidth="2" strokeLinejoin="round"/><path d="M14 14h2v2h-2v-2zM18 14h2v2h-2v-2zM14 18h2v2h-2v-2zM18 18h2v2h-2v-2z" fill="#072a0c"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  shuttle: <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l3 9H9l3-9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="16.5" r="4" stroke="currentColor" strokeWidth="1.8"/></svg>,
  court: <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><path d="M12 5v14M3 12h18" stroke="currentColor" strokeWidth="1.6"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>,
  left: <svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  right: <svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.8"/></svg>,
};

/* ---------- money input ---------- */
function MoneyInput({ icon, label, value, onChange }) {
  return (
    <div className="infield">
      <div className="lab"><span className="ic">{icon}</span>{label}</div>
      <div className="valrow">
        <input
          inputMode="numeric"
          value={value ? fmt(value) : ''}
          placeholder="0"
          onChange={(e) => onChange(parseInt(e.target.value.replace(/\D/g,'')||'0', 10))}
        />
        <span className="unit">đ</span>
      </div>
    </div>
  );
}

/* ---------- main ---------- */
function App() {
  const [st, setSt] = useState(() => {
    try { const s = localStorage.getItem(STORE_KEY); if (s) return JSON.parse(s); } catch(e){}
    return freshState();
  });
  const [tab, setTab] = useState(0); // 0-3 weeks, 4 = total
  const [qrOpen, setQrOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const toastRef = useRef();

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch(e){} }, [st]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 1800);
  };

  const colorOf = (m) => COLORS[st.members.indexOf(m) % COLORS.length];

  /* ---- week computations ---- */
  const weekCalc = (w) => {
    const total = (w.shuttle || 0) + (w.court || 0);
    const playing = st.members.filter((m) => w.players[m] && w.players[m].playing);
    const per = playing.length ? roundK(total / playing.length) : 0;
    return { total, playing, per };
  };

  const week = st.weeks[tab] || st.weeks[0];
  const { total, playing, per } = weekCalc(week);
  const owing = playing.filter((m) => m !== HOST);
  const paidCount = owing.filter((m) => week.players[m].paid).length;

  /* ---- mutations ---- */
  const setWeek = (fn) => setSt((s) => {
    const weeks = s.weeks.map((w, i) => i === tab ? fn({ ...w, players: { ...w.players } }) : w);
    return { ...s, weeks };
  });
  const setField = (k, v) => setWeek((w) => ({ ...w, [k]: v }));
  const togglePlay = (m) => setWeek((w) => {
    const p = { ...w.players[m], playing: !w.players[m].playing };
    if (!p.playing) p.paid = false;
    if (m === HOST && p.playing) p.paid = true;
    return { ...w, players: { ...w.players, [m]: p } };
  });
  const togglePaid = (m) => { if (m === HOST) return; setWeek((w) => ({ ...w, players: { ...w.players, [m]: { ...w.players[m], paid: !w.players[m].paid } } })); };

  const addMember = () => {
    const nm = newName.trim();
    if (!nm) return;
    if (st.members.includes(nm)) { showToast('Tên đã có rồi'); return; }
    setSt((s) => {
      const members = [...s.members, nm];
      const weeks = s.weeks.map((w, i) => {
        const players = { ...w.players, [nm]: { playing: i === tab, paid: false } };
        return { ...w, players };
      });
      return { ...s, members, weeks };
    });
    setNewName('');
    setAddOpen(false);
    showToast('Đã thêm ' + nm);
  };

  const resetAll = (keepMembers) => {
    setSt((s) => {
      const members = keepMembers ? s.members : [...DEFAULT_MEMBERS];
      return { ...s, members, weeks: [freshWeek(members,false), freshWeek(members,false), freshWeek(members,false), freshWeek(members,false)] };
    });
    setResetOpen(false);
    setTab(0);
    showToast('Đã khởi tạo lại, tính tiền mới 🏸');
  };

  const changeMonth = (d) => setSt((s) => {
    let mi = s.monthIdx + d, yr = s.year;
    if (mi > 11) { mi = 0; yr++; } if (mi < 0) { mi = 11; yr--; }
    return { ...s, monthIdx: mi, year: yr };
  });

  const copyAcct = () => {
    navigator.clipboard && navigator.clipboard.writeText('4832441');
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  /* ---- total view data ---- */
  const memberTotals = st.members.map((m) => {
    let owed = 0, paid = 0;
    const weeks = st.weeks.map((w) => {
      const c = weekCalc(w);
      const playingHere = w.players[m] && w.players[m].playing;
      if (!playingHere) return 'none';
      if (m === HOST) return 'host';
      owed += c.per;
      if (w.players[m].paid) { paid += c.per; return 'paid'; }
      return 'unpaid';
    });
    return { m, owed, paid, weeks, host: m === HOST };
  });
  const grandOwed = memberTotals.reduce((a, x) => a + x.owed, 0);
  const grandPaid = memberTotals.reduce((a, x) => a + x.paid, 0);
  const grandOut = grandOwed - grandPaid;
  const pct = grandOwed ? Math.round(grandPaid / grandOwed * 100) : 0;

  return (
    <div className="app">
      <div className="court-lines"></div>

      <header>
        <div className="brand">
          <div className="logo">
            <div className="mk">C</div>
            <div className="wm">CHIA&nbsp;CẦU<small>CHIA TIỀN NHÓM</small></div>
          </div>
          <div className="host-chip" onClick={() => setQrOpen(true)}>
            <div className="ht"><b>Quế Anh</b><span>HOST · THU TIỀN</span></div>
            <div className="qr-btn">{I.qr}</div>
          </div>
        </div>

        <div className="monthrow">
          <div className="ml"><span className="dot"></span>{MONTHS[st.monthIdx]} · {st.year}</div>
          <div className="navmonth">
            <button onClick={() => changeMonth(-1)}>{I.left}</button>
            <button onClick={() => changeMonth(1)}>{I.right}</button>
          </div>
        </div>

        <div className="tabs">
          {[0,1,2,3].map((i) => (
            <button key={i} className={tab===i?'active':''} onClick={() => setTab(i)}>
              Tuần {i+1}
              <span className="sub">W{i+1}</span>
            </button>
          ))}
          <button className={'tot '+(tab===4?'active':'')} onClick={() => setTab(4)}>
            Tổng
            <span className="sub">∑</span>
          </button>
        </div>
      </header>

      <div className="scroll">
        {tab < 4 ? (
          <div className="body fade" key={'w'+tab}>
            {/* inputs */}
            <div className="sec-label"><span className="n">1</span>Chi phí buổi đánh</div>
            <div className="inputs">
              <MoneyInput icon={I.shuttle} label="Ống cầu" value={week.shuttle} onChange={(v) => setField('shuttle', v)} />
              <MoneyInput icon={I.court} label="Tiền sân" value={week.court} onChange={(v) => setField('court', v)} />
            </div>

            {/* summary */}
            <div className="summary">
              <div className="sumtop">
                <div className="minicol"><div className="k">Tổng chi</div><div className="v">{fmt(total)}đ</div></div>
                <div className="minicol"><div className="k">Số người</div><div className="v">{playing.length}</div></div>
                <div className="minicol"><div className="k">Đã thu</div><div className="v peo">{paidCount}/{owing.length}</div></div>
              </div>
              <div className="sumdiv"></div>
              <div className="perperson">
                <div className="pl">Mỗi người trả<br/><b>chia đều {playing.length || 0} người</b></div>
                <div className="pv">{fmt(per)}<span className="d">đ</span></div>
              </div>
            </div>

            {/* pool */}
            <div className="poolwrap">
              <div className="sec-label"><span className="n">2</span>Ai đánh tuần này?</div>
              <div className="pool">
                {st.members.map((m) => (
                  <div key={m} className={'chip '+(week.players[m]&&week.players[m].playing?'on':'')} onClick={() => togglePlay(m)}>
                    <span className="tick">{I.check}</span>{m}{m===HOST?' 👑':''}
                  </div>
                ))}
                <div className="chip add" onClick={() => setAddOpen(true)}>
                  <span className="tick">{I.plus}</span>Thêm tên
                </div>
              </div>
            </div>

            {/* settlement */}
            <div className="settle">
              <div className="settle-head">
                <div className="sec-label" style={{margin:0}}><span className="n">3</span>Thanh toán</div>
                <div className="prog">Đã thu <b>{fmt(paidCount*per)}đ</b> / {fmt(owing.length*per)}đ</div>
              </div>
              {playing.length === 0 ? (
                <div className="empty">Chọn người đánh ở trên để<br/>tính tiền và theo dõi thanh toán 🏸</div>
              ) : (
                playing.map((m) => {
                  const isHost = m === HOST;
                  const paid = week.players[m].paid;
                  return (
                    <div key={m} className={'srow '+(paid?'paid':'')}>
                      <div className="avi" style={{background: colorOf(m)}}>{initials(m)}</div>
                      <div className="sinfo">
                        <div className="nm">{m}{isHost && <span className="badge">Host</span>}</div>
                        <div className={'amt '+(isHost?'z':'')}>{isHost ? 'Người thu tiền' : fmt(per)+'đ'}</div>
                      </div>
                      {isHost ? (
                        <button className="paybtn host">Chủ chi</button>
                      ) : (
                        <button className={'paybtn '+(paid?'done':'')} onClick={() => togglePaid(m)}>
                          {paid ? <>{I.check}Đã trả</> : 'Chưa trả'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="fab-row">
              <button className="bigbtn" onClick={() => setQrOpen(true)}>{I.qr}Xem QR chuyển khoản</button>
            </div>
          </div>
        ) : (
          /* ---------- TOTAL ---------- */
          <div className="body fade">
            <div className="sec-label"><span className="n">∑</span>Tổng kết {MONTHS[st.monthIdx]}</div>
            <div className="tot-hero">
              <div className="col"><div className="k">Đã thu</div><div className="v g">{fmt(grandPaid)}<small>đ</small></div></div>
              <div className="col"><div className="k">Còn thiếu</div><div className="v a">{fmt(grandOut)}<small>đ</small></div></div>
            </div>
            <div className="tbar"><i style={{width: pct+'%'}}></i></div>

            <div className="mtable">
              <div className="thead"><span>Thành viên · W1–W4</span><span>Tổng nợ</span></div>
              {memberTotals.map(({m, owed, paid, weeks, host}) => (
                <div key={m} className="mrow">
                  <div className="left">
                    <div className="avi" style={{background: colorOf(m)}}>{initials(m)}</div>
                    <div>
                      <div className="nm">{m}{host?' 👑':''}</div>
                      <div className="weeks">
                        {weeks.map((s, i) => <span key={i} className={'wd '+(s==='paid'||s==='host'?'paidw':s==='unpaid'?'played':'')}></span>)}
                      </div>
                    </div>
                  </div>
                  <div className="right">
                    {host ? (
                      <><div className="rt" style={{color:'var(--txt-3)'}}>—</div><div className="rs">Chủ chi</div></>
                    ) : (
                      <><div className="rt">{fmt(owed)}đ</div><div className={'rs '+(owed>0&&paid>=owed?'ok':'')}>{owed===0?'Không đánh':paid>=owed?'Đã trả đủ':'Còn '+fmt(owed-paid)+'đ'}</div></>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:'18px 2px 6px',color:'var(--txt-3)',fontSize:11,textAlign:'center',lineHeight:1.6}}>
              🟢 đã trả &nbsp;·&nbsp; 🟡 chưa trả &nbsp;·&nbsp; ⚫ không đánh
            </div>
            <div className="fab-row">
              <button className="bigbtn" onClick={() => setQrOpen(true)}>{I.qr}Xem QR chuyển khoản</button>
            </div>
            <div className="reset-block">
              <div className="reset-card">
                <div className="rc-txt">
                  <b>Trả hết rồi?</b>
                  <span>Xoá toàn bộ chi phí & lượt đánh 4 tuần để bắt đầu tính tiền tháng mới.</span>
                </div>
                <button className="bigbtn danger" onClick={() => setResetOpen(true)}>↻&nbsp; Khởi tạo lại toàn bộ</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- QR sheet ---------- */}
      <div className={'ov '+(qrOpen?'show':'')} onClick={() => setQrOpen(false)}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="grab"></div>
          <h3>Chuyển khoản cho Host</h3>
          <div className="sub">Quét mã ACB · TRINH QUE ANH</div>
          <div className="qrcard"><img src="assets/host-qr.png" alt="QR chuyển khoản" onError={(e)=>{e.target.style.display='none';e.target.nextSibling.style.display='block';}} /><div style={{display:'none',padding:'30px 0',color:'#666',fontSize:13}}>Không tìm thấy ảnh QR.<br/>Vui lòng thêm file <b>assets/host-qr.png</b></div></div>
          <div className="acct">
            <div className="ai">
              <div className="bk">NGÂN HÀNG ACB</div>
              <div className="no">4832441</div>
              <div className="ow">TRINH QUE ANH</div>
            </div>
            <button className={'copy '+(copied?'ok':'')} onClick={copyAcct}>{copied?I.check:I.copy}{copied?'Đã chép':'Copy'}</button>
          </div>
          {tab < 4 && per > 0 && (
            <div className="amt-note"><span className="l">Số tiền mỗi người tuần này</span><span className="v">{fmt(per)}đ</span></div>
          )}
          {tab === 4 && grandOut > 0 && (
            <div className="amt-note"><span className="l">Tổng còn thiếu tháng này</span><span className="v">{fmt(grandOut)}đ</span></div>
          )}
        </div>
      </div>

      {/* ---------- add name sheet ---------- */}
      <div className={'ov '+(addOpen?'show':'')} onClick={() => setAddOpen(false)}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="grab"></div>
          <h3>Thêm thành viên</h3>
          <div className="sub">Thêm tên lẻ vào danh sách nhóm</div>
          <div className="field">
            <input autoFocus value={newName} placeholder="Ví dụ: Irene, Hòa, CaTu…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key==='Enter'&&addMember()} />
          </div>
          <button className="bigbtn" onClick={addMember}>{I.plus}Thêm vào nhóm</button>
          <button className="bigbtn ghost" onClick={() => { setAddOpen(false); setNewName(''); }}>Huỷ</button>
        </div>
      </div>

      {/* ---------- reset confirm sheet ---------- */}
      <div className={'ov '+(resetOpen?'show':'')} onClick={() => setResetOpen(false)}>
        <div className="sheet" onClick={(e) => e.stopPropagation()}>
          <div className="grab"></div>
          <h3>Khởi tạo lại toàn bộ?</h3>
          <div className="sub">Xoá hết tiền ống cầu, tiền sân, lượt đánh và<br/>trạng thái thanh toán của cả 4 tuần.</div>
          <button className="bigbtn danger" onClick={() => resetAll(true)}>↻&nbsp; Xoá & tính lại (giữ danh sách tên)</button>
          <button className="bigbtn ghost" onClick={() => resetAll(false)}>Xoá luôn cả tên lẻ đã thêm</button>
          <button className="bigbtn ghost" onClick={() => setResetOpen(false)}>Huỷ</button>
        </div>
      </div>

      <div className={'toast '+(toast?'show':'')}>{toast}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
