import base64, hashlib, hmac, json, os, secrets, sqlite3, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT=Path(__file__).parent
DB=os.getenv('LAB_DB',str(ROOT/'lab.sqlite'))
ADMIN_LOGIN='admin'
ADMIN_NAME='王鸽'
ROLES=['产品经理','需求人员','设计人员','开发人员','测试人员']
MODULES=[
['产品规划','项目管理','产品评审与验收'],
['需求获取与分析','需求建模与文档编制','需求变更与追踪'],
['软件架构设计','软件详细设计','界面原型设计'],
['开发任务管理','编码实现与代码管理','软件集成与缺陷修复'],
['测试计划与用例设计','测试执行与结果分析','缺陷管理与质量评估']]
STAGES=['产品规划','需求分析','软件设计','编码实现','软件测试','产品验收']
OWNERS=[0,1,2,3,4,0]
KINDS=['artifact','task','milestone','change','defect','case','evaluation','version']
def cx():
    c=sqlite3.connect(DB,timeout=10)
    c.row_factory=sqlite3.Row
    return c
with cx() as c:
    c.executescript("""
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT UNIQUE,pw TEXT,teacher INT);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid INT,expires INT);
    CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY,title TEXT,body TEXT,teacher INT);
    CREATE TABLE IF NOT EXISTS teams(id INTEGER PRIMARY KEY,pid INT,name TEXT,code TEXT UNIQUE,stage INT DEFAULT 0,archived INT DEFAULT 0);
    CREATE TABLE IF NOT EXISTS members(tid INT,uid INT,role INT,PRIMARY KEY(tid,uid));
    CREATE TABLE IF NOT EXISTS records(id INTEGER PRIMARY KEY,tid INT,uid INT,kind TEXT,module TEXT,title TEXT,body TEXT,status TEXT,extra TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,tid INT,uid INT,to_uid INT,body TEXT,file TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,tid INT,uid INT,body TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
    """)
    c.execute('BEGIN IMMEDIATE')
    if 'admin' not in {col['name'] for col in c.execute('PRAGMA table_info(users)')}:
        c.execute('ALTER TABLE users ADD COLUMN admin INTEGER NOT NULL DEFAULT 0')

def rows(c,q,*a): return [dict(x) for x in c.execute(q,a)]
def one(c,q,*a): return c.execute(q,a).fetchone()
def require(test,msg='没有操作权限'):
    if not test: raise ValueError(msg)
def password(p,s): return hashlib.pbkdf2_hmac('sha256',p.encode(),bytes.fromhex(s),310000).hex()
def initialize_admin():
    pw=os.getenv('LAB_ADMIN_PASSWORD','')
    if not pw:
        return
    with cx() as c:
        c.execute('BEGIN IMMEDIATE')
        existing=one(c,'SELECT admin FROM users WHERE name=?',ADMIN_LOGIN)
        if existing:
            require(existing['admin'],'现有普通账号已占用 admin，请联系平台维护人员处理')
            return
        require(8<=len(pw)<=128,'管理员密码须为 8–128 位')
        salt=secrets.token_hex(16)
        c.execute('INSERT INTO users(name,pw,teacher,admin) VALUES(?,?,0,1)',
                  (ADMIN_LOGIN,salt+':'+password(pw,salt)))

def event(c,t,u,s): c.execute('INSERT INTO events(tid,uid,body) VALUES(?,?,?)',(t,u,s))
class Handler(BaseHTTPRequestHandler):
    def answer(self,data,status=200,cookie=None):
        body=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        if cookie: self.send_header('Set-Cookie',cookie)
        self.end_headers()
        self.wfile.write(body)
    def do_GET(self):
        url=urlsplit(self.path)
        if url.path=='/api/stream':
            self.stream(parse_qs(url.query))
        else:
            self.run(False)
    def stream(self,q):
        def snapshot():
            with cx() as c:
                state,_=self.api(c,'state',False,{},q)
                if not state['user']: return None
                return json.dumps(state,ensure_ascii=False,separators=(',',':'))
        try:
            current=snapshot()
            if current is None: return self.answer({'error':'请先登录'},401)
            self.send_response(200)
            self.send_header('Content-Type','text/event-stream; charset=utf-8')
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Accel-Buffering','no')
            self.end_headers()
            self.connection.settimeout(5)
            last=None
            last_sent=0
            deadline=time.monotonic()+30
            while time.monotonic()<deadline and current is not None:
                if current!=last:
                    self.wfile.write(('data: '+current+'\n\n').encode())
                    last=current
                    last_sent=time.monotonic()
                elif time.monotonic()-last_sent>=10:
                    self.wfile.write(b': heartbeat\n\n')
                    last_sent=time.monotonic()
                self.wfile.flush()
                time.sleep(1)
                current=snapshot()
        except (OSError,ValueError):
            return
    def do_POST(self): self.run(True)
    def run(self,post):
        url=urlsplit(self.path)
        if not post and url.path in ('/','/app.js','/style.css'):
            name,mime={'/':('index.html','text/html'),'/app.js':('app.js','text/javascript'),'/style.css':('style.css','text/css')}[url.path]
            self.send_response(200)
            self.send_header('Content-Type',mime+'; charset=utf-8')
            self.send_header('X-Content-Type-Options','nosniff')
            self.end_headers()
            self.wfile.write((ROOT/name).read_bytes())
            return
        if not url.path.startswith('/api/'): return self.answer({'error':'页面不存在'},404)
        try:
            if post:
                require(self.headers.get('Content-Type','').split(';')[0]=='application/json','请求格式无效')
                if self.headers.get('Origin'):
                    require(urlsplit(self.headers['Origin']).netloc==self.headers.get('Host'),'请求来源无效')
            n=int(self.headers.get('Content-Length',0))
            require(0<=n<=3_000_000,'请求过大')
            d=json.loads(self.rfile.read(n)) if n else {}
            require(isinstance(d,dict),'请求格式无效')
            with cx() as c:
                if post: c.execute('BEGIN IMMEDIATE')
                result,cookie=self.api(c,url.path[5:],post,d,parse_qs(url.query))
            self.answer(result,cookie=cookie)
        except (ValueError,TypeError,KeyError,sqlite3.IntegrityError) as e:
            self.answer({'error':str(e) if not isinstance(e,sqlite3.Error) else '记录冲突'},400)
    def api(self,c,a,post,d,q):
        secure='; Secure' if os.getenv('LAB_SECURE_COOKIE')=='1' else ''
        cookie='; HttpOnly; SameSite=Strict; Path=/'+secure
        token=next((x.strip()[4:] for x in self.headers.get('Cookie','').split(';') if x.strip().startswith('sid=')),'')
        if post and a in ('register','login'):
            name=str(d.get('name','')).strip()
            pw=str(d.get('password',''))
            require(1<=len(name)<=40 and 8<=len(pw)<=128,'请输入用户名及 8–128 位密码')
            u=one(c,'SELECT * FROM users WHERE name=?',name)
            if a=='register':
                require(name.casefold()!=ADMIN_LOGIN,'admin 是预留的管理员登录名')
                require(not u,'用户名已存在')
                teacher=int(bool(d.get('teacher')))
                if teacher:
                    key=os.getenv('LAB_TEACHER_KEY','')
                    require(key and hmac.compare_digest(key,str(d.get('key',''))),'教师邀请码无效')
                salt=secrets.token_hex(16)
                uid=c.execute('INSERT INTO users(name,pw,teacher) VALUES(?,?,?)',(name,salt+':'+password(pw,salt),teacher)).lastrowid
            else:
                require(u,'账号或密码错误')
                salt,digest=u['pw'].split(':')
                require(hmac.compare_digest(password(pw,salt),digest),'账号或密码错误')
                uid=u['id']
            t=secrets.token_urlsafe(32)
            c.execute('INSERT INTO sessions VALUES(?,?,?)',(t,uid,int(time.time())+604800))
            return {},'sid='+t+cookie+'; Max-Age=604800'
        u=one(c,'SELECT users.id,name,teacher,admin FROM users JOIN sessions ON uid=users.id WHERE token=? AND expires>?',token,int(time.time()))
        if not u and a=='state' and not post: return {'user':None},None
        require(u,'请先登录')
        uid=u['id']
        teacher=u['teacher']
        admin=u['admin']
        if post and a=='logout':
            c.execute('DELETE FROM sessions WHERE token=?',(token,))
            return {},'sid='+cookie+'; Max-Age=0'
        require(not (post and admin),'管理员工作台仅供查看')
        if post and a=='project':
            require(teacher)
            title=str(d['title']).strip()
            require(title,'请输入项目名称')
            c.execute('INSERT INTO projects(title,body,teacher) VALUES(?,?,?)',(title,str(d.get('body','')),uid))
            return {},None
        if post and a in ('create','join'):
            require(not teacher)
            r=int(d['role'])
            require(0<=r<5,'请选择角色')
            if a=='create':
                p=int(d['pid'])
                require(one(c,'SELECT id FROM projects WHERE id=?',p),'项目不存在')
                name=str(d['name']).strip()
                require(name,'请输入小组名称')
                tid=c.execute('INSERT INTO teams(pid,name,code) VALUES(?,?,?)',(p,name,secrets.token_hex(4))).lastrowid
            else:
                t=one(c,'SELECT * FROM teams WHERE code=? AND archived=0',str(d['code']).strip().lower())
                require(t,'小组邀请码无效')
                tid=t['id']
            require(not one(c,'SELECT 1 FROM members WHERE tid=? AND role=?',tid,r),'该岗位已有人担任')
            c.execute('INSERT INTO members VALUES(?,?,?)',(tid,uid,r))
            event(c,tid,uid,'加入小组 · '+ROLES[r])
            return {'tid':tid},None
        tid=int((d.get('tid') if post else q.get('tid',[0])[0]) or 0)
        scope='p.teacher=?' if teacher else 'EXISTS(SELECT 1 FROM members m WHERE m.tid=t.id AND m.uid=?)'
        if admin:
            teams=rows(c, """SELECT t.id,t.name,t.stage,t.archived,p.title,p.body,
                (SELECT COUNT(*) FROM members WHERE tid=t.id) AS member_count,
                (SELECT COUNT(*) FROM records WHERE tid=t.id AND kind='task') AS task_count,
                (SELECT COUNT(*) FROM records WHERE tid=t.id AND kind='task' AND status='已完成') AS completed_tasks,
                (SELECT COUNT(*) FROM records WHERE tid=t.id AND kind='artifact') AS artifact_count
                FROM teams t JOIN projects p ON t.pid=p.id ORDER BY t.id DESC""")
        else:
            teams=rows(c,'SELECT t.*,p.title,p.body FROM teams t JOIN projects p ON t.pid=p.id WHERE '+scope+' ORDER BY t.id DESC',uid)
        if not tid and teams and not admin: tid=teams[0]['id']
        team=next((t for t in teams if t['id']==tid),None)
        if not post and a=='state':
            out={'user':dict(u),'projects':rows(c,'SELECT id,title,body FROM projects WHERE teacher=?',uid) if teacher else rows(c,'SELECT id,title,body FROM projects'),'teams':teams,'team':team}
            if admin: out['user']['name']=ADMIN_NAME
            if team:
                out['members']=rows(c,'SELECT u.id,u.name,m.role FROM members m JOIN users u ON u.id=m.uid WHERE tid=? ORDER BY role',tid)
                out['records']=rows(c,'SELECT * FROM records WHERE tid=? ORDER BY id DESC',tid)
                out['events']=rows(c,'SELECT e.*,u.name FROM events e JOIN users u ON u.id=e.uid WHERE tid=? ORDER BY e.id DESC',tid)
                out['messages']=[] if admin else rows(c,'SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.uid WHERE tid=? AND (to_uid IS NULL OR to_uid=? OR uid=?) ORDER BY m.id',tid,uid,uid)
            return out,None
        require(post and team)
        if a=='archive':
            require(teacher)
            c.execute('UPDATE teams SET archived=1-archived WHERE id=?',(tid,))
            event(c,tid,uid,'更新小组归档状态')
            return {},None
        require(not team['archived'],'小组已归档')
        member=one(c,'SELECT role FROM members WHERE tid=? AND uid=?',tid,uid)
        r=member['role'] if member else -1
        if a=='message':
            to=int(d['to']) if d.get('to') else None
            require(to is None or (not teacher and one(c,'SELECT 1 FROM members WHERE tid=? AND uid=?',tid,to)))
            body=str(d.get('body','')).strip()
            f=d.get('file')
            require(body or f,'请输入消息或选择附件')
            if f:
                require(isinstance(f,dict) and isinstance(f.get('name'),str),'文件无效')
                payload=base64.b64decode(f['data'],validate=True)
                require(len(payload)<=1_500_000,'文件过大')
            c.execute('INSERT INTO messages(tid,uid,to_uid,body,file) VALUES(?,?,?,?,?)',(tid,uid,to,body,json.dumps(f) if f else None))
            return {},None
        if a=='record':
            k=d['kind']; module=str(d.get('module','')); title=str(d['title']).strip(); body=str(d.get('body',''))
            ex=d.get('extra',{})
            require(k in KINDS and title and isinstance(ex,dict),'请完善记录')
            valid={'artifact':r>=0 and module in MODULES[r],'task':r in (0,3),'milestone':r==0,'change':r==1,'defect':r==4,'case':r==4,'evaluation':teacher,'version':r==3}
            require(valid[k])
            for tag in ('link','parent'):
                if ex.get(tag): require(one(c,'SELECT 1 FROM records WHERE tid=? AND id=?',tid,int(ex[tag])),'关联记录不存在')
            if ex.get('assignee'): require(one(c,'SELECT 1 FROM members WHERE tid=? AND uid=?',tid,int(ex['assignee'])),'负责人不在小组内')
            if k in ('task','milestone'):
                from datetime import date
                start=date.fromisoformat(ex['start']) if ex.get('start') else None
                due=date.fromisoformat(ex['due']) if ex.get('due') else None
                require(not (start and due) or start<=due,'任务日期无效')
            if ex.get('nodes') or ex.get('edges'):
                nodes,edges=ex.get('nodes',[]),ex.get('edges',[])
                require(isinstance(nodes,list) and isinstance(edges,list) and len(nodes)<=200 and len(edges)<=400,'图形数据无效')
                require(all(isinstance(n,dict) and isinstance(n.get('label'),str) and type(n.get('x')) is int and type(n.get('y')) is int and 0<=n['x']<=490 and 0<=n['y']<=215 for n in nodes),'图形组件无效')
                require(all(isinstance(e,list) and len(e)==2 and all(type(i) is int and 0<=i<len(nodes) for i in e) for e in edges),'图形连接无效')
            if k=='evaluation':
                require(ex.get('assignee'),'请选择评价对象')
                require(all(0<=float(ex.get(x,-1))<=100 for x in ('duty','quality','standard','teamwork')),'分数须为 0–100')
            status={'artifact':'待评审','task':'待处理','milestone':'待处理','change':'待审批','defect':'待修复','case':'未执行','evaluation':'已评价','version':'待评审'}[k]
            rid=c.execute('INSERT INTO records(tid,uid,kind,module,title,body,status,extra) VALUES(?,?,?,?,?,?,?,?)',(tid,uid,k,module,title,body,status,json.dumps(ex,ensure_ascii=False))).lastrowid
            event(c,tid,uid,'创建 #'+str(rid)+' · '+title)
        elif a=='update':
            old=one(c,'SELECT * FROM records WHERE tid=? AND id=?',tid,int(d['id']))
            require(old)
            k,s=old['kind'],old['status']
            ex=json.loads(old['extra'])
            actions={
                'artifact':{'待评审':{'通过':r==0,'退回修改':r==0}},
                'version':{'待评审':{'通过':r in (0,3) and uid!=old['uid'],'退回修改':r in (0,3) and uid!=old['uid']}},
                'task':{'待处理':{'进行中':r==0 or (r==3 and not ex.get('assignee')) or str(uid)==str(ex.get('assignee'))},'进行中':{'已完成':r==0 or str(uid)==str(ex.get('assignee'))}},
                'milestone':{'待处理':{'已完成':r==0}},
                'change':{'待审批':{'已批准':r==0,'已驳回':r==0}},
                'defect':{'待修复':{'待回归':r==3},'待回归':{'已关闭':r==4,'待修复':r==4}},
                'case':{x:{'通过':r==4,'失败':r==4} for x in ('未执行','通过','失败')}
            }
            new=d['status']
            require(actions.get(k,{}).get(s,{}).get(new),'当前角色或状态不允许该操作')
            if k=='task' and new=='进行中' and not ex.get('assignee'): ex['assignee']=uid
            note=str(d.get('note','')).strip()
            c.execute('UPDATE records SET status=?,extra=? WHERE id=?',(new,json.dumps(ex,ensure_ascii=False),old['id']))
            event(c,tid,uid,f"#{old['id']} {old['title']} · {s} → {new}"+(' · '+note if note else ''))
        elif a=='advance':
            stage=team['stage']
            require(r==0 and stage<6)
            module=MODULES[OWNERS[stage]][[0,1,0,1,1,2][stage]]
            require(one(c,"SELECT 1 FROM records WHERE tid=? AND module=? AND kind='artifact' AND status='通过'",tid,module),'请先完成本阶段交付物评审：'+module)
            if stage>=4: require(not one(c,"SELECT 1 FROM records WHERE tid=? AND kind='defect' AND status!='已关闭'",tid),'请先完成缺陷修复及回归测试')
            c.execute('UPDATE teams SET stage=stage+1 WHERE id=?',(tid,))
            event(c,tid,uid,'完成阶段 · '+STAGES[stage])
        elif a=='ai':
            require(r>=0)
            prompt=str(d.get('prompt','')).strip()
            require(prompt,'请输入问题')
            key=os.getenv('LAB_AI_KEY')
            if key:
                import urllib.request
                text='你是软件工程课程的'+ROLES[r]+'助教。根据学生的问题提供提问、检查点和局部示例，引导学生完成，不输出完整代做成果。'
                req=urllib.request.Request(os.getenv('LAB_AI_URL','https://api.openai.com/v1/chat/completions'),data=json.dumps({'model':os.getenv('LAB_AI_MODEL','gpt-4.1-mini'),'messages':[{'role':'system','content':text},{'role':'user','content':prompt[:12000]}]}).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
                c.rollback()
                try:
                    with urllib.request.urlopen(req,timeout=25) as response:
                        return {'reply':json.load(response)['choices'][0]['message']['content']},None
                except Exception: raise ValueError('模型服务暂不可用，请检查服务配置')
            templates=[
                '目标用户是谁？列出核心场景与优先级，为每个里程碑定义可验证的验收标准。',
                '能否区分需求、设计约束和假设？检查每条需求是否可测试、是否有唯一编号及来源。',
                '检查模块职责、模块间的依赖和接口契约。选一个关键场景，核对正常及异常路径。',
                '从前置条件、异常处理和边界输入入手审查实现。为一个最小功能写出可独立重复的测试。',
                '检查正常、非法和临界输入是否均有覆盖。每个用例应包含前置条件、输入和预期结果。']
            return {'reply':'岗位检查清单（模型未配置）\n'+templates[r]},None
        else: raise ValueError('操作不存在')
        return {},None
if __name__=='__main__':
    initialize_admin()
    host=os.getenv('LAB_HOST','0.0.0.0')
    port=int(os.getenv('PORT','8080'))
    with ThreadingHTTPServer((host,port),Handler) as server:
        local_host='127.0.0.1' if host=='0.0.0.0' else host
        print(f'西安交通大学软小智课程平台已启动，请在浏览器访问 http://{local_host}:{server.server_port}',flush=True)
        server.serve_forever()
