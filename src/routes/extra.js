'use strict';
const express=require('express'),bcrypt=require('bcryptjs'),db=require('../config/db');
const router=express.Router();
const run=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const only=(role,req,res)=>{if(req.session.user.role!==role){res.sendStatus(403);return false}return true};
const isAdmin=(req,res)=>only('Admin',req,res);
router.get('/profile',(req,res)=>res.render('extra/profile',{title:'Profile & Password',activePage:'profile',error:null,success:req.query.saved}));
router.post('/profile/password',run(async(req,res)=>{
 const {old_password,new_password}=req.body;
 const fail=msg=>res.status(400).render('extra/profile',{title:'Profile & Password',activePage:'profile',error:msg,success:null});
 if(!new_password||new_password.length<12)return fail('New password must contain at least 12 characters');
 const [u]=await db.query('SELECT password_hash FROM app_user WHERE user_id=?',[req.session.user.id]);
 if(!u||!await bcrypt.compare(String(old_password||''),u.password_hash))return fail('Current password is incorrect');
 await db.query('UPDATE app_user SET password_hash=? WHERE user_id=?',[await bcrypt.hash(new_password,12),req.session.user.id]);
 res.redirect('/profile?saved=1');
}));
router.get('/users',run(async(req,res)=>{if(!isAdmin(req,res))return;
 const [users,coaches,parents]=await Promise.all([
 db.query('SELECT user_id,username,role,coach_id,parent_id,created_at FROM app_user ORDER BY user_id'),
 db.query("SELECT coach_id id,CONCAT(first_name,' ',last_name) label FROM coach ORDER BY first_name"),
 db.query("SELECT parent_id id,CONCAT(first_name,' ',last_name) label FROM parent ORDER BY first_name")]);
 res.render('extra/users',{title:'User Accounts',activePage:'users',users,coaches,parents,error:req.query.error,success:req.query.saved});
}));
router.post('/users',run(async(req,res)=>{if(!isAdmin(req,res))return;
 const {username,password,role}=req.body,valid=['Admin','Coach','Parent','Management'];
 try{
 if(!String(username||'').match(/^[a-zA-Z0-9_.-]{3,80}$/))throw Error('Username must be 3-80 characters (letters, numbers, _ . -)');
 if(!valid.includes(role)||!password||password.length<12)throw Error('Choose a role and password of 12+ characters');
 const coachId=role==='Coach'?Number(req.body.coach_id):null,parentId=role==='Parent'?Number(req.body.parent_id):null;
 if(role==='Coach'&&(!Number.isInteger(coachId)||coachId<1))throw Error('Choose a coach');
 if(role==='Parent'&&(!Number.isInteger(parentId)||parentId<1))throw Error('Choose a parent');
 await db.query('INSERT INTO app_user(username,password_hash,role,coach_id,parent_id) VALUES(?,?,?,?,?)',[username,await bcrypt.hash(password,12),role,coachId,parentId]);
 res.redirect('/users?saved=1');
 }catch(e){res.redirect('/users?error='+encodeURIComponent(e.message))}
}));
router.post('/users/:id/reset',run(async(req,res)=>{if(!isAdmin(req,res))return;
 const password=String(req.body.password||'');if(password.length<12)return res.redirect('/users?error=Password%20must%20be%2012%2B%20characters');
 await db.query('UPDATE app_user SET password_hash=? WHERE user_id=?',[await bcrypt.hash(password,12),req.params.id]);res.redirect('/users?saved=1');
}));
router.post('/users/:id/delete',run(async(req,res)=>{if(!isAdmin(req,res))return;
 if(String(req.params.id)===String(req.session.user.id))return res.redirect('/users?error=Cannot%20delete%20your%20own%20account');
 await db.query('DELETE FROM app_user WHERE user_id=?',[req.params.id]);res.redirect('/users?saved=1');
}));
router.get('/coach/sessions',run(async(req,res)=>{if(!only('Coach',req,res))return;
 const [classes,sessions]=await Promise.all([
 db.query('SELECT class_id,class_name FROM class WHERE coach_id=?',[req.session.user.coachId]),
 db.query('SELECT s.*,c.class_name FROM training_session s JOIN class c ON c.class_id=s.class_id WHERE c.coach_id=? ORDER BY s.session_date DESC',[req.session.user.coachId])]);
 res.render('extra/coach-sessions',{title:'My Training Sessions',activePage:'sessions',classes,sessions,error:req.query.error});
}));
router.post('/coach/sessions',run(async(req,res)=>{if(!only('Coach',req,res))return;
 const {class_id,session_date,start_time,end_time,location}=req.body;
 const [allowed]=await db.query('SELECT class_id FROM class WHERE class_id=? AND coach_id=?',[class_id,req.session.user.coachId]);
 if(!allowed)return res.sendStatus(403);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(session_date||'')||!start_time||!end_time||start_time>=end_time)return res.redirect('/coach/sessions?error=Invalid%20session%20date%20or%20time');
 await db.query('INSERT INTO training_session(class_id,session_date,start_time,end_time,location) VALUES(?,?,?,?,?)',[class_id,session_date,start_time,end_time,location||null]);res.redirect('/coach/sessions');
}));
router.post('/coach/sessions/:id/update',run(async(req,res)=>{if(!only('Coach',req,res))return;
 const {session_date,start_time,end_time,location}=req.body;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(session_date||'')||!start_time||!end_time||start_time>=end_time)return res.redirect('/coach/sessions?error=Invalid%20session%20date%20or%20time');
 const r=await db.query('UPDATE training_session s JOIN class c ON c.class_id=s.class_id SET s.session_date=?,s.start_time=?,s.end_time=?,s.location=? WHERE s.session_id=? AND c.coach_id=?',[session_date,start_time,end_time,location||null,req.params.id,req.session.user.coachId]);
 if(!r.affectedRows)return res.sendStatus(403);res.redirect('/coach/sessions');
}));
router.get('/coach/recommendations',run(async(req,res)=>{if(!only('Coach',req,res))return;
 const [players,groups,rows]=await Promise.all([
 db.query("SELECT DISTINCT p.player_id,CONCAT(p.first_name,' ',p.last_name) label FROM player p JOIN registration r ON r.player_id=p.player_id AND r.status='Active' JOIN class c ON c.class_id=r.class_id WHERE c.coach_id=?",[req.session.user.coachId]),
 db.query('SELECT age_group_id,group_name FROM age_group'),
 db.query('SELECT ar.*,CONCAT(p.first_name," ",p.last_name) player_name,ag.group_name FROM age_group_recommendation ar JOIN player p ON p.player_id=ar.player_id JOIN age_group ag ON ag.age_group_id=ar.suggested_age_group_id WHERE ar.coach_id=? ORDER BY ar.created_at DESC',[req.session.user.coachId])]);
 res.render('extra/recommendations',{title:'Age Group Recommendations',activePage:'recommendations',players,groups,rows,admin:false,error:req.query.error});
}));
router.post('/coach/recommendations',run(async(req,res)=>{if(!only('Coach',req,res))return;
 const {player_id,suggested_age_group_id,reason}=req.body;
 const [allowed]=await db.query("SELECT 1 FROM registration r JOIN class c ON c.class_id=r.class_id WHERE r.player_id=? AND r.status='Active' AND c.coach_id=? LIMIT 1",[player_id,req.session.user.coachId]);
 if(!allowed)return res.sendStatus(403);
 if(!String(reason||'').trim()||String(reason).length>500)return res.redirect('/coach/recommendations?error=Provide%20a%20reason%20under%20500%20characters');
 await db.query('INSERT INTO age_group_recommendation(player_id,coach_id,suggested_age_group_id,reason) VALUES(?,?,?,?)',[player_id,req.session.user.coachId,suggested_age_group_id,reason]);res.redirect('/coach/recommendations');
}));
router.get('/recommendations',run(async(req,res)=>{if(!isAdmin(req,res))return;
 const rows=await db.query('SELECT ar.*,CONCAT(p.first_name," ",p.last_name) player_name,ag.group_name,CONCAT(c.first_name," ",c.last_name) coach_name FROM age_group_recommendation ar JOIN player p ON p.player_id=ar.player_id JOIN age_group ag ON ag.age_group_id=ar.suggested_age_group_id JOIN coach c ON c.coach_id=ar.coach_id ORDER BY ar.created_at DESC');
 res.render('extra/recommendations',{title:'Review Age Group Recommendations',activePage:'recommendations',rows,admin:true,error:req.query.error});
}));
router.post('/recommendations/:id/review',run(async(req,res)=>{if(!isAdmin(req,res))return;
 const decision=req.body.decision;if(!['Approved','Rejected'].includes(decision))return res.sendStatus(400);
 try{await db.withTransaction(async conn=>{
 const [[rec]]=await conn.execute('SELECT * FROM age_group_recommendation WHERE recommendation_id=? FOR UPDATE',[req.params.id]);
 if(!rec||rec.status!=='Pending')throw Error('Recommendation is not pending');
 if(decision==='Approved'){
  const [[player]]=await conn.execute('SELECT age_group_id,date_of_birth FROM player WHERE player_id=? FOR UPDATE',[rec.player_id]);
  const [[group]]=await conn.execute('SELECT min_age,max_age FROM age_group WHERE age_group_id=?',[rec.suggested_age_group_id]);
  const now=new Date(),dob=new Date(player.date_of_birth+'T00:00:00');let age=now.getFullYear()-dob.getFullYear();if(now.getMonth()<dob.getMonth()||(now.getMonth()===dob.getMonth()&&now.getDate()<dob.getDate()))age--;
  if(age<group.min_age||age>group.max_age)throw Error('Player is not eligible for the proposed age group');
  const [[conflict]]=await conn.execute("SELECT COUNT(*) n FROM registration r JOIN class c ON c.class_id=r.class_id WHERE r.player_id=? AND r.status IN ('Active','Pending') AND c.age_group_id<>?",[rec.player_id,rec.suggested_age_group_id]);
  if(conflict.n)throw Error('Cancel or complete incompatible registrations before approving');
  await conn.execute('UPDATE player SET age_group_id=? WHERE player_id=?',[rec.suggested_age_group_id,rec.player_id]);
  await conn.execute('UPDATE player_age_group_history SET end_date=CURDATE() WHERE player_id=? AND end_date>=CURDATE()',[rec.player_id]);
  await conn.execute('INSERT INTO player_age_group_history(player_id,age_group_id,start_date,end_date) VALUES(?,?,CURDATE(),DATE_ADD(CURDATE(),INTERVAL 1 YEAR))',[rec.player_id,rec.suggested_age_group_id]);
 }
 await conn.execute('UPDATE age_group_recommendation SET status=?,reviewed_at=NOW(),reviewed_by=? WHERE recommendation_id=?',[decision,req.session.user.id,req.params.id]);
 });res.redirect('/recommendations');}catch(e){res.redirect('/recommendations?error='+encodeURIComponent(e.message))}
}));
module.exports=router;
