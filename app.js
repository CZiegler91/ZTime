const $ = (selector) => document.querySelector(selector);

// ------------------------------
// ZTime demo profile system
// Profiles are stored only in this browser with localStorage.
// This is a course-demo profile system, not secure authentication.
// ------------------------------
const PROFILE_KEY = 'ztime-profiles';
const ACTIVE_PROFILE_KEY = 'ztime-active-profile';

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
}

function getActiveProfile() {
  const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return getProfiles().find(profile => profile.id === activeId) || null;
}

function setActiveProfile(profileId) {
  if (profileId) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
  loadProfileData();
  renderProfileControls();
  renderWorkouts();
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
  dialog.innerHTML = `
    <div class="profileDialogInner">
      <button class="profileDialogClose" type="button" aria-label="Close profile window">×</button>

      <p class="eyebrow">ZTIME PROFILES</p>
      <h2>Log in or switch profiles</h2>
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
    localStorage.setItem(`ztime-workouts-${id}`, JSON.stringify(starter));
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
  identity.innerHTML = `
    <span class="profileAvatar">${initials(profile.name)}</span>
    <span class="profileName">${profile.name}</span>
  `;
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

  const stored = localStorage.getItem(profileStorageKey('workouts'));
  workouts = stored ? JSON.parse(stored) : [...starter];
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
  if ($('#sessionStat')) $('#sessionStat').textContent = `${n} / ${goal}`;
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
  localStorage.setItem(profileStorageKey('workouts'), JSON.stringify(workouts));
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
