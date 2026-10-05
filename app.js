const $ = (selector) => document.querySelector(selector);
// Module 5 robustness: memory fallback when browser storage is unavailable.
const temporaryStorage = new Map();
const storage = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return temporaryStorage.get(key) ?? null; } },
  setItem(key, value) { try { localStorage.setItem(key, value); } catch { temporaryStorage.set(key, value); } },
  removeItem(key) { try { localStorage.removeItem(key); } catch { temporaryStorage.delete(key); } }
};
function readArray(key, fallback) { try { const data=JSON.parse(storage.getItem(key)); return Array.isArray(data) ? data : fallback; } catch { return fallback; } }

// ------------------------------
// ZTime demo profile system
// Profiles are stored only in this browser with storage.
// This is a course-demo profile system, not secure authentication.
// ------------------------------
const PROFILE_KEY = 'ztime-profiles';
const ACTIVE_PROFILE_KEY = 'ztime-active-profile';

function getProfiles() {
  try {
    return readArray(PROFILE_KEY, []).filter(p => p && typeof p.id === 'string' && typeof p.name === 'string');
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  storage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

function getActiveProfile() {
  const activeId = storage.getItem(ACTIVE_PROFILE_KEY);
  return getProfiles().find(profile => profile.id === activeId) || null;
}

function setActiveProfile(profileId) {
  if (profileId) {
    storage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } else {
    storage.removeItem(ACTIVE_PROFILE_KEY);
  }
  loadProfileData();
  renderProfileControls();
  renderWorkouts();
  // Module 5: refresh weekly progress immediately after switching profiles.
  renderWeeklyTracker();
}

function profileStorageKey(type) {
  const profile = getActiveProfile();
  return `ztime-${type}-${profile ? profile.id : 'guest'}`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'ZT';
}

// Create the login/switch dialog once so every page can use it.
function ensureProfileDialog() {
  if ($('#profileManagerDialog')) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'profileManagerDialog';
  dialog.className = 'profileDialog';
  dialog.setAttribute('aria-labelledby', 'profileDialogTitle');
  dialog.innerHTML = `
    <div class="profileDialogInner">
      <button class="profileDialogClose" type="button" aria-label="Close profile window">×</button>

      <p class="eyebrow">ZTIME PROFILES</p>
      <h2 id="profileDialogTitle">Log in or switch profiles</h2>
      <p class="profileNote">
        Demo profiles are saved only in this browser. No passwords or real
        authentication are used for this course project.
      </p>

      <section class="savedProfilesSection">
        <h3>Saved Profiles</h3>
        <div id="savedProfiles"></div>
      </section>

      <div class="profileDivider"><span>OR</span></div>

      <form id="createProfileForm" class="createProfileForm">
        <h3>Create a New Profile</h3>
        <label>
          Name
          <input id="newProfileName" maxlength="40" required placeholder="Example: Chris Ziegler">
        </label>
        <label>
          Weekly workout goal
          <input id="newProfileGoal" type="number" min="1" max="14" value="5" required>
        </label>
        <button class="primary" type="submit">Create &amp; Log In</button>
        <p id="profileMessage" role="status"></p>
      </form>
    </div>
  `;
  document.body.appendChild(dialog);

  $('.profileDialogClose').addEventListener('click', () => dialog.close());

  $('#createProfileForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#newProfileName').value.trim();
    const weeklyGoal = Number($('#newProfileGoal').value);

    if (!name) return;

    const profiles = getProfiles();
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const profile = { id, name, goal: weeklyGoal };
    profiles.push(profile);
    saveProfiles(profiles);

    // Start each new profile with its own workout history.
    storage.setItem(`ztime-workouts-${id}`, JSON.stringify(starter));
    setActiveProfile(id);

    $('#profileMessage').textContent = `${name} is now logged in.`;
    dialog.close();
    event.target.reset();
    $('#newProfileGoal').value = 5;
  });
}

function populateSavedProfiles() {
  const container = $('#savedProfiles');
  if (!container) return;

  const profiles = getProfiles();
  const active = getActiveProfile();
  container.innerHTML = '';

  if (!profiles.length) {
    const empty = document.createElement('p');
    empty.className = 'emptyProfiles';
    empty.textContent = 'No saved profiles yet. Create your first profile below.';
    container.appendChild(empty);
    return;
  }

  profiles.forEach(profile => {
    const row = document.createElement('div');
    row.className = 'savedProfileRow';

    const identity = document.createElement('div');
    identity.className = 'savedProfileIdentity';

    const avatar = document.createElement('span');
    avatar.className = 'profileAvatar';
    avatar.textContent = initials(profile.name);

    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = profile.name;
    const goalText = document.createElement('small');
    goalText.textContent = `${profile.goal} workout${profile.goal === 1 ? '' : 's'} per week`;
    info.append(name, goalText);
    identity.append(avatar, info);

    const login = document.createElement('button');
    login.type = 'button';
    login.className = 'profileLoginButton';
    login.textContent = active && active.id === profile.id ? 'Current' : 'Log In';
    login.disabled = Boolean(active && active.id === profile.id);
    login.addEventListener('click', () => {
      setActiveProfile(profile.id);
      $('#profileManagerDialog').close();
    });

    row.append(identity, login);
    container.appendChild(row);
  });
}

function openProfileManager() {
  ensureProfileDialog();
  populateSavedProfiles();
  $('#profileManagerDialog').showModal();
}

function renderProfileControls() {
  const controls = $('#profileControls');
  if (!controls) return;

  controls.innerHTML = '';
  const profile = getActiveProfile();

  if (!profile) {
    const login = document.createElement('button');
    login.type = 'button';
    login.className = 'loginButton';
    login.textContent = 'Log In';
    login.addEventListener('click', openProfileManager);
    controls.appendChild(login);
    return;
  }

  const identity = document.createElement('button');
  identity.type = 'button';
  identity.className = 'activeProfileButton';
  identity.title = 'Switch profiles';
  // Treat profile names as text, including names containing HTML characters.
  const avatar = document.createElement('span');
  avatar.className = 'profileAvatar';
  avatar.textContent = initials(profile.name);
  const name = document.createElement('span');
  name.className = 'profileName';
  name.textContent = profile.name;
  identity.append(avatar, name);
  identity.addEventListener('click', openProfileManager);

  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'logoutButton';
  logout.textContent = 'Log Out';
  logout.addEventListener('click', () => setActiveProfile(null));

  controls.append(identity, logout);
}

// ------------------------------
// Workout tracker data and saved progress
// Each profile gets its own workout list and weekly goal.
// ------------------------------
const starter = [
  {day:'Leg Day',exercise:'Leg press',sets:4,reps:10,weight:180},
  {day:'Chest Day',exercise:'Bench press',sets:3,reps:8,weight:135},
  {day:'Core / Abs',exercise:'Plank',sets:3,reps:1,weight:0}
];

let workouts = [];
let goal = 5;

function loadProfileData() {
  const profile = getActiveProfile();
  goal = profile ? Number(profile.goal || 5) : 5;

  const stored = storage.getItem(profileStorageKey('workouts'));
  workouts = readArray(profileStorageKey('workouts'), [...starter]).filter(w => w && typeof w.exercise === 'string' && [w.sets, w.reps, w.weight].every(Number.isFinite));
}

function renderWorkouts() {
  const list = $('#workoutList');
  const n = workouts.length;

  if (list) {
    list.innerHTML = '';
    workouts.forEach((workout, index) => {
      const li = document.createElement('li');
      const info = document.createElement('div');
      const title = document.createElement('p');
      const meta = document.createElement('small');
      const remove = document.createElement('button');

      title.textContent = workout.exercise;
      meta.textContent = `${workout.day} · ${workout.sets} sets × ${workout.reps} reps${workout.weight ? ` · ${workout.weight} lb` : ''}`;
      remove.textContent = 'Remove';
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${workout.exercise}`);
      remove.onclick = () => {
        workouts.splice(index, 1);
        saveWorkouts();
      };

      info.append(title, meta);
      li.append(info, remove);
      list.append(li);
    });
  }

  if ($('#workoutCount')) $('#workoutCount').textContent = `${n} ${n === 1 ? 'entry' : 'entries'}`;
  if ($('#heroSessions')) $('#heroSessions').textContent = n;
  if ($('#sessionStat')) $('#sessionStat').textContent = n;
  if ($('#sessionBar')) $('#sessionBar').style.width = Math.min(n / goal * 100, 100) + '%';

  const left = Math.max(goal - n, 0);
  if ($('#goalText')) {
    $('#goalText').textContent = left
      ? `${left} more ${left === 1 ? 'session' : 'sessions'} will reach your goal.`
      : 'Weekly goal reached. Keep going!';
  }

  const volume = workouts.reduce((sum, workout) => sum + workout.sets * workout.reps * workout.weight, 0);
  if ($('#volumeStat')) $('#volumeStat').textContent = volume.toLocaleString() + ' lb';
}

function saveWorkouts() {
  storage.setItem(profileStorageKey('workouts'), JSON.stringify(workouts));
  renderWorkouts();
}

const workoutForm = $('#workoutForm');
if (workoutForm) {
  workoutForm.addEventListener('submit', event => {
    event.preventDefault();

    workouts.unshift({
      day: $('#day').value,
      exercise: $('#exercise').value.trim(),
      sets: Number($('#sets').value),
      reps: Number($('#reps').value),
      weight: Number($('#weight').value)
    });

    saveWorkouts();
    event.target.reset();
    $('#sets').value = 3;
    $('#reps').value = 10;
    $('#weight').value = 0;

    const profile = getActiveProfile();
    $('#workoutMessage').textContent = profile
      ? `Workout added to ${profile.name}'s progress.`
      : 'Workout added to the guest profile. Log in to keep separate profile progress.';
  });
}

// ------------------------------
// Demo music player controls
// ------------------------------
const tracks = [
  ['Intensity Boost', 'Thrash Squad'],
  ['Blood Rush', 'Gym Fuel Mix'],
  ['Deep Focus Beats', 'Study Mode']
];
let current = 0;
let playing = false;
let timer;

function setTrack(number) {
  if (!$('#trackTitle')) return;
  current = (number + tracks.length) % tracks.length;
  $('#trackTitle').textContent = tracks[current][0];
  $('#trackArtist').textContent = tracks[current][1];
  document.querySelectorAll('[data-track]').forEach((button, index) => {
    button.classList.toggle('active', index === current);
  });
  if ($('#trackBar')) $('#trackBar').style.width = '20%';
}

function togglePlay() {
  const play = $('#play');
  if (!play) return;

  playing = !playing;
  play.textContent = playing ? '❚❚' : '▶';
  play.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + tracks[current][0]);

  clearInterval(timer);
  if (playing) {
    let progress = 20;
    timer = setInterval(() => {
      if ($('#trackBar')) {
        progress = progress >= 100 ? 0 : progress + 1;
        $('#trackBar').style.width = progress + '%';
      }
    }, 350);
  }
}

if ($('#play')) $('#play').onclick = togglePlay;
if ($('#next')) $('#next').onclick = () => setTrack(current + 1);
if ($('#previous')) $('#previous').onclick = () => setTrack(current - 1);
document.querySelectorAll('[data-track]').forEach(button => {
  button.onclick = () => setTrack(Number(button.dataset.track));
});

// ------------------------------
// Community discussion demo
// ------------------------------
const postForm = $('#postForm');
if (postForm) {
  postForm.addEventListener('submit', event => {
    event.preventDefault();

    const article = document.createElement('article');
    const avatar = document.createElement('b');
    const content = document.createElement('div');
    const topic = document.createElement('small');
    const title = document.createElement('h3');
    const text = document.createElement('p');
    const profile = getActiveProfile();

    avatar.textContent = profile ? initials(profile.name) : 'YOU';
    topic.textContent = $('#topic').value.toUpperCase();
    title.textContent = $('#postTitle').value.trim();
    text.textContent = $('#postBody').value.trim();

    content.append(topic, title, text);
    article.append(avatar, content);
    $('#posts').prepend(article);

    event.target.reset();
    $('#postMessage').textContent = profile
      ? `Posted as ${profile.name} in this demo.`
      : 'Posted as a guest in this demo.';
  });
}

// Initialize the current page.
ensureProfileDialog();
loadProfileData();
renderProfileControls();
setTrack(0);
renderWorkouts();

// Module 3 concept buttons give feedback without claiming unfinished services are live.
document.querySelectorAll('.demoAction').forEach(button=>{button.addEventListener('click',()=>{const original=button.textContent;button.textContent='Future ZTime feature';button.disabled=true;setTimeout(()=>{button.textContent=original;button.disabled=false;},1800);});});

// Module 5: initialize only when the complete timer exists on this page.
function initializeWorkoutTimer() {
  const display = $('#workoutTimerDisplay');
  const card = $('#workoutTimerCard');
  const status = $('#workoutTimerStatus');
  const start = $('#startWorkoutTimer');
  const pause = $('#pauseWorkoutTimer');
  const reset = $('#resetWorkoutTimer');
  if (!display || !card || !status || !start || !pause || !reset) return;

  let elapsed = 0;
  let startedAt = null;
  let intervalId = null;
  // Measure elapsed time rather than counting ticks, avoiding background-tab drift.
  function renderWorkoutTime() {
    const milliseconds = elapsed + (startedAt === null ? 0 : performance.now() - startedAt);
    const seconds = Math.floor(milliseconds / 1000);
    display.textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  function updateControls(running) {
    start.disabled = running;
    pause.disabled = !running;
    card.classList.toggle('isRunning', running);
  }
  function startWorkoutTimer() {
    if (startedAt !== null) return;
    startedAt = performance.now();
    intervalId = setInterval(renderWorkoutTime, 200);
    updateControls(true);
    status.textContent = 'Workout timer running.';
  }
  function pauseWorkoutTimer() {
    if (startedAt === null) return;
    elapsed += performance.now() - startedAt;
    startedAt = null;
    clearInterval(intervalId);
    renderWorkoutTime();
    updateControls(false);
    status.textContent = 'Paused at ' + display.textContent + '. Select Start to resume.';
  }
  function resetWorkoutTimer() {
    clearInterval(intervalId);
    startedAt = null;
    elapsed = 0;
    renderWorkoutTime();
    updateControls(false);
    status.textContent = 'Timer reset. Ready to start.';
  }
  start.addEventListener('click', startWorkoutTimer);
  pause.addEventListener('click', pauseWorkoutTimer);
  reset.addEventListener('click', resetWorkoutTimer);
}

// Module 5: cycle through messages so consecutive clicks never repeat.
function initializeMotivationGenerator() {
  const button = $('#motivationButton');
  const message = $('#motivationMessage');
  if (!button || !message) return;
  const messages = [
    'Small wins add up. Keep moving.',
    'Progress is built one workout at a time.',
    'Find your rhythm. Let the music fuel your movement.',
    'Your goal does not need perfection. It needs consistency.',
    'Recovery is part of progress. Make room to recharge.',
    'Show up for yourself, one step at a time.',
    'WHAT TIME IS IT?! ZTIME — LET’S GET IT!'
  ];
  let index = 0;
  button.addEventListener('click', () => {
    index = (index + 1) % messages.length;
    message.textContent = messages[index];
  });
}
initializeWorkoutTimer();
initializeMotivationGenerator();

// Module 5 enhanced: challenge selection avoids consecutive duplicate results.
function initializeChallenges() {
  const level=$('#challengeDifficulty'), button=$('#generateChallenge'), result=$('#challengeResult');
  if (!level || !button || !result) return;
  const choices={
    Easy:['Walk at a comfortable pace for 5 minutes.', 'Complete 2 rounds of 5 chair squats.', 'Complete 2 rounds of 5 wall push-ups.'],
    Moderate:['Complete 3 rounds of 10 bodyweight squats.', 'Complete 3 rounds of 8 incline push-ups.', 'Alternate 1 minute of brisk walking and 1 minute easy for 10 minutes.'],
    Hard:['Complete 4 rounds of 15 bodyweight squats.', 'Complete 4 rounds of 10 push-ups with a rest between rounds.', 'Complete 4 rounds of 30 seconds of mountain climbers, with 60 seconds rest.']
  };
  let previous='';
  button.addEventListener('click',()=>{const options=(choices[level.value] || choices.Easy).filter(item=>item!==previous); previous=options[Math.floor(Math.random()*options.length)]; result.textContent=level.value+' challenge: '+previous;});
}

// Module 5 enhanced: local calendar dates avoid UTC and daylight-saving week errors.
let weeklyReady = true;
function weekDetails() {
  const start=new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate()-((start.getDay()+6)%7));
  const end=new Date(start); end.setDate(end.getDate()+6);
  const key=start.getFullYear()+'-'+String(start.getMonth()+1).padStart(2,'0')+'-'+String(start.getDate()).padStart(2,'0');
  return {key, label:start.toLocaleDateString()+' – '+end.toLocaleDateString()};
}
function weeklyState() {
  const key=profileStorageKey('week-'+weekDetails().key);
  let saved={}; try { saved=JSON.parse(storage.getItem(key)) || {}; } catch {}
  const profile=getActiveProfile();
  return {key, goal:Number.isInteger(saved.goal) && saved.goal>=1 && saved.goal<=14 ? saved.goal : Math.min(14,Math.max(1,Number(profile?.goal)||5)), count:Number.isInteger(saved.count) && saved.count>=0 ? saved.count : 0};
}
function renderWeeklyTracker() {
  const input=$('#weeklyGoalInput'), bar=$('#weeklyProgress'), summary=$('#weeklySummary'), dates=$('#weeklyDates'), undo=$('#removeWeeklySession');
  if (!input || !bar || !summary || !dates || !undo) return;
  const state=weeklyState(); input.value=state.goal; bar.max=state.goal; bar.value=Math.min(state.count,state.goal);
  dates.textContent='Week of '+weekDetails().label;
  summary.textContent=state.count+' / '+state.goal+' sessions complete · '+Math.min(100,Math.round(state.count/state.goal*100))+'%'+(state.count>=state.goal ? ' — Goal reached!' : ' — '+(state.goal-state.count)+' to go.');
  undo.disabled=state.count===0;
}
function initializeWeeklyTracker() {
  const form=$('#weeklyGoalForm'), input=$('#weeklyGoalInput'), add=$('#addWeeklySession'), undo=$('#removeWeeklySession');
  if (!form || !input || !add || !undo || !$('#weeklyProgress') || !$('#weeklySummary') || !$('#weeklyDates')) return;
  function save(state) {storage.setItem(state.key,JSON.stringify({goal:state.goal,count:state.count})); renderWeeklyTracker();}
  form.addEventListener('submit',event=>{event.preventDefault(); const value=Number(input.value); if (!Number.isInteger(value) || value<1 || value>14) return; const state=weeklyState(); state.goal=value; save(state);});
  add.addEventListener('click',()=>{const state=weeklyState(); state.count++; save(state);});
  undo.addEventListener('click',()=>{const state=weeklyState(); state.count=Math.max(0,state.count-1); save(state);});
  window.addEventListener('focus',renderWeeklyTracker);
  renderWeeklyTracker();
}

// Module 5 enhanced: use text nodes for all changing recommendation content.
function initializePlaylistMoods() {
  const select=$('#playlistMood'), container=$('#playlistRecommendations');
  if (!select || !container) return;
  const moods={
    Lifting:['Heavy Rotation','Hard rock, metal, and bold hip-hop for strength sessions.','Warm-up: familiar rock; working sets: high-energy favorites; finish: a slower groove.'],
    Cardio:['Run the Rhythm','Upbeat pop, dance, and electronic music for a steady pace.','Warm-up: bright pop; main session: dance beats; cooldown: mellow electronic.'],
    Focus:['Find Your Zone','Instrumental hip-hop, lo-fi, and minimal electronic music.','Start: soft instrumentals; focus block: steady lo-fi; finish: ambient textures.'],
    Recovery:['Reset & Recharge','Ambient, acoustic, and relaxed soul for winding down.','Start: gentle acoustic; mobility: calm soul; finish: peaceful ambient.']
  };
  function render() {const data=moods[select.value] || moods.Lifting; container.replaceChildren(); const title=document.createElement('h3'); title.textContent=data[0]; container.append(title); data.slice(1).forEach(text=>{const p=document.createElement('p'); p.textContent=text; container.append(p);});}
  select.addEventListener('change',render); render();
}
initializeChallenges();
initializeWeeklyTracker();
initializePlaylistMoods();

// Module 5 Local Radio: keep only an allowlisted station ID in localStorage.
// iHeart and Amperwave provide official widgets; Audacy pages play in normal
// browser frames. Keep each complete provider player intact. No raw streams,
// tokens, altered referrers, proxies or browser security changes are used.
const LOCAL_STATIONS = [
  {
    "id": "wgrf",
    "embedUrl": "https://www.iheart.com/live/97-rock-5355/?embed=true&theme=dark",
    "playerKind": "iheart",
    "name": "97 Rock",
    "frequency": "96.9 FM \u00b7 WGRF",
    "genre": "Classic Rock",
    "playerUrl": "https://www.97rock.com/player/"
  },
  {
    "id": "wedg",
    "embedUrl": "https://www.iheart.com/live/1033-the-edge-5449/?embed=true&theme=dark",
    "playerKind": "iheart",
    "name": "103.3 The Edge",
    "frequency": "103.3 FM \u00b7 WEDG",
    "genre": "Alternative Rock",
    "playerUrl": "https://player.listenlive.co/22061"
  },
  {
    "id": "wyrk",
    "playerKind": "amperwave",
    "embedUrl": "https://player-minimal.amperwave.net/5000",
    "name": "106.5 WYRK",
    "frequency": "106.5 FM \u00b7 WYRK",
    "genre": "Country",
    "playerUrl": "https://wyrk.com/listen-live/"
  },
  {
    "id": "wblk",
    "playerKind": "amperwave",
    "embedUrl": "https://player-minimal.amperwave.net/4997",
    "name": "Power 93.7 WBLK",
    "frequency": "93.7 FM \u00b7 WBLK",
    "genre": "Hip-Hop / R&B",
    "playerUrl": "https://wblk.com/listen-live/"
  },
  {
    "id": "wkse",
    "embedUrl": "https://www.audacy.com/stations/kiss985",
    "playerKind": "audacy",
    "name": "KISS 98.5",
    "frequency": "98.5 FM \u00b7 WKSE",
    "genre": "Pop / Top 40",
    "playerUrl": "https://www.audacy.com/stations/kiss985"
  },
  {
    "id": "wgr",
    "embedUrl": "https://www.audacy.com/stations/wgr550",
    "playerKind": "audacy",
    "name": "WGR 550 Sports Radio",
    "frequency": "550 AM \u00b7 WGR",
    "genre": "Buffalo Sports",
    "playerUrl": "https://www.audacy.com/stations/wgr550"
  }
];

// Nationwide stations use iHeart's documented public embed, never raw audio URLs.
const SAVED_RADIO_KEY = 'ztime-saved-iheart';
function iheartStation(raw, label = '', location = '') {
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || !['www.iheart.com', 'iheart.com'].includes(url.hostname) || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/live\/(?:[a-z0-9-]+-)?([1-9][0-9]*)\/?$/i);
    if (!match) return null;
    const id = match[1];
    const canonical = 'https://www.iheart.com/live/' + id + '/';
    const fallback = url.pathname.split('/')[2].replace(/-?\d+$/, '').replace(/-/g, ' ') || 'iHeart station ' + id;
    return {id: 'iheart-' + id, name: String(label || fallback).trim().slice(0,80), frequency: String(location || 'iHeart Live Radio').trim().slice(0,80), genre: 'Live Radio', playerKind: 'iheart', playerUrl: canonical, embedUrl: canonical + '?embed=true&theme=dark'};
  } catch { return null; }
}
const NATIONAL_STATIONS = [
  iheartStation('https://www.iheart.com/live/z100-1469/', 'Z100', 'New York, NY · Hit Music'),
  iheartStation('https://www.iheart.com/live/1027-kiis-fm-los-angeles-185/', '102.7 KIIS FM', 'Los Angeles, CA · Hit Music'),
  iheartStation('https://www.iheart.com/live/1035-kiss-fm-849/', '103.5 KISS FM', 'Chicago, IL · Hit Music'),
  iheartStation('https://www.iheart.com/live/1067-lite-fm-1477/', '106.7 Lite FM', 'New York, NY · Variety')
];
function savedRadioStations() {
  try {
    const saved = JSON.parse(storage.getItem(SAVED_RADIO_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.slice(0,100).map(item => item && iheartStation(item.playerUrl,item.name,item.frequency)).filter(Boolean);
  } catch { return []; }
}
function sameRadioStation(a,b) {
  if (a.playerKind === 'iheart' && b.playerKind === 'iheart') return iheartStation(a.embedUrl)?.id === iheartStation(b.embedUrl)?.id;
  return a.id === b.id;
}
function allRadioStations() {
  const stations = [...LOCAL_STATIONS, ...NATIONAL_STATIONS];
  savedRadioStations().forEach(item => { if (!stations.some(s => sameRadioStation(s,item))) stations.push(item); });
  return stations;
}
// Build controls with textContent so stored labels are never interpreted as HTML.
function refreshRadioLibrary() {
  const select = $('#localStationSelect');
  if (select) {
    select.replaceChildren();
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Select a station'; select.appendChild(empty);
    allRadioStations().forEach(station => {const option = document.createElement('option'); option.value = station.id; option.textContent = station.name + ' — ' + station.frequency; select.appendChild(option);});
  }
  renderRadioResults();
}
function renderRadioResults() {
  const host = $('#nationalStationResults'); if (!host) return;
  const query = ($('#radioSearch')?.value || '').trim().toLowerCase();
  const stations = allRadioStations().filter(s => [s.name,s.frequency,s.genre].join(' ').toLowerCase().includes(query));
  host.replaceChildren();
  stations.forEach(station => {
    const card = document.createElement('article'); card.className = 'guideCard';
    const title = document.createElement('h3'); title.textContent = station.name;
    const detail = document.createElement('p'); detail.textContent = station.frequency;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'radioListen'; button.textContent = '▶ Listen Here';
    button.addEventListener('click', () => {chooseLocalStation(station.id); loadLocalRadio();});
    card.append(title,detail,button); host.appendChild(card);
  });
  $('#radioSearchStatus').textContent = stations.length ? stations.length + ' stations in your ZTime library.' : 'No matches in your library. Find a station on iHeart, then paste its link below.';
}
function initializeRadioLibrary() {
  refreshRadioLibrary();
  $('#radioSearch')?.addEventListener('input',renderRadioResults);
  $('#addRadioForm')?.addEventListener('submit',event => {
    event.preventDefault();
    const station = iheartStation($('#iheartStationUrl').value,$('#iheartStationLabel').value);
    const status = $('#addRadioStatus');
    if (!station) {status.textContent = 'Paste an iHeart live-station link, such as https://www.iheart.com/live/z100-1469/.'; return;}
    const existing = allRadioStations().find(s => sameRadioStation(s,station));
    const chosen = existing || station;
    if (!existing) {
      const saved = savedRadioStations();
      if (saved.length >= 100) {status.textContent = 'Your saved library has reached 100 stations.'; return;}
      saved.push(station); storage.setItem(SAVED_RADIO_KEY,JSON.stringify(saved));
    }
    refreshRadioLibrary(); chooseLocalStation(chosen.id); loadLocalRadio();
    status.textContent = chosen.name + ' added to your station choices. Press Play in the official player.';
    try {if (!existing && !JSON.parse(localStorage.getItem(SAVED_RADIO_KEY) || '[]').some(s => s.id === chosen.id)) throw Error();}
    catch {status.textContent += ' Browser storage is unavailable; this station is saved only for this page visit.';}
  });
}

const LOCAL_STATION_KEY = 'ztime-local-station';
function selectedLocalStation() {
  return allRadioStations().find(station => station.id === storage.getItem(LOCAL_STATION_KEY)) || null;
}
// Iframe loads only after a user action, preserving broadcaster controls and ads.
let loadedLocalStation = null;
let localPlayerTimeout = null;
function stopLocalRadio() {
  clearTimeout(localPlayerTimeout);
  const host = $('#localPlayerHost');
  if (host) { host.replaceChildren(); host.hidden = true; }
  loadedLocalStation = null;
  if ($('#stopLocalPlayer')) $('#stopLocalPlayer').hidden = true;
}
function renderLocalStation() {
  const name = $('#localStationName'), meta = $('#localStationMeta');
  const status = $('#localStationStatus'), link = $('#localOfficialPlayer');
  if (!name || !meta || !status || !link) return;
  const station = selectedLocalStation();
  const credit = $('#radioProviderCredit');
  if (credit) credit.hidden = station?.playerKind !== 'iheart';
  if (loadedLocalStation && loadedLocalStation !== station?.id) stopLocalRadio();
  name.textContent = station ? station.name : 'Choose your station';
  meta.textContent = station ? station.frequency + ' · ' + station.genre : 'Buffalo & Western New York';
  if (!loadedLocalStation) status.textContent = !station ? 'Choose a station to listen here.' : station.embedUrl ? 'Ready to listen here. Select Load Station Here, then press Play or Listen Live in the official player.' : 'This station uses its official listening page. On-page playback is not available for this station.';
  link.hidden = !station;
  if (station) { link.href = station.playerUrl; link.setAttribute('aria-label', 'Open ' + station.name + ' official player (opens a new tab)'); }
  else link.removeAttribute('href');
  const load = $('#loadLocalPlayer');
  if (load) load.hidden = !station?.embedUrl;
  if ($('#localStationSelect')) $('#localStationSelect').value = station?.id || '';
  document.querySelectorAll('[data-station-card]').forEach(card => {
    card.classList.toggle('stationSelected', Boolean(station && card.dataset.stationCard === station.id));
  });
}
function loadLocalRadio() {
  const station = selectedLocalStation(), host = $('#localPlayerHost');
  if (!station?.embedUrl || !host) return;
  // Avoid restarting an already-open broadcast on repeated clicks.
  if (loadedLocalStation === station.id) return;
  stopLocalRadio();
  loadedLocalStation = station.id;
  const frame = document.createElement('iframe');
  frame.title = station.name + ' official live radio player';
  frame.allow = 'autoplay';
  frame.className = 'radioFrame-' + station.playerKind;
  frame.src = station.embedUrl;
  frame.addEventListener('load', () => {
    clearTimeout(localPlayerTimeout);
    if (loadedLocalStation === station.id) $('#localStationStatus').textContent = 'Official player opened below. Press Play or Listen Live inside it. If it is blank or unavailable, use Open Official Player.';
    // A cross-origin load event does not prove audio playback or successful loading.
  });
  frame.addEventListener('error', () => {
    if (loadedLocalStation === station.id) $('#localStationStatus').textContent = 'The embedded player could not open. Use Open Official Player to listen.';
  });
  host.appendChild(frame); host.hidden = false;
  // Bring the on-page player into view after selecting a card lower on the page.
  host.scrollIntoView({block: 'center', behavior: 'auto'});
  $('#stopLocalPlayer').hidden = false;
  $('#localStationStatus').textContent = 'Opening the official player below…';
  localPlayerTimeout = setTimeout(() => {
    if (loadedLocalStation === station.id) $('#localStationStatus').textContent = 'The player is taking longer to open. You can use Open Official Player instead.';
  }, 15000);
}
function chooseLocalStation(id) {
  if (!allRadioStations().some(station => station.id === id)) return;
  storage.setItem(LOCAL_STATION_KEY, id);
  renderLocalStation();
}
document.querySelectorAll('[data-station]').forEach(link => {
  link.addEventListener('click', event => {
    const station = LOCAL_STATIONS.find(item => item.id === link.dataset.station);
    if (!station) return;
    chooseLocalStation(station.id);
    if (station.embedUrl) { event.preventDefault(); loadLocalRadio(); }
    // Unsupported stations and no-JS browsers retain native official link navigation.
    try { if (localStorage.getItem(LOCAL_STATION_KEY) !== station.id) throw new Error('Storage unavailable'); }
    catch { $('#localStationStatus').textContent += ' Browser storage is unavailable; selection will not persist between pages.'; }
  });
});
if ($('#localStationSelect')) $('#localStationSelect').addEventListener('change', event => {
  if (!event.target.value) { storage.removeItem(LOCAL_STATION_KEY); stopLocalRadio(); renderLocalStation(); return; }
  chooseLocalStation(event.target.value);
  if (selectedLocalStation()?.embedUrl) loadLocalRadio();
});
if ($('#loadLocalPlayer')) $('#loadLocalPlayer').addEventListener('click', loadLocalRadio);
if ($('#stopLocalPlayer')) $('#stopLocalPlayer').addEventListener('click', () => { stopLocalRadio(); renderLocalStation(); });
// A station change in another tab stops the old embedded player on this page.
window.addEventListener('storage', event => { if ([LOCAL_STATION_KEY, SAVED_RADIO_KEY, null].includes(event.key)) {refreshRadioLibrary(); renderLocalStation();} });
window.addEventListener('focus', () => {refreshRadioLibrary(); renderLocalStation();});
initializeRadioLibrary();
renderLocalStation();
