import { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  LayoutDashboard, Calendar as CalendarIcon, ListTodo, Target, PenLine,
  Wallet, BookOpen, Sparkles, Sun, Moon, Menu, X, Plus, Check, Flame,
  ChevronLeft, ChevronRight, Pencil, Trash2, Star, ArrowDownRight,
  ArrowUpRight, Clock, Leaf, ImagePlus, Upload,
  Settings, Eye, EyeOff, ArrowUp, ArrowDown, ListChecks, NotebookPen,
  Heart, ShoppingCart, Dumbbell, Plane, Music, Coffee, Camera, Briefcase, Gift, TrendingUp, Palette, CalendarClock, Download,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   Momentum — 올인원 개인 비서 (프론트엔드 전용 프로토타입, DB 연동 없음)
   · 사이드바 네비게이션 + 7개 페이지
   · 각 페이지에서 추가/수정/취소/삭제(CRUD) 가능
   · 데이터는 메모리(useState)에만 — 새로고침 시 초기화됩니다
   ════════════════════════════════════════════════════════════════ */

/* ── 유틸 ── */
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const WON = (n) => "₩" + new Intl.NumberFormat("ko-KR").format(Math.round(n || 0));
const comma = (s) => {
  const n = parseInt(String(s).replace(/[^0-9]/g, ""), 10);
  return n ? new Intl.NumberFormat("ko-KR").format(n) : "";
};
const num = (s) => parseInt(String(s).replace(/[^0-9]/g, ""), 10) || 0;
const uid = () => Date.now() + Math.floor(Math.random() * 999);

/* ── localStorage 영속화 (브라우저에서 안전하게, 미지원 환경에선 메모리로 폴백) ── */
const LS = (() => {
  try { const k = "__momentum_test__"; window.localStorage.setItem(k, "1"); window.localStorage.removeItem(k); return window.localStorage; }
  catch (e) { return null; }
})();
function usePersistentState(key, initial) {
  const [val, setVal] = useState(() => {
    if (!LS) return initial;
    try { const raw = LS.getItem(key); return raw != null ? JSON.parse(raw) : initial; } catch (e) { return initial; }
  });
  useEffect(() => {
    if (!LS) return;
    try { LS.setItem(key, JSON.stringify(val)); } catch (e) { /* 저장 공간 초과 등은 조용히 무시 */ }
  }, [key, val]);
  return [val, setVal];
}

const NOW = new Date();
const TODAY = { y: NOW.getFullYear(), m: NOW.getMonth(), d: NOW.getDate() };
const TODAY_KEY = keyOf(TODAY.y, TODAY.m, TODAY.d);

function monthMatrix(y, m) {
  const first = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const prev = new Date(y, m, 0).getDate();
  const cells = [];
  for (let i = first - 1; i >= 0; i--) cells.push({ d: prev - i, cur: false });
  for (let d = 1; d <= dim; d++) cells.push({ d, cur: true });
  let nx = 1;
  while (cells.length < 42) cells.push({ d: nx++, cur: false });
  return cells;
}

/* 분류 → 색 */
const CAT_COLOR = { 업무:"violet", 개인:"rose", 건강:"green", 약속:"blue", 공부:"gold", 생활:"coral", 식비:"coral", 교통:"blue", 카페:"gold", 쇼핑:"violet", 여가:"rose", 급여:"green", 용돈:"green", 환급:"blue", 기타:"faint" };
const VAR = (c) => `var(--${c || "faint"})`;
const catVar = (name) => VAR(CAT_COLOR[name] || "accent");
const tint = (v, p = 14) => `color-mix(in srgb, ${v} ${p}%, transparent)`;

const MOOD_THEMES = [
  { id:"amber", label:"앰버", sub:"따뜻한 베이지·살구", swatch:["#f1b07f","#1e1c27","#f4f1ec"] },
  { id:"slate", label:"슬레이트", sub:"차분한 블루그레이", swatch:["#7ea8e0","#1b212d","#eef1f5"] },
  { id:"forest", label:"포레스트", sub:"자연스러운 그린", swatch:["#8fc97a","#1b251a","#f1f4ec"] },
  { id:"bloom", label:"블룸", sub:"발랄한 핑크라벤더", swatch:["#e892c9","#251e30","#fbf1f7"] },
  { id:"aurora", label:"아우로라", sub:"보라\u2192자홍 오로라 그라디언트", swatch:["#a06bf0","#1c1530","#f7f1fd"], gradient:true },
];

const MOODS = [
  { e:"😄", l:"좋음" }, { e:"🥰", l:"행복" }, { e:"🙂", l:"보통" },
  { e:"😐", l:"그냥" }, { e:"😔", l:"별로" }, { e:"😣", l:"힘듦" },
];

const WDS = ["일","월","화","수","목","금","토"];
const last7Labels = () => { const a = []; const b = new Date(); for (let i = 6; i >= 0; i--) { const d = new Date(b); d.setDate(b.getDate() - i); a.push(WDS[d.getDay()]); } return a; };
/* 이번 주(월요일 시작 ~ 일요일) 날짜 목록: { label, key, today } */
const weekDays = () => {
  const b = new Date();
  const dow = (b.getDay() + 6) % 7; // 월=0 ... 일=6
  const mon = new Date(b); mon.setDate(b.getDate() - dow);
  const tkey = keyOf(b.getFullYear(), b.getMonth(), b.getDate());
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const key = keyOf(d.getFullYear(), d.getMonth(), d.getDate());
    out.push({ label: WDS[d.getDay()], key, today: key === tkey });
  }
  return out;
};

/* 아이콘 이름 → 컴포넌트 매핑 (메뉴 설정을 데이터로 저장하기 위함) */
const ICONS = { dashboard:LayoutDashboard, calendar:CalendarIcon, list:ListTodo, target:Target, pen:PenLine, wallet:Wallet, book:BookOpen, checks:ListChecks, note:NotebookPen, star:Star, heart:Heart, cart:ShoppingCart, dumbbell:Dumbbell, plane:Plane, music:Music, coffee:Coffee, camera:Camera, briefcase:Briefcase, gift:Gift, sparkles:Sparkles, trend:TrendingUp };
const Icon = ({ name, ...p }) => { const C = ICONS[name] || ListChecks; return <C {...p} />; };
const PICK_ICONS = ["checks","note","star","heart","cart","dumbbell","plane","music","coffee","camera","briefcase","gift","target","book","wallet","sparkles"];
const PAGE_TYPES = [
  { kind:"checklist", icon:"checks", label:"체크리스트", desc:"체크하는 목록 (장보기, 루틴, 위시리스트 등)" },
  { kind:"notes", icon:"note", label:"메모", desc:"날짜별 기록 (아이디어, 일지, 감사일기 등)" },
];
/* 기본(빌트인) 페이지 — 대시보드는 항상 고정 */
const BUILTINS = [
  { id:"cal",   label:"일정",   icon:"calendar", color:"blue",   kind:"builtin", key:"cal",   hidden:false },
  { id:"todo",  label:"할 일",  icon:"list",     color:"accent", kind:"builtin", key:"todo",  hidden:false },
  { id:"habit", label:"습관",   icon:"target",   color:"green",  kind:"builtin", key:"habit", hidden:false },
  { id:"diary", label:"일기",   icon:"pen",      color:"rose",   kind:"builtin", key:"diary", hidden:false },
  { id:"metric",label:"목표 지표", icon:"trend",  color:"gold",   kind:"builtin", key:"metric",hidden:false },
  { id:"budget",label:"가계부", icon:"wallet",   color:"coral",  kind:"builtin", key:"budget",hidden:false },
  { id:"read",  label:"꿈나무", icon:"book",     color:"green",  kind:"builtin", key:"read",  hidden:false },
  { id:"dream", label:"비전 보드", icon:"sparkles", color:"violet", kind:"builtin", key:"dream", hidden:false },
];

/* ════════════════ 공용 컴포넌트 ════════════════ */
function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-ov" onMouseDown={onClose}>
      <div className={"modal" + (wide ? " wide" : "")} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="xbtn" onClick={onClose} aria-label="닫기"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function Confirm({ text, sub, title = "삭제할까요?", okLabel = "삭제", onCancel, onOk }) {
  return (
    <Modal title={title} onClose={onCancel}
      footer={<>
        <button className="btn ghost" onClick={onCancel}>취소</button>
        <button className="btn danger" onClick={onOk}><Trash2 size={15} /> {okLabel}</button>
      </>}>
      <p className="confirm-tx">{text}</p>
      <p className="confirm-sub">{sub || "이 작업은 되돌릴 수 없어요."}</p>
    </Modal>
  );
}

const Row = ({ label, children }) => (
  <label className="frow"><span className="flbl">{label}</span>{children}</label>
);

function Stars({ value, onChange, size = 18 }) {
  return (
    <div className="stars">
      {[1,2,3,4,5].map((i) => (
        <button key={i} type="button" className="star" onClick={() => onChange && onChange(i)} aria-label={`${i}점`}>
          <Star size={size} fill={i <= value ? "var(--gold)" : "none"} color={i <= value ? "var(--gold)" : "var(--border2)"} />
        </button>
      ))}
    </div>
  );
}

/* 파일 → base64 데이터 URL (DB 연동 시 Supabase Storage 업로드로 교체) */
const fileToDataURL = (file) => new Promise((res) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.readAsDataURL(file);
});

/* 업로드 이미지를 캔버스로 축소·재인코딩해 용량을 크게 줄임.
   (localStorage 5MB 한도를 넘겨 앱이 멈추는 문제를 예방) */
const compressImage = (file, maxDim = 1280, quality = 0.72) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onerror = () => resolve("");
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => resolve(reader.result);
    img.onload = () => {
      try {
        let { width, height } = img;
        if (Math.max(width, height) > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) { resolve(reader.result); }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const isImg = (f) => f && f.type && f.type.startsWith("image/");

function PhotoInput({ photos, onChange, max = 6 }) {
  const [url, setUrl] = useState("");
  const add = async (e) => {
    const files = Array.from(e.target.files || []).filter(isImg);
    const urls = await Promise.all(files.map((f) => compressImage(f)));
    onChange([...photos, ...urls.filter(Boolean)].slice(0, max));
    e.target.value = "";
  };
  const addUrl = () => { const u = url.trim(); if (u) { onChange([...photos, u].slice(0, max)); setUrl(""); } };
  return (
    <div className="img-field">
      <div className="photos">
        {photos.map((src, i) => (
          <div className="photo-thumb" key={i}>
            <img src={src} alt="" />
            <button type="button" className="photo-x" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label="사진 삭제"><X size={13} /></button>
          </div>
        ))}
        {photos.length < max && (
          <label className="photo-add">
            <ImagePlus size={20} />
            <span>사진 추가</span>
            <input type="file" accept="image/*" multiple onChange={add} hidden />
          </label>
        )}
      </div>
      {photos.length < max && (
        <div className="url-row">
          <input className="inp" placeholder="또는 이미지 URL 붙여넣기" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} />
          <button type="button" className="btn ghost sm" onClick={addUrl} disabled={!url.trim()}>추가</button>
        </div>
      )}
    </div>
  );
}

function CoverInput({ cover, color, onChange }) {
  const [url, setUrl] = useState("");
  const pick = async (e) => { const f = e.target.files?.[0]; if (isImg(f)) onChange(await compressImage(f)); e.target.value = ""; };
  const applyUrl = () => { const u = url.trim(); if (u) { onChange(u); setUrl(""); } };
  return (
    <div className="img-field">
      <div className="cover-up">
        <div className="cover-prev" style={cover ? {} : { background:`linear-gradient(160deg, ${VAR(color)}, color-mix(in srgb, ${VAR(color)} 50%, #000))` }}>
          {cover ? <img src={cover} alt="표지" /> : <BookOpen size={24} color="#fff" />}
        </div>
        <div className="cover-actions">
          <label className="btn ghost sm"><Upload size={14} /> {cover ? "변경" : "표지 업로드"}<input type="file" accept="image/*" onChange={pick} hidden /></label>
          {cover && <button type="button" className="btn ghost sm" onClick={() => onChange("")}><Trash2 size={14} /> 제거</button>}
        </div>
      </div>
      <div className="url-row">
        <input className="inp" placeholder="또는 표지 이미지 URL" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }} />
        <button type="button" className="btn ghost sm" onClick={applyUrl} disabled={!url.trim()}>적용</button>
      </div>
    </div>
  );
}

function Lightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [src, onClose]);
  if (!src) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      <img src={src} alt="" onClick={(e) => e.stopPropagation()} />
      <button className="lb-x" onClick={onClose} aria-label="닫기"><X size={22} /></button>
    </div>
  );
}

/* 단일 이미지 업로더 (드림보드 사진, 프로필 사진 공용) */
function SingleImage({ value, onChange, round }) {
  const [url, setUrl] = useState("");
  const pick = async (e) => { const f = e.target.files?.[0]; if (isImg(f)) onChange(await compressImage(f)); e.target.value = ""; };
  const applyUrl = () => { const u = url.trim(); if (u) { onChange(u); setUrl(""); } };
  return (
    <div className="img-field">
      <div className="single-img">
        <div className={"si-prev"+(round?" round":"")}>{value ? <img src={value} alt="" /> : <ImagePlus size={22} color="var(--faint)" />}</div>
        <div className="cover-actions">
          <label className="btn ghost sm"><Upload size={14} /> {value ? "변경" : "사진 선택"}<input type="file" accept="image/*" onChange={pick} hidden /></label>
          {value && <button type="button" className="btn ghost sm" onClick={() => onChange("")}><Trash2 size={14} /> 제거</button>}
        </div>
      </div>
      <div className="url-row">
        <input className="inp" placeholder="또는 이미지 URL 붙여넣기" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }} />
        <button type="button" className="btn ghost sm" onClick={applyUrl} disabled={!url.trim()}>적용</button>
      </div>
    </div>
  );
}

function Avatar({ profile, size = 36 }) {
  return profile.avatar
    ? <img className="avatar" src={profile.avatar} alt="" style={{ width:size, height:size }} />
    : <span className="avatar ph" style={{ width:size, height:size, fontSize:Math.round(size*0.42) }}>{(profile.name || "U").trim().slice(0,1)}</span>;
}

/* ── 동기부여 비주얼: 과녁(목표 게이지) · 도넛 · 막대 · 추이 (외부 라이브러리 없이 SVG) ── */
function TargetRing({ value, max = 100, color = "var(--accent)", caption, sub, size = 150 }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const R = 60, C = 2 * Math.PI * R;
  return (
    <div className="ring-wrap" style={{ width:size, height:size }}>
      <svg viewBox="0 0 140 140" width={size} height={size}>
        {[60,48,36].map((r,i) => <circle key={r} cx="70" cy="70" r={r} fill={i%2 ? tint(color,7) : tint(color,15)} />)}
        <circle cx="70" cy="70" r="29" fill="var(--card)" />
        <circle cx="70" cy="70" r="29" fill="none" stroke={tint(color,30)} strokeWidth="1.5" />
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--inset)" strokeWidth="8" />
        <circle cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 70 70)" style={{ transition:"stroke-dashoffset .7s ease" }} />
      </svg>
      <div className="ring-center">
        <div className="ring-val">{caption ?? Math.round(pct * 100) + "%"}</div>
        {sub && <div className="ring-sub">{sub}</div>}
      </div>
    </div>
  );
}

function Donut({ data, size = 150, thickness = 20, centerTop, centerSub }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 58, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="ring-wrap" style={{ width:size, height:size }}>
      <svg viewBox="0 0 140 140" width={size} height={size}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--inset)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const seg = <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={`${frac * C} ${C - frac * C}`} strokeDashoffset={-acc * C} transform="rotate(-90 70 70)"
            style={{ transition:"stroke-dasharray .6s ease" }} />;
          acc += frac;
          return seg;
        })}
      </svg>
      <div className="ring-center">
        <div className="ring-val sm">{centerTop}</div>
        {centerSub && <div className="ring-sub">{centerSub}</div>}
      </div>
    </div>
  );
}

function Bars({ data, color = "var(--accent)", height = 116 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-track">
            <div className="bar-fill" style={{ height:`${(d.value / max) * 100}%`, background: d.hl ? color : tint(color, 40) }} />
          </div>
          <span className={"bar-lbl"+(d.hl?" hl":"")}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Trend({ values, color = "var(--rose)", height = 88 }) {
  if (!values || values.length < 2) return <div className="trend-empty">데이터가 더 모이면 추이가 보여요</div>;
  const n = values.length, min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const X = (i) => (i / (n - 1)) * 100;
  const Y = (v) => 30 - ((v - min) / span) * 24 - 3;
  const line = "M" + values.map((v, i) => `${X(i)},${Y(v)}`).join(" L");
  const area = `M0,32 L` + values.map((v, i) => `${X(i)},${Y(v)}`).join(" L") + ` L100,32 Z`;
  return (
    <svg className="trend" viewBox="0 0 100 32" preserveAspectRatio="none" style={{ height }}>
      <path d={area} fill={tint(color, 16)} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const Legend = ({ items }) => (
  <div className="legend">{items.map((it, i) => (
    <span key={i}><i style={{ background: it.color }} />{it.label}{it.value != null && <b>{it.value}</b>}</span>
  ))}</div>
);

const PageHead = ({ icon:Icon, color, title, sub, action }) => (
  <div className="page-head">
    <div className="ph-l">
      <span className="ph-icn" style={{ background: tint(VAR(color), 16) }}><Icon size={20} color={VAR(color)} /></span>
      <div>
        <h2 className="ph-title">{title}</h2>
        {sub && <p className="ph-sub">{sub}</p>}
      </div>
    </div>
    {action}
  </div>
);

const Empty = ({ icon:Icon, text }) => (
  <div className="empty-box">
    <Icon size={26} color="var(--faint)" />
    <span>{text}</span>
  </div>
);

/* ════════════════ 페이지: 일정 ════════════════ */
function SchedulePage({ events, setEvents, todos, setTodos }) {
  const [view, setView] = useState({ y: TODAY.y, m: TODAY.m });
  const [sel, setSel] = useState(TODAY_KEY);
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const empty = { title:"", date: sel, time:"09:00", cat:"약속", memo:"" };
  const [form, setForm] = useState(empty);

  const matrix = useMemo(() => monthMatrix(view.y, view.m), [view]);
  const byDay = useMemo(() => {
    const map = {};
    events.forEach((e) => { (map[e.date] = map[e.date] || []).push(e); });
    return map;
  }, [events]);
  const todoByDay = useMemo(() => {
    const map = {};
    todos.forEach((t) => { if (t.date) (map[t.date] = map[t.date] || []).push(t); });
    return map;
  }, [todos]);
  const dayList = (byDay[sel] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const dayTodos = (todoByDay[sel] || []).slice().sort((a,b) => a.done - b.done);

  const openNew = () => { setForm({ ...empty, date: sel }); setEditing("new"); };
  const openEdit = (e) => { setForm({ ...e }); setEditing(e.id); };
  const save = () => {
    if (!form.title.trim()) return;
    if (editing === "new") setEvents((p) => [...p, { ...form, id: uid() }]);
    else setEvents((p) => p.map((x) => x.id === editing ? { ...form, id: editing } : x));
    setEditing(null);
  };
  const sendToTodo = (e) => {
    setTodos((p) => [...p, { id:uid(), title:e.title, cat:e.cat==="업무"||e.cat==="공부"?e.cat:"개인", date:e.date, done:false }]);
    setEvents((p) => p.filter((x) => x.id !== e.id));
  };
  const toggleTodo = (id) => setTodos((p) => p.map((x) => x.id===id?{...x,done:!x.done}:x));

  return (
    <div className="pg">
      <PageHead icon={CalendarIcon} color="blue" title="일정" sub="이번 달 일정과 그날의 할 일을 함께 보세요"
        action={<button className="btn primary" onClick={openNew}><Plus size={16} /> 일정 추가</button>} />

      {(() => {
        const counts = weekDays().map((d) => ({ label:d.label, value: events.filter((e) => e.date === d.key).length, hl:d.today }));
        const total = counts.reduce((s, c) => s + c.value, 0);
        return (
          <section className="card insight-bars">
            <div className="card-head"><div className="card-title"><span className="icn" style={{ background:tint("var(--blue)",16) }}><CalendarIcon size={16} color="var(--blue)" /></span>이번 주 일정 분포</div><span className="meta">이번 주 · 총 {total}개</span></div>
            <Bars data={counts} color="var(--blue)" height={104} />
          </section>
        );
      })()}

      <div className="split">
        <section className="card">
          <div className="card-head">
            <div className="card-title"><span className="meta-strong">{view.y}년 {view.m + 1}월</span></div>
            <div className="cal-nav">
              <button onClick={() => setView((v) => v.m === 0 ? { y:v.y-1, m:11 } : { y:v.y, m:v.m-1 })}><ChevronLeft size={16} /></button>
              <button onClick={() => { setView({ y:TODAY.y, m:TODAY.m }); }} className="today-btn">오늘</button>
              <button onClick={() => setView((v) => v.m === 11 ? { y:v.y+1, m:0 } : { y:v.y, m:v.m+1 })}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="cal-grid">
            {["일","월","화","수","목","금","토"].map((w,i) => <div key={w} className={"cal-wd"+(i===0?" sun":i===6?" sat":"")}>{w}</div>)}
            {matrix.map((c, i) => {
              const k = keyOf(view.y, view.m, c.d);
              const isToday = c.cur && k === TODAY_KEY;
              const isSel = c.cur && k === sel;
              const dots = c.cur ? byDay[k] : null;
              const tDots = c.cur ? todoByDay[k] : null;
              return (
                <div key={i} className={"cell"+(c.cur?"":" dim")+(isToday?" today":"")+(isSel&&!isToday?" sel":"")}
                  onClick={() => c.cur && setSel(k)}>
                  {c.d}
                  {(dots || tDots) && <span className="dots">
                    {dots && dots.slice(0,2).map((e,j) => <i key={"e"+j} className="dot" style={isToday?{}:{background:catVar(e.cat)}} />)}
                    {tDots && tDots.slice(0,1).map((t,j) => <i key={"t"+j} className="dot dot-todo" style={isToday?{}:{}} />)}
                  </span>}
                </div>
              );
            })}
          </div>
          <div className="cal-legend"><span><i className="dot" style={{ background:"var(--blue)" }} /> 일정</span><span><i className="dot dot-todo" /> 할 일</span></div>
        </section>

        <section className="card">
          <div className="card-head">
            <div className="card-title">
              <span className="icn" style={{ background: tint("var(--blue)",16) }}><Clock size={16} color="var(--blue)" /></span>
              {sel === TODAY_KEY ? "오늘" : sel.slice(5).replace("-",".")}
            </div>
            <span className="meta">{dayList.length + dayTodos.length}건</span>
          </div>
          {dayList.length === 0 && dayTodos.length === 0 ? <Empty icon={CalendarIcon} text="이 날짜에 등록된 일정·할 일이 없어요" /> : (
            <div className="ev-list">
              {dayList.map((e) => (
                <div key={"e"+e.id} className="ev">
                  <span className="ev-bar" style={{ background: catVar(e.cat) }} />
                  <div className="ev-time">{e.time}</div>
                  <div className="ev-mid">
                    <div className="ev-title">{e.title}</div>
                    {e.memo && <div className="ev-memo">{e.memo}</div>}
                  </div>
                  <span className="tag" style={{ color: catVar(e.cat), background: tint(catVar(e.cat),14) }}>{e.cat}</span>
                  <div className="rowact">
                    <button onClick={() => sendToTodo(e)} aria-label="할 일로 보내기" title="할 일로 보내기"><ListTodo size={14} /></button>
                    <button onClick={() => openEdit(e)} aria-label="수정"><Pencil size={14} /></button>
                    <button onClick={() => setDel(e)} aria-label="삭제"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {dayTodos.length > 0 && (
                <div className="ev-todo-group">
                  <div className="ev-todo-label"><ListTodo size={12} /> 이 날의 할 일</div>
                  {dayTodos.map((t) => (
                    <div key={"t"+t.id} className={"ev ev-todo"+(t.done?" done":"")}>
                      <button className={"box"+(t.done?" on":"")} onClick={() => toggleTodo(t.id)} aria-label="완료 토글"><Check size={12} strokeWidth={3} /></button>
                      <div className="ev-mid"><div className="ev-title">{t.title}</div></div>
                      <span className="tag" style={{ color: catVar(t.cat), background: tint(catVar(t.cat),14) }}>{t.cat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <Modal title={editing === "new" ? "일정 추가" : "일정 수정"} onClose={() => setEditing(null)}
          footer={<>
            <button className="btn ghost" onClick={() => setEditing(null)}>취소</button>
            <button className="btn primary" onClick={save}><Check size={15} /> 저장</button>
          </>}>
          <Row label="제목"><input className="inp" value={form.title} autoFocus placeholder="일정 제목" onChange={(e) => setForm({ ...form, title:e.target.value })} /></Row>
          <div className="frow2">
            <Row label="날짜"><input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date:e.target.value })} /></Row>
            <Row label="시간"><input className="inp" type="time" value={form.time} onChange={(e) => setForm({ ...form, time:e.target.value })} /></Row>
          </div>
          <Row label="분류">
            <div className="chips">
              {["업무","개인","건강","약속","공부","생활"].map((c) => (
                <button key={c} className={"chip-b"+(form.cat===c?" on":"")} style={form.cat===c?{borderColor:catVar(c),color:catVar(c),background:tint(catVar(c),14)}:{}} onClick={() => setForm({ ...form, cat:c })}>{c}</button>
              ))}
            </div>
          </Row>
          <Row label="메모"><textarea className="inp ta" rows={2} value={form.memo} placeholder="선택 입력" onChange={(e) => setForm({ ...form, memo:e.target.value })} /></Row>
        </Modal>
      )}
      {del && <Confirm text={`"${del.title}" 일정을 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setEvents((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
    </div>
  );
}

/* ════════════════ 페이지: 할 일 ════════════════ */
function TodoPage({ todos, setTodos, setEvents }) {
  const [filter, setFilter] = useState("today");
  const [quick, setQuick] = useState("");
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [postponeId, setPostponeId] = useState(null);
  const [postDate, setPostDate] = useState(TODAY_KEY);
  const empty = { title:"", cat:"개인", date:TODAY_KEY };
  const [form, setForm] = useState(empty);

  const overdue = (t) => t.date && t.date < TODAY_KEY && !t.done;
  const inFilter = (t) => {
    if (filter === "all") return true;
    if (filter === "today") return t.date === TODAY_KEY || overdue(t);
    if (filter === "upcoming") return t.date && t.date > TODAY_KEY;
    if (filter === "noDate") return !t.date;
    if (filter === "done") return t.done;
    return true;
  };
  const shown = todos.filter(inFilter).slice().sort((a,b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.date||"9999").localeCompare(b.date||"9999");
  });
  const todayCount = todos.filter((t) => t.date === TODAY_KEY || overdue(t)).length;
  const doneN = todayCount ? todos.filter((t) => (t.date===TODAY_KEY||overdue(t)) && t.done).length : todos.filter((t) => t.done).length;
  const todayTotal = todayCount || todos.length;

  const addQuick = () => { if (!quick.trim()) return; setTodos((p) => [...p, { id:uid(), title:quick.trim(), cat:"개인", date:TODAY_KEY, done:false }]); setQuick(""); };
  const openEdit = (t) => { setForm({ title:t.title, cat:t.cat, date:t.date||"" }); setEditing(t.id); };
  const save = () => { if (!form.title.trim()) return; setTodos((p) => p.map((x) => x.id === editing ? { ...x, ...form, date: form.date || "" } : x)); setEditing(null); };
  const openPostpone = (t, def) => { setPostponeId(t.id); setPostDate(def || TODAY_KEY); };
  const tomorrowKey = () => { const d = new Date(); d.setDate(d.getDate()+1); return keyOf(d.getFullYear(), d.getMonth(), d.getDate()); };
  const applyPostpone = () => { if (!postponeId) return; setTodos((p) => p.map((x) => x.id===postponeId?{...x,date:postDate}:x)); setPostponeId(null); };
  const sendToSchedule = (t) => {
    setEvents((p) => [...p, { id:uid(), title:t.title, date:t.date||TODAY_KEY, time:"09:00", cat:t.cat==="업무"||t.cat==="공부"?t.cat:"개인", memo:"" }]);
    setTodos((p) => p.filter((x) => x.id !== t.id));
  };

  return (
    <div className="pg">
      <PageHead icon={ListTodo} color="accent" title="할 일" sub={`${todayTotal}개 중 ${doneN}개 완료`} />

      {(() => {
        const pct = todayTotal ? Math.round(doneN / todayTotal * 100) : 0;
        const wd = weekDays();
        const week = wd.map((d) => ({ label:d.label, value: d.today ? doneN : todos.filter((t) => t.date===d.key && t.done).length, hl: d.today }));
        return (
          <section className="card insight">
            <TargetRing value={doneN} max={todayTotal || 1} caption={pct + "%"} sub={`${doneN}/${todayTotal} 완료`} color="var(--accent)" />
            <div className="ins-text">
              <div className="ins-cap">{todayTotal===0 ? "오늘 할 일을 추가해보세요" : pct === 100 ? "오늘 할 일을 모두 끝냈어요! 🎯" : <>목표까지 <b>{todayTotal - doneN}개</b> 남았어요</>}</div>
              <div className="ins-sub">오늘(+미룬 항목) 기준 완료율이에요. 이번 주 흐름도 함께 보여요.</div>
              <div className="mini-bars"><Bars data={week} color="var(--accent)" height={80} /></div>
            </div>
          </section>
        );
      })()}

      <div className="adder big">
        <input className="inp" placeholder="할 일을 입력하고 Enter로 추가하세요 (오늘 날짜로 추가됨)" value={quick}
          onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQuick()} />
        <button className="btn-icn" onClick={addQuick}><Plus size={18} strokeWidth={2.5} /></button>
      </div>

      <div className="tabs scrollx">
        {[["today","오늘"],["upcoming","예정"],["noDate","날짜 없음"],["all","전체"],["done","완료"]].map(([k,l]) => (
          <button key={k} className={"tab"+(filter===k?" on":"")} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      <section className="card">
        {shown.length === 0 ? <Empty icon={ListTodo} text="표시할 할 일이 없어요" /> : (
          <div className="todos">
            {shown.map((t) => (
              <div key={t.id} className={"todo"+(t.done?" done":"")+(overdue(t)?" overdue":"")}>
                <button className={"box"+(t.done?" on":"")} onClick={() => setTodos((p) => p.map((x) => x.id===t.id?{...x,done:!x.done}:x))} aria-label="완료 토글"><Check size={13} strokeWidth={3} /></button>
                <div className="todo-mid">
                  <span className="tx">{t.title}</span>
                  <span className="todo-date-row">
                    {t.date ? <span className={"todo-date"+(overdue(t)?" overdue":"")}>{overdue(t) && <Clock size={11} />} {t.date===TODAY_KEY?"오늘":t.date===tomorrowKey()?"내일":t.date.slice(5).replace("-",".")}{overdue(t) && " · 지남"}</span> : <span className="todo-date none">날짜 없음</span>}
                  </span>
                </div>
                <span className="tag" style={{ color: catVar(t.cat), background: tint(catVar(t.cat),14) }}>{t.cat}</span>
                <div className="rowact">
                  {!t.done && <button onClick={() => openPostpone(t, tomorrowKey())} aria-label="미루기" title="다른 날로 미루기"><CalendarClock size={14} /></button>}
                  <button onClick={() => sendToSchedule(t)} aria-label="일정으로 보내기" title="일정으로 보내기"><CalendarIcon size={14} /></button>
                  <button onClick={() => openEdit(t)} aria-label="수정"><Pencil size={14} /></button>
                  <button onClick={() => setDel(t)} aria-label="삭제"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <Modal title="할 일 수정" onClose={() => setEditing(null)}
          footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn primary" onClick={save}><Check size={15} /> 저장</button></>}>
          <Row label="내용"><input className="inp" autoFocus value={form.title} onChange={(e) => setForm({ ...form, title:e.target.value })} /></Row>
          <Row label="날짜 (선택)"><input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date:e.target.value })} /></Row>
          <Row label="분류"><div className="chips">{["업무","개인","건강","공부","생활"].map((c) => (
            <button key={c} className={"chip-b"+(form.cat===c?" on":"")} style={form.cat===c?{borderColor:catVar(c),color:catVar(c),background:tint(catVar(c),14)}:{}} onClick={() => setForm({ ...form, cat:c })}>{c}</button>))}</div></Row>
        </Modal>
      )}
      {postponeId != null && (
        <Modal title="다른 날로 미루기" onClose={() => setPostponeId(null)}
          footer={<><button className="btn ghost" onClick={() => setPostponeId(null)}>취소</button><button className="btn primary" onClick={applyPostpone}><Check size={15} /> 미루기</button></>}>
          <div className="postpone-quick">
            <button className="btn ghost sm" onClick={() => setPostDate(tomorrowKey())}>내일</button>
            <button className="btn ghost sm" onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); setPostDate(keyOf(d.getFullYear(), d.getMonth(), d.getDate())); }}>다음 주</button>
          </div>
          <Row label="지정일"><input className="inp" type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)} /></Row>
        </Modal>
      )}
      {del && <Confirm text={`"${del.title}"을(를) 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setTodos((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
    </div>
  );
}

/* ════════════════ 페이지: 습관 ════════════════ */
function HabitsPage({ habits, setHabits }) {
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [form, setForm] = useState({ name:"", color:"green" });
  const COLORS = ["green","blue","rose","gold","violet","coral"];

  const openNew = () => { setForm({ name:"", color:"green" }); setEditing("new"); };
  const openEdit = (h) => { setForm({ name:h.name, color:h.color }); setEditing(h.id); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editing === "new") setHabits((p) => [...p, { id:uid(), name:form.name.trim(), color:form.color, on:false, streak:0, week:[0,0,0,0,0,0,0] }]);
    else setHabits((p) => p.map((h) => h.id === editing ? { ...h, name:form.name.trim(), color:form.color } : h));
    setEditing(null);
  };
  const toggle = (id) => setHabits((p) => p.map((h) => {
    if (h.id !== id) return h;
    const on = !h.on; const week = [...h.week]; week[6] = on ? 1 : 0;
    return { ...h, on, week, streak: on ? h.streak + 1 : Math.max(0, h.streak - 1) };
  }));
  const doneN = habits.filter((h) => h.on).length;

  return (
    <div className="pg">
      <PageHead icon={Target} color="green" title="습관 만들기" sub={`오늘 ${doneN}/${habits.length} 달성`}
        action={<button className="btn primary" onClick={openNew}><Plus size={16} /> 습관 추가</button>} />

      {habits.length > 0 && (() => {
        const wd = weekDays();
        const cons = wd.map((d) => ({ label:d.label, value: d.today && habits.length ? Math.round(doneN / habits.length * 100) : 0, hl:d.today }));
        const best = habits.reduce((m,h) => Math.max(m, h.streak), 0);
        const pct = habits.length ? Math.round(doneN / habits.length * 100) : 0;
        return (
          <section className="card insight">
            <TargetRing value={doneN} max={habits.length || 1} caption={pct + "%"} sub="오늘 달성" color="var(--green)" />
            <div className="ins-text">
              <div className="ins-cap">최고 연속 기록 <b>{best}일</b> 🔥</div>
              <div className="ins-sub">막대는 요일별 습관 달성률이에요. 빈 칸을 채워 연속 기록을 이어가요.</div>
              <div className="mini-bars"><Bars data={cons} color="var(--green)" height={80} /></div>
            </div>
          </section>
        );
      })()}

      {habits.length === 0 ? <section className="card"><Empty icon={Target} text="습관을 추가해 꾸준함을 쌓아보세요" /></section> : (
        <div className="hgrid">
          {habits.map((h) => (
            <div key={h.id} className={"hcard"+(h.on?" on":"")} style={h.on?{borderColor:tint(VAR(h.color),45)}:{}}>
              <div className="hcard-top">
                <button className={"hcheck"+(h.on?" on":"")} style={h.on?{background:VAR(h.color),borderColor:VAR(h.color)}:{}} onClick={() => toggle(h.id)} aria-label="오늘 체크">
                  <Check size={17} strokeWidth={3} color={h.on ? "#fff" : "transparent"} />
                </button>
                <div className="rowact static">
                  <button onClick={() => openEdit(h)} aria-label="수정"><Pencil size={13} /></button>
                  <button onClick={() => setDel(h)} aria-label="삭제"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="hcard-name">{h.name}</div>
              <div className="hcard-foot">
                <div className="week">{h.week.map((f,i) => <i key={i} className={(f?"f":"")+(i===6?" tdy":"")} style={f?{background:VAR(h.color)}:{}} />)}</div>
                <span className="streak"><Flame size={13} /> {h.streak}일</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing==="new"?"습관 추가":"습관 수정"} onClose={() => setEditing(null)}
          footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn primary" onClick={save}><Check size={15} /> 저장</button></>}>
          <Row label="습관 이름"><input className="inp" autoFocus placeholder="예: 물 2L 마시기" value={form.name} onChange={(e) => setForm({ ...form, name:e.target.value })} /></Row>
          <Row label="색상"><div className="swatches">{COLORS.map((c) => (
            <button key={c} className={"sw"+(form.color===c?" on":"")} style={{ background: VAR(c) }} onClick={() => setForm({ ...form, color:c })} aria-label={c} />))}</div></Row>
        </Modal>
      )}
      {del && <Confirm text={`"${del.name}" 습관을 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setHabits((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
    </div>
  );
}

/* ════════════════ 페이지: 일기 ════════════════ */
function DiaryPage({ diaries, setDiaries }) {
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [viewer, setViewer] = useState(null);
  const empty = { date: TODAY_KEY, mood:0, text:"", photos:[] };
  const [form, setForm] = useState(empty);

  const sorted = diaries.slice().sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  const openNew = () => { setForm(empty); setEditing("new"); };
  const openEdit = (d) => { setForm({ date:d.date, mood:d.mood, text:d.text, photos:d.photos||[] }); setEditing(d.id); };
  const save = () => {
    if (!form.text.trim()) return;
    if (editing === "new") setDiaries((p) => [...p, { ...form, id: uid() }]);
    else setDiaries((p) => p.map((x) => x.id === editing ? { ...form, id: editing } : x));
    setEditing(null);
  };

  return (
    <div className="pg">
      <PageHead icon={PenLine} color="rose" title="일기" sub={`${diaries.length}개의 기록`}
        action={<button className="btn primary" onClick={openNew}><Plus size={16} /> 일기 쓰기</button>} />

      {diaries.length > 0 && (() => {
        const asc = diaries.slice().sort((a,b) => a.date.localeCompare(b.date) || a.id - b.id).slice(-7);
        const trend = asc.map((d) => (5 - d.mood) / 5 * 100);
        const avg = Math.round(diaries.reduce((s,d) => s + (5 - d.mood) / 5 * 100, 0) / diaries.length);
        return (
          <section className="card insight">
            <TargetRing value={avg} caption={avg + "%"} sub="긍정 지수" color="var(--rose)" />
            <div className="ins-text">
              <div className="ins-cap">최근 기분 흐름</div>
              <Trend values={trend} color="var(--rose)" height={68} />
              <div className="ins-sub">위로 갈수록 좋은 하루예요. {avg >= 70 ? "요즘 컨디션이 좋네요!" : avg >= 45 ? "잔잔한 나날들이에요." : "스스로를 조금 더 돌봐주세요."}</div>
            </div>
          </section>
        );
      })()}

      {sorted.length === 0 ? <section className="card"><Empty icon={PenLine} text="오늘 하루를 기록해보세요" /></section> : (
        <div className="diary-grid">
          {sorted.map((d) => (
            <article key={d.id} className="dcard" onClick={() => openEdit(d)}>
              <div className="dcard-head">
                <span className="dmood">{MOODS[d.mood].e}</span>
                <div>
                  <div className="ddate">{d.date.replace(/-/g,". ")}</div>
                  <div className="dmood-l">{MOODS[d.mood].l}</div>
                </div>
                <div className="rowact static" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(d)} aria-label="수정"><Pencil size={13} /></button>
                  <button onClick={() => setDel(d)} aria-label="삭제"><Trash2 size={13} /></button>
                </div>
              </div>
              <p className="dtext">{d.text}</p>
              {d.photos && d.photos.length > 0 && (
                <div className="dphotos" onClick={(e) => e.stopPropagation()}>
                  {d.photos.slice(0,4).map((src,i) => (
                    <button key={i} className="dphoto" onClick={() => setViewer(src)}>
                      <img src={src} alt="" />
                      {i === 3 && d.photos.length > 4 && <span className="more">+{d.photos.length - 4}</span>}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing==="new"?"일기 쓰기":"일기 수정"} onClose={() => setEditing(null)} wide
          footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn rose" onClick={save}><Check size={15} /> 저장</button></>}>
          <div className="frow2">
            <Row label="날짜"><input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date:e.target.value })} /></Row>
            <Row label="오늘의 기분"><div className="moods">{MOODS.map((m,i) => (
              <button key={i} className={"mood-b"+(form.mood===i?" on":"")} onClick={() => setForm({ ...form, mood:i })}><span className="e">{m.e}</span></button>))}</div></Row>
          </div>
          <Row label="내용"><textarea className="inp ta tall" autoFocus placeholder="오늘 하루는 어땠나요?" value={form.text} onChange={(e) => setForm({ ...form, text:e.target.value })} /></Row>
          <Row label="사진"><PhotoInput photos={form.photos} onChange={(photos) => setForm({ ...form, photos })} /></Row>
        </Modal>
      )}
      {del && <Confirm text={`${del.date.replace(/-/g,". ")} 일기를 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setDiaries((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
      <Lightbox src={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}

/* ════════════════ 페이지: 목표 지표 ════════════════ */
function MetricsPage({ metrics, setMetrics }) {
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [logFor, setLogFor] = useState(null);
  const emptyM = { name:"", unit:"원", target:"", start:"", color:"gold" };
  const [form, setForm] = useState(emptyM);
  const [logForm, setLogForm] = useState({ date:TODAY_KEY, value:"" });
  const UNITS = ["원","명","개","회","권","kg","%"];

  const sortedEntries = (m) => m.entries.slice().sort((a,b) => a.date.localeCompare(b.date));
  const curOf = (m) => { const e = sortedEntries(m); return e.length ? e[e.length-1].value : 0; };
  const pctOf = (m) => m.target > 0 ? Math.round(curOf(m)/m.target*100) : 0;
  const fmtV = (v, u) => comma(v) + (u || "");
  const avg = metrics.length ? Math.round(metrics.reduce((s,m) => s + Math.min(100,pctOf(m)), 0) / metrics.length) : 0;

  const openNew = () => { setForm(emptyM); setEditing("new"); };
  const openEdit = (m) => { setForm({ name:m.name, unit:m.unit, target:String(m.target||""), start:"", color:m.color }); setEditing(m.id); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editing === "new") {
      const entries = form.start !== "" ? [{ id:uid(), date:TODAY_KEY, value:num(form.start) }] : [];
      setMetrics((p) => [...p, { id:uid(), name:form.name.trim(), unit:form.unit, target:num(form.target), color:form.color, entries }]);
    } else {
      setMetrics((p) => p.map((m) => m.id === editing ? { ...m, name:form.name.trim(), unit:form.unit, target:num(form.target), color:form.color } : m));
    }
    setEditing(null);
  };
  const addLog = () => {
    if (logFor == null) return;
    const v = num(logForm.value);
    setMetrics((p) => p.map((m) => m.id === logFor ? { ...m, entries:[...m.entries, { id:uid(), date:logForm.date, value:v }] } : m));
    setLogFor(null); setLogForm({ date:TODAY_KEY, value:"" });
  };

  return (
    <div className="pg">
      <PageHead icon={TrendingUp} color="gold" title="목표 지표" sub="매출·구독자·저축 등 핵심 숫자를 목표까지 추적"
        action={<button className="btn primary" onClick={openNew}><Plus size={16} /> 지표 추가</button>} />

      {metrics.length > 0 && (
        <section className="card insight">
          <TargetRing value={avg} caption={`${avg}%`} sub="평균 달성률" color="var(--gold)" />
          <div className="ins-text">
            <div className="ins-cap">핵심 지표 평균 <b>{avg}%</b> 달성 중</div>
            <div className="ins-sub">매주 숫자를 기록하면 목표까지 얼마나 왔는지 한눈에 보여요. 작은 전진이 모멘텀이 됩니다.</div>
          </div>
        </section>
      )}

      {metrics.length === 0 ? <section className="card"><Empty icon={TrendingUp} text="추적할 핵심 숫자를 추가해보세요 (예: 월 매출)" /></section> : (
        <div className="metric-grid">
          {metrics.map((m) => {
            const cur = curOf(m), pct = pctOf(m), vals = sortedEntries(m).map((e) => e.value);
            return (
              <article key={m.id} className="metric-card">
                <div className="m-top">
                  <span className="m-name">{m.name}</span>
                  <div className="rowact static"><button onClick={() => openEdit(m)} aria-label="수정"><Pencil size={13} /></button><button onClick={() => setDel(m)} aria-label="삭제"><Trash2 size={13} /></button></div>
                </div>
                <div className="m-val"><b style={{ color:VAR(m.color) }}>{fmtV(cur, m.unit)}</b><span> / 목표 {fmtV(m.target, m.unit)}</span></div>
                <div className="m-bar"><i style={{ width:`${Math.min(100,pct)}%`, background:VAR(m.color) }} /></div>
                <div className="m-foot">
                  <span className="m-pct" style={{ color:VAR(m.color) }}>{pct}%</span>
                  {vals.length >= 2 && <div className="m-spark"><Trend values={vals} color={VAR(m.color)} height={34} /></div>}
                </div>
                <button className="m-log" onClick={() => { setLogFor(m.id); setLogForm({ date:TODAY_KEY, value:"" }); }}><Plus size={14} /> 기록 추가</button>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing==="new"?"지표 추가":"지표 수정"} onClose={() => setEditing(null)}
          footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn primary" onClick={save}><Check size={15} /> 저장</button></>}>
          <Row label="이름"><input className="inp" autoFocus placeholder="예: 월 매출, 구독자 수, 저축" value={form.name} onChange={(e) => setForm({ ...form, name:e.target.value })} /></Row>
          <Row label="단위"><div className="chips">{UNITS.map((u) => (
            <button key={u} className={"chip-b"+(form.unit===u?" on":"")} style={form.unit===u?{borderColor:"var(--gold)",color:"var(--gold)",background:tint("var(--gold)",14)}:{}} onClick={() => setForm({ ...form, unit:u })}>{u}</button>))}
            <input className="inp unit-inp" placeholder="직접 입력" value={UNITS.includes(form.unit)?"":form.unit} onChange={(e) => setForm({ ...form, unit:e.target.value })} /></div></Row>
          <div className="frow2">
            <Row label="목표값"><input className="inp" inputMode="numeric" placeholder="0" value={comma(form.target)} onChange={(e) => setForm({ ...form, target:e.target.value })} /></Row>
            {editing === "new" && <Row label="현재값 (선택)"><input className="inp" inputMode="numeric" placeholder="0" value={comma(form.start)} onChange={(e) => setForm({ ...form, start:e.target.value })} /></Row>}
          </div>
          <Row label="색상"><div className="swatches">{["gold","green","blue","violet","rose","coral"].map((c) => (
            <button key={c} className={"sw"+(form.color===c?" on":"")} style={{ background:VAR(c) }} onClick={() => setForm({ ...form, color:c })} aria-label={c} />))}</div></Row>
        </Modal>
      )}
      {logFor != null && (
        <Modal title="기록 추가" onClose={() => setLogFor(null)}
          footer={<><button className="btn ghost" onClick={() => setLogFor(null)}>취소</button><button className="btn primary" onClick={addLog}><Check size={15} /> 저장</button></>}>
          <div className="frow2">
            <Row label="날짜"><input className="inp" type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date:e.target.value })} /></Row>
            <Row label="값"><input className="inp" inputMode="numeric" autoFocus placeholder="0" value={comma(logForm.value)} onChange={(e) => setLogForm({ ...logForm, value:e.target.value })} /></Row>
          </div>
        </Modal>
      )}
      {del && <Confirm text={`"${del.name}" 지표를 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setMetrics((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
    </div>
  );
}

/* ════════════════ 페이지: 가계부 ════════════════ */
function BudgetPage({ txs, setTxs }) {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const empty = { type:"expense", amt:"", cat:"식비", memo:"", date:TODAY_KEY };
  const [form, setForm] = useState(empty);
  const EXP = ["식비","교통","카페","쇼핑","여가","기타"];
  const INC = ["급여","용돈","환급","기타"];

  const income = txs.filter((t) => t.type === "income").reduce((s,t) => s + t.amt, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s,t) => s + t.amt, 0);
  const shown = txs.filter((t) => filter === "all" ? true : t.type === filter).slice().sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);

  const openNew = () => { setForm(empty); setEditing("new"); };
  const openEdit = (t) => { setForm({ type:t.type, amt:String(t.amt), cat:t.cat, memo:t.memo||"", date:t.date }); setEditing(t.id); };
  const save = () => {
    const a = num(form.amt); if (!a) return;
    const rec = { type:form.type, amt:a, cat:form.cat, memo:form.memo.trim(), date:form.date };
    if (editing === "new") setTxs((p) => [...p, { ...rec, id: uid() }]);
    else setTxs((p) => p.map((x) => x.id === editing ? { ...rec, id: editing } : x));
    setEditing(null);
  };

  const byCat = {};
  txs.filter((t) => t.type === "expense").forEach((t) => { byCat[t.cat] = (byCat[t.cat]||0) + t.amt; });
  const segs = Object.entries(byCat).map(([cat,v]) => ({ label:cat, value:v, color:catVar(cat) })).sort((a,b) => b.value - a.value);

  return (
    <div className="pg">
      <PageHead icon={Wallet} color="coral" title="가계부" sub="수입과 지출을 기록하고 한눈에"
        action={<button className="btn primary" onClick={openNew}><Plus size={16} /> 내역 추가</button>} />

      <div className="bsum">
        <div className="bsum-c"><span className="sl"><ArrowUpRight size={14} color="var(--green)" /> 총 수입</span><span className="sv" style={{ color:"var(--green)" }}>{WON(income)}</span></div>
        <div className="bsum-c"><span className="sl"><ArrowDownRight size={14} color="var(--coral)" /> 총 지출</span><span className="sv" style={{ color:"var(--coral)" }}>{WON(expense)}</span></div>
        <div className="bsum-c hi"><span className="sl">잔액</span><span className="sv">{WON(income - expense)}</span></div>
      </div>

      {expense > 0 && (
        <section className="card insight">
          <Donut data={segs} centerTop={WON(expense)} centerSub="총 지출" />
          <div className="ins-text">
            <div className="ins-cap">가장 많이 쓴 곳은 <b>{segs[0].label}</b> ({WON(segs[0].value)})</div>
            <div className="ins-sub">카테고리별 지출 비중이에요. 새는 돈을 한눈에 확인하고 다음 달 예산을 세워보세요.</div>
            <Legend items={segs.map((s) => ({ color:s.color, label:s.label, value:WON(s.value) }))} />
          </div>
        </section>
      )}

      <div className="tabs">
        {[["all","전체"],["expense","지출"],["income","수입"]].map(([k,l]) => (
          <button key={k} className={"tab"+(filter===k?" on":"")} onClick={() => setFilter(k)}>{l}</button>))}
      </div>

      <section className="card">
        {shown.length === 0 ? <Empty icon={Wallet} text="내역이 없어요" /> : (
          <div className="tx-list">{shown.map((t) => (
            <div key={t.id} className="txr">
              <span className="tdot" style={{ background: t.type==="expense"?"var(--coral)":"var(--green)" }} />
              <div className="tx-mid"><div className="tx-l">{t.memo || t.cat}</div><div className="tx-meta">{t.cat} · {t.date.slice(5).replace("-",".")}</div></div>
              <span className="tx-v" style={{ color: t.type==="expense"?"var(--coral)":"var(--green)" }}>{t.type==="expense"?"-":"+"}{WON(t.amt)}</span>
              <div className="rowact"><button onClick={() => openEdit(t)} aria-label="수정"><Pencil size={14} /></button><button onClick={() => setDel(t)} aria-label="삭제"><Trash2 size={14} /></button></div>
            </div>))}
          </div>
        )}
      </section>

      {editing && (
        <Modal title={editing==="new"?"내역 추가":"내역 수정"} onClose={() => setEditing(null)}
          footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn primary" onClick={save}><Check size={15} /> 저장</button></>}>
          <div className="seg">
            <button className={form.type==="expense"?"on-exp":""} onClick={() => setForm({ ...form, type:"expense", cat:EXP[0] })}>지출</button>
            <button className={form.type==="income"?"on-inc":""} onClick={() => setForm({ ...form, type:"income", cat:INC[0] })}>수입</button>
          </div>
          <Row label="금액"><div className="amt-row"><span className="won">₩</span><input inputMode="numeric" placeholder="0" value={comma(form.amt)} onChange={(e) => setForm({ ...form, amt:e.target.value })} autoFocus /></div></Row>
          <Row label="분류"><div className="chips">{(form.type==="expense"?EXP:INC).map((c) => (
            <button key={c} className={"chip-b"+(form.cat===c?" on":"")} style={form.cat===c?{borderColor:catVar(c),color:catVar(c),background:tint(catVar(c),14)}:{}} onClick={() => setForm({ ...form, cat:c })}>{c}</button>))}</div></Row>
          <div className="frow2">
            <Row label="날짜"><input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date:e.target.value })} /></Row>
            <Row label="메모"><input className="inp" placeholder="선택 입력" value={form.memo} onChange={(e) => setForm({ ...form, memo:e.target.value })} /></Row>
          </div>
        </Modal>
      )}
      {del && <Confirm text={`${WON(del.amt)} (${del.cat}) 내역을 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setTxs((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
    </div>
  );
}

/* ════════════════ 꿈나무(독서일기) ════════════════ */
function DreamTree({ count }) {
  const spots = [[60,30],[42,40],[78,40],[34,54],[60,48],[86,54],[48,62],[72,62],[60,66]];
  const fruits = Math.min(count, spots.length);
  return (
    <svg viewBox="0 0 120 110" width="92" height="86" aria-hidden>
      <ellipse cx="60" cy="100" rx="28" ry="5" fill="var(--inset)" />
      <rect x="55" y="62" width="10" height="34" rx="4" fill="var(--coral)" opacity="0.5" />
      <ellipse cx="60" cy="46" rx="40" ry="34" fill="color-mix(in srgb, var(--green) 30%, transparent)" />
      <ellipse cx="60" cy="44" rx="32" ry="27" fill="color-mix(in srgb, var(--green) 22%, transparent)" />
      {spots.slice(0, fruits).map((s, i) => (
        <circle key={i} cx={s[0]} cy={s[1]} r="5.5" fill="var(--gold)" stroke="var(--card)" strokeWidth="1.5" />
      ))}
      {fruits === 0 && <circle cx="60" cy="46" r="4" fill="color-mix(in srgb, var(--green) 50%, transparent)" />}
    </svg>
  );
}

function ReadingPage({ books, setBooks }) {
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [viewer, setViewer] = useState(null);
  const COLORS = ["blue","rose","green","gold","violet","coral"];
  const STATUS = ["읽고 싶음","읽는 중","완독"];
  const empty = { title:"", author:"", status:"읽는 중", total:"", current:"", rating:0, review:"", color:"blue", cover:"" };
  const [form, setForm] = useState(empty);

  const done = books.filter((b) => b.status === "완독").length;
  const reading = books.filter((b) => b.status === "읽는 중").length;
  const statusColor = (s) => s === "완독" ? "green" : s === "읽는 중" ? "gold" : "blue";

  const openNew = () => { setForm(empty); setEditing("new"); };
  const openEdit = (b) => { setForm({ ...b, total:String(b.total||""), current:String(b.current||"") }); setEditing(b.id); };
  const save = () => {
    if (!form.title.trim()) return;
    const rec = { title:form.title.trim(), author:form.author.trim(), status:form.status, total:num(form.total), current:num(form.current), rating:form.rating, review:form.review.trim(), color:form.color, cover:form.cover||"" };
    if (editing === "new") setBooks((p) => [...p, { ...rec, id: uid() }]);
    else setBooks((p) => p.map((x) => x.id === editing ? { ...rec, id: editing } : x));
    setEditing(null);
  };

  return (
    <div className="pg">
      <PageHead icon={BookOpen} color="green" title="꿈나무" sub="읽은 만큼 자라는 나의 독서 나무"
        action={<button className="btn primary" onClick={openNew}><Plus size={16} /> 책 추가</button>} />

      <section className="card tree-card">
        <DreamTree count={done} />
        <div className="tree-stats">
          <div className="tree-msg"><Leaf size={15} color="var(--green)" /> 완독 <b>{done}권</b>으로 나무가 자라고 있어요</div>
          <div className="tree-nums">
            <div><span className="tn">{books.length}</span><span className="tl">전체</span></div>
            <div><span className="tn" style={{ color:"var(--gold)" }}>{reading}</span><span className="tl">읽는 중</span></div>
            <div><span className="tn" style={{ color:"var(--green)" }}>{done}</span><span className="tl">완독</span></div>
          </div>
        </div>
      </section>

      <section className="card insight">
        <TargetRing value={done} max={12} caption={`${done}/12`} sub="올해 목표" color="var(--green)" />
        <div className="ins-text">
          <div className="ins-cap">{done >= 12 ? "올해 독서 목표 달성! 🎉" : <>올해 목표까지 <b>{12 - done}권</b> 남았어요</>}</div>
          <div className="ins-sub">완독할 때마다 꿈나무에 열매가 하나씩 열려요. 지금 페이스를 유지해볼까요?</div>
          <Legend items={[
            { color:"var(--blue)", label:"읽고 싶음", value: books.filter((b) => b.status === "읽고 싶음").length },
            { color:"var(--gold)", label:"읽는 중", value: reading },
            { color:"var(--green)", label:"완독", value: done },
          ]} />
        </div>
      </section>

      {books.length === 0 ? <section className="card"><Empty icon={BookOpen} text="첫 번째 책을 등록해보세요" /></section> : (
        <div className="bgrid">
          {books.map((b) => {
            const pct = b.total ? Math.min(100, Math.round((b.current / b.total) * 100)) : 0;
            return (
              <article key={b.id} className="bcard">
                <button className="bcover" onClick={() => b.cover && setViewer(b.cover)} style={b.cover ? {} : { background:`linear-gradient(160deg, ${VAR(b.color)}, color-mix(in srgb, ${VAR(b.color)} 50%, #000))` }}>
                  {b.cover ? <img src={b.cover} alt={b.title} /> : <BookOpen size={22} color="#fff" />}
                </button>
                <div className="bbody">
                  <div className="bcard-top">
                    <span className="tag" style={{ color: VAR(statusColor(b.status)), background: tint(VAR(statusColor(b.status)),14) }}>{b.status}</span>
                    <div className="rowact static">
                      <button onClick={() => openEdit(b)} aria-label="수정"><Pencil size={13} /></button>
                      <button onClick={() => setDel(b)} aria-label="삭제"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <h4 className="btitle">{b.title}</h4>
                  <div className="bauthor">{b.author || "저자 미상"}</div>
                  {b.status !== "읽고 싶음" && b.total > 0 && (
                    <div className="bprog">
                      <div className="bprog-bar"><i style={{ width:`${pct}%`, background:VAR(b.color) }} /></div>
                      <span className="bprog-tx">{b.current}/{b.total}p · {pct}%</span>
                    </div>
                  )}
                  {b.rating > 0 && <Stars value={b.rating} size={14} />}
                  {b.review && <p className="breview">“{b.review}”</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing==="new"?"책 추가":"책 수정"} onClose={() => setEditing(null)} wide
          footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn primary" onClick={save}><Check size={15} /> 저장</button></>}>
          <div className="frow2">
            <Row label="제목"><input className="inp" autoFocus placeholder="책 제목" value={form.title} onChange={(e) => setForm({ ...form, title:e.target.value })} /></Row>
            <Row label="저자"><input className="inp" placeholder="저자" value={form.author} onChange={(e) => setForm({ ...form, author:e.target.value })} /></Row>
          </div>
          <Row label="상태"><div className="chips">{STATUS.map((s) => (
            <button key={s} className={"chip-b"+(form.status===s?" on":"")} style={form.status===s?{borderColor:VAR(statusColor(s)),color:VAR(statusColor(s)),background:tint(VAR(statusColor(s)),14)}:{}} onClick={() => setForm({ ...form, status:s })}>{s}</button>))}</div></Row>
          <div className="frow2">
            <Row label="현재 페이지"><input className="inp" inputMode="numeric" placeholder="0" value={form.current} onChange={(e) => setForm({ ...form, current:e.target.value })} /></Row>
            <Row label="전체 페이지"><input className="inp" inputMode="numeric" placeholder="0" value={form.total} onChange={(e) => setForm({ ...form, total:e.target.value })} /></Row>
          </div>
          <Row label="별점"><Stars value={form.rating} onChange={(v) => setForm({ ...form, rating:v })} /></Row>
          <Row label="표지 사진"><CoverInput cover={form.cover} color={form.color} onChange={(cover) => setForm({ ...form, cover })} /></Row>
          <Row label="표지 색 (사진 없을 때)"><div className="swatches">{COLORS.map((c) => (
            <button key={c} className={"sw"+(form.color===c?" on":"")} style={{ background: VAR(c) }} onClick={() => setForm({ ...form, color:c })} aria-label={c} />))}</div></Row>
          <Row label="한 줄 평"><textarea className="inp ta" rows={2} placeholder="기억하고 싶은 문장이나 감상" value={form.review} onChange={(e) => setForm({ ...form, review:e.target.value })} /></Row>
        </Modal>
      )}
      {del && <Confirm text={`"${del.title}"을(를) 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setBooks((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
      <Lightbox src={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}

/* ════════════════ 페이지: 대시보드 ════════════════ */
function DashboardPage({ go, now, profile, mitsByDate, setMitsByDate, todos, setTodos, habits, setHabits, events, diaries, metrics, books, dreams }) {
  const [mitText, setMitText] = useState("");
  const [editMitId, setEditMitId] = useState(null);
  const [editMitText, setEditMitText] = useState("");
  const [mitHistOpen, setMitHistOpen] = useState(false);
  const mits = mitsByDate[TODAY_KEY] || [];
  const setMits = (updater) => setMitsByDate((d) => ({ ...d, [TODAY_KEY]: typeof updater === "function" ? updater(d[TODAY_KEY] || []) : updater }));
  const mitHistory = Object.entries(mitsByDate).filter(([k]) => k !== TODAY_KEY && (mitsByDate[k] || []).length > 0).sort((a,b) => b[0].localeCompare(a[0]));
  const saveEditMit = () => { if (editMitText.trim()) setMits((p) => p.map((x) => x.id===editMitId?{...x,text:editMitText.trim()}:x)); setEditMitId(null); };
  const hr = now.getHours();
  const part = hr < 6 ? "늦은 밤이에요" : hr < 12 ? "좋은 아침이에요" : hr < 18 ? "좋은 오후예요" : "편안한 저녁이에요";
  const fmtTime = now.toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit", hour12:true });
  const fmtDate = now.toLocaleDateString("ko-KR", { month:"long", day:"numeric", weekday:"long" });

  const todayTodos = todos.filter((t) => t.date === TODAY_KEY || (t.date && t.date < TODAY_KEY && !t.done));
  const todayDoneN = todayTodos.filter((t) => t.done).length;
  const doneN = todayTodos.length ? todayDoneN : todos.filter((t) => t.done).length;
  const habitN = habits.filter((h) => h.on).length;
  const mitDone = mits.filter((m) => m.done).length;
  const todayDiary = diaries.find((d) => d.date === TODAY_KEY);
  const upcoming = events.filter((e) => e.date >= TODAY_KEY).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time)).slice(0,3);
  const reading = books.find((b) => b.status === "읽는 중");
  const visionPct = dreams.length ? Math.round(dreams.reduce((s,d) => s + (d.done?100:(d.progress||0)), 0) / dreams.length) : 0;
  const metricCur = (m) => { const e = m.entries.slice().sort((a,b) => a.date.localeCompare(b.date)); return e.length ? e[e.length-1].value : 0; };
  const metricPct = metrics.length ? Math.round(metrics.reduce((s,m) => s + (m.target>0?Math.min(100,Math.round(metricCur(m)/m.target*100)):0), 0) / metrics.length) : 0;
  const addMit = () => { if (!mitText.trim() || mits.length >= 3) return; setMits((p) => [...p, { id:uid(), text:mitText.trim(), done:false }]); setMitText(""); };

  const score = Math.round((((todayTodos.length?doneN/todayTodos.length:0) + (habits.length?habitN/habits.length:0) + (mits.length?mitDone/mits.length:0)) / 3) * 100);
  const weekScore = weekDays().map((d) => {
    const items = mitsByDate[d.key] || [];
    const v = items.length ? Math.round(items.filter((x) => x.done).length / items.length * 100) : 0;
    return { label: d.label, value: v, hl: d.today };
  });
  const cheer = score >= 80 ? "완벽에 가까워요. 이대로만 쭉!" : score >= 50 ? "좋아요, 한 걸음만 더 가볼까요?" : "시작이 반이에요. 작은 것부터 하나씩!";

  const SecHead = ({ icon:Icon, color, title, page }) => (
    <div className="card-head">
      <div className="card-title"><span className="icn" style={{ background: tint(VAR(color),16) }}><Icon size={16} color={VAR(color)} /></span>{title}</div>
      <button className="seemore" onClick={() => go(page)}>전체 보기 →</button>
    </div>
  );

  return (
    <div className="pg">
      <header className="dash-head">
        <div className="hello">
          <span className="eyebrow"><Sparkles size={14} /> 오늘의 대시보드</span>
          <h1 className="greet">안녕하세요, <b>{profile.name || "사용자"}</b>님</h1>
          <p className="focusline">{part} · 남은 할 일 <b>{todos.length - doneN}개</b>, 습관 <b>{habits.length - habitN}개</b> 더 남았어요</p>
        </div>
        <div className="dash-id">
          <div className="clock"><div className="t">{fmtTime}</div><div className="d">{fmtDate}</div></div>
          <Avatar profile={profile} size={48} />
        </div>
      </header>

      <section className="card dream-hero">
        <div className="card-head">
          <div className="card-title"><span className="icn" style={{ background:tint("var(--violet)",16) }}><Sparkles size={16} color="var(--violet)" /></span>비전 보드</div>
          <button className="seemore" onClick={() => go("dream")}>전체 보기 →</button>
        </div>
        <div className="hero-rail">
          {dreams.map((d) => (
            <button key={d.id} className="hero-tile" onClick={() => go("dream")} style={d.image?{}:{ background:`linear-gradient(150deg, ${VAR(d.color)}, color-mix(in srgb, ${VAR(d.color)} 45%, #000))` }}>
              {d.image ? <img src={d.image} alt="" /> : <Sparkles size={20} color="#fff" />}
              <span className="hero-grad" />
              <span className="hero-cap">{d.title}</span>
              <span className="hero-pbar"><i style={{ width:`${d.done?100:(d.progress||0)}%` }} /></span>
              {d.done && <span className="hero-badge"><Check size={11} strokeWidth={3} /></span>}
            </button>
          ))}
          <button className="hero-add" onClick={() => go("dream")}><Plus size={18} /><span>목표 추가</span></button>
        </div>
      </section>

      <section className="card mit-card">
        <div className="card-head">
          <div className="card-title"><span className="icn" style={{ background:tint("var(--accent)",16) }}><Target size={16} color="var(--accent)" /></span>오늘의 핵심 3가지</div>
          <div className="mit-head-r">
            <span className="meta">{mitDone}/{mits.length}</span>
            <button className="mit-hist-btn" onClick={() => setMitHistOpen(true)}><Clock size={13} /> 기록</button>
          </div>
        </div>
        <div className="mit-list">
          {mits.map((m, i) => (
            <div key={m.id} className={"mit-row"+(m.done?" done":"")}>
              <span className="mit-no">{i+1}</span>
              <button className={"box"+(m.done?" on":"")} onClick={() => setMits((p) => p.map((x) => x.id===m.id?{...x,done:!x.done}:x))} aria-label="완료"><Check size={13} strokeWidth={3} /></button>
              {editMitId === m.id ? (
                <input className="mit-input" autoFocus value={editMitText}
                  onChange={(e) => setEditMitText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEditMit(); if (e.key === "Escape") setEditMitId(null); }}
                  onBlur={saveEditMit} />
              ) : (
                <button className="mit-tx" onClick={() => { setEditMitId(m.id); setEditMitText(m.text); }}>{m.text}</button>
              )}
              <button className="mit-act-b" onClick={() => { setEditMitId(m.id); setEditMitText(m.text); }} aria-label="수정"><Pencil size={13} /></button>
              <button className="mit-act-b" onClick={() => setMits((p) => p.filter((x) => x.id !== m.id))} aria-label="삭제"><Trash2 size={13} /></button>
            </div>
          ))}
          {mits.length < 3 && (
            <div className="mit-row add">
              <span className="mit-no ghost">{mits.length+1}</span>
              <input className="mit-input" placeholder="오늘 가장 중요한 일은?" value={mitText} onChange={(e) => setMitText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMit()} />
              <button className="mit-addbtn" onClick={addMit} disabled={!mitText.trim()}><Plus size={16} strokeWidth={2.5} /></button>
            </div>
          )}
        </div>
        {mits.length === 0 && <div className="mit-empty-hint">새로운 하루예요. 오늘 가장 중요한 일 3가지를 정해보세요.</div>}
        {mits.length > 0 && mitDone === mits.length && <div className="mit-cheer">오늘의 핵심을 모두 해냈어요! 🎯 멋진 하루예요.</div>}
      </section>

      {mitHistOpen && (
        <Modal title="핵심 3가지 기록" onClose={() => setMitHistOpen(false)}>
          {mitHistory.length === 0 ? <Empty icon={Clock} text="아직 지난 기록이 없어요" /> : (
            <div className="mit-hist-list">
              {mitHistory.map(([date, items]) => {
                const dn = items.filter((x) => x.done).length;
                return (
                  <div key={date} className="mit-hist-day">
                    <div className="mhd-head">
                      <span className="mhd-date">{date.replace(/-/g,". ")}</span>
                      <span className={"mhd-count"+(dn===items.length?" all":"")}>{dn}/{items.length} 완료</span>
                    </div>
                    {items.map((it) => (
                      <div key={it.id} className={"mhd-item"+(it.done?" done":"")}>
                        <span className="mhd-dot">{it.done ? <Check size={11} strokeWidth={3} /> : ""}</span>{it.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      <section className="card metric-hero">
        <div className="card-head">
          <div className="card-title"><span className="icn" style={{ background:tint("var(--gold)",16) }}><TrendingUp size={16} color="var(--gold)" /></span>목표 지표</div>
          <button className="seemore" onClick={() => go("metric")}>전체 보기 →</button>
        </div>
        {metrics.length === 0 ? <Empty icon={TrendingUp} text="추적할 핵심 숫자를 추가해보세요" /> : (
          <div className="metric-hero-grid">{metrics.slice(0,3).map((m) => {
            const cur = metricCur(m), pct = m.target>0?Math.round(cur/m.target*100):0;
            return (
              <div key={m.id} className="mm-metric">
                <div className="mmm-top"><span className="mmm-name">{m.name}</span><span className="mmm-pct" style={{ color:VAR(m.color) }}>{pct}%</span></div>
                <div className="m-bar sm"><i style={{ width:`${Math.min(100,pct)}%`, background:VAR(m.color) }} /></div>
              </div>
            );
          })}</div>
        )}
      </section>

      <section className="dash-insights">
        <div className="card insight">
          <TargetRing value={score} sub="오늘 목표" color="var(--accent)" />
          <div className="ins-text">
            <div className="ins-cap">오늘의 집중 점수 <b>{score}점</b></div>
            <div className="ins-sub">{cheer}</div>
            <div className="mini-legend">할 일 · 습관 · 오늘의 핵심 3가지를 합친 종합 달성률이에요</div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-title"><span className="icn" style={{ background:tint("var(--accent)",16) }}><Target size={16} color="var(--accent)" /></span>주간 달성 흐름</div></div>
          <Bars data={weekScore} color="var(--accent)" height={132} />
        </div>
      </section>

      <section className="stats">
        <button className="stat" onClick={() => go("todo")}>
          <span className="lbl"><span className="chip" style={{ background:tint("var(--accent)",16) }}><ListTodo size={14} color="var(--accent)" /></span> 오늘 할 일</span>
          <span className="val">{doneN}<small> / {todayTodos.length}</small></span></button>
        <button className="stat" onClick={() => go("habit")}>
          <span className="lbl"><span className="chip" style={{ background:tint("var(--green)",16) }}><Target size={14} color="var(--green)" /></span> 습관 달성</span>
          <span className="val">{habitN}<small> / {habits.length}</small></span></button>
        <button className="stat" onClick={() => go("dream")}>
          <span className="lbl"><span className="chip" style={{ background:tint("var(--violet)",16) }}><Sparkles size={14} color="var(--violet)" /></span> 비전 진행률</span>
          <span className="val">{visionPct}<small>%</small></span></button>
        <button className="stat" onClick={() => go("metric")}>
          <span className="lbl"><span className="chip" style={{ background:tint("var(--gold)",16) }}><TrendingUp size={14} color="var(--gold)" /></span> 목표 지표</span>
          <span className="val">{metricPct}<small>%</small></span></button>
      </section>

      <div className="dash-grid">
        {/* 다가오는 일정 */}
        <section className="card a-cal">
          <SecHead icon={CalendarIcon} color="blue" title="다가오는 일정" page="cal" />
          {upcoming.length === 0 ? <Empty icon={CalendarIcon} text="예정된 일정이 없어요" /> : (
            <div className="ev-list">{upcoming.map((e) => (
              <div key={e.id} className="ev mini"><span className="ev-bar" style={{ background:catVar(e.cat) }} />
                <div className="ev-date">{e.date === TODAY_KEY ? "오늘" : e.date.slice(5).replace("-",".")}<br /><b>{e.time}</b></div>
                <div className="ev-mid"><div className="ev-title">{e.title}</div></div>
                <span className="tag" style={{ color:catVar(e.cat), background:tint(catVar(e.cat),14) }}>{e.cat}</span>
              </div>))}
            </div>
          )}
        </section>

        {/* 오늘 할 일 (대시보드에서 바로 체크 가능) */}
        <section className="card a-todo">
          <SecHead icon={ListTodo} color="accent" title="오늘 할 일" page="todo" />
          <div className="progress"><i style={{ width:`${todayTodos.length?(todayDoneN/todayTodos.length)*100:0}%` }} /></div>
          {todayTodos.length === 0 ? <Empty icon={ListTodo} text="오늘로 잡힌 할 일이 없어요" /> : (
          <div className="todos">{todayTodos.slice(0,5).map((t) => (
            <div key={t.id} className={"todo"+(t.done?" done":"")+(t.date && t.date < TODAY_KEY && !t.done?" overdue":"")}>
              <button className={"box"+(t.done?" on":"")} onClick={() => setTodos((p) => p.map((x) => x.id===t.id?{...x,done:!x.done}:x))}><Check size={13} strokeWidth={3} /></button>
              <span className="tx">{t.title}</span>
              <span className="tag" style={{ color:catVar(t.cat), background:tint(catVar(t.cat),14) }}>{t.cat}</span>
            </div>))}
          </div>
          )}
        </section>

        {/* 습관 */}
        <section className="card a-habit">
          <SecHead icon={Target} color="green" title="습관" page="habit" />
          <div className="habits-mini">{habits.slice(0,4).map((h) => (
            <div key={h.id} className={"habit"+(h.on?" on":"")}>
              <button className={"hcheck sm"+(h.on?" on":"")} style={h.on?{background:VAR(h.color),borderColor:VAR(h.color)}:{}} onClick={() => setHabits((p) => p.map((x) => x.id===h.id?{...x,on:!x.on,streak:x.on?Math.max(0,x.streak-1):x.streak+1,week:x.on?[...x.week.slice(0,6),0]:[...x.week.slice(0,6),1]}:x))}>
                <Check size={14} strokeWidth={3} color={h.on?"#fff":"transparent"} /></button>
              <span className="hn">{h.name}</span>
              <span className="streak"><Flame size={12} /> {h.streak}</span>
            </div>))}
          </div>
        </section>

        {/* 일기 */}
        <section className="card a-diary">
          <SecHead icon={PenLine} color="rose" title="오늘의 일기" page="diary" />
          {todayDiary ? (
            <div className="dash-diary">
              <div className="dd-mood">{MOODS[todayDiary.mood].e} <span>{MOODS[todayDiary.mood].l}</span></div>
              <p className="dtext">{todayDiary.text}</p>
              {todayDiary.photos && todayDiary.photos.length > 0 && (
                <div className="dphotos sm">{todayDiary.photos.slice(0,4).map((s,i) => <span className="dphoto" key={i}><img src={s} alt="" /></span>)}</div>
              )}
            </div>
          ) : <button className="write-prompt" onClick={() => go("diary")}><PenLine size={16} /> 오늘 일기를 아직 안 썼어요. 기록하러 가기</button>}
        </section>

        {/* 꿈나무 */}
        <section className="card a-read">
          <SecHead icon={BookOpen} color="green" title="꿈나무" page="read" />
          <div className="dash-read">
            <DreamTree count={books.filter((b) => b.status === "완독").length} />
            <div className="dr-info">
              {reading ? <>
                <div className="dr-label">읽는 중</div>
                <div className="dr-title">{reading.title}</div>
                <div className="dr-author">{reading.author}</div>
                {reading.total > 0 && <div className="bprog-bar sm"><i style={{ width:`${Math.min(100,Math.round(reading.current/reading.total*100))}%`, background:"var(--green)" }} /></div>}
              </> : <div className="dr-empty">읽는 중인 책이 없어요</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
function ChecklistPage({ page, items, setItems }) {
  const [quick, setQuick] = useState("");
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [text, setText] = useState("");
  const doneN = items.filter((i) => i.done).length;
  const add = () => { if (!quick.trim()) return; setItems((p) => [...p, { id:uid(), text:quick.trim(), done:false }]); setQuick(""); };
  const openEdit = (it) => { setText(it.text); setEditing(it.id); };
  const save = () => { if (!text.trim()) return; setItems((p) => p.map((x) => x.id === editing ? { ...x, text:text.trim() } : x)); setEditing(null); };
  return (
    <div className="pg">
      <PageHead icon={ICONS[page.icon] || ListChecks} color={page.color} title={page.label} sub={`${items.length}개 중 ${doneN}개 완료`} />
      <div className="adder big">
        <input className="inp" placeholder="항목을 입력하고 Enter로 추가하세요" value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn-icn" style={{ background:VAR(page.color) }} onClick={add}><Plus size={18} strokeWidth={2.5} color="#fff" /></button>
      </div>
      {items.length > 0 && <div className="progress"><i style={{ width:`${(doneN/items.length)*100}%`, background:VAR(page.color) }} /></div>}
      <section className="card">
        {items.length === 0 ? <Empty icon={ListChecks} text="첫 항목을 추가해보세요" /> : (
          <div className="todos">{items.map((it) => (
            <div key={it.id} className={"todo"+(it.done?" done":"")}>
              <button className={"box"+(it.done?" on":"")} style={it.done?{ background:VAR(page.color), borderColor:VAR(page.color) }:{}} onClick={() => setItems((p) => p.map((x) => x.id===it.id?{...x,done:!x.done}:x))}><Check size={13} strokeWidth={3} color={it.done?"#fff":"transparent"} /></button>
              <span className="tx">{it.text}</span>
              <div className="rowact"><button onClick={() => openEdit(it)}><Pencil size={14} /></button><button onClick={() => setDel(it)}><Trash2 size={14} /></button></div>
            </div>))}
          </div>
        )}
      </section>
      {editing && <Modal title="항목 수정" onClose={() => setEditing(null)} footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn primary" onClick={save}><Check size={15} /> 저장</button></>}><Row label="내용"><input className="inp" autoFocus value={text} onChange={(e) => setText(e.target.value)} /></Row></Modal>}
      {del && <Confirm text={`"${del.text}"을(를) 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setItems((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
    </div>
  );
}

function NotesPage({ page, items, setItems }) {
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const empty = { date: TODAY_KEY, text:"" };
  const [form, setForm] = useState(empty);
  const sorted = items.slice().sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  const openNew = () => { setForm(empty); setEditing("new"); };
  const openEdit = (n) => { setForm({ date:n.date, text:n.text }); setEditing(n.id); };
  const save = () => { if (!form.text.trim()) return; if (editing === "new") setItems((p) => [...p, { ...form, id:uid() }]); else setItems((p) => p.map((x) => x.id === editing ? { ...form, id:editing } : x)); setEditing(null); };
  return (
    <div className="pg">
      <PageHead icon={ICONS[page.icon] || NotebookPen} color={page.color} title={page.label} sub={`${items.length}개의 기록`}
        action={<button className="btn primary" style={{ background:VAR(page.color), borderColor:"transparent", color:"#fff" }} onClick={openNew}><Plus size={16} /> 새 메모</button>} />
      {sorted.length === 0 ? <section className="card"><Empty icon={NotebookPen} text="첫 메모를 작성해보세요" /></section> : (
        <div className="diary-grid">{sorted.map((n) => (
          <article key={n.id} className="dcard" onClick={() => openEdit(n)}>
            <div className="dcard-head">
              <span className="icn" style={{ background:tint(VAR(page.color),16) }}><Icon name={page.icon} size={15} color={VAR(page.color)} /></span>
              <div><div className="ddate">{n.date.replace(/-/g,". ")}</div></div>
              <div className="rowact static" onClick={(e) => e.stopPropagation()}><button onClick={() => openEdit(n)}><Pencil size={13} /></button><button onClick={() => setDel(n)}><Trash2 size={13} /></button></div>
            </div>
            <p className="dtext">{n.text}</p>
          </article>))}
        </div>
      )}
      {editing && <Modal title={editing==="new"?"새 메모":"메모 수정"} onClose={() => setEditing(null)} wide footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn primary" onClick={save}><Check size={15} /> 저장</button></>}>
        <Row label="날짜"><input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date:e.target.value })} /></Row>
        <Row label="내용"><textarea className="inp ta tall" autoFocus placeholder="자유롭게 적어보세요" value={form.text} onChange={(e) => setForm({ ...form, text:e.target.value })} /></Row>
      </Modal>}
      {del && <Confirm text="이 메모를 삭제할까요?" onCancel={() => setDel(null)} onOk={() => { setItems((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
    </div>
  );
}

const CustomPage = ({ page, items, setItems }) =>
  page.kind === "checklist"
    ? <ChecklistPage page={page} items={items} setItems={setItems} />
    : <NotesPage page={page} items={items} setItems={setItems} />;

/* ════════════════ 드림보드 (비전보드) ════════════════ */
function DreamBoardPage({ dreams, setDreams }) {
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const [viewer, setViewer] = useState(null);
  const empty = { title:"", note:"", target:"", image:"", color:"violet", done:false, progress:0 };
  const [form, setForm] = useState(empty);
  const prog = (d) => d.done ? 100 : (d.progress || 0);
  const doneN = dreams.filter((d) => d.done).length;
  const avgPct = dreams.length ? Math.round(dreams.reduce((s,d) => s + prog(d), 0) / dreams.length) : 0;
  const openNew = () => { setForm(empty); setEditing("new"); };
  const openEdit = (d) => { setForm({ ...empty, ...d }); setEditing(d.id); };
  const save = () => {
    if (!form.title.trim()) return;
    const rec = { title:form.title.trim(), note:form.note.trim(), target:form.target.trim(), image:form.image||"", color:form.color, done:form.done, progress: form.done ? 100 : (Number(form.progress) || 0) };
    if (editing === "new") setDreams((p) => [...p, { ...rec, id:uid() }]);
    else setDreams((p) => p.map((x) => x.id === editing ? { ...rec, id:editing } : x));
    setEditing(null);
  };
  const toggleDone = (id) => setDreams((p) => p.map((d) => d.id === id ? { ...d, done:!d.done } : d));
  return (
    <div className="pg">
      <PageHead icon={Sparkles} color="violet" title="비전 보드" sub="이루고 싶은 목표를 눈에 보이게, 진행률로 확인"
        action={<button className="btn primary" onClick={openNew}><Plus size={16} /> 목표 추가</button>} />

      {dreams.length > 0 && (
        <section className="card insight">
          <TargetRing value={avgPct} caption={`${avgPct}%`} sub="평균 진행률" color="var(--violet)" />
          <div className="ins-text">
            <div className="ins-cap">전체 목표 평균 진행률 <b>{avgPct}%</b> · 달성 <b>{doneN}개</b></div>
            <div className="ins-sub">각 목표의 진행률을 조금씩 올리며 매일 전진을 확인하세요. 다 이루면 카드를 체크하면 됩니다.</div>
          </div>
        </section>
      )}

      {dreams.length === 0 ? <section className="card"><Empty icon={Sparkles} text="이루고 싶은 꿈을 사진과 함께 올려보세요" /></section> : (
        <div className="dream-grid">
          {dreams.map((d) => (
            <article key={d.id} className={"dream-card"+(d.done?" done":"")}>
              <button className={"dream-img"+(d.image?"":" ph")} onClick={() => d.image ? setViewer(d.image) : openEdit(d)} style={d.image?{}:{ background:`linear-gradient(150deg, ${VAR(d.color)}, color-mix(in srgb, ${VAR(d.color)} 45%, #000))` }}>
                {d.image ? <img src={d.image} alt={d.title} /> : <Sparkles size={26} color="#fff" />}
                {d.done && <span className="dream-badge"><Check size={12} strokeWidth={3} /> 이룸</span>}
              </button>
              <div className="dream-body">
                <div className="dream-top">
                  <h4 className="dream-title">{d.title}</h4>
                  <div className="rowact static"><button onClick={() => openEdit(d)} aria-label="수정"><Pencil size={13} /></button><button onClick={() => setDel(d)} aria-label="삭제"><Trash2 size={13} /></button></div>
                </div>
                {d.note && <p className="dream-note">{d.note}</p>}
                <div className="dream-prog">
                  <div className="dream-bar"><i style={{ width:`${prog(d)}%`, background:VAR(d.color) }} /></div>
                  <span className="dream-pct">{prog(d)}%</span>
                </div>
                <div className="dream-foot">
                  {d.target ? <span className="dream-target">🎯 {d.target}</span> : <span />}
                  <button className={"dream-check"+(d.done?" on":"")} onClick={() => toggleDone(d.id)}>{d.done ? "달성 ✓" : "달성"}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing==="new"?"꿈 추가":"꿈 수정"} onClose={() => setEditing(null)} wide
          footer={<><button className="btn ghost" onClick={() => setEditing(null)}>취소</button><button className="btn primary" onClick={save}><Check size={15} /> 저장</button></>}>
          <Row label="사진"><SingleImage value={form.image} onChange={(image) => setForm({ ...form, image })} /></Row>
          <Row label="제목"><input className="inp" autoFocus placeholder="예: 제주 한 달 살기" value={form.title} onChange={(e) => setForm({ ...form, title:e.target.value })} /></Row>
          <Row label="메모"><input className="inp" placeholder="한 줄 설명 (선택)" value={form.note} onChange={(e) => setForm({ ...form, note:e.target.value })} /></Row>
          <div className="frow2">
            <Row label="목표 시기"><input className="inp" placeholder="예: 2026 여름" value={form.target} onChange={(e) => setForm({ ...form, target:e.target.value })} /></Row>
            <Row label="색상"><div className="swatches">{["violet","blue","rose","green","gold","coral"].map((c) => (
              <button key={c} className={"sw"+(form.color===c?" on":"")} style={{ background:VAR(c) }} onClick={() => setForm({ ...form, color:c })} aria-label={c} />))}</div></Row>
          </div>
          <Row label={`진행률 — ${form.done ? 100 : (form.progress||0)}%`}>
            <input type="range" min="0" max="100" step="5" className="range" value={form.done ? 100 : (form.progress||0)} disabled={form.done} onChange={(e) => setForm({ ...form, progress:Number(e.target.value) })} />
          </Row>
          <label className="check-line"><input type="checkbox" checked={form.done} onChange={(e) => setForm({ ...form, done:e.target.checked })} /> 이 목표를 달성했어요 (진행률 100%)</label>
        </Modal>
      )}
      {del && <Confirm text={`"${del.title}" 꿈을 삭제할까요?`} onCancel={() => setDel(null)} onOk={() => { setDreams((p) => p.filter((x) => x.id !== del.id)); setDel(null); }} />}
      <Lightbox src={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}

/* ════════════════ 메뉴 편집 ════════════════ */
/* ════════════════ 테마 설정 ════════════════ */
function ThemePage({ mood, setMood, theme, setTheme }) {
  return (
    <div className="pg">
      <PageHead icon={Palette} color="violet" title="테마 설정" sub="기분에 따라 색상 무드와 명도를 골라보세요" />

      <section className="card theme-sec">
        <div className="card-head"><div className="card-title">명도</div></div>
        <div className="mode-toggle">
          <button className={"mode-opt"+(theme==="light"?" on":"")} onClick={() => setTheme("light")}><Sun size={18} /> 라이트</button>
          <button className={"mode-opt"+(theme==="dark"?" on":"")} onClick={() => setTheme("dark")}><Moon size={18} /> 다크</button>
        </div>
      </section>

      <section className="card theme-sec">
        <div className="card-head"><div className="card-title">색상 무드</div></div>
        <div className="mood-grid">
          {MOOD_THEMES.map((m) => (
            <button key={m.id} className={"mood-card"+(mood===m.id?" on":"")} onClick={() => setMood(m.id)}>
              <span className="mood-prev" style={{ background:m.swatch[theme==="light"?2:1] }}>
                <span className="mp-dot" style={{ background: m.gradient ? `linear-gradient(135deg, ${m.swatch[0]}, #e85ec2)` : m.swatch[0] }} />
              </span>
              <span className="mood-info"><b>{m.label}</b><small>{m.sub}</small></span>
              {mood===m.id && <span className="mood-check"><Check size={13} strokeWidth={3} /></span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}


function MenuManager({ pages, setPages, setCustomData, onClose, currentPageId, setPage }) {
  const [editingPage, setEditingPage] = useState(null);
  const [delPage, setDelPage] = useState(null);
  const [pf, setPf] = useState({ label:"", icon:"checks", color:"blue", kind:"checklist" });

  const move = (idx, dir) => { const a = [...pages]; const j = idx + dir; if (j < 0 || j >= a.length) return; [a[idx], a[j]] = [a[j], a[idx]]; setPages(a); };
  const toggleHidden = (id) => setPages(pages.map((p) => p.id === id ? { ...p, hidden:!p.hidden } : p));
  const openNew = () => { setPf({ label:"", icon:"checks", color:"blue", kind:"checklist" }); setEditingPage("new"); };
  const openEdit = (p) => { setPf({ label:p.label, icon:p.icon, color:p.color, kind:p.kind }); setEditingPage(p.id); };
  const savePage = () => {
    if (!pf.label.trim()) return;
    if (editingPage === "new") {
      const id = "c" + uid();
      setPages([...pages, { id, label:pf.label.trim(), icon:pf.icon, color:pf.color, kind:pf.kind, hidden:false }]);
      setCustomData((d) => ({ ...d, [id]: [] }));
    } else {
      setPages(pages.map((p) => p.id === editingPage ? { ...p, label:pf.label.trim(), icon:pf.icon, color:pf.color } : p));
    }
    setEditingPage(null);
  };
  const remove = (p) => { if (currentPageId === p.id) setPage("dash"); setPages(pages.filter((x) => x.id !== p.id)); setCustomData((d) => { const n = { ...d }; delete n[p.id]; return n; }); setDelPage(null); };

  return (
    <>
      <Modal title="메뉴 편집" onClose={onClose} footer={<button className="btn primary" onClick={openNew}><Plus size={15} /> 새 페이지 추가</button>}>
        <div className="mm-list">
          {pages.map((p, idx) => (
            <div className="mm-row" key={p.id}>
              <div className="mm-reorder">
                <button disabled={idx===0} onClick={() => move(idx,-1)} aria-label="위로"><ArrowUp size={14} /></button>
                <button disabled={idx===pages.length-1} onClick={() => move(idx,1)} aria-label="아래로"><ArrowDown size={14} /></button>
              </div>
              <span className="mm-ic" style={{ background:tint(VAR(p.color),16) }}><Icon name={p.icon} size={16} color={VAR(p.color)} /></span>
              <span className={"mm-name"+(p.hidden?" off":"")}>{p.label}{p.kind!=="builtin" && <em> · {p.kind==="checklist"?"체크리스트":"메모"}</em>}</span>
              <div className="mm-act">
                <button onClick={() => toggleHidden(p.id)} aria-label="표시/숨김">{p.hidden ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                <button onClick={() => openEdit(p)} aria-label="수정"><Pencil size={14} /></button>
                {p.kind!=="builtin" && <button onClick={() => setDelPage(p)} aria-label="삭제"><Trash2 size={14} /></button>}
              </div>
            </div>
          ))}
        </div>
        <p className="mm-hint">👁 기본 페이지는 숨기기만 가능해요. 직접 추가한 페이지는 삭제할 수 있습니다. 화살표로 순서를 바꿔보세요.</p>
      </Modal>

      {editingPage && (
        <Modal title={editingPage==="new"?"새 페이지":"페이지 수정"} onClose={() => setEditingPage(null)} wide
          footer={<><button className="btn ghost" onClick={() => setEditingPage(null)}>취소</button><button className="btn primary" onClick={savePage}><Check size={15} /> 저장</button></>}>
          <Row label="이름"><input className="inp" autoFocus placeholder="예: 장보기 목록" value={pf.label} onChange={(e) => setPf({ ...pf, label:e.target.value })} /></Row>
          {editingPage === "new" && (
            <Row label="유형"><div className="type-pick">{PAGE_TYPES.map((t) => (
              <button key={t.kind} className={"type-card"+(pf.kind===t.kind?" on":"")} onClick={() => setPf({ ...pf, kind:t.kind, icon:t.icon })}>
                <Icon name={t.icon} size={18} color="var(--accent)" /><b>{t.label}</b><span>{t.desc}</span>
              </button>))}</div></Row>
          )}
          <Row label="아이콘"><div className="icon-pick">{PICK_ICONS.map((ic) => (
            <button key={ic} className={"ic-b"+(pf.icon===ic?" on":"")} onClick={() => setPf({ ...pf, icon:ic })}><Icon name={ic} size={18} /></button>))}</div></Row>
          <Row label="색상"><div className="swatches">{["blue","rose","green","gold","violet","coral"].map((c) => (
            <button key={c} className={"sw"+(pf.color===c?" on":"")} style={{ background:VAR(c) }} onClick={() => setPf({ ...pf, color:c })} aria-label={c} />))}</div></Row>
        </Modal>
      )}
      {delPage && <Confirm text={`"${delPage.label}" 페이지와 그 안의 모든 내용을 삭제할까요?`} onCancel={() => setDelPage(null)} onOk={() => remove(delPage)} />}
    </>
  );
}

/* 페이지를 memo로 감싸 매초 시계 갱신 등 무관한 상태 변화로 인한 재렌더를 차단.
   (전역 상태 라이브러리는 실제 프로젝트 분리 시 도입 권장) */
const MDashboard = memo(DashboardPage);
const MSchedule = memo(SchedulePage);
const MTodo = memo(TodoPage);
const MHabits = memo(HabitsPage);
const MDiary = memo(DiaryPage);
const MMetrics = memo(MetricsPage);
const MBudget = memo(BudgetPage);
const MReading = memo(ReadingPage);
const MDream = memo(DreamBoardPage);
const MCustom = memo(CustomPage);

/* ════════════════ 루트 앱 ════════════════ */
export default function App() {
  const [theme, setTheme] = usePersistentState("theme", "dark");
  const [mood, setMood] = usePersistentState("mood", "amber");
  const cycleMood = () => setMood((m) => { const i = MOOD_THEMES.findIndex((x) => x.id === m); return MOOD_THEMES[(i + 1) % MOOD_THEMES.length].id; });
  const [page, setPage] = useState("dash");
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pages, setPages] = usePersistentState("pages", BUILTINS);
  const [customData, setCustomData] = usePersistentState("customData", {});
  const [profile, setProfile] = usePersistentState("profile", { name:"사용자", avatar:"" });
  const [profileOpen, setProfileOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  /* 초기 데모 데이터 (Supabase 연동 시 이 부분을 fetch 결과로 대체) */
  const [todos, setTodos] = usePersistentState("todos", [
    { id:1, title:"스탠드업 미팅 준비", done:true, cat:"업무", date:TODAY_KEY },
    { id:2, title:"운동 30분", done:false, cat:"건강", date:TODAY_KEY },
    { id:3, title:"전기요금 납부", done:false, cat:"생활", date:TODAY_KEY },
    { id:4, title:"사이드 프로젝트 PR 리뷰", done:false, cat:"공부", date:"" },
    { id:5, title:"엄마한테 전화하기", done:false, cat:"개인", date:TODAY_KEY },
  ]);
  const [events, setEvents] = usePersistentState("events", [
    { id:11, title:"팀 회의", date:TODAY_KEY, time:"10:00", cat:"업무", memo:"분기 회고" },
    { id:12, title:"치과 예약", date:TODAY_KEY, time:"15:30", cat:"건강", memo:"" },
    { id:13, title:"저녁 약속", date:keyOf(TODAY.y,TODAY.m,Math.min(28,TODAY.d+2)), time:"19:00", cat:"약속", memo:"대학 동기 모임" },
  ]);
  const [habits, setHabits] = usePersistentState("habits", [
    { id:21, name:"물 2L 마시기", color:"blue", on:true, streak:12, week:[1,1,0,1,1,1,1] },
    { id:22, name:"독서 20분", color:"green", on:false, streak:5, week:[1,1,1,0,1,1,0] },
    { id:23, name:"아침 스트레칭", color:"gold", on:true, streak:23, week:[1,1,1,1,1,1,1] },
    { id:24, name:"코드 1커밋", color:"violet", on:false, streak:8, week:[1,0,1,1,1,1,0] },
  ]);
  const [diaries, setDiaries] = usePersistentState("diaries", [
    { id:31, date:TODAY_KEY, mood:0, text:"오랜만에 코드가 술술 풀린 하루. 사이드 프로젝트 대시보드 디자인을 거의 끝냈다. 내일은 가계부 페이지를 다듬어야지." },
    { id:32, date:keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-1)), mood:2, text:"비가 와서 차분한 하루였다. 카페에서 책 한 권을 거의 다 읽었다." },
    { id:33, date:keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-2)), mood:1, text:"친구들과 오랜만에 만나 즐거운 저녁. 에너지가 충전된 기분." },
    { id:34, date:keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-3)), mood:3, text:"무난한 하루. 할 일은 했지만 특별한 건 없었다." },
    { id:35, date:keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-4)), mood:4, text:"조금 지친 하루. 일찍 자기로." },
    { id:36, date:keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-5)), mood:1, text:"운동 후 개운함. 꾸준히 하니 컨디션이 좋아진다." },
  ]);
  const [mitsByDate, setMitsByDate] = usePersistentState("mitsByDate", {
    [TODAY_KEY]: [
      { id:81, text:"투자 제안서 초안 마무리", done:true },
      { id:82, text:"신규 고객 미팅 준비", done:false },
    ],
    [keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-1))]: [
      { id:84, text:"분기 리포트 발송", done:true },
      { id:85, text:"세금계산서 정리", done:true },
      { id:86, text:"디자인 시안 피드백", done:false },
    ],
    [keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-2))]: [
      { id:87, text:"제품 페이지 카피 작성", done:true },
      { id:88, text:"고객 응대 메일 정리", done:true },
    ],
  });
  const [metrics, setMetrics] = usePersistentState("metrics", [
    { id:71, name:"월 매출", unit:"원", target:5000000, color:"gold", entries:[
      { id:1, date:keyOf(TODAY.y,TODAY.m,1), value:2100000 },
      { id:2, date:keyOf(TODAY.y,TODAY.m,Math.max(2,TODAY.d-7)), value:3200000 },
      { id:3, date:TODAY_KEY, value:3850000 },
    ] },
    { id:72, name:"뉴스레터 구독자", unit:"명", target:1000, color:"blue", entries:[
      { id:1, date:keyOf(TODAY.y,TODAY.m,1), value:420 },
      { id:2, date:keyOf(TODAY.y,TODAY.m,Math.max(2,TODAY.d-5)), value:560 },
      { id:3, date:TODAY_KEY, value:690 },
    ] },
    { id:73, name:"비상금 저축", unit:"원", target:10000000, color:"green", entries:[
      { id:1, date:keyOf(TODAY.y,TODAY.m,1), value:4500000 },
      { id:2, date:TODAY_KEY, value:6200000 },
    ] },
  ]);
  const [txs, setTxs] = usePersistentState("txs", [
    { id:41, type:"expense", amt:8500, cat:"식비", memo:"점심 김치찌개", date:TODAY_KEY },
    { id:42, type:"expense", amt:4800, cat:"카페", memo:"아이스 아메리카노", date:TODAY_KEY },
    { id:43, type:"income", amt:300000, cat:"용돈", memo:"생활비", date:keyOf(TODAY.y,TODAY.m,1) },
    { id:44, type:"expense", amt:32000, cat:"쇼핑", memo:"티셔츠", date:keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-2)) },
    { id:45, type:"expense", amt:1500, cat:"교통", memo:"버스", date:TODAY_KEY },
    { id:46, type:"expense", amt:12000, cat:"식비", memo:"저녁 분식", date:keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-1)) },
    { id:47, type:"expense", amt:9900, cat:"여가", memo:"영화", date:keyOf(TODAY.y,TODAY.m,Math.max(1,TODAY.d-3)) },
  ]);
  const [books, setBooks] = usePersistentState("books", [
    { id:51, title:"클린 코드", author:"로버트 마틴", status:"읽는 중", total:464, current:180, rating:4, review:"이름 짓기의 중요함을 다시 느낀다.", color:"blue" },
    { id:52, title:"미드나잇 라이브러리", author:"매트 헤이그", status:"완독", total:320, current:320, rating:5, review:"후회와 가능성에 대한 따뜻한 이야기.", color:"rose" },
    { id:53, title:"사피엔스", author:"유발 하라리", status:"읽고 싶음", total:0, current:0, rating:0, review:"", color:"gold" },
    { id:54, title:"함께 자라기", author:"김창준", status:"완독", total:198, current:198, rating:5, review:"꾸준함과 피드백, 그리고 동료.", color:"green" },
  ]);
  const [dreams, setDreams] = usePersistentState("dreams", [
    { id:61, title:"제주 한 달 살기", note:"바다 보며 일하기 🌊", target:"2026 여름", image:"", color:"blue", done:false, progress:30 },
    { id:62, title:"Momentum 정식 출시", note:"내 손으로 만든 앱 런칭 🚀", target:"올해 안에", image:"", color:"violet", done:false, progress:55 },
    { id:63, title:"풀 마라톤 완주", note:"42.195km 도전", target:"가을 대회", image:"", color:"green", done:true, progress:100 },
    { id:64, title:"유럽 배낭여행", note:"파리 · 로마 · 바르셀로나", target:"언젠가", image:"", color:"gold", done:false, progress:15 },
  ]);

  const go = useCallback((p) => { setPage(p); setNavOpen(false); window.scrollTo({ top:0 }); }, []);
  const resetAll = () => {
    try { ["pages","customData","profile","mitsByDate","todos","events","habits","diaries","metrics","txs","books","dreams"].forEach((k) => { if (LS) LS.removeItem(k); }); } catch (e) {}
    setPages(BUILTINS); setCustomData({}); setProfile({ name:"", avatar:"" }); setMitsByDate({});
    setTodos([]); setEvents([]); setHabits([]); setDiaries([]);
    setMetrics([]); setTxs([]); setBooks([]); setDreams([]);
    setResetOpen(false); setNavOpen(false); setMenuOpen(false); setPage("dash");
    window.scrollTo({ top:0 });
  };

  const exportData = () => {
    const data = { _app:"momentum", _version:1, exportedAt:new Date().toISOString(),
      theme, mood, pages, customData, profile, todos, events, habits, diaries, mitsByDate, metrics, txs, books, dreams };
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      a.href = url;
      a.download = `momentum-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { alert("내보내기에 실패했어요. 다시 시도해 주세요."); }
  };

  const applyImport = (data) => {
    if (!data || typeof data !== "object") return false;
    const set = (v, fn) => { if (v !== undefined) fn(v); };
    set(data.theme, setTheme); set(data.mood, setMood);
    set(data.pages, setPages); set(data.customData, setCustomData); set(data.profile, setProfile);
    set(data.todos, setTodos); set(data.events, setEvents); set(data.habits, setHabits);
    set(data.diaries, setDiaries); set(data.mitsByDate, setMitsByDate); set(data.metrics, setMetrics);
    set(data.txs, setTxs); set(data.books, setBooks); set(data.dreams, setDreams);
    return true;
  };
  const importData = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data._app && data._app !== "momentum") { if (!confirm("이 파일은 Momentum 백업이 아닐 수 있어요. 그래도 불러올까요?")) return; }
        if (applyImport(data)) { setNavOpen(false); setPage("dash"); window.scrollTo({ top:0 }); alert("데이터를 불러왔어요! ✅"); }
        else alert("파일 형식을 읽을 수 없어요.");
      } catch (e) { alert("백업 파일을 읽지 못했어요. 올바른 JSON 파일인지 확인해 주세요."); }
    };
    reader.onerror = () => alert("파일을 읽는 중 오류가 발생했어요.");
    reader.readAsText(file);
  };
  const visible = pages.filter((p) => !p.hidden);
  const current = (page === "dash" || page === "theme") ? null : pages.find((p) => p.id === page);
  const title = page === "dash" ? "대시보드" : page === "theme" ? "테마 설정" : (current ? current.label : "대시보드");
  const setCustomItems = (id) => (u) => setCustomData((d) => ({ ...d, [id]: typeof u === "function" ? u(d[id] || []) : u }));

  return (
    <div className="app" data-theme={theme} data-mood={mood}>
      <style>{STYLES}</style>
      <div className="shell">

        {/* 사이드바 */}
        {navOpen && <div className="nav-bd" onClick={() => setNavOpen(false)} />}
        <aside className={"side"+(navOpen?" open":"")}>
          <div className="brand"><span className="brand-i"><Star size={17} color="var(--accent-ink)" fill="var(--accent-ink)" strokeWidth={2} /></span><span className="brand-t">Momentum</span></div>
          <button className="profile-row top" onClick={() => { setProfileOpen(true); setNavOpen(false); }}>
            <Avatar profile={profile} size={36} />
            <div className="pr-info"><div className="pr-name">{profile.name || "사용자"}</div><div className="pr-sub">프로필 편집</div></div>
            <Pencil size={13} color="var(--faint)" />
          </button>
          <div className="side-sep" />
          <nav className="nav">
            <button className={"navbtn"+(page==="dash"?" on":"")} onClick={() => go("dash")}><LayoutDashboard size={18} /> <span>대시보드</span></button>
            {visible.map((p) => (
              <button key={p.id} className={"navbtn"+(page===p.id?" on":"")} onClick={() => go(p.id)}>
                <Icon name={p.icon} size={18} /> <span>{p.label}</span>
              </button>
            ))}
            <button className="navbtn subtle" onClick={() => { setMenuOpen(true); setNavOpen(false); }}><Settings size={18} /> <span>메뉴 편집</span></button>
          </nav>
          <div className="theme-block">
            <button className="navbtn theme-row" onClick={() => setTheme((t) => t==="dark"?"light":"dark")}>
              {theme==="dark" ? <Sun size={18} /> : <Moon size={18} />} <span>{theme==="dark"?"라이트 모드":"다크 모드"}</span>
            </button>
            <button className="mood-dot-btn" onClick={cycleMood} aria-label="색상 테마 바꾸기" title="색상 테마 바꾸기">
              <span className="mood-dot" style={{ background:VAR("accent") }} />
            </button>
          </div>
          <button className="navbtn" onClick={() => { go("theme"); setNavOpen(false); }}><Palette size={18} /> <span>테마 설정</span></button>
          <button className="navbtn" onClick={exportData}><Download size={18} /> <span>데이터 내보내기</span></button>
          <label className="navbtn" style={{ cursor:"pointer" }}>
            <Upload size={18} /> <span>데이터 가져오기</span>
            <input type="file" accept="application/json,.json" hidden onChange={(e) => { importData(e.target.files?.[0]); e.target.value=""; }} />
          </label>
          <button className="navbtn reset-row" onClick={() => { setResetOpen(true); setNavOpen(false); }}>
            <Trash2 size={18} /> <span>전체 초기화</span>
          </button>
        </aside>

        {/* 본문 */}
        <main className="main2">
          <div className="topbar">
            <button className="hamb" onClick={() => setNavOpen(true)} aria-label="메뉴"><Menu size={20} /></button>
            <div className="tb-title">{title}</div>
            <button className="hamb" onClick={() => setTheme((t) => t==="dark"?"light":"dark")} aria-label="테마">{theme==="dark"?<Sun size={18} />:<Moon size={18} />}</button>
          </div>

          {(() => {
            if (page === "theme")
              return <ThemePage mood={mood} setMood={setMood} theme={theme} setTheme={setTheme} />;
            if (page === "dash" || !current)
              return <MDashboard go={go} now={now} profile={profile} mitsByDate={mitsByDate} setMitsByDate={setMitsByDate} todos={todos} setTodos={setTodos} habits={habits} setHabits={setHabits} events={events} diaries={diaries} metrics={metrics} books={books} dreams={dreams} />;
            if (current.kind === "builtin") {
              if (current.key === "cal")    return <MSchedule events={events} setEvents={setEvents} todos={todos} setTodos={setTodos} />;
              if (current.key === "todo")   return <MTodo todos={todos} setTodos={setTodos} setEvents={setEvents} />;
              if (current.key === "habit")  return <MHabits habits={habits} setHabits={setHabits} />;
              if (current.key === "diary")  return <MDiary diaries={diaries} setDiaries={setDiaries} />;
              if (current.key === "metric") return <MMetrics metrics={metrics} setMetrics={setMetrics} />;
              if (current.key === "budget") return <MBudget txs={txs} setTxs={setTxs} />;
              if (current.key === "read")   return <MReading books={books} setBooks={setBooks} />;
              if (current.key === "dream")  return <MDream dreams={dreams} setDreams={setDreams} />;
            }
            return <MCustom page={current} items={customData[current.id] || []} setItems={setCustomItems(current.id)} />;
          })()}
        </main>
      </div>

      {/* 모바일 하단 탭바 */}
      <nav className="botnav">
        <button className={"bn"+(page==="dash"?" on":"")} onClick={() => go("dash")}><LayoutDashboard size={21} /><span>홈</span></button>
        {visible.slice(0,3).map((p) => (
          <button key={p.id} className={"bn"+(page===p.id?" on":"")} onClick={() => go(p.id)}><Icon name={p.icon} size={21} /><span>{p.label}</span></button>
        ))}
        <button className={"bn"+(navOpen?" on":"")} onClick={() => setNavOpen(true)}><Menu size={21} /><span>더보기</span></button>
      </nav>

      {resetOpen && <Confirm title="전체 초기화" okLabel="모두 삭제"
        text="모든 데이터를 삭제하고 처음 상태로 되돌릴까요?"
        sub="되돌릴 수 없어요. 걱정되면 먼저 '데이터 내보내기'로 백업해두세요. (할 일·일정·습관·일기·지표·가계부·비전 보드·기록·프로필이 모두 삭제됩니다)"
        onCancel={() => setResetOpen(false)} onOk={resetAll} />}
      {menuOpen && <MenuManager pages={pages} setPages={setPages} setCustomData={setCustomData} onClose={() => setMenuOpen(false)} currentPageId={page} setPage={setPage} />}
      {profileOpen && (
        <Modal title="프로필" onClose={() => setProfileOpen(false)} footer={<button className="btn primary" onClick={() => setProfileOpen(false)}><Check size={15} /> 완료</button>}>
          <Row label="프로필 사진"><SingleImage value={profile.avatar} onChange={(avatar) => setProfile((p) => ({ ...p, avatar }))} round /></Row>
          <Row label="이름"><input className="inp" placeholder="이름" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name:e.target.value }))} /></Row>
        </Modal>
      )}
    </div>
  );
}

/* ════════════════ 스타일 ════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

/* ─ 무드 04 — 앰버(기본): 따뜻한 베이지·살구 ─ */
.app[data-mood="amber"][data-theme="dark"]{ --bg:#14131a; --bg2:#1b1924; --card:#1e1c27; --card2:#252231; --inset:#191722; --border:#2d2a38; --border2:#39354a; --text:#edeaf3; --muted:#a29eb1; --faint:#6f6a7e; --accent:#f1b07f; --accent-ink:#2a1c10; --blue:#8db2f7; --rose:#f29bb6; --green:#8ad6aa; --gold:#f1cf86; --coral:#f0a387; --violet:#bfa4f5; --shadow:0 1px 0 rgba(255,255,255,.03),0 18px 40px -24px rgba(0,0,0,.7); }
.app[data-mood="amber"][data-theme="light"]{ --bg:#f4f1ec; --bg2:#efe9e0; --card:#ffffff; --card2:#faf7f2; --inset:#f2eee7; --border:#e7e1d6; --border2:#d9d2c5; --text:#2a2631; --muted:#6f6a78; --faint:#a8a2b0; --accent:#d8884a; --accent-ink:#fff7ef; --blue:#4f7ed4; --rose:#d4688d; --green:#3da670; --gold:#c79829; --coral:#d57051; --violet:#8a6fd0; --shadow:0 1px 0 rgba(255,255,255,.6),0 16px 34px -26px rgba(60,40,20,.45); }

/* ─ 무드 02 — 블루그레이: 차분한 오피스 느낌 ─ */
.app[data-mood="slate"][data-theme="dark"]{ --bg:#11151c; --bg2:#161b24; --card:#1b212d; --card2:#212836; --inset:#161b24; --border:#283040; --border2:#344052; --text:#e8edf5; --muted:#9aa5b5; --faint:#646e7e; --accent:#7ea8e0; --accent-ink:#0f2138; --blue:#7ea8e0; --rose:#e29bb0; --green:#7fcdb0; --gold:#e3c87f; --coral:#e4a07e; --violet:#a8a8e8; --shadow:0 1px 0 rgba(255,255,255,.03),0 18px 40px -24px rgba(0,0,0,.7); }
.app[data-mood="slate"][data-theme="light"]{ --bg:#eef1f5; --bg2:#e6eaf0; --card:#ffffff; --card2:#f6f8fb; --inset:#eef1f5; --border:#dde2ea; --border2:#cbd2dd; --text:#1f2733; --muted:#5e6b7d; --faint:#9aa5b3; --accent:#3f6fb8; --accent-ink:#f3f8ff; --blue:#3f6fb8; --rose:#c25a7c; --green:#2f8f6c; --gold:#b08a2c; --coral:#c46c4a; --violet:#6f6fc4; --shadow:0 1px 0 rgba(255,255,255,.6),0 16px 34px -26px rgba(30,40,60,.35); }

/* ─ 무드 03 — 포레스트: 자연·차분함 ─ */
.app[data-mood="forest"][data-theme="dark"]{ --bg:#10160f; --bg2:#151d14; --card:#1b251a; --card2:#212c20; --inset:#161f15; --border:#283a26; --border2:#374e34; --text:#e7f0e2; --muted:#9eb098; --faint:#677d62; --accent:#8fc97a; --accent-ink:#11260c; --blue:#85b6d6; --rose:#dd9aa8; --green:#8fc97a; --gold:#dccb78; --coral:#dba074; --violet:#a8b698; --shadow:0 1px 0 rgba(255,255,255,.03),0 18px 40px -24px rgba(0,0,0,.7); }
.app[data-mood="forest"][data-theme="light"]{ --bg:#f1f4ec; --bg2:#e9eee0; --card:#ffffff; --card2:#f6f9f2; --inset:#eef2e7; --border:#dee6d3; --border2:#cbd6bc; --text:#222b1e; --muted:#5e6d56; --faint:#97a78c; --accent:#4e8c3a; --accent-ink:#f3fbee; --blue:#3e7ca6; --rose:#b85b75; --green:#4e8c3a; --gold:#a98a2c; --coral:#b06a3e; --violet:#7c8a64; --shadow:0 1px 0 rgba(255,255,255,.6),0 16px 34px -26px rgba(30,45,20,.35); }

/* ─ 무드 04 — 핑크라벤더: 발랄함 ─ */
.app[data-mood="bloom"][data-theme="dark"]{ --bg:#181321; --bg2:#1f1828; --card:#251e30; --card2:#2c2438; --inset:#1f1828; --border:#382e47; --border2:#473a59; --text:#f2e9f7; --muted:#b2a3c0; --faint:#7a6b8c; --accent:#e892c9; --accent-ink:#2c1024; --blue:#9bb0f0; --rose:#e892c9; --green:#8fd6b8; --gold:#eed08c; --coral:#ef9fa6; --violet:#bda3f0; --shadow:0 1px 0 rgba(255,255,255,.03),0 18px 40px -24px rgba(0,0,0,.7); }
.app[data-mood="bloom"][data-theme="light"]{ --bg:#fbf1f7; --bg2:#f7e9f2; --card:#ffffff; --card2:#fdf6fa; --inset:#f9eef5; --border:#f0dced; --border2:#e6c8e2; --text:#352a3c; --muted:#857190; --faint:#bba8c4; --accent:#c554a0; --accent-ink:#fff5fb; --blue:#5f74cf; --rose:#c554a0; --green:#3f9e78; --gold:#bb8f24; --coral:#cf6e7a; --violet:#8b66cf; --shadow:0 1px 0 rgba(255,255,255,.6),0 16px 34px -26px rgba(60,20,50,.3); }

/* ─ 무드 05 — 아우로라: 보라→자홍 그라디언트 ─ */
.app[data-mood="aurora"][data-theme="dark"]{ --bg:#100c1c; --bg2:#161024; --card:#1c1530; --card2:#231a3a; --inset:#161024; --border:#2c2147; --border2:#3a2c5c; --text:#efe9fb; --muted:#a99fc4; --faint:#6e6390; --accent:#a06bf0; --accent-ink:#1c0f33; --accent2:#e85ec2; --blue:#8c9af5; --rose:#e85ec2; --green:#7fd9b8; --gold:#e8c878; --coral:#ef8aa8; --violet:#a06bf0; --shadow:0 1px 0 rgba(255,255,255,.04),0 18px 44px -24px rgba(60,10,90,.55); }
.app[data-mood="aurora"][data-theme="light"]{ --bg:#f7f1fd; --bg2:#f1e8fb; --card:#ffffff; --card2:#faf5fe; --inset:#f3ecfb; --border:#e7d9f6; --border2:#d8c2ef; --text:#2c2240; --muted:#75678f; --faint:#ad9fc8; --accent:#9050d8; --accent-ink:#fbf6ff; --accent2:#d83f9e; --blue:#5f6fd0; --rose:#d83f9e; --green:#3d9e7c; --gold:#b3892a; --coral:#d8678c; --violet:#9050d8; --shadow:0 1px 0 rgba(255,255,255,.6),0 16px 36px -26px rgba(70,20,100,.3); }

/* 무드 미지정 시 기본값(amber)도 보장 */
.app[data-theme="dark"]:not([data-mood]){ --bg:#14131a; --bg2:#1b1924; --card:#1e1c27; --card2:#252231; --inset:#191722; --border:#2d2a38; --border2:#39354a; --text:#edeaf3; --muted:#a29eb1; --faint:#6f6a7e; --accent:#f1b07f; --accent-ink:#2a1c10; --blue:#8db2f7; --rose:#f29bb6; --green:#8ad6aa; --gold:#f1cf86; --coral:#f0a387; --violet:#bfa4f5; --shadow:0 1px 0 rgba(255,255,255,.03),0 18px 40px -24px rgba(0,0,0,.7); }
.app[data-theme="light"]:not([data-mood]){ --bg:#f4f1ec; --bg2:#efe9e0; --card:#ffffff; --card2:#faf7f2; --inset:#f2eee7; --border:#e7e1d6; --border2:#d9d2c5; --text:#2a2631; --muted:#6f6a78; --faint:#a8a2b0; --accent:#d8884a; --accent-ink:#fff7ef; --blue:#4f7ed4; --rose:#d4688d; --green:#3da670; --gold:#c79829; --coral:#d57051; --violet:#8a6fd0; --shadow:0 1px 0 rgba(255,255,255,.6),0 16px 34px -26px rgba(60,40,20,.45); }


*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; }
html{ background:#14131a; }
body{ margin:0; overscroll-behavior:none; -webkit-text-size-adjust:100%; }
#root{ min-height:100vh; }
.app{ min-height:100vh; background:linear-gradient(180deg,var(--bg2),var(--bg) 30%); color:var(--text); font-family:'Plus Jakarta Sans',ui-sans-serif,system-ui,sans-serif; letter-spacing:-.01em; -webkit-font-smoothing:antialiased; transition:background .4s,color .25s; }
button{ font-family:inherit; }
.shell{ display:flex; min-height:100vh; }

/* 사이드바 */
.side{ width:232px; flex:none; background:var(--card); border-right:1px solid var(--border); position:sticky; top:0; height:100vh; display:flex; flex-direction:column; padding:18px 13px; gap:3px; }
.brand{ display:flex; align-items:center; gap:10px; padding:6px 10px 12px; }
.side-sep{ height:1px; background:var(--border); margin:4px 8px 10px; }
.brand-i{ width:32px; height:32px; border-radius:10px; background:var(--accent); display:grid; place-items:center; }
.app[data-mood="aurora"] .brand-i{ background:linear-gradient(135deg, var(--accent), var(--accent2)); }
.app[data-mood="aurora"] .btn.primary{ background:linear-gradient(135deg, var(--accent), var(--accent2)); }
.app[data-mood="aurora"] .mood-dot-btn .mood-dot,
.app[data-mood="aurora"] .mood-check{ background:linear-gradient(135deg, var(--accent), var(--accent2)); }
.app[data-mood="aurora"] .mode-opt.on{ border-color:var(--accent); background:linear-gradient(135deg, color-mix(in srgb,var(--accent) 16%,transparent), color-mix(in srgb,var(--accent2) 16%,transparent)); color:var(--accent); }
.app[data-mood="aurora"] .mood-card.on{ border-color:var(--accent); background:linear-gradient(135deg, color-mix(in srgb,var(--accent) 10%,transparent), color-mix(in srgb,var(--accent2) 10%,transparent)); }
.brand-t{ font-family:'Fraunces',serif; font-weight:600; font-size:21px; }
.nav{ display:flex; flex-direction:column; gap:3px; flex:1; }
.navbtn{ display:flex; align-items:center; gap:12px; padding:11px 12px; border-radius:12px; border:none; background:transparent; color:var(--muted); font-size:14px; font-weight:600; cursor:pointer; transition:.15s; text-align:left; width:100%; }
.navbtn:hover{ background:var(--inset); color:var(--text); }
.navbtn.on{ background:color-mix(in srgb,var(--accent) 14%,transparent); color:var(--accent); }
.theme-row{ margin-top:4px; border-top:1px solid var(--border); border-radius:0; padding-top:14px; flex:1; }
.theme-block{ display:flex; align-items:stretch; gap:6px; }
.mood-dot-btn{ flex:none; width:38px; margin-top:4px; border:none; background:transparent; border-radius:11px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.15s; }
.mood-dot-btn:hover{ background:var(--inset); }
.mood-dot{ width:15px; height:15px; border-radius:99px; box-shadow:0 0 0 3px color-mix(in srgb, currentColor 0%, transparent), 0 0 0 1px var(--border2) inset; transition:background .3s; }
.reset-row{ color:var(--coral); }
.reset-row:hover{ background:color-mix(in srgb,var(--coral) 12%,transparent); color:var(--coral); }

/* 테마 설정 페이지 */
.theme-sec{ margin-bottom:16px; }
.mode-toggle{ display:flex; gap:10px; }
.mode-opt{ flex:1; height:52px; border-radius:14px; border:1.5px solid var(--border); background:var(--inset); color:var(--muted); font-family:inherit; font-size:14px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; transition:.15s; }
.mode-opt.on{ border-color:var(--accent); color:var(--accent); background:color-mix(in srgb,var(--accent) 12%,transparent); }
.mood-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
@media(max-width:560px){ .mood-grid{ grid-template-columns:1fr; } }
.mood-card{ position:relative; display:flex; align-items:center; gap:13px; padding:13px; border-radius:15px; border:1.5px solid var(--border); background:var(--inset); cursor:pointer; text-align:left; transition:.15s; font-family:inherit; }
.mood-card.on{ border-color:var(--accent); background:color-mix(in srgb,var(--accent) 9%,transparent); }
.mood-prev{ width:44px; height:44px; border-radius:12px; flex:none; display:flex; align-items:center; justify-content:center; border:1px solid var(--border2); }
.mp-dot{ width:16px; height:16px; border-radius:99px; box-shadow:0 0 0 1px rgba(0,0,0,.15); }
.mood-info{ display:flex; flex-direction:column; gap:2px; color:var(--text); }
.mood-info b{ font-size:14px; font-weight:700; }
.mood-info small{ font-size:11.5px; color:var(--faint); font-weight:600; }
.mood-check{ position:absolute; top:10px; right:10px; width:20px; height:20px; border-radius:99px; background:var(--accent); color:var(--accent-ink); display:flex; align-items:center; justify-content:center; }
.nav-bd{ position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:40; }

.main2{ flex:1; min-width:0; }
.topbar{ display:none; }

/* 페이지 공통 */
.pg{ max-width:1180px; margin:0 auto; padding:26px 24px 64px; }
.page-head{ display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:22px; flex-wrap:wrap; }
.ph-l{ display:flex; align-items:center; gap:13px; }
.ph-icn{ width:46px; height:46px; border-radius:14px; display:grid; place-items:center; flex:none; }
.ph-title{ font-family:'Fraunces',serif; font-weight:600; font-size:26px; letter-spacing:-.02em; }
.ph-sub{ font-size:13px; color:var(--muted); margin-top:1px; }

.card{ background:var(--card); border:1px solid var(--border); border-radius:18px; padding:18px; box-shadow:var(--shadow); display:flex; flex-direction:column; min-width:0; }
.card-head{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
.card-title{ display:flex; align-items:center; gap:10px; font-weight:700; font-size:15px; }
.icn{ width:30px; height:30px; border-radius:10px; display:grid; place-items:center; flex:none; }
.meta{ font-size:12px; color:var(--faint); font-weight:600; }
.meta-strong{ font-weight:700; font-size:15px; }
.seemore{ font-size:12.5px; font-weight:700; color:var(--accent); background:none; border:none; cursor:pointer; }

/* 버튼 */
.btn{ display:inline-flex; align-items:center; gap:7px; height:40px; padding:0 16px; border-radius:12px; border:1px solid var(--border); background:var(--card); color:var(--text); font-weight:700; font-size:13.5px; cursor:pointer; transition:.16s; }
.btn:hover{ transform:translateY(-1px); }
.btn.primary{ background:var(--accent); color:var(--accent-ink); border-color:transparent; }
.btn.rose{ background:var(--rose); color:#fff; border-color:transparent; }
.app[data-theme="dark"] .btn.rose{ color:#2a121c; }
.btn.ghost{ background:transparent; color:var(--muted); }
.btn.danger{ background:var(--coral); color:#fff; border-color:transparent; }
.app[data-theme="dark"] .btn.danger{ color:#2a1410; }
.btn-icn{ width:44px; height:44px; flex:none; border-radius:12px; border:none; background:var(--accent); color:var(--accent-ink); display:grid; place-items:center; cursor:pointer; transition:.16s; }
.btn-icn:hover{ transform:translateY(-1px); filter:brightness(1.05); }

/* 행 액션(수정/삭제) */
.rowact{ display:flex; gap:2px; opacity:0; transition:.15s; flex:none; }
.todo:hover .rowact,.ev:hover .rowact,.txr:hover .rowact{ opacity:1; }
.rowact.static{ opacity:1; }
.rowact button{ width:28px; height:28px; border-radius:8px; border:none; background:transparent; color:var(--faint); cursor:pointer; display:grid; place-items:center; transition:.14s; }
.rowact button:hover{ background:var(--inset); color:var(--text); }

/* 탭/필터 */
.tabs{ display:flex; gap:6px; margin-bottom:14px; }
.tab{ display:inline-flex; align-items:center; gap:7px; height:36px; padding:0 14px; border-radius:11px; border:1px solid var(--border); background:var(--card); color:var(--muted); font-weight:700; font-size:13px; cursor:pointer; transition:.15s; }
.tab.on{ background:var(--accent); color:var(--accent-ink); border-color:transparent; }
.tab-n{ font-size:11px; opacity:.7; }

.split{ display:grid; grid-template-columns:1.15fr 1fr; gap:16px; align-items:start; }
.adder{ display:flex; gap:8px; }
.adder.big{ margin-bottom:16px; }
.adder.big .inp{ height:46px; font-size:14px; }
.adder.big .btn-icn{ width:46px; height:46px; }

/* 달력 */
.cal-nav{ display:flex; align-items:center; gap:4px; }
.cal-nav button{ width:30px; height:30px; border-radius:9px; display:grid; place-items:center; border:1px solid transparent; background:transparent; color:var(--muted); cursor:pointer; transition:.15s; }
.cal-nav button:hover{ background:var(--inset); color:var(--text); }
.today-btn{ width:auto !important; padding:0 10px; font-size:12px; font-weight:700; }
.cal-grid{ display:grid; grid-template-columns:repeat(7,1fr); gap:3px; }
.cal-wd{ text-align:center; font-size:11px; font-weight:700; color:var(--faint); padding:3px 0 6px; }
.cal-wd.sun{ color:var(--coral); } .cal-wd.sat{ color:var(--blue); }
.cell{ position:relative; aspect-ratio:1/1; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:600; cursor:pointer; border:1px solid transparent; transition:.14s; font-variant-numeric:tabular-nums; }
.cell:hover{ background:var(--inset); }
.cell.dim{ color:var(--faint); font-weight:500; }
.cell.today{ background:var(--accent); color:var(--accent-ink); font-weight:700; }
.cell.sel{ border-color:var(--accent); }
.cell .dots{ position:absolute; bottom:5px; display:flex; gap:3px; }
.cell .dot{ width:4px; height:4px; border-radius:99px; }
.cell.today .dot{ background:var(--accent-ink); opacity:.6; }
.dot.dot-todo{ width:4px; height:4px; border-radius:1px; background:var(--gold); }
.cell.today .dot.dot-todo{ background:var(--accent-ink); opacity:.85; }
.cal-legend{ display:flex; gap:16px; margin-top:11px; padding-top:11px; border-top:1px solid var(--border); }
.cal-legend span{ display:inline-flex; align-items:center; gap:6px; font-size:11.5px; color:var(--faint); font-weight:600; }
.cal-legend .dot{ width:6px; height:6px; }
.cal-legend .dot-todo{ border-radius:2px; background:var(--gold); }

/* 일정 리스트 */
.ev-list{ display:flex; flex-direction:column; gap:4px; }
.ev{ display:flex; align-items:center; gap:11px; padding:11px 8px; border-radius:12px; transition:.14s; }
.ev:hover{ background:var(--inset); }
.ev-bar{ width:3px; align-self:stretch; border-radius:99px; flex:none; }
.ev-time,.ev-date{ font-size:12px; font-weight:700; color:var(--muted); font-variant-numeric:tabular-nums; flex:none; min-width:42px; }
.ev-date{ text-align:center; line-height:1.3; }
.ev-mid{ flex:1; min-width:0; }
.ev-title{ font-size:14px; font-weight:600; }
.ev-memo{ font-size:12px; color:var(--faint); margin-top:1px; }
.ev-todo-group{ margin-top:8px; padding-top:10px; border-top:1px dashed var(--border); display:flex; flex-direction:column; gap:3px; }
.ev-todo-label{ display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; color:var(--faint); padding:0 8px 6px; }
.ev.ev-todo{ padding:8px; }
.ev.ev-todo.done .ev-title{ color:var(--faint); text-decoration:line-through; }
.ev.mini{ padding:9px 6px; }
.tag{ font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:99px; flex:none; white-space:nowrap; }

/* 할 일 */
.progress{ height:6px; border-radius:99px; background:var(--inset); overflow:hidden; margin-bottom:14px; }
.progress > i{ display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 55%,var(--gold))); transition:width .35s; }
.todos{ display:flex; flex-direction:column; gap:2px; }
.todo{ display:flex; align-items:center; gap:11px; padding:9px 8px; border-radius:11px; transition:.14s; }
.todo:hover{ background:var(--inset); }
.todo.overdue{ background:color-mix(in srgb,var(--coral) 7%,transparent); }
.box{ width:21px; height:21px; border-radius:7px; border:2px solid var(--border2); display:grid; place-items:center; cursor:pointer; flex:none; color:transparent; transition:.16s; }
.box:hover{ border-color:var(--accent); }
.box.on{ background:var(--accent); border-color:var(--accent); color:var(--accent-ink); }
.todo-mid{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.todo .tx{ font-size:14px; font-weight:500; }
.todo.done .tx{ color:var(--faint); text-decoration:line-through; }
.todo-date-row{ display:flex; }
.todo-date{ font-size:11px; font-weight:700; color:var(--faint); display:inline-flex; align-items:center; gap:3px; }
.todo-date.overdue{ color:var(--coral); }
.todo-date.none{ color:var(--faint); opacity:.6; }
.tabs.scrollx{ overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
.tabs.scrollx::-webkit-scrollbar{ display:none; }
.tabs.scrollx .tab{ flex:none; }
.postpone-quick{ display:flex; gap:8px; margin-bottom:4px; }
.postpone-quick .btn{ flex:1; justify-content:center; }

/* 습관 */
.hgrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
.hcard{ background:var(--card); border:1px solid var(--border); border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:13px; box-shadow:var(--shadow); transition:.16s; }
.hcard-top{ display:flex; align-items:center; justify-content:space-between; }
.hcheck{ width:32px; height:32px; border-radius:10px; border:2px solid var(--border2); background:transparent; display:grid; place-items:center; cursor:pointer; flex:none; transition:.16s; }
.hcheck.sm{ width:28px; height:28px; }
.hcheck:hover{ border-color:var(--green); }
.hcard-name{ font-size:15px; font-weight:700; }
.hcard-foot{ display:flex; align-items:center; justify-content:space-between; }
.week{ display:flex; gap:4px; }
.week i{ width:9px; height:9px; border-radius:99px; background:var(--border2); }
.week i.tdy{ box-shadow:0 0 0 2px color-mix(in srgb,var(--green) 40%,transparent); }
.streak{ display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; color:var(--accent); padding:5px 9px; border-radius:99px; background:color-mix(in srgb,var(--accent) 13%,transparent); flex:none; }
.habits-mini{ display:flex; flex-direction:column; gap:8px; }
.habits-mini .habit{ display:flex; align-items:center; gap:11px; padding:9px 10px; border-radius:12px; background:var(--inset); }
.habits-mini .habit.on{ background:color-mix(in srgb,var(--green) 11%,transparent); }
.habits-mini .hn{ flex:1; font-size:13.5px; font-weight:600; }

/* 일기 */
.diary-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
.dcard{ background:var(--card); border:1px solid var(--border); border-radius:16px; padding:16px; box-shadow:var(--shadow); cursor:pointer; transition:.16s; }
.dcard:hover{ transform:translateY(-2px); border-color:var(--border2); }
.dcard-head{ display:flex; align-items:center; gap:11px; margin-bottom:11px; }
.dmood{ font-size:28px; line-height:1; }
.ddate{ font-size:13px; font-weight:700; }
.dmood-l{ font-size:11.5px; color:var(--faint); font-weight:600; }
.dcard-head .rowact{ margin-left:auto; }
.dtext{ font-size:13px; line-height:1.6; color:var(--muted); display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }

/* 가계부 */
.bsum{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
.bsum.compact{ grid-template-columns:repeat(2,1fr); margin-bottom:12px; }
.bsum-c{ background:var(--inset); border-radius:13px; padding:13px 14px; }
.bsum-c.hi{ background:color-mix(in srgb,var(--accent) 12%,transparent); }
.bsum-c .sl{ font-size:12px; font-weight:700; color:var(--faint); display:flex; align-items:center; gap:5px; }
.bsum-c .sv{ font-size:19px; font-weight:700; margin-top:5px; font-variant-numeric:tabular-nums; }
.bsum.compact .sv{ font-size:16px; }
.tx-list{ display:flex; flex-direction:column; gap:2px; }
.txr{ display:flex; align-items:center; gap:11px; padding:10px 6px; border-radius:10px; transition:.14s; }
.txr:hover{ background:var(--inset); }
.tdot{ width:8px; height:8px; border-radius:99px; flex:none; }
.tx-mid{ flex:1; min-width:0; }
.tx-l{ font-size:13.5px; font-weight:600; }
.tx-meta{ font-size:11.5px; color:var(--faint); margin-top:1px; }
.tx-v{ font-size:14px; font-weight:700; font-variant-numeric:tabular-nums; flex:none; }

/* 꿈나무 */
.tree-card{ flex-direction:row; align-items:center; gap:20px; margin-bottom:16px; }
.tree-stats{ flex:1; }
.tree-msg{ display:flex; align-items:center; gap:7px; font-size:14px; font-weight:600; margin-bottom:14px; }
.tree-msg b{ color:var(--green); }
.tree-nums{ display:flex; gap:26px; }
.tree-nums > div{ display:flex; flex-direction:column; }
.tn{ font-size:24px; font-weight:700; font-variant-numeric:tabular-nums; }
.tl{ font-size:12px; color:var(--faint); font-weight:600; }
.bgrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; }
.bcard{ display:flex; background:var(--card); border:1px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:var(--shadow); transition:.16s; }
.bcard:hover{ transform:translateY(-2px); }
.bbody{ padding:15px; flex:1; min-width:0; display:flex; flex-direction:column; gap:7px; }
.bcard-top{ display:flex; align-items:center; justify-content:space-between; }
.btitle{ font-size:15.5px; font-weight:700; line-height:1.3; }
.bauthor{ font-size:12.5px; color:var(--faint); font-weight:600; }
.bprog{ margin-top:2px; }
.bprog-bar{ height:6px; border-radius:99px; background:var(--inset); overflow:hidden; }
.bprog-bar.sm{ margin-top:6px; }
.bprog-bar > i{ display:block; height:100%; border-radius:99px; transition:width .35s; }
.bprog-tx{ font-size:11px; color:var(--faint); font-weight:600; margin-top:4px; display:inline-block; }
.breview{ font-size:12.5px; line-height:1.55; color:var(--muted); font-style:italic; }
.stars{ display:flex; gap:2px; }
.star{ background:none; border:none; padding:1px; cursor:pointer; line-height:0; }

/* 사진 첨부 */
.photos{ display:flex; flex-wrap:wrap; gap:9px; }
.photo-thumb{ position:relative; width:74px; height:74px; border-radius:12px; overflow:hidden; border:1px solid var(--border); }
.photo-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
.photo-x{ position:absolute; top:3px; right:3px; width:22px; height:22px; border-radius:7px; border:none; background:rgba(0,0,0,.55); color:#fff; cursor:pointer; display:grid; place-items:center; }
.photo-x:hover{ background:rgba(0,0,0,.75); }
.photo-add{ width:74px; height:74px; border-radius:12px; border:1.5px dashed var(--border2); background:var(--inset); color:var(--muted); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; cursor:pointer; transition:.15s; font-size:11px; font-weight:600; }
.photo-add:hover{ border-color:var(--accent); color:var(--accent); }

/* 일기 카드 사진 */
.dphotos{ display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-top:11px; }
.dphotos.sm{ display:flex; gap:6px; margin-top:9px; }
.dphoto{ position:relative; aspect-ratio:1/1; border-radius:9px; overflow:hidden; border:none; padding:0; cursor:pointer; background:var(--inset); }
.dphotos.sm .dphoto{ width:42px; height:42px; aspect-ratio:auto; cursor:default; flex:none; }
.dphoto img{ width:100%; height:100%; object-fit:cover; display:block; }
.dphoto .more{ position:absolute; inset:0; background:rgba(0,0,0,.55); color:#fff; display:grid; place-items:center; font-size:13px; font-weight:700; }

/* 책 표지 */
.bcover{ width:70px; flex:none; border:none; padding:0; cursor:pointer; display:grid; place-items:center; overflow:hidden; align-self:stretch; }
.bcover img{ width:100%; height:100%; object-fit:cover; display:block; }

/* 표지 업로드 */
.cover-up{ display:flex; align-items:center; gap:14px; }
.cover-prev{ width:64px; height:90px; border-radius:10px; overflow:hidden; display:grid; place-items:center; flex:none; box-shadow:var(--shadow); }
.cover-prev img{ width:100%; height:100%; object-fit:cover; display:block; }
.cover-actions{ display:flex; flex-direction:column; gap:8px; }
.btn.sm{ height:34px; padding:0 12px; font-size:12.5px; }

/* 라이트박스(크게 보기) */
.lightbox{ position:fixed; inset:0; background:rgba(8,6,12,.86); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:24px; z-index:70; }
.lightbox img{ max-width:100%; max-height:100%; border-radius:14px; box-shadow:0 30px 80px -20px rgba(0,0,0,.7); }
.lb-x{ position:absolute; top:18px; right:18px; width:44px; height:44px; border-radius:12px; border:none; background:rgba(255,255,255,.14); color:#fff; cursor:pointer; display:grid; place-items:center; }
.lb-x:hover{ background:rgba(255,255,255,.24); }

/* 동기부여 비주얼 */
.ring-wrap{ position:relative; flex:none; }
.ring-center{ position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
.ring-val{ font-size:29px; font-weight:700; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.ring-val.sm{ font-size:19px; }
.ring-sub{ font-size:11.5px; color:var(--faint); font-weight:600; margin-top:1px; }
.bars{ display:flex; align-items:flex-end; gap:8px; }
.bar-col{ flex:1; display:flex; flex-direction:column; align-items:center; gap:7px; height:100%; min-width:0; }
.bar-track{ width:100%; flex:1; display:flex; align-items:flex-end; background:var(--inset); border-radius:8px; overflow:hidden; min-height:0; }
.bar-fill{ width:100%; border-radius:8px 8px 0 0; transition:height .55s ease; min-height:3px; }
.bar-lbl{ font-size:11px; color:var(--faint); font-weight:600; }
.bar-lbl.hl{ color:var(--accent); }
.trend{ width:100%; display:block; }
.trend-empty{ font-size:12.5px; color:var(--faint); font-weight:600; padding:14px 0; }
.legend{ display:flex; flex-wrap:wrap; gap:7px 14px; margin-top:10px; }
.legend > span{ display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:var(--muted); }
.legend i{ width:9px; height:9px; border-radius:3px; flex:none; }
.legend b{ color:var(--text); font-weight:700; font-variant-numeric:tabular-nums; }

.insight{ display:flex; align-items:center; gap:22px; margin-bottom:16px; }
.insight .ins-text{ flex:1; min-width:0; }
.ins-cap{ font-size:15px; font-weight:700; line-height:1.45; }
.ins-cap b{ color:var(--accent); }
.ins-sub{ font-size:12.5px; color:var(--muted); margin-top:5px; line-height:1.5; }
.mini-bars{ margin-top:12px; }
.mini-legend{ font-size:11.5px; color:var(--faint); font-weight:600; margin-top:8px; }
.insight-bars{ margin-bottom:16px; }
.dash-insights{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
@media(max-width:760px){
  .insight{ flex-direction:column; align-items:stretch; gap:14px; }
  .insight .ring-wrap{ align-self:center; }
  .dash-insights{ grid-template-columns:1fr; }
}

/* 대시보드 */
.dash-head{ display:flex; align-items:flex-end; justify-content:space-between; gap:18px; flex-wrap:wrap; margin-bottom:20px; }
.hello{ display:flex; flex-direction:column; gap:6px; }
.eyebrow{ display:inline-flex; align-items:center; gap:7px; font-size:12.5px; font-weight:600; color:var(--accent); }
.greet{ font-family:'Fraunces',serif; font-weight:500; font-size:30px; line-height:1.08; }
.greet b{ font-weight:600; color:var(--accent); }
.focusline{ font-size:13.5px; color:var(--muted); }
.focusline b{ color:var(--text); font-weight:600; }
.clock{ text-align:right; }
.clock .t{ font-variant-numeric:tabular-nums; font-weight:600; font-size:22px; }
.clock .d{ font-size:12px; color:var(--faint); margin-top:2px; }
.stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
.stat{ background:var(--card); border:1px solid var(--border); border-radius:16px; padding:15px 16px; box-shadow:var(--shadow); display:flex; flex-direction:column; gap:9px; cursor:pointer; text-align:left; color:var(--text); transition:.16s; }
.stat:hover{ transform:translateY(-2px); border-color:var(--border2); }
.stat .lbl{ font-size:12px; color:var(--muted); font-weight:600; display:flex; align-items:center; gap:7px; }
.stat .val{ font-size:24px; font-weight:700; font-variant-numeric:tabular-nums; }
.stat .val small{ font-size:14px; font-weight:600; color:var(--faint); }
.stat .mood{ font-size:26px; }
.chip{ width:24px; height:24px; border-radius:8px; display:grid; place-items:center; flex:none; }
.dash-grid{ display:grid; gap:16px; grid-template-columns:1fr; }
@media(min-width:1000px){ .dash-grid{ grid-template-columns:repeat(3,1fr); grid-auto-rows:minmax(0,auto); }
  .a-cal{ grid-row:span 1; } }
.write-prompt{ display:flex; align-items:center; gap:9px; width:100%; padding:16px; border-radius:13px; border:1px dashed var(--border2); background:var(--inset); color:var(--muted); font-weight:600; font-size:13.5px; cursor:pointer; transition:.15s; }
.write-prompt:hover{ color:var(--text); border-color:var(--rose); }
.dash-diary .dd-mood{ font-size:15px; margin-bottom:8px; }
.dash-diary .dd-mood span{ font-size:13px; color:var(--faint); font-weight:600; }
.dash-read{ display:flex; align-items:center; gap:14px; }
.dr-info{ flex:1; min-width:0; }
.dr-label{ font-size:11px; font-weight:700; color:var(--gold); }
.dr-title{ font-size:14.5px; font-weight:700; margin-top:2px; }
.dr-author{ font-size:12px; color:var(--faint); font-weight:600; }
.dr-empty{ font-size:13px; color:var(--faint); }

/* 모달 */
.modal-ov{ position:fixed; inset:0; background:rgba(10,8,14,.5); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:18px; z-index:60; }
.modal{ width:100%; max-width:440px; max-height:90vh; overflow:auto; background:var(--card); border:1px solid var(--border); border-radius:20px; box-shadow:0 30px 70px -20px rgba(0,0,0,.6); }
.modal.wide{ max-width:520px; }
.modal-head{ display:flex; align-items:center; justify-content:space-between; padding:18px 20px 4px; }
.modal-head h3{ font-family:'Fraunces',serif; font-weight:600; font-size:19px; }
.xbtn{ width:32px; height:32px; border-radius:9px; border:none; background:transparent; color:var(--faint); cursor:pointer; display:grid; place-items:center; }
.xbtn:hover{ background:var(--inset); color:var(--text); }
.modal-body{ padding:14px 20px; display:flex; flex-direction:column; gap:14px; }
.modal-foot{ display:flex; justify-content:flex-end; gap:9px; padding:6px 20px 20px; }
.confirm-tx{ font-size:14.5px; font-weight:600; }
.confirm-sub{ font-size:12.5px; color:var(--faint); margin-top:6px; }

/* 폼 */
.frow{ display:flex; flex-direction:column; gap:7px; }
.frow2{ display:grid; grid-template-columns:1fr 1fr; gap:13px; }
.flbl{ font-size:12.5px; font-weight:700; color:var(--muted); }
.inp{ height:42px; border-radius:11px; border:1px solid var(--border); background:var(--inset); color:var(--text); padding:0 13px; font-size:14px; font-family:inherit; outline:none; transition:.16s; width:100%; }
.inp::placeholder{ color:var(--faint); }
.inp:focus{ border-color:var(--accent); background:var(--card); }
.inp.ta{ height:auto; padding:11px 13px; resize:vertical; line-height:1.55; }
.inp.tall{ min-height:150px; }
.chips,.swatches{ display:flex; gap:7px; flex-wrap:wrap; }
.chip-b{ font-size:12.5px; font-weight:600; padding:7px 13px; border-radius:99px; border:1px solid var(--border); background:transparent; color:var(--muted); cursor:pointer; transition:.15s; }
.chip-b:hover{ border-color:var(--border2); }
.sw{ width:30px; height:30px; border-radius:10px; border:2px solid transparent; cursor:pointer; transition:.15s; }
.sw.on{ box-shadow:0 0 0 2px var(--card),0 0 0 4px var(--text); }
.seg{ display:flex; padding:3px; gap:3px; background:var(--inset); border-radius:12px; }
.seg button{ flex:1; height:36px; border-radius:9px; border:none; background:transparent; color:var(--muted); font-weight:700; font-size:13.5px; cursor:pointer; transition:.16s; }
.seg button.on-exp{ background:var(--card); color:var(--coral); box-shadow:var(--shadow); }
.seg button.on-inc{ background:var(--card); color:var(--green); box-shadow:var(--shadow); }
.amt-row{ display:flex; align-items:center; gap:9px; background:var(--inset); border:1px solid var(--border); border-radius:11px; padding:0 13px; height:48px; transition:.16s; }
.amt-row:focus-within{ border-color:var(--accent); background:var(--card); }
.won{ font-size:18px; font-weight:700; color:var(--faint); }
.amt-row input{ flex:1; border:none; background:transparent; color:var(--text); font-size:19px; font-weight:700; font-family:inherit; outline:none; min-width:0; font-variant-numeric:tabular-nums; }
.moods{ display:flex; gap:6px; }
.mood-b{ flex:1; height:42px; border-radius:11px; border:1px solid var(--border); background:var(--inset); cursor:pointer; font-size:20px; transition:.15s; }
.mood-b.on{ border-color:var(--rose); background:color-mix(in srgb,var(--rose) 14%,transparent); }

/* 빈 상태 */
.empty-box{ display:flex; flex-direction:column; align-items:center; gap:10px; padding:34px 0; color:var(--faint); font-size:13px; font-weight:600; }

/* 반응형 */
@media(max-width:980px){
  .side{ position:fixed; left:0; top:0; z-index:50; transform:translateX(-100%); transition:transform .25s; }
  .side.open{ transform:none; box-shadow:30px 0 60px -30px rgba(0,0,0,.5); }
  .topbar{ display:flex; align-items:center; justify-content:space-between; padding:13px 16px; border-bottom:1px solid var(--border); background:color-mix(in srgb,var(--bg) 80%,transparent); backdrop-filter:blur(8px); position:sticky; top:0; z-index:30; }
  .hamb{ width:40px; height:40px; border-radius:11px; border:1px solid var(--border); background:var(--card); color:var(--text); display:grid; place-items:center; cursor:pointer; }
  .tb-title{ font-weight:700; font-size:16px; }
  .split{ grid-template-columns:1fr; }
  .pg{ padding:20px 16px 56px; }
}
@media(max-width:600px){
  .stats{ grid-template-columns:repeat(2,1fr); }
  .bsum{ grid-template-columns:1fr; }
  .frow2{ grid-template-columns:1fr; }
  .dash-head{ flex-direction:row; align-items:flex-start; }
  .greet{ font-size:25px; }
  .tree-card{ flex-direction:column; text-align:center; }
  .tree-nums{ justify-content:center; }
}
@media(prefers-reduced-motion:reduce){ *{ transition:none !important; } }

/* ════ 모바일 최적화 ════ */
.botnav{ display:none; }
@media(max-width:980px){
  .topbar{ padding-top:calc(13px + env(safe-area-inset-top)); }
  .side{ padding-top:calc(18px + env(safe-area-inset-top)); padding-bottom:calc(18px + env(safe-area-inset-bottom)); overflow-y:auto; }
  .botnav{ display:flex; position:fixed; left:0; right:0; bottom:0; z-index:35;
    background:color-mix(in srgb,var(--card) 92%,transparent); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px);
    border-top:1px solid var(--border); padding:7px 4px calc(7px + env(safe-area-inset-bottom)); gap:2px; }
  .bn{ flex:1 1 0; min-width:0; display:flex; flex-direction:column; align-items:center; gap:3px; padding:5px 2px; border:none; background:none; color:var(--faint); font-size:10px; font-weight:700; font-family:inherit; cursor:pointer; border-radius:12px; transition:.14s; }
  .bn span{ max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .bn.on{ color:var(--accent); }
  .bn:active{ transform:scale(.9); }
  .pg{ padding-bottom:calc(92px + env(safe-area-inset-bottom)); }
}
/* 작은 화면 디테일 */
@media(max-width:600px){
  .ph-title{ font-size:23px; }
  .ph-icn{ width:42px; height:42px; }
  .stat{ padding:13px 14px; }
  .stat .val{ font-size:21px; }
  .card{ padding:16px; }
  .metric-hero-grid{ grid-template-columns:1fr; }
  .page-head{ margin-bottom:18px; }
}
/* 모바일 모달 → 바텀시트 */
@media(max-width:560px){
  .modal-ov{ align-items:flex-end; padding:0; }
  .modal,.modal.wide{ max-width:none; width:100%; border-radius:22px 22px 0 0; max-height:92vh; padding-bottom:env(safe-area-inset-bottom); position:relative; animation:sheetUp .26s cubic-bezier(.22,1,.36,1); }
  .modal::before{ content:""; position:absolute; top:9px; left:50%; transform:translateX(-50%); width:38px; height:4px; border-radius:99px; background:var(--border2); }
  .modal-head{ padding-top:22px; }
  .modal-foot{ position:sticky; bottom:0; background:var(--card); padding-bottom:calc(20px + env(safe-area-inset-bottom)); }
  .modal-foot .btn{ flex:1; justify-content:center; height:46px; }
  @keyframes sheetUp{ from{ transform:translateY(100%); } to{ transform:none; } }
}
:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; border-radius:8px; }

/* 메뉴 편집 */
.navbtn.subtle{ color:var(--faint); }
.navbtn.subtle:hover{ color:var(--text); }
.mm-list{ display:flex; flex-direction:column; gap:6px; }
.mm-row{ display:flex; align-items:center; gap:10px; padding:8px 8px 8px 4px; border-radius:12px; background:var(--inset); }
.mm-reorder{ display:flex; flex-direction:column; gap:1px; }
.mm-reorder button{ width:22px; height:17px; border:none; background:transparent; color:var(--faint); cursor:pointer; display:grid; place-items:center; border-radius:5px; }
.mm-reorder button:hover:not(:disabled){ background:var(--card); color:var(--text); }
.mm-reorder button:disabled{ opacity:.25; cursor:default; }
.mm-ic{ width:30px; height:30px; border-radius:9px; display:grid; place-items:center; flex:none; }
.mm-name{ flex:1; font-size:14px; font-weight:600; min-width:0; }
.mm-name.off{ color:var(--faint); }
.mm-name em{ font-style:normal; font-size:11px; color:var(--faint); font-weight:600; }
.mm-act{ display:flex; gap:1px; flex:none; }
.mm-act button{ width:30px; height:30px; border:none; background:transparent; color:var(--muted); cursor:pointer; display:grid; place-items:center; border-radius:8px; }
.mm-act button:hover{ background:var(--card); color:var(--text); }
.mm-hint{ font-size:11.5px; color:var(--faint); margin-top:12px; line-height:1.6; }
.type-pick{ display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.type-card{ display:flex; flex-direction:column; align-items:flex-start; gap:5px; padding:13px; border-radius:13px; border:1px solid var(--border); background:var(--inset); color:var(--text); cursor:pointer; text-align:left; transition:.15s; }
.type-card:hover{ border-color:var(--border2); }
.type-card.on{ border-color:var(--accent); background:color-mix(in srgb,var(--accent) 10%,transparent); }
.type-card b{ font-size:13.5px; }
.type-card span{ font-size:11px; color:var(--faint); line-height:1.4; }
.icon-pick{ display:flex; flex-wrap:wrap; gap:7px; }
.ic-b{ width:42px; height:42px; border-radius:11px; border:1px solid var(--border); background:var(--inset); color:var(--muted); cursor:pointer; display:grid; place-items:center; transition:.15s; }
.ic-b:hover{ border-color:var(--border2); color:var(--text); }
.ic-b.on{ border-color:var(--accent); color:var(--accent); background:color-mix(in srgb,var(--accent) 12%,transparent); }

/* 아바타 · 프로필 */
.avatar{ border-radius:50%; object-fit:cover; flex:none; display:block; }
.avatar.ph{ display:grid; place-items:center; background:var(--accent); color:var(--accent-ink); font-weight:700; }
.profile-row{ display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:12px; border:none; background:transparent; cursor:pointer; width:100%; text-align:left; transition:.15s; }
.profile-row:hover{ background:var(--inset); }
.pr-info{ flex:1; min-width:0; }
.pr-name{ font-size:13.5px; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pr-sub{ font-size:11px; color:var(--faint); font-weight:600; }
.dash-id{ display:flex; align-items:center; gap:14px; }
.single-img{ display:flex; align-items:center; gap:14px; }
.img-field{ display:flex; flex-direction:column; gap:11px; }
.url-row{ display:flex; gap:8px; }
.url-row .inp{ flex:1; height:38px; font-size:13px; }
.si-prev{ width:84px; height:84px; border-radius:14px; overflow:hidden; display:grid; place-items:center; flex:none; background:var(--inset); border:1px solid var(--border); }
.si-prev.round{ border-radius:50%; width:80px; height:80px; }
.si-prev img{ width:100%; height:100%; object-fit:cover; display:block; }

/* 드림보드 */
.dream-grid{ column-count:2; column-gap:16px; }
@media(min-width:760px){ .dream-grid{ column-count:3; } }
@media(min-width:1200px){ .dream-grid{ column-count:4; } }
.dream-card{ break-inside:avoid; margin-bottom:16px; background:var(--card); border:1px solid var(--border); border-radius:18px; overflow:hidden; box-shadow:var(--shadow); display:block; transition:.16s; }
.dream-card:hover{ transform:translateY(-3px); }
.dream-img{ position:relative; width:100%; border:none; padding:0; cursor:pointer; display:block; overflow:hidden; line-height:0; }
.dream-img.ph{ aspect-ratio:4/3; display:grid; place-items:center; }
.dream-img img{ width:100%; height:auto; display:block; transition:.3s; }
.dream-card.done .dream-img img{ filter:saturate(.8); }
.dream-badge{ position:absolute; top:10px; left:10px; display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:#fff; background:color-mix(in srgb, var(--green) 88%, #000); padding:4px 9px; border-radius:99px; box-shadow:0 4px 12px -4px rgba(0,0,0,.5); }
.dream-body{ padding:14px 15px 15px; display:flex; flex-direction:column; gap:7px; }
.dream-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.dream-title{ font-size:15px; font-weight:700; line-height:1.3; }
.dream-card.done .dream-title{ color:var(--muted); }
.dream-note{ font-size:12.5px; color:var(--muted); line-height:1.5; }
.dream-foot{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:3px; }
.dream-target{ font-size:11.5px; font-weight:600; color:var(--faint); }
.dream-check{ font-size:11.5px; font-weight:700; padding:5px 12px; border-radius:99px; border:1px solid var(--border2); background:transparent; color:var(--muted); cursor:pointer; transition:.15s; flex:none; }
.dream-check:hover{ border-color:var(--violet); color:var(--violet); }
.dream-check.on{ background:var(--green); border-color:transparent; color:#fff; }
.app[data-theme="dark"] .dream-check.on{ color:#10271a; }

/* 비전 진행률 */
.dream-prog{ display:flex; align-items:center; gap:8px; margin-top:2px; }
.dream-bar{ flex:1; height:6px; border-radius:99px; background:var(--inset); overflow:hidden; }
.dream-bar > i{ display:block; height:100%; border-radius:99px; transition:width .4s ease; }
.dream-pct{ font-size:11px; font-weight:700; color:var(--faint); font-variant-numeric:tabular-nums; flex:none; }
.hero-pbar{ position:absolute; left:0; right:0; bottom:0; height:4px; background:rgba(255,255,255,.25); z-index:1; }
.hero-pbar > i{ display:block; height:100%; background:#fff; }

/* 오늘의 핵심 3가지 */
.mit-card{ margin-bottom:16px; }
.mit-list{ display:flex; flex-direction:column; gap:6px; }
.mit-row{ display:flex; align-items:center; gap:11px; padding:10px; border-radius:12px; background:var(--inset); transition:.14s; }
.mit-row.add{ background:transparent; border:1px dashed var(--border2); }
.mit-no{ width:22px; height:22px; border-radius:7px; background:var(--card); color:var(--accent); font-size:12px; font-weight:800; display:grid; place-items:center; flex:none; }
.mit-no.ghost{ color:var(--faint); }
.mit-tx{ flex:1; min-width:0; font-size:14px; font-weight:600; background:none; border:none; text-align:left; color:var(--text); font-family:inherit; cursor:text; padding:5px 2px; border-radius:6px; transition:.14s; }
.mit-tx:hover{ background:color-mix(in srgb,var(--text) 6%,transparent); }
.mit-row.done .mit-tx{ color:var(--faint); text-decoration:line-through; }
.mit-act-b{ width:28px; height:28px; border:none; background:transparent; color:var(--faint); border-radius:7px; cursor:pointer; display:grid; place-items:center; flex:none; transition:.14s; }
.mit-act-b:hover{ background:var(--card); color:var(--text); }
.mit-input{ flex:1; border:none; background:transparent; color:var(--text); font-size:14px; font-weight:600; font-family:inherit; outline:none; min-width:0; }
.mit-input::placeholder{ color:var(--faint); font-weight:500; }
.mit-addbtn{ width:30px; height:30px; border:none; border-radius:8px; background:var(--accent); color:var(--accent-ink); cursor:pointer; display:grid; place-items:center; flex:none; transition:.15s; }
.mit-addbtn:disabled{ opacity:.4; cursor:default; }
.mit-cheer{ margin-top:12px; padding:11px 14px; border-radius:12px; background:color-mix(in srgb,var(--green) 13%,transparent); color:var(--green); font-size:13px; font-weight:700; text-align:center; }
.mit-empty-hint{ margin-top:12px; font-size:12.5px; color:var(--faint); text-align:center; }
.mit-head-r{ display:flex; align-items:center; gap:10px; }
.mit-hist-btn{ display:inline-flex; align-items:center; gap:5px; height:28px; padding:0 11px; border-radius:9px; border:1px solid var(--border); background:transparent; color:var(--muted); font-size:12px; font-weight:700; font-family:inherit; cursor:pointer; transition:.15s; }
.mit-hist-btn:hover{ border-color:var(--border2); color:var(--text); }
.mit-hist-list{ display:flex; flex-direction:column; gap:14px; }
.mit-hist-day{ background:var(--inset); border-radius:13px; padding:13px 14px; }
.mhd-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:9px; }
.mhd-date{ font-size:13px; font-weight:700; }
.mhd-count{ font-size:11.5px; font-weight:700; color:var(--faint); }
.mhd-count.all{ color:var(--green); }
.mhd-item{ display:flex; align-items:center; gap:9px; font-size:13px; font-weight:500; padding:3px 0; color:var(--muted); }
.mhd-item.done{ color:var(--text); }
.mhd-dot{ width:17px; height:17px; border-radius:6px; background:var(--card); display:grid; place-items:center; flex:none; color:var(--green); }
.mhd-item.done .mhd-dot{ background:var(--green); color:#fff; }
.app[data-theme="dark"] .mhd-item.done .mhd-dot{ color:#10271a; }

/* 내부 툴바 · 큰 탭 */
.inner-bar{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; flex-wrap:wrap; }
.inner-sub{ font-size:13px; color:var(--muted); }
.big-tabs{ margin-bottom:18px; }
.big-tabs .tab{ height:40px; padding:0 18px; font-size:14px; }

/* 목표 지표 */
.metric-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; }
.metric-card{ background:var(--card); border:1px solid var(--border); border-radius:18px; padding:18px; box-shadow:var(--shadow); display:flex; flex-direction:column; gap:11px; }
.m-top{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.m-name{ font-size:14.5px; font-weight:700; }
.m-val{ display:flex; align-items:baseline; gap:7px; flex-wrap:wrap; }
.m-val b{ font-size:23px; font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }
.m-val span{ font-size:12.5px; color:var(--faint); font-weight:600; }
.m-bar{ height:8px; border-radius:99px; background:var(--inset); overflow:hidden; }
.m-bar.sm{ height:6px; }
.m-bar > i{ display:block; height:100%; border-radius:99px; transition:width .5s ease; }
.m-foot{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
.m-pct{ font-size:14px; font-weight:800; font-variant-numeric:tabular-nums; flex:none; }
.m-spark{ flex:1; min-width:0; max-width:130px; }
.m-log{ margin-top:2px; height:38px; border-radius:11px; border:1px solid var(--border); background:transparent; color:var(--muted); font-weight:700; font-size:13px; font-family:inherit; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:.15s; }
.m-log:hover{ border-color:var(--gold); color:var(--gold); }
.unit-inp{ height:34px !important; width:100px; flex:none; font-size:13px !important; }
.m-mini{ display:flex; flex-direction:column; gap:12px; }
.mm-metric{ display:flex; flex-direction:column; gap:6px; }
.mmm-top{ display:flex; align-items:center; justify-content:space-between; }
.mmm-name{ font-size:13px; font-weight:600; }
.mmm-pct{ font-size:12.5px; font-weight:700; font-variant-numeric:tabular-nums; }

/* 슬라이더 · 체크라인 */
.range{ width:100%; accent-color:var(--accent); height:6px; cursor:pointer; }
.check-line{ display:flex; align-items:center; gap:9px; font-size:13.5px; font-weight:600; color:var(--muted); cursor:pointer; margin-top:2px; }
.check-line input{ width:17px; height:17px; accent-color:var(--green); cursor:pointer; }

/* 대시보드 드림보드 띠 */
.dream-hero{ margin-bottom:16px; }
.metric-hero{ margin-bottom:16px; }
.metric-hero-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
@media(max-width:680px){ .metric-hero-grid{ grid-template-columns:1fr; gap:13px; } }
.hero-rail{ display:flex; gap:12px; overflow-x:auto; padding-bottom:6px; scroll-snap-type:x proximity; }
.hero-rail::-webkit-scrollbar{ height:6px; }
.hero-rail::-webkit-scrollbar-thumb{ background:var(--border2); border-radius:99px; }
.hero-rail::-webkit-scrollbar-track{ background:transparent; }
.hero-tile{ position:relative; flex:none; width:162px; height:112px; border-radius:14px; overflow:hidden; border:none; padding:0; cursor:pointer; display:grid; place-items:center; scroll-snap-align:start; transition:.16s; }
.hero-tile:hover{ transform:translateY(-2px); }
.hero-tile img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.hero-grad{ position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.62), transparent 58%); }
.hero-cap{ position:absolute; left:11px; right:11px; bottom:9px; z-index:1; color:#fff; font-size:12.5px; font-weight:700; line-height:1.3; text-align:left; text-shadow:0 1px 4px rgba(0,0,0,.5); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.hero-badge{ position:absolute; top:8px; right:8px; z-index:1; width:21px; height:21px; border-radius:50%; background:color-mix(in srgb,var(--green) 90%,#000); color:#fff; display:grid; place-items:center; box-shadow:0 2px 6px -1px rgba(0,0,0,.4); }
.hero-add{ flex:none; width:118px; height:112px; border-radius:14px; border:1.5px dashed var(--border2); background:var(--inset); color:var(--muted); cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; font-size:12px; font-weight:700; transition:.15s; scroll-snap-align:start; }
.hero-add:hover{ border-color:var(--violet); color:var(--violet); }
`;
