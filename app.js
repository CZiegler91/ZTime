const $ = (selector) => document.querySelector(selector);
// Workout tracker data and saved progress
const starter = [
  {day:'Leg Day',exercise:'Leg press',sets:4,reps:10,weight:180},
  {day:'Chest Day',exercise:'Bench press',sets:3,reps:8,weight:135},
  {day:'Core / Abs',exercise:'Plank',sets:3,reps:1,weight:0}
];
let workouts = JSON.parse(localStorage.getItem('ztime-workouts') || 'null') || starter;
let goal = Number(localStorage.getItem('ztime-goal') || 5);

function renderWorkouts(){
  const list = $('#workoutList');
  const n = workouts.length;
  if(list){
    list.innerHTML = '';
    workouts.forEach((w,i)=>{
      const li=document.createElement('li');
      const info=document.createElement('div');
      const title=document.createElement('p');
      const meta=document.createElement('small');
      const remove=document.createElement('button');
      title.textContent=w.exercise;
      meta.textContent=`${w.day} · ${w.sets} sets × ${w.reps} reps${w.weight?` · ${w.weight} lb`:''}`;
      remove.textContent='Remove';
      remove.type='button';
      remove.setAttribute('aria-label',`Remove ${w.exercise}`);
      remove.onclick=()=>{workouts.splice(i,1);saveWorkouts();};
      info.append(title,meta);li.append(info,remove);list.append(li);
    });
  }
  if($('#workoutCount')) $('#workoutCount').textContent=`${n} ${n===1?'entry':'entries'}`;
  if($('#heroSessions')) $('#heroSessions').textContent=n;
  if($('#sessionStat')) $('#sessionStat').textContent=`${n} / ${goal}`;
  if($('#sessionBar')) $('#sessionBar').style.width=Math.min(n/goal*100,100)+'%';
  const left=Math.max(goal-n,0);
  if($('#goalText')) $('#goalText').textContent=left?`${left} more ${left===1?'session':'sessions'} will reach your goal.`:'Weekly goal reached. Keep going!';
  const volume=workouts.reduce((sum,w)=>sum+w.sets*w.reps*w.weight,0);
  if($('#volumeStat')) $('#volumeStat').textContent=volume.toLocaleString()+' lb';
}
function saveWorkouts(){localStorage.setItem('ztime-workouts',JSON.stringify(workouts));renderWorkouts();}

const workoutForm=$('#workoutForm');
if(workoutForm){
  workoutForm.addEventListener('submit',e=>{
    e.preventDefault();
    workouts.unshift({day:$('#day').value,exercise:$('#exercise').value.trim(),sets:Number($('#sets').value),reps:Number($('#reps').value),weight:Number($('#weight').value)});
    saveWorkouts();e.target.reset();$('#sets').value=3;$('#reps').value=10;$('#weight').value=0;$('#workoutMessage').textContent='Workout added to your progress.';
  });
}

// Demo music player controls
const tracks=[['Intensity Boost','Thrash Squad'],['Blood Rush','Gym Fuel Mix'],['Deep Focus Beats','Study Mode']];
let current=0,playing=false,timer;
function setTrack(n){
  if(!$('#trackTitle')) return;
  current=(n+tracks.length)%tracks.length;
  $('#trackTitle').textContent=tracks[current][0];
  $('#trackArtist').textContent=tracks[current][1];
  document.querySelectorAll('[data-track]').forEach((b,i)=>b.classList.toggle('active',i===current));
  if($('#trackBar')) $('#trackBar').style.width='20%';
}
function togglePlay(){
  const play=$('#play'); if(!play) return;
  playing=!playing;play.textContent=playing?'❚❚':'▶';play.setAttribute('aria-label',(playing?'Pause ':'Play ')+tracks[current][0]);clearInterval(timer);
  if(playing){let x=20;timer=setInterval(()=>{if($('#trackBar')) $('#trackBar').style.width=(x=x>=100?0:x+1)+'%';},350);}
}
if($('#play')) $('#play').onclick=togglePlay;
if($('#next')) $('#next').onclick=()=>setTrack(current+1);
if($('#previous')) $('#previous').onclick=()=>setTrack(current-1);
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>setTrack(Number(b.dataset.track)));

// Profile dialog and saved weekly goal
const dialog=$('#profileDialog');
const profileButton=$('#profileButton');
if(dialog && profileButton){
  profileButton.onclick=()=>dialog.showModal();
  const close=$('.close'); if(close) close.onclick=()=>dialog.close();
  const profileForm=$('#profileForm');
  if(profileForm) profileForm.addEventListener('submit',e=>{e.preventDefault();const name=$('#name').value.trim();goal=Number($('#goal').value);localStorage.setItem('ztime-name',name);localStorage.setItem('ztime-goal',goal);profileButton.textContent=name;renderWorkouts();dialog.close();});
  const savedName=localStorage.getItem('ztime-name');if(savedName) profileButton.textContent=savedName;
}

// Community discussion form
const postForm=$('#postForm');
if(postForm){
  postForm.addEventListener('submit',e=>{e.preventDefault();const article=document.createElement('article'),avatar=document.createElement('b'),content=document.createElement('div'),topic=document.createElement('small'),title=document.createElement('h3'),text=document.createElement('p');avatar.textContent='YOU';topic.textContent=$('#topic').value.toUpperCase();title.textContent=$('#postTitle').value.trim();text.textContent=$('#postBody').value.trim();content.append(topic,title,text);article.append(avatar,content);$('#posts').prepend(article);e.target.reset();$('#postMessage').textContent='Your discussion was posted in this demo.';});
}

setTrack(0);
renderWorkouts();
