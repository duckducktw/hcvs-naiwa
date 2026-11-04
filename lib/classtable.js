// 欣河雲端課表（cloud.shin-her.com.tw）公開查詢代理：不需登入
const SC = '33adeddbde96acc64ccfef6ef8f69580';
const HOST = 'https://cloud.shin-her.com.tw';
const PAGE = `${HOST}/ClassTableV2/ClassTable?sc=${SC}`;
const API = `${HOST}/ClassTableV2/ClassTableForTest/`;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36';

// 防偽 token + cookie：同一個 serverless 實例內共用 10 分鐘
let sess = null;
async function session(force) {
  if (!force && sess && Date.now() - sess.t < 600000) return sess;
  const r = await fetch(PAGE, { headers: { 'User-Agent': UA } });
  const html = await r.text();
  const token = (html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) || [])[1];
  const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  if (!token) throw new Error('no token');
  sess = { token, cookie, t: Date.now() };
  return sess;
}

// 欣河要求的完整查詢參數（照官方頁面送的欄位）
function params(o) {
  return {
    SchoolCode: '180404', Year: String(o.year || ''), Term: String(o.term || ''), WeekNo: '',
    ClassNo: o.type === 'Class' ? o.no : '', ClassroomNo: o.type === 'Classroom' ? o.no : '',
    CrossName: '', TeacherNo: o.type === 'Teacher' ? o.no : '', SubjectNo: '',
    ShowWindow: 'left', TimetableType: o.type || '', IsReverse: 'false',
    '教師超鐘點顯示': '隱藏', '教師姓名': '正常顯示',
    '學生能檢視的課程': '學生能檢視整天的課程', '檢視權限設定': '學生能檢視整天的課程',
    '是否顯示午休': '顯示', '是否顯示早自習': '顯示', '是否顯示節次時間': '顯示',
    '顯示科目名稱': '全名', '是否顯示總時數': '否', '是否顯示實施日期': '否',
    '實施開始日期': '', '實施結束日期': ''
  };
}

async function call(name, body, retry = true) {
  const s = await session();
  const r = await fetch(API + name, {
    method: 'POST',
    body: new URLSearchParams({ ...body, __RequestVerificationToken: s.token }),
    headers: {
      'User-Agent': UA, Cookie: s.cookie, Referer: PAGE, 'X-Requested-With': 'XMLHttpRequest',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
    }
  });
  const txt = await r.text();
  if ((!r.ok || txt.trimStart().startsWith('<')) && retry) { await session(true); return call(name, body, false); }
  if (!r.ok) throw new Error('upstream ' + r.status);
  return JSON.parse(txt);
}

// 學年學期清單
export async function terms() {
  const d = await call('GetYearTermList', {});
  return d.map(x => ({ v: x.Value, name: x.DisplayText, on: !!x.Selected }));
}

// 班級 / 教師 / 教室 清單
const LIST = { Class: 'GetClassNoList', Teacher: 'GetTeacherNoList', Classroom: 'GetClassroomDropdownList' };
export async function options(type, year, term) {
  if (!LIST[type]) throw new Error('bad type');
  const d = await call(LIST[type], params({ type: '', year, term }));
  return d.map(x => ({ v: x.Value, name: x.DisplayText }));
}

// 課表：精簡成 { days, sections, cells }
export async function timetable(type, no, year, term) {
  if (!LIST[type]) throw new Error('bad type');
  const d = await call('GetTimetable', params({ type, no, year, term }));
  const days = (d.TimeTableWeekDayDisplayList || [])
    .filter(w => w.WeekDay >= 1 && w.WeekDay <= (d.TimeTableSetting?.MaxWeekDay || 5))
    .map(w => ({ d: w.WeekDay, name: w.WeekDayDisplay }));
  // 節次清單混了三種列（名稱 / 時間 / 上下午標籤），依 SectionSeq 合併
  const hm = t => (String(t || '').match(/T(\d\d:\d\d)/) || [])[1] || '';
  const secMap = new Map();
  for (const x of d.TimeTableSectionList || []) {
    const k = x.SectionSeq;
    const cur = secMap.get(k) || { s: k, name: '', full: '', time: '' };
    if (x.SectionName && !cur.name) { cur.name = x.SectionName; cur.full = x.SectionDisplay || ''; }
    if (x.SectionBeginTime && !cur.time) cur.time = `${hm(x.SectionBeginTime)}~${hm(x.SectionEndTime)}`;
    secMap.set(k, cur);
  }
  const sections = [...secMap.values()].filter(x => x.name).sort((a, b) => a.s - b.s);
  const cells = (d.TimeTableItemList || [])
    .filter(x => (x.SubjectName || x.SubjectDisplay || '').trim())
    .map(x => ({
      d: x.WeekDay, s: x.SectionSeq,
      subj: (x.SubjectDisplay || x.SubjectName || '').trim(),
      teacher: (x.TeacherNameDisplay || x.FirstTeacherName || '').trim(),
      cls: (x.ClassName || '').trim(),
      room: (x.ClassroomDisplay || x.ClassroomName || '').trim(),
      wk: x['單雙週Display'] || ''
    }));
  return { days, sections, cells };
}
