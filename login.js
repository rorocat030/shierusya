// ====== Supabase 設定 ======
const client = window.supabase.createClient(
  'https://wfhwhvodgikpducrhgda.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaHdodm9kZ2lrcGR1Y3JoZ2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTAwNjEsImV4cCI6MjA2MzU4NjA2MX0.P6P-x4SxjiR4VdWH6VFgY_ktgMac_OzuI4Bl7HWskz8'
);

// ===== 錯誤訊息轉換 =====
function transErrorMsg(msg) {
  if (!msg) return '';
  if (msg.includes('Invalid login credentials')) return '帳號或密碼錯誤';
  if (msg.includes('Email not confirmed')) return '信箱尚未驗證，請至信箱點擊驗證連結！';
  if (msg.includes('User already registered')) return '此信箱已經註冊過了';
  if (msg.includes('User not found')) return '查無此帳號，請確認信箱是否輸入正確';
  if (msg.includes('Password should be at least')) return '密碼長度不足（至少 6 位）';
  if (msg.includes('Invalid email or password')) return '帳號或密碼錯誤';
  if (msg.toLowerCase().includes('network')) return '網路連線失敗，請稍後再試';
  if (msg.includes('Email rate limit')) return '請勿頻繁操作，請稍後再試';
  if (msg.includes('Database error saving new user')) return '請聯繫管理員開啟註冊系統';

  return msg;
}

// ==== 密碼顯示/隱藏（貓咪眼睛）====
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '(=ω=)';
  } else {
    input.type = 'password';
    btn.textContent = '(ΦωΦ)';
  }
}

// ===== 表單切換 =====
function showSignUp() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = '';
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('login-msg').textContent = '';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';
}
function showLogin(msg='') {
  document.getElementById('login-form').style.display = '';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';
  const el = document.getElementById('login-msg');
  if (msg) {
    el.textContent = msg;
    el.className = 'msg success';
  } else {
    el.textContent = '';
    el.className = 'msg';
  }
}
function showForgot() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = '';
  document.getElementById('login-msg').textContent = '';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';
}
function setLoading(isLoading) {
  document.getElementById('login-btn')?.classList.toggle('loading', isLoading);
  document.getElementById('signup-btn')?.classList.toggle('loading', isLoading);
  document.getElementById('forgot-btn')?.classList.toggle('loading', isLoading);
}

// ============ 忘記密碼 ============
async function handleForgot(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  const msgDiv = document.getElementById('forgot-msg');
  msgDiv.textContent = '';
  if (!email) {
    msgDiv.textContent = '請輸入電子信箱';
    return;
  }
  document.getElementById('forgot-btn').classList.add('loading');
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://shierusha.github.io/login/reset'
  });
  document.getElementById('forgot-btn').classList.remove('loading');
  if (error) {
    msgDiv.textContent = '寄送失敗: ' + transErrorMsg(error.message);
  } else {
    msgDiv.textContent = '已寄送密碼重設信到你的信箱，請查收！';
    msgDiv.className = 'msg success';
  }
}

// ============ 註冊（只 signUp，不手動 insert players） ============
async function signUp() {
  setLoading(true);
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const username = document.getElementById('signup-username').value.trim();
  const msgEl = document.getElementById('signup-msg');

  if (!email || !password || !username) {
    msgEl.textContent = '請填寫所有欄位';
    setLoading(false);
    return;
  }

  try {
    const { error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { username },                                   // 觸發器會拿這個
        emailRedirectTo: 'https://shierusha.github.io/login/reset'  // 你指定的頁
      }
    });

    setLoading(false);
    if (error) { msgEl.textContent = '註冊失敗: ' + transErrorMsg(error.message); return; }
    showLogin('註冊成功，請到信箱完成驗證再登入！');
  } catch {
    setLoading(false);
    msgEl.textContent = '無法連線到伺服器';
  }
}


// ============ 登入（用 email 撈真正的 player_id） ============
async function signIn() {
  setLoading(true);
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msgEl = document.getElementById('login-msg');

  if (!email || !password) {
    msgEl.textContent = '請輸入帳號與密碼';
    setLoading(false);
    return;
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      msgEl.textContent = '登入失敗: ' + transErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      msgEl.textContent = '帳號異常，請確認信箱驗證';
      setLoading(false);
      return;
    }

    // ✅ 用 email 去 players 撈真正的 player_id / role / username（與 RLS 相容）
    const { data: player, error: playerError } = await client
      .from('players')
      .select('player_id, username, role, email')
      .eq('email', user.email)
      .single();

    if (playerError || !player) {
      msgEl.textContent = '查無玩家資料，請完成信箱驗證或稍後再試';
      setLoading(false);
      return;
    }

    // 存真正的 player_id（不是 auth 的 user.id）
    localStorage.setItem('player_id', player.player_id);
    localStorage.setItem('player_username', player.username);

    setLoading(false);

    // 依照身份導頁
    if (player.role === 'admin') {
      window.location.href = 'admin'; // 管理者首頁
    } else {
      window.location.href = 'https://shierusha.github.io/create-student/player'; // 玩家首頁
    }
  } catch (e) {
    msgEl.textContent = '無法連線到伺服器';
    setLoading(false);
  }
}

// 初始化顯示登入
document.addEventListener('DOMContentLoaded', function () {
  showLogin();
});
