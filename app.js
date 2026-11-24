const roles=['产品经理','需求人员','设计人员','开发人员','测试人员'];
const modules=[['产品规划','项目管理','产品评审与验收'],['需求获取与分析','需求建模与文档编制','需求变更与追踪'],['软件架构设计','软件详细设计','界面原型设计'],['开发任务管理','编码实现与代码管理','软件集成与缺陷修复'],['测试计划与用例设计','测试执行与结果分析','缺陷管理与质量评估']];
const stages=['产品规划','需求分析','软件设计','编码实现','软件测试','产品验收'];
const kinds={artifact:'阶段交付物',task:'任务',milestone:'里程碑',change:'需求变更',defect:'缺陷',case:'测试用例',evaluation:'教师评价',version:'代码版本'};
const sample={
 user:{id:1,name:'林知远'},team:{id:1,name:'第 03 实践小组',title:'智慧校园服务平台',body:'为校园师生构建集活动报名、场地预约与服务查询于一体的轻量化平台。',stage:2,code:'示例'},
 members:['林知远','陈一诺','周可欣','王宇航','许佳宁'].map((name,i)=>({id:i+1,name,role:i})),
 records:[
 {id:6,uid:1,kind:'task',module:'项目管理',title:'评审系统架构设计方案',status:'待处理',extra:'{"assignee":1,"priority":"高","start":"2026-11-24","due":"2026-11-28"}',body:'组织跨角色设计评审，确认模块职责与接口边界。'},
 {id:5,uid:1,kind:'task',module:'项目管理',title:'确认场地预约验收标准',status:'进行中',extra:'{"assignee":1,"priority":"中","start":"2026-11-24","due":"2026-11-29"}',body:'明确各类场地的预约时段、预约冲突判断与取消规则。'},
 {id:4,uid:3,kind:'task',module:'软件架构设计',title:'完成首版系统架构图',status:'进行中',extra:'{"assignee":3,"priority":"高","start":"2026-11-22","due":"2026-11-27"}',body:'结合需求编号明确系统模块和数据流转。'},
 {id:3,uid:2,kind:'artifact',module:'需求建模与文档编制',title:'软件需求规格说明书 V1.0',status:'通过',extra:'{}',body:'场地预约支持查询余量、预约、取消及冲突校验。'},
 {id:2,uid:1,kind:'task',module:'项目管理',title:'整理产品目标及优先级',status:'已完成',extra:'{"assignee":1,"priority":"中","start":"2026-11-20","due":"2026-11-23"}',body:'以活动报名和场地预约为首期交付范围。'},
 {id:1,uid:1,kind:'artifact',module:'产品规划',title:'智慧校园产品规划',status:'通过',extra:'{}',body:'面向校园师生，梳理活动报名、场地预约和服务查询三类核心场景。'}],
 events:[{name:'周可欣',body:'更新了系统架构设计任务',created:'2026-11-24 09:42'},{name:'陈一诺',body:'提交了需求规格说明书 V1.0',created:'2026-11-24 08:15'},{name:'林知远',body:'完成需求分析阶段评审',created:'2026-11-23 10:36'}],
 messages:[{name:'周可欣',uid:3,body:'架构图初稿已经整理好，请大家关注预约服务的接口划分。',created:'2026-11-24 09:42'},{name:'陈一诺',uid:2,body:'需求文档已通过评审，场地预约的验收标准在第 3 节。',created:'2026-11-24 08:15'}]
};
let live, stream, streamTeam, pending=false, tid=0, page='项目概览', tab='讨论', recipient='', demoRole=0, aiReply='', filter='', taskView='列表', authMode='login';
const app=document.querySelector('#app'), dialog=document.querySelector('#dialog');
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const I=(name,size=18)=>{
 const paths={logo:'M12 2 3 7v10l9 5 9-5V7z M3 7l9 5 9-5 M12 12v10 M7 4.8l10 5.5',home:'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',board:'M3 4h18v16H3z M9 4v16 M15 4v16',file:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 15a4 4 0 0 1 5 4v2 M17 3a4 4 0 0 1 0 8',chat:'M21 11a8 8 0 0 1-8 8H8l-5 3 1-6a8 8 0 0 1 7-13h2a8 8 0 0 1 8 8z M8 11h8',bell:'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9 M10 21h4',spark:'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z M19 2v5 M16.5 4.5h5',target:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',check:'M4 12l5 5L20 6',arrow:'M5 12h14 M13 6l6 6-6 6',plus:'M12 5v14 M5 12h14',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v6l4 2',attach:'M8 13l6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8',send:'M3 4l18 8-18 8 4-8z M7 12h14'};
 return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="'+(paths[name]||paths.file)+'"/></svg>';
};
const demo=()=>!live?.user;
const current=()=>demo()?sample:live;
const role=()=>demo()?demoRole:(live?.members||[]).find(m=>m.id===live.user.id)?.role??-1;
const extra=r=>JSON.parse(r.extra||'{}');
const done=s=>['通过','已完成','已关闭','已评价'].includes(s);
const button=(label,action,cls='',icon='')=>'<button class="'+cls+'" data-action="'+E(action)+'">'+(icon?I(icon,16):'')+E(label)+'</button>';
const person=(m)=>'<span class="avatar tone'+(m.role??0)+'">'+E(m.name.slice(-2))+'</span>';
const pill=s=>'<span class="pill '+(done(s)?'green':/进行|待评|待回/.test(s)?'blue':'gray')+'">'+E(s)+'</span>';
const opts=(items,selected)=>items.map(([v,n])=>'<option value="'+E(v)+'" '+(String(v)===String(selected)?'selected':'')+'>'+E(n)+'</option>').join('');
const field=(label,name,control)=>'<label>'+E(label)+control.replace('@@',name)+'</label>';
const input=(name,label,value='',type='text')=>field(label,name,'<input name="@@" type="'+type+'" value="'+E(value)+'">');
const area=(name,label,value='')=>field(label,name,'<textarea name="@@">'+E(value)+'</textarea>');
const select=(name,label,items,value)=>field(label,name,'<select name="@@">'+opts(items,value)+'</select>');
async function api(action,data){
 const res=await fetch('/api/'+action,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'});
 const out=await res.json();
 if(out.error) throw Error(out.error);
 return out;
}
function notify(msg){const t=document.querySelector('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove('show'),3500);}
const busy=()=>dialog.open||app.querySelector('input:focus,textarea:focus,select:focus');
function update(next,force=false){
 const changed=JSON.stringify(next)!==JSON.stringify(live);
 live=next;
 if(force||((changed||pending)&&!busy())){pending=false;render();}
 else if(changed)pending=true;
}
function connect(){
 const key=live?.user?live.user.id+':'+tid:'';
 if(key===streamTeam)return;
 stream?.close();
 streamTeam=key;
 if(!key)return;
 stream=new EventSource('/api/stream?tid='+tid);
 stream.onmessage=e=>update(JSON.parse(e.data));
}
async function refresh(force=false){
 const next=await api('state?tid='+tid);
 update(next,force);
 connect();
}
function openForm(title,body,callback,label='保存'){
 dialog.innerHTML='<form><div class="dialog-head"><h2>'+E(title)+'</h2><button type="button" data-close aria-label="关闭">×</button></div><div class="fields">'+body+'</div><footer><button type="button" data-close>取消</button><button class="primary" type="submit">'+E(label)+'</button></footer></form>';
 if(!dialog.open)dialog.showModal();
 dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
 dialog.querySelector('form').onsubmit=async e=>{
  e.preventDefault();
  const submit=e.submitter;
  submit.disabled=true;
  try{await callback(Object.fromEntries(new FormData(e.target)),e.target);dialog.close();await refresh(true);}catch(err){notify(err.message);}finally{submit.disabled=false;}
 };
}
function auth(mode='login'){
 authMode=mode;
 openForm(mode==='login'?'登录研工坊':'创建账号',input('name','用户名')+input('password','密码（至少 8 位）','','password')+(mode==='register'?select('teacher','账号类型',[[0,'学生'],[1,'教师']])+input('key','教师邀请码（学生留空）'):'')+'<button type="button" class="link" id="switch-auth">'+(mode==='login'?'还没有账号？创建账号':'已有账号？登录')+'</button>',async d=>{await api(mode,{...d,teacher:d.teacher==='1'});tid=0;page='项目概览';},mode==='login'?'登录':'注册');
 dialog.querySelector('#switch-auth').onclick=()=>auth(mode==='login'?'register':'login');
}
const authOnly=fn=>demo()?auth():fn();
const teamId=()=>current().team?.id;
async function change(action,d={}){await api(action,{...d,tid:teamId()});await refresh(true);}
function timeline(t){
 return '<div class="steps">'+stages.map((s,i)=>'<div class="step '+(i<t.stage?'complete':i===t.stage?'active':'')+'"><span>'+(i<t.stage?I('check',15):String(i+1).padStart(2,'0'))+'</span><b>'+s+'</b><small>'+(i<t.stage?'已完成':i===t.stage?'进行中':'待开始')+'</small></div>').join('')+'</div>';
}
function tasks(rs,short=false){
 const selected=rs.filter(r=>r.kind==='task'||(!short&&r.kind==='milestone')).filter(r=>!short||!done(r.status));
 if(!selected.length)return '<div class="empty">暂无待办任务</div>';
 const row=r=>{const x=extra(r);return '<button class="taskrow" data-action="detail:'+r.id+'"><div class="taskicon">'+I('file',17)+'</div><div class="grow"><b>'+E(r.title)+'</b><small>'+E(r.module||kinds[r.kind])+' · '+E(x.due||'未设截止日期')+'</small></div><span class="priority '+(x.priority==='高'?'high':'')+'">'+E(x.priority||'常规')+'</span>'+pill(r.status)+'</button>';};
 if(short||taskView==='列表')return selected.slice(0,short?4:999).map(row).join('');
 if(taskView==='看板')return '<div class="kanban">'+['待处理','进行中','已完成'].map(s=>'<section><b>'+s+'</b>'+selected.filter(r=>r.status===s).map(row).join('')+'</section>').join('')+'</div>';
 const dated=selected.filter(r=>extra(r).start&&extra(r).due);
 if(!dated.length)return '<div class="empty">为任务设置起止日期后可查看甘特图</div>';
 const dates=dated.flatMap(r=>[Date.parse(extra(r).start),Date.parse(extra(r).due)]), lo=Math.min(...dates), hi=Math.max(...dates)+86400000;
 return '<div class="gantt"><div class="ganttlabels"><span>'+new Date(lo).toISOString().slice(0,10)+'</span><span>'+new Date(hi-86400000).toISOString().slice(0,10)+'</span></div>'+dated.map(r=>'<button data-action="detail:'+r.id+'" class="ganttrow"><span>'+E(r.title)+'</span><i><b style="left:'+((Date.parse(extra(r).start)-lo)/(hi-lo)*100)+'%;width:'+((Date.parse(extra(r).due)-Date.parse(extra(r).start)+86400000)/(hi-lo)*100)+'%"></b></i></button>').join('')+'</div>';
}
function panel(title,body,end='',sub=''){return '<section class="card"><div class="cardhead"><div><h2>'+E(title)+'</h2>'+(sub?'<p>'+E(sub)+'</p>':'')+'</div>'+end+'</div>'+body+'</section>';}
function stats(t,rs,ms){
 const all=rs.filter(r=>r.kind==='task'), complete=all.filter(r=>done(r.status)).length;
 return '<div class="stats">'+[
 ['target','生命周期进度',Math.round(t.stage/6*100)+'%','已完成 '+t.stage+' / 6 个阶段'],
 ['board','团队任务',all.length,'已完成 '+complete+' 项任务'],
 ['file','阶段交付物',rs.filter(r=>r.kind==='artifact').length,'已通过 '+rs.filter(r=>r.kind==='artifact'&&done(r.status)).length+' 项评审'],
 ['people','小组成员',ms.length,'已分配 '+ms.length+' / 5 个岗位']
 ].map(([i,n,v,s],idx)=>'<div class="stat"><span class="metricicon tone'+idx+'">'+I(i,20)+'</span><span>'+n+'</span><strong>'+v+'</strong><small>'+s+'</small></div>').join('')+'</div>';
}
function overview(t,rs,ms,u){
 return '<section class="hero"><div class="hero-inner"><div class="hero-tag">'+I('logo',14)+' 软件工程课程实践</div><h1>'+E(t.title)+'</h1><p>'+E(t.body)+'</p><div class="heroactions">'+button('查看任务看板','nav:任务看板','primary','board')+button('项目成果','nav:项目文档','soft','file')+'</div></div><div class="heroart" aria-hidden="true"><svg viewBox="0 0 330 210"><defs><linearGradient id="art" x2="1" y2="1"><stop stop-color="#739aff"/><stop offset="1" stop-color="#2455eb"/></linearGradient></defs><g fill="none" stroke="#9cb8ff" opacity=".55"><path d="M22 128 155 56l140 70-133 73z M22 143l140 71 133-73 M52 112l140 70 M83 95l140 70 M115 78l140 70 M52 143l133-72 M84 160l133-72 M116 176l133-72"/><path d="M55 75v45l50 26 51-27V74 M169 52v49l51 27 51-27V52" stroke-dasharray="4 5"/></g><g stroke="#e0eaff" stroke-width="2"><path d="m107 68 55-30 56 30-56 30z" fill="#9fbbff"/><path d="m107 68 55 30v62l-55-29z" fill="#527dfa"/><path d="m162 98 56-30v63l-56 29z" fill="url(#art)"/><path d="m46 82 29-15 29 15-29 16z" fill="#d4e2ff"/><path d="m46 82 29 16v33l-29-15z" fill="#8babff"/><path d="m75 98 29-16v34l-29 15z" fill="#648cff"/><path d="m223 75 27-15 28 15-28 16z" fill="#c0d4ff"/><path d="m223 75 27 16v31l-27-15z" fill="#83a6ff"/><path d="m250 91 28-16v32l-28 15z" fill="#608bff"/></g><path d="m135 106-9 5 9 12m8-11 8 12-8 5m34-14 8 3 15-19" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g fill="#608aff"><circle cx="97" cy="47" r="3"/><circle cx="240" cy="39" r="4"/><circle cx="285" cy="126" r="3"/></g></svg></div></section>'+
 stats(t,rs,ms)+panel('软件工程生命周期',timeline(t),pill(t.stage===6?'已完成':'进行中')+(role()===0&&t.stage<6?button('推进阶段','advance','link'):''),
 '按阶段交付与评审，追踪团队项目进度')+
 '<div class="lower">'+panel('个人待办',tasks(rs.filter(r=>Number(extra(r).assignee)===u.id),true),button('查看全部','nav:任务看板','link'))+panel('项目动态',(current().events||[]).slice(0,4).map(e=>'<div class="event"><i></i><div><b>'+E(e.name)+'</b> '+E(e.body)+'<small>'+E(e.created)+'</small></div></div>').join('')||'<div class="empty">暂无项目动态</div>',button('全部动态','tab:通知','link'))+'</div>';
}
function right(ms){
 const s=current(), me=s.user;
 const msgs=(s.messages||[]).filter(m=>recipient?(m.uid===me.id&&String(m.to_uid)===recipient)||(String(m.uid)===recipient&&m.to_uid===me.id):!m.to_uid);
 const content=tab==='讨论'?'<div class="right-section"><h3>团队成员 <span>'+ms.length+'</span></h3>'+ms.map(m=>'<button class="member" data-action="recipient:'+m.id+'">'+person(m)+'<span><b>'+E(m.name)+'</b><small>'+roles[m.role]+'</small></span><i></i></button>').join('')+'</div><div class="right-section discussion"><h3>'+(recipient?'私信 · '+E(ms.find(m=>String(m.id)===recipient)?.name||'成员'):'小组公开讨论')+(recipient?button('返回讨论','recipient:','link'):'')+'</h3><div class="messages">'+(msgs.slice(-15).map(m=>'<div class="message"><small>'+E(m.name)+' <span>'+E(m.created?.slice(11,16))+'</span></small><div>'+E(m.body)+(m.file?button('下载附件','attachment:'+m.id,'link','attach'):'')+'</div></div>').join('')||'<div class="empty">暂无消息</div>')+'</div><form id="chat"><input name="body" placeholder="输入消息…" aria-label="消息"><label class="clip" title="添加附件">'+I('attach',17)+'<input name="upload" type="file" hidden></label><button class="send" aria-label="发送">'+I('send',16)+'</button></form></div>':tab==='通知'?'<div class="right-section"><h3>项目动态与提醒</h3>'+(s.events||[]).map(e=>'<div class="event"><i></i><div>'+E(e.name)+' · '+E(e.body)+'<small>'+E(e.created)+'</small></div></div>').join('')+'</div>':'<div class="right-section"><div class="assist">'+I('spark',24)+'<h3>'+E(roles[role()]||'岗位')+'助教</h3><p>提问并获取岗位指导、成果规范检查或方案反馈。</p></div><form id="assistant"><textarea name="prompt" placeholder="例如：如何让验收标准更容易验证？" required></textarea><button class="primary">获取指导</button></form>'+(aiReply?'<div class="reply">'+E(aiReply)+'</div>':'')+'</div>';
 return '<aside class="right"><div class="righttitle"><h2>团队协作</h2>'+I('people',18)+'</div><div class="tabs">'+[['讨论','chat'],['通知','bell'],['AI 助教','spark']].map(([n,i])=>button(n,'tab:'+n,n===tab?'chosen':'',i)).join('')+'</div>'+content+'</aside>';
}
function report(rs,ms){
 return '<div class="report">'+ms.map(m=>{
  const made=rs.filter(r=>r.uid===m.id), assigned=rs.filter(r=>Number(extra(r).assignee)===m.id);
  const grade=rs.find(r=>r.kind==='evaluation'&&Number(extra(r).assignee)===m.id), g=grade&&extra(grade);
  return '<div class="reportrow">'+person(m)+'<div class="grow"><b>'+E(m.name)+' · '+roles[m.role]+'</b><small>提交 '+made.length+' 项记录 · 完成 '+assigned.filter(r=>done(r.status)).length+' / '+assigned.length+' 个任务'+(g?' · 综合评分 '+Math.round((+g.duty + +g.quality + +g.standard + +g.teamwork)/4):'')+'</small></div>'+button('个人档案','report:'+m.id,'link')+(live?.user?.teacher?button('评价','new:evaluation:'+m.id,'soft'):'')+'</div>';
 }).join('')+'</div>';
}
function section(t,rs,ms){
 if(page==='任务看板')return panel(page,'<div class="switch">'+['列表','看板','甘特图'].map(v=>button(v,'view:'+v,taskView===v?'chosen':'')).join('')+'</div>'+tasks(rs),[0,3].includes(role())?button('新建任务','new:task','primary','plus'):'');
 if(page==='小组与项目')return panel('项目与小组','<div class="projectlist">'+(live?.projects||[]).map(p=>'<div><b>'+E(p.title)+'</b><p>'+E(p.body)+'</p></div>').join('')+'</div>'+panel('小组成员',report(rs,ms),button('下载小组报告','report:0','link'))+'<p class="invite">小组邀请码 <b>'+E(t.code)+'</b></p>',live?.user?.teacher?button(t.archived?'恢复小组':'归档小组','archive','soft'):button('创建或加入小组','groups','primary','plus'));
 const m=page==='项目文档'?rs.filter(r=>r.kind!=='evaluation'):rs.filter(r=>r.module===page);
 const r=role(), own=modules[r]?.includes(page);
 const add=own?button('提交交付物','new:artifact','primary','plus')+
 (page==='项目管理'?button('里程碑','new:milestone','soft'):page==='需求变更与追踪'?button('需求变更','new:change','soft'):page==='编码实现与代码管理'?button('代码版本','new:version','soft'):page==='测试计划与用例设计'?button('测试用例','new:case','soft'):page==='缺陷管理与质量评估'?button('报告缺陷','new:defect','soft'):''):'';
 const cases=rs.filter(x=>x.kind==='case'), req=rs.filter(x=>x.kind==='artifact'&&x.module===modules[1][0]);
 const covered=new Set(cases.map(x=>Number(extra(x).link)));
 const teststat=page===modules[4][1]?'<p class="invite">通过率 '+(cases.filter(x=>x.status!=='未执行').length?Math.round(100*cases.filter(x=>x.status==='通过').length/cases.filter(x=>x.status!=='未执行').length)+'%':'—')+'　需求覆盖率 '+(req.length?Math.round(100*req.filter(x=>covered.has(x.id)).length/req.length)+'%':'—')+'</p>':'';
 return panel(page,teststat+(m.length?m.map(x=>'<button class="taskrow" data-action="detail:'+x.id+'"><span class="taskicon">'+I('file')+'</span><span class="grow"><b>'+E(x.title)+'</b><small>'+E(kinds[x.kind])+' · #'+x.id+'</small></span>'+pill(x.status)+'</button>').join(''):'<div class="empty">暂无记录</div>'),add);
}
function render(){
 const s=current(),t=s.team,ms=s.members||[],rs=s.records||[],u=s.user,r=role();
 const nav=(n,i)=>button(n,'nav:'+n,page===n?'selected':'',i);
 const roleName=u.teacher?'教师工作台':roles[r]||'学生工作台';
 app.innerHTML='<div class="layout"><aside class="left"><div class="brand"><span>'+I('logo',24)+'</span><div><b>研工坊</b><small>软件工程实践平台</small></div></div><div class="groupbox"><span class="groupicon">'+I('people',18)+'</span><div class="grow"><small>当前工作空间</small><b>'+E(t?.name||'课程实践')+'</b></div>'+(!demo()&&s.teams?.length>1?'<select id="team-switch" aria-label="切换小组">'+opts(s.teams.map(x=>[x.id,x.name]),t?.id)+'</select>':'')+'</div><nav><div class="navlabel">项目空间</div>'+nav('项目概览','home')+nav('任务看板','board')+nav('项目文档','file')+nav('小组与项目','people')+'<div class="navlabel rolelabel">'+roleName+'</div>'+
 (u.teacher?button('发布实践项目','project','','plus'):modules[Math.max(0,r)].map((n,i)=>nav(n,['target','board','check'][i])).join(''))+'</nav><div class="leftfoot">'+(demo()?select('demo-role','示例岗位',roles.map((n,i)=>[i,n]),demoRole):'')+'<div class="identity">'+person({name:u.name,role:Math.max(r,0)})+'<span class="grow"><b>'+E(u.name)+'</b><small>'+roleName+'</small></span>'+button(demo()?'登录':'退出',demo()?'login':'logout','link')+'</div></div></aside>'+
 '<div class="workspace"><header><div class="crumb">课程实践 <span> / </span> <b>'+E(page)+'</b></div><div class="head-actions">'+(demo()?'<span class="demo">示例工作空间</span>':'')+button('通知','tab:通知','headbutton','bell')+button(demo()?'进入我的工作台':u.teacher?'发布项目':'加入小组',demo()?'login':u.teacher?'project':'groups','primary','plus')+'</div></header>'+
 '<div class="bodygrid"><main>'+(t?(page==='项目概览'?overview(t,rs,ms,u):'<div class="pageintro"><h1>'+E(page)+'</h1><p>'+E(t.title)+' · '+E(t.name)+'</p></div>'+section(t,rs,ms)):'<section class="hero"><div class="hero-inner"><div class="hero-tag">软件工程课程实践</div><h1>'+E(u.name)+'，欢迎来到研工坊</h1><p>'+ (u.teacher?'发布课程实践项目后，可在此跟踪学生小组的项目进度。':'选择课程实践项目创建小组，或通过邀请码加入已有小组。')+'</p>'+button(u.teacher?'发布实践项目':'创建或加入小组',u.teacher?'project':'groups','primary','plus')+'</div></section>'+panel('已发布项目','<div class="projectlist">'+(s.projects||[]).map(p=>'<div><b>'+E(p.title)+'</b><p>'+E(p.body)+'</p></div>').join('')+'</div>'))+'</main>'+ (t?right(ms):'')+'</div></div></div>';
 const switcher=document.querySelector('#team-switch');if(switcher)switcher.onchange=()=>{tid=Number(switcher.value);recipient='';aiReply='';page='项目概览';refresh(true).catch(e=>notify(e.message));};
 const ds=app.querySelector('[name="demo-role"]');if(ds)ds.onchange=()=>{demoRole=Number(ds.value);page='项目概览';aiReply='';render();};
 const chat=document.querySelector('#chat');if(chat){chat.upload.onchange=()=>notify(chat.upload.files[0]?.name||'');chat.onsubmit=async e=>{
  e.preventDefault();
  if(demo())return auth();
  const upload=chat.upload.files[0], data={to:recipient,body:chat.body.value};
  if(upload){if(upload.size>1500000)return notify('附件上限 1.5 MB');const bytes=new Uint8Array(await upload.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);data.file={name:upload.name,data:btoa(binary)};}
  try{await change('message',data);const feed=app.querySelector('.messages');feed.scrollTop=feed.scrollHeight;}catch(err){notify(err.message);}
 };}
 const assist=document.querySelector('#assistant');if(assist)assist.onsubmit=async e=>{e.preventDefault();if(demo())return auth();try{e.submitter.disabled=true;aiReply=(await api('ai',{tid:teamId(),prompt:assist.prompt.value})).reply;render();}catch(err){notify(err.message);}finally{e.submitter.disabled=false;}};
}
const template={
'产品规划':'产品定位\n目标用户\n应用场景\n核心功能（含优先级）',
'产品评审与验收':'产品目标\n验收标准\n验收记录\n结论',
'需求获取与分析':'访谈与来源\n业务场景及流程\n功能需求\n非功能需求',
'需求建模与文档编制':'范围\n需求编号与描述\n用例及流程\n验收标准',
'软件架构设计':'架构选型与理由\n模块职责\n模块关系\n部署方案',
'软件详细设计':'数据库\n接口契约\n内部逻辑\n异常路径',
'界面原型设计':'页面及交互说明\n页面跳转逻辑',
'编码实现与代码管理':'实现说明\n提交版本\n单元测试步骤和结果',
'软件集成与缺陷修复':'集成范围\n集成结果\n关联缺陷和复测步骤',
'测试执行与结果分析':'测试类型（功能、接口、集成、系统）\n实际结果\n覆盖范围\n限制',
'缺陷管理与质量评估':'缺陷概况\n回归结果\n风险\n质量结论'};
const diagrams=['用例图','业务流程图','活动图','架构图','组件图','部署图','类图','时序图','状态图','数据库 ER 图','界面原型'];
function drawing(nodes=[],edges=[],edit=false){
 return '<div class="diagram"><svg viewBox="0 0 600 250" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="tip" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8z" fill="#6486cd"/></marker></defs>'+edges.map(([a,b])=>nodes[a]&&nodes[b]?'<line x1="'+(Number(nodes[a].x)+50)+'" y1="'+(Number(nodes[a].y)+17)+'" x2="'+(Number(nodes[b].x)+50)+'" y2="'+(Number(nodes[b].y)+17)+'" stroke="#6486cd" stroke-width="2" marker-end="url(#tip)"/>':'').join('')+'</svg>'+nodes.map((n,i)=>'<span class="diagramnode" '+(edit?'data-node="'+i+'"':'')+' style="left:'+Number(n.x)/6+'%;top:'+Number(n.y)/2.5+'%">'+E(n.label)+'</span>').join('')+'</div>';
}
function editorUI(){
 return '<details><summary>图与界面原型编辑器</summary>'+select('diagramType','图类型',diagrams.map(i=>[i,i]))+'<div class="drawbuttons"><input id="node-label" placeholder="组件名称，例如 登录按钮"><button type="button" id="node-add">添加组件</button><button type="button" id="edge-add">连接组件</button><button type="button" id="draw-clear">清空</button></div><div id="draw"></div><small>拖动组件至所需位置。开启连接后按顺序点选两个组件。</small></details>';
}
function bindDrawing(nodes,edges){
 const draw=dialog.querySelector('#draw');if(!draw)return;
 let connecting=false,first=null;
 const paint=()=>{draw.innerHTML=drawing(nodes,edges,true);const board=draw.firstElementChild;
  board.onpointerdown=e=>{
   const index=e.target.dataset.node;if(index===undefined)return;
   const i=Number(index), n=nodes[i];
   if(connecting){if(first===null){first=i;e.target.classList.add('marked');}else{if(first!==i)edges.push([first,i]);first=null;connecting=false;paint();}return;}
   const bounds=board.getBoundingClientRect(), x=e.clientX,y=e.clientY, ox=n.x,oy=n.y,element=e.target;
   element.setPointerCapture(e.pointerId);
   element.onpointermove=ev=>{n.x=Math.round(Math.max(0,Math.min(490,ox+(ev.clientX-x)*600/bounds.width)));n.y=Math.round(Math.max(0,Math.min(215,oy+(ev.clientY-y)*250/bounds.height)));element.style.left=n.x/6+'%';element.style.top=n.y/2.5+'%';};
   element.onpointerup=()=>paint();
  };
 };
 dialog.querySelector('#node-add').onclick=()=>{const el=dialog.querySelector('#node-label'),label=el.value.trim();if(!label)return;nodes.push({label:label.slice(0,32),x:20+(nodes.length%4)*135,y:20+(Math.floor(nodes.length/4)%5)*45});el.value='';paint();};
 dialog.querySelector('#edge-add').onclick=()=>{connecting=!connecting;first=null;paint();notify(connecting?'依次点击起点和终点':'已退出连接模式');};
 dialog.querySelector('#draw-clear').onclick=()=>{nodes.length=0;edges.length=0;connecting=false;first=null;paint();};paint();
}
function newRecord(kind,personId,original){
 const s=current(), roleId=role(), old=original?extra(original):{};
 const module=original?.module||(modules[roleId]?.includes(page)?page:kind==='task'?modules[roleId]?.[roleId===0?1:0]:'');
 const members=(s.members||[]).map(m=>[m.id,m.name+' · '+roles[m.role]]);
 const drawingAllowed=kind==='artifact'&&[1,2].includes(roleId);
 const nodes=structuredClone(old.nodes||[]), edges=structuredClone(old.edges||[]);
 const links=[['','无关联'],...s.records.filter(r=>r.kind!=='evaluation').map(r=>[r.id,'#'+r.id+' '+r.title])];
 let body=input('title','标题',original?.title||(personId?'个人实践评价':''))+area('body',kind==='version'?'代码内容或版本说明':kind==='evaluation'?'教师评语':'内容',original?.body||(kind==='artifact'?template[module]||'':kind==='case'?'测试方法\n前置条件\n输入\n预期结果':kind==='defect'?'复现步骤\n预期与实际结果':kind==='change'?'变更原因\n影响范围及处理建议':''));
 if(kind==='version')body+=field('上传代码文件','codefile','<input type="file" name="@@" accept=".py,.js,.ts,.java,.cpp,.c,.cs,.go,.rs,.html,.css,.json,.txt,.sql">');
 if(['task','evaluation','defect'].includes(kind))body+=select('assignee','负责人或评价对象',[...(kind==='evaluation'?[]:[['','待领取']]),...members],personId||old.assignee);
 if(['task','milestone'].includes(kind))body+=input('start','开始日期',old.start,'date')+input('due','截止日期',old.due,'date')+select('priority','优先级',[['中','中'],['高','高'],['低','低']],old.priority);
 if(kind==='defect')body+=select('priority','严重程度',[['一般','一般'],['严重','严重'],['阻断','阻断']],old.priority);
 if(kind==='evaluation')body+=['岗位职责完成度','成果质量','工程规范性','团队协作能力'].map((n,i)=>input(['duty','quality','standard','teamwork'][i],n,'','number')).join('');
 else body+=select('link','关联需求、任务或成果',links,old.link);
 if(drawingAllowed)body+=editorUI();
 openForm((original?'提交修订 · ':'新建')+kinds[kind],body,async(d,f)=>{
  const {title,body,...fields}=d, ex={...fields};delete ex.codefile;
  if(ex.start&&ex.due&&ex.start>ex.due)throw Error('开始日期须早于或等于截止日期');
  if(kind==='evaluation'&&['duty','quality','standard','teamwork'].some(x=>ex[x]===''))throw Error('请填写四项评分');
  if(drawingAllowed){ex.nodes=nodes;ex.edges=edges;}
  if(original)ex.parent=original.id;
  const upload=f.codefile?.files[0];if(upload&&upload.size>200000)throw Error('代码文件上限 200 KB');
  let content=body;if(upload)content+='\n\n'+upload.name+'\n'+await upload.text();
  await api('record',{tid:teamId(),title,body:content,extra:ex,module,kind});
 });
 if(drawingAllowed){bindDrawing(nodes,edges);if(old.diagramType)dialog.querySelector('[name="diagramType"]').value=old.diagramType;}
}
function highlight(source){
 const pattern=/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:async|await|class|const|def|else|false|for|function|if|import|interface|let|new|null|return|true|var|while)\b|\b\d+(?:\.\d+)?\b)/g;
 let result='',offset=0;
 for(const match of source.matchAll(pattern)){
  result+=E(source.slice(offset,match.index))+'<span class="syntax">'+E(match[0])+'</span>';
  offset=match.index+match[0].length;
 }
 return result+E(source.slice(offset));
}
function details(id){
 const s=current(), rec=s.records.find(r=>r.id===id);if(!rec)return;
 const r=role(), x=extra(rec), k=rec.kind, st=rec.status;
 let transitions=[];
 if(k==='artifact'&&r===0&&st==='待评审')transitions=['通过','退回修改'];
 if(k==='version'&&[0,3].includes(r)&&s.user.id!==rec.uid&&st==='待评审')transitions=['通过','退回修改'];
 if(k==='task'&&st==='待处理'&&(r===0||r===3&&!x.assignee||Number(x.assignee)===s.user.id))transitions=['进行中'];
 if(k==='task'&&st==='进行中'&&(r===0||Number(x.assignee)===s.user.id)||k==='milestone'&&r===0&&st==='待处理')transitions=['已完成'];
 if(k==='change'&&r===0&&st==='待审批')transitions=['已批准','已驳回'];
 if(k==='defect'&&r===3&&st==='待修复')transitions=['待回归'];
 if(k==='defect'&&r===4&&st==='待回归')transitions=['已关闭','待修复'];
 if(k==='case'&&r===4)transitions=['通过','失败'];
 const canRevise=rec.uid===s.user.id&&['artifact','version'].includes(k)&&!demo();
 const links=[x.link,x.parent].filter(Boolean).map(l=>button('#'+l,'detail:'+l,'link')).join('');
 const related=s.records.filter(rr=>[extra(rr).link,extra(rr).parent].some(l=>Number(l)===id)).map(rr=>button('#'+rr.id+' '+rr.title,'detail:'+rr.id,'link')).join('');
 openForm(rec.title,'<div class="detailmeta">'+pill(st)+' <span>'+E(kinds[k])+' · #'+id+'</span></div><pre class="recordbody">'+(k==='version'?highlight(rec.body):E(rec.body))+'</pre>'+(x.nodes?.length?'<b>'+E(x.diagramType)+'</b>'+drawing(x.nodes,x.edges):'')+(links||related?'<div>关联记录 '+links+related+'</div>':'')+(canRevise?button('提交修订','revise:'+id,'soft'):'')+(transitions.length?select('status','更新状态',transitions.map(y=>[y,y]))+area('note','评审意见、测试结果或修改说明'):'')+'<div class="history">'+(s.events||[]).filter(e=>e.body.includes('#'+id+' ')).map(e=>'<p>'+E(e.name)+' · '+E(e.body)+' <small>'+E(e.created)+'</small></p>').join('')+'</div>',async d=>{if(demo())return auth();if(d.status)await api('update',{...d,id,tid:teamId()});},transitions.length?'提交':'关闭');
 dialog.querySelectorAll('[data-action]').forEach(b=>b.type='button');
}
function groups(){
 const s=current();
 openForm('创建或加入小组',select('mode','操作',[['join','通过邀请码加入'],['create','创建小组']])+input('code','小组邀请码')+select('pid','课程项目',[['','请选择'],...s.projects.map(p=>[p.id,p.title])])+input('name','新小组名称')+select('role','担任岗位',roles.map((n,i)=>[i,n])),async d=>{tid=(await api(d.mode,d)).tid;recipient='';page='项目概览';});
}
function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportReport(id){
 const s=current(),m=s.members.find(x=>x.id===id);
 const rs=s.records.filter(r=>!id||r.uid===id||Number(extra(r).assignee)===id);
 const text='# '+(m?m.name+'个人实践档案':s.team.name+'实践报告')+'\n\n项目：'+s.team.title+'\n完成阶段：'+s.team.stage+' / 6\n\n'+(m?'岗位：'+roles[m.role]+'\n\n':'## 小组成员\n'+s.members.map(x=>'- '+x.name+' · '+roles[x.role]).join('\n')+'\n\n')+'## 实践记录\n'+rs.map(r=>{const x=extra(r);return '- #'+r.id+' '+r.title+' · '+r.status+'\n  '+r.body.replaceAll('\n','\n  ')+(r.kind==='evaluation'?'\n  职责 '+x.duty+' / 质量 '+x.quality+' / 规范 '+x.standard+' / 协作 '+x.teamwork:'');}).join('\n')+'\n\n## 过程记录\n'+s.events.filter(e=>!id||e.uid===id).map(e=>'- '+e.created+' '+e.name+' '+e.body).join('\n');
 download((m?m.name+'-个人实践档案':'小组实践报告')+'.md',new Blob([text],{type:'text/markdown;charset=utf-8'}));
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 e.preventDefault();
 const [a,v,z]=b.dataset.action.split(':');
 try{
  if(a==='nav'){page=v;render();}
  else if(a==='tab'){tab=v;render();}
  else if(a==='view'){taskView=v;render();}
  else if(a==='login')auth();
  else if(a==='logout'){await api('logout',{});tid=0;page='项目概览';recipient='';aiReply='';await refresh(true);}
  else if(a==='groups')authOnly(groups);
  else if(a==='project')authOnly(()=>openForm('发布实践项目',input('title','项目名称')+area('body','项目背景与实践要求'),d=>api('project',d),'发布'));
  else if(a==='recipient'){if(v&&current().user.teacher)return notify('教师工作台支持小组公开讨论');if(Number(v)===current().user.id)return;recipient=v;tab='讨论';render();}
  else if(a==='detail')details(Number(v));
  else if(a==='new')authOnly(()=>newRecord(v,z));
  else if(a==='revise')newRecord(current().records.find(r=>r.id===Number(v)).kind,null,current().records.find(r=>r.id===Number(v)));
  else if(a==='report')exportReport(Number(v));
  else if(a==='advance')authOnly(()=>openForm('推进生命周期阶段','<p>提交前请确认本阶段成果已通过评审。</p>',()=>api('advance',{tid:teamId()}),'推进'));
  else if(a==='archive')openForm('更新归档状态','<p>归档后小组可查阅已有记录，恢复后可继续协作。</p>',()=>api('archive',{tid:teamId()}),'确认');
  else if(a==='attachment'){const f=JSON.parse(current().messages.find(m=>m.id===Number(v)).file);download(f.name,new Blob([Uint8Array.from(atob(f.data),c=>c.charCodeAt(0))],{type:'application/octet-stream'}));}
 }catch(err){notify(err.message);}
});
render();
refresh(true).catch(()=>notify('服务连接失败，当前显示示例工作空间'));
setInterval(()=>{if(pending&&!busy()){pending=false;render();}},750);
