document.addEventListener('DOMContentLoaded', () => {
  const mainAuth = document.querySelector('.main-auth');
  const loginBtn = document.querySelector('.login-button');
  const closeBtn = document.querySelector('.close-button');
  const registerLink = document.querySelector('.register');
  const loginLink = document.querySelector('.login');
  const forgotPasswordLink = document.querySelector('.forgot-password');
  const backToLoginLink = document.querySelector('.back-to-login');
  const profileBox = document.querySelector('.pbox');
  const avatar = document.querySelector('.Ava');
  const logoutLink = document.querySelector('.logout');
  const alertBox = document.querySelector('.alert');
  const alertIcon = alertBox.querySelector('i');
  const alertText = alertBox.querySelector('span');
  const homeLinks = document.querySelectorAll('header .nav a[href="/"]');
  const mainContent = document.getElementById('main-content');
  
  clearAuthForm();
  
  
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');
  
  if (resetToken) {
    verifyResetToken(resetToken);
  }

  homeLinks.forEach(homeLink => {
    homeLink.addEventListener('click', e => {
      e.preventDefault();
      


  function clearAuthForm() {
    document.querySelectorAll(".main-auth input").forEach(input => input.value = "");
  }

  function triggerAlert(message, type) {
    alertBox.classList.remove('success', 'error', 'show');
    alertIcon.className = type === 'success' ? 'bx bx-check' : 'bx bx-error-circle';
    alertText.textContent = message;
    alertBox.classList.add(type, 'show');
    setTimeout(() => alertBox.classList.remove('show'), 6000);
  }

  function updateUIForLogin(userName) {
    if (userName) {
      loginBtn.style.display = 'none';
      avatar.textContent = userName.charAt(0).toUpperCase();
      profileBox.style.display = 'flex';
    } else {
      loginBtn.style.display = '';
      profileBox.style.display = 'none';
    }
  }

  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add('loading');
      button.disabled = true;
      button.textContent = 'Please wait...';
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');
  if (token && userName) updateUIForLogin(userName);


  document.addEventListener('click', (e) => {
    if (!profileBox.contains(e.target)) {
      profileBox.classList.remove('show');
    }
  });

  avatar.addEventListener('click', (e) => {
    e.stopPropagation();
    profileBox.classList.toggle('show');
  });

  logoutLink.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    updateUIForLogin(null);
    clearAuthForm();
    triggerAlert('Logged out successfully!', 'success');
  });


  loginBtn.addEventListener('click', () => {
    mainAuth.classList.add('show');
    mainAuth.classList.remove('slide', 'forgot', 'reset');
  });
  
  closeBtn.addEventListener('click', () => {
    mainAuth.classList.remove('show', 'slide', 'forgot', 'reset');
    clearAuthForm();
  });
  
  registerLink.addEventListener('click', () => {
    mainAuth.classList.add('slide');
    mainAuth.classList.remove('forgot', 'reset');
  });
  
  loginLink.addEventListener('click', () => {
    mainAuth.classList.remove('slide', 'forgot', 'reset');
  });
  
 
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    mainAuth.classList.add('forgot');
    mainAuth.classList.remove('slide', 'reset');
  });
  
  backToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    mainAuth.classList.remove('forgot', 'reset', 'slide');
  });

  mainAuth.addEventListener('click', (e) => {
    if (e.target === mainAuth) {
      mainAuth.classList.remove('show', 'slide', 'forgot', 'reset');
      clearAuthForm();
    }
  });


  const registerForm = document.querySelector('.fboxregister form');
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = registerForm.querySelector('.button');
    const { name, email, password } = registerForm;
    
    if (!name.value.trim() || !email.value.trim() || !password.value) {
      triggerAlert('All fields are required!', 'error');
      return;
    }
    
    if (password.value.length < 6) {
      triggerAlert('Password must be at least 6 characters!', 'error');
      return;
    }
    
    setButtonLoading(submitBtn, true);
    
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.value.trim(),
          email: email.value.trim(),
          password: password.value
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        triggerAlert('Registration successful! Please login.', 'success');
        registerForm.reset();
        setTimeout(() => {
          mainAuth.classList.remove('slide');
        }, 1500);
      } else {
        triggerAlert(data.error || data.message, 'error');
      }
    } catch (err) {
      triggerAlert('Registration failed: ' + err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
      submitBtn.textContent = 'Signup';
    }
  });

 
  const loginForm = document.querySelector('.fbox form');
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = loginForm.querySelector('.button');
    const { email, password } = loginForm;
    
    if (!email.value.trim() || !password.value) {
      triggerAlert('Email and password are required!', 'error');
      return;
    }
    
    setButtonLoading(submitBtn, true);
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.value.trim(),
          password: password.value
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        triggerAlert('Login successful!', 'success');
        localStorage.setItem('token', data.token);
        localStorage.setItem('userName', data.name);
        updateUIForLogin(data.name);
        mainAuth.classList.remove('show', 'slide', 'forgot', 'reset');
        clearAuthForm();
      } else {
        triggerAlert(data.message || 'Invalid credentials.', 'error');
      }
    } catch (err) {
      triggerAlert('Login failed: ' + err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
      submitBtn.textContent = 'Login';
    }
  });

 
  const forgotForm = document.querySelector('.fboxforgot form');
  forgotForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = forgotForm.querySelector('.button');
    const { email } = forgotForm;
    
    if (!email.value.trim()) {
      triggerAlert('Email is required!', 'error');
      return;
    }
    
    setButtonLoading(submitBtn, true);
    
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        triggerAlert('If email exist Password reset email sent! Check your inbox. (check your spam if not received)', 'success');
        forgotForm.reset();
        setTimeout(() => {
          mainAuth.classList.remove('show', 'forgot');
        }, 2000);
      } else {
        triggerAlert(data.error || 'Failed to send reset email.', 'error');
      }
    } catch (err) {
      triggerAlert('Failed to send reset email: ' + err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
      submitBtn.textContent = 'Send Reset Link';
    }
  });


  const resetForm = document.querySelector('.fboxreset form');
  resetForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = resetForm.querySelector('.button');
    const { password, confirmPassword } = resetForm;
    
    if (!password.value || !confirmPassword.value) {
      triggerAlert('Both password fields are required!', 'error');
      return;
    }
    
    if (password.value !== confirmPassword.value) {
      triggerAlert('Passwords do not match!', 'error');
      return;
    }
    
    if (password.value.length < 6) {
      triggerAlert('Password must be at least 6 characters!', 'error');
      return;
    }
    
    setButtonLoading(submitBtn, true);
    
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword: password.value
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        triggerAlert('Password reset successful! You can now login.', 'success');
        resetForm.reset();
        setTimeout(() => {
          mainAuth.classList.remove('show', 'reset');
          window.history.replaceState({}, document.title, "/");
        }, 2000);
      } else {
        triggerAlert(data.error || 'Password reset failed.', 'error');
      }
    } catch (err) {
      triggerAlert('Password reset failed: ' + err.message, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
      submitBtn.textContent = 'Reset Password';
    }
  });


  async function verifyResetToken(token) {
    try {
      const res = await fetch(`/api/reset-password/${token}`);
      const data = await res.json();
      
      if (res.ok) {
        mainAuth.classList.add('show', 'reset');
        triggerAlert('Please enter your new password.', 'success');
      } else {
        triggerAlert('Invalid or expired reset link.', 'error');
        setTimeout(() => {
          window.history.replaceState({}, document.title, "/");
        }, 3000);
      }
    } catch (err) {
      triggerAlert('Failed to verify reset link.', 'error');
      setTimeout(() => {
        window.history.replaceState({}, document.title, "/");
      }, 3000);
    }
  }
});
