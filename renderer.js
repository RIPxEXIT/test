const { ipcRenderer } = require('electron');

// Notification handling
function showNotification(title, message, type = 'info') {
  const notificationContainer = document.getElementById('notification-container');
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const titleElement = document.createElement('div');
  titleElement.className = 'title';
  titleElement.textContent = title;
  
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.textContent = message;
  
  notification.appendChild(titleElement);
  notification.appendChild(messageElement);
  notificationContainer.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove notification after delay
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notificationContainer.removeChild(notification);
    }, 300);
  }, 3000);
}

// Listen for notifications from main process
ipcRenderer.on('show-notification', (event, { title, message, type }) => {
  showNotification(title, message, type);
});

// Elements
const loginForm = document.getElementById('login-form');
const loginContainer = document.getElementById('login-container');
const launcherContainer = document.getElementById('launcher-container');

// Login elements
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Load saved credentials
if (localStorage.getItem('lastUsername')) {
  usernameInput.value = localStorage.getItem('lastUsername');
}
if (localStorage.getItem('lastPassword')) {
  passwordInput.value = localStorage.getItem('lastPassword');
}

// Other elements
const versionSelect = document.getElementById('version');
const ramSlider = document.getElementById('ram');
const ramValue = document.getElementById('ram-value');
const ramMarks = document.querySelectorAll('.ram-mark');
const launchButton = document.getElementById('launch-button');
const logoutButton = document.getElementById('logout-button');
const progressBar = document.querySelector('.progress-bar-fill');
const minimizeButton = document.getElementById('minimize-button');
const closeButton = document.getElementById('close-button');

let currentUsername = '';
let currentSettings = {
  ram: 2,
  version: 'voxel-loader',
  lastUsername: ''
};

// Function to format date
function formatDate(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Logout function
function logout() {
  currentUsername = '';
  currentSettings = {
    ram: 2,
    version: 'voxel-loader',
    lastUsername: ''
  };
  
  // Reset form
  loginForm.reset();
  
  // Reset version select
  versionSelect.value = 'voxel-loader';
  
  // Load saved credentials back
  if (localStorage.getItem('lastUsername')) {
    usernameInput.value = localStorage.getItem('lastUsername');
  }
  if (localStorage.getItem('lastPassword')) {
    passwordInput.value = localStorage.getItem('lastPassword');
  }
  
  // Switch containers
  launcherContainer.style.display = 'none';
  loginContainer.style.display = 'block';
  
  showNotification('Success', 'Logged out successfully');
}

// Event Listeners
logoutButton.addEventListener('click', logout);

// Function to update RAM display
function updateRamDisplay(value) {
  // Update the display
  ramValue.textContent = `${value} GB`;
  
  // Update the gradient
  const percent = ((value - 2) / (32 - 2)) * 100;
  ramSlider.style.setProperty('--value-percent', `${percent}%`);
  
  // Update marks
  ramMarks.forEach(mark => {
    const markValue = parseInt(mark.getAttribute('data-value'));
    mark.classList.toggle('active', value >= markValue);
  });
}

// Initialize RAM slider
function initializeRamSlider() {
  // Set initial value from settings or default
  const initialValue = currentSettings.ram || 2;
  ramSlider.value = initialValue;
  updateRamDisplay(initialValue);

  // Add event listeners
  ramSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    updateRamDisplay(value);
  });

  ramSlider.addEventListener('change', async () => {
    if (currentUsername) {
      const value = parseInt(ramSlider.value);
      currentSettings.ram = value;
      await ipcRenderer.invoke('save-settings', { 
        username: currentUsername, 
        settings: currentSettings 
      });
    }
  });
}

// Add version select event listener
versionSelect.addEventListener('change', async () => {
  if (currentUsername) {
    currentSettings.version = versionSelect.value;
    await ipcRenderer.invoke('save-settings', { 
      username: currentUsername, 
      settings: currentSettings 
    });
    showNotification('Success', 'Version preference saved');
  }
});

// GitHub configuration
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/YOUR_USERNAME/REPO_NAME/main';
const GITHUB_API_URL = 'https://api.github.com/repos/YOUR_USERNAME/REPO_NAME';

// Function to fetch versions from GitHub
async function fetchVersions() {
  try {
    const response = await fetch(`${GITHUB_RAW_URL}/versions.json`);
    const versions = await response.json();
    
    // Clear existing options
    versionSelect.innerHTML = '';
    
    // Add versions from GitHub
    versions.forEach(version => {
      const option = document.createElement('option');
      option.value = version.id;
      option.textContent = `✨ ${version.name} ${version.version}`;
      versionSelect.appendChild(option);
    });
    
    return versions;
  } catch (error) {
    console.error('Failed to fetch versions:', error);
    showNotification('Error', 'Failed to fetch versions from GitHub', 'error');
    return [];
  }
}

// Function to fetch user data from GitHub
async function fetchUserData(username) {
  try {
    const response = await fetch(`${GITHUB_RAW_URL}/users.json`);
    const users = await response.json();
    return users[username];
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    return null;
  }
}

// Function to download game files
async function downloadGameFiles(version) {
  try {
    // Get version information from GitHub
    const versionsResponse = await fetch(`${GITHUB_RAW_URL}/versions.json`);
    const versions = await versionsResponse.json();
    const versionInfo = versions.find(v => v.id === version);
    
    if (!versionInfo || !versionInfo.downloadUrl) {
      throw new Error('Version not found or no download URL available');
    }
    
    // Start download
    launchButton.disabled = true;
    launchButton.textContent = 'Downloading...';
    
    showNotification('Info', 'Downloading game files...');
    
    const downloadResponse = await fetch(versionInfo.downloadUrl);
    if (!downloadResponse.ok) throw new Error('Failed to download game files');
    
    const reader = downloadResponse.body.getReader();
    const contentLength = downloadResponse.headers.get('content-length');
    let receivedLength = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      // Update progress bar
      if (contentLength) {
        const progress = (receivedLength / parseInt(contentLength)) * 100;
        progressBar.style.width = `${progress}%`;
      }
    }
    
    // Combine chunks and save file
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }
    
    // Save the file
    await ipcRenderer.invoke('save-game-file', {
      version,
      fileName: 'game.zip',
      data: allChunks.buffer
    });
    
    showNotification('Success', 'Game files downloaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to download game files:', error);
    showNotification('Error', `Failed to download game files: ${error.message}`, 'error');
    return false;
  } finally {
    launchButton.disabled = false;
    launchButton.textContent = 'Launch Game';
    progressBar.style.width = '0%';
  }
}

// Update the login handler to use GitHub user data
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value;
  const password = passwordInput.value;
  
  try {
    const userData = await fetchUserData(username);
    
    if (userData && userData.password === password) {
      currentUsername = username;
      currentSettings = userData.settings || {
        ram: 2,
        version: 'latest',
        lastUsername: username
      };
      
      // Initialize RAM slider with new settings
      initializeRamSlider();
      
      // Fetch and set available versions
      await fetchVersions();
      
      // Set version from saved settings
      if (currentSettings.version) {
        versionSelect.value = currentSettings.version;
      }
      
      showNotification('Success', 'Login successful!');
      loginContainer.style.display = 'none';
      launcherContainer.style.display = 'block';
    } else {
      showNotification('Error', 'Invalid username or password', 'error');
    }
  } catch (error) {
    console.error('Login failed:', error);
    showNotification('Error', 'Login failed! Please try again.', 'error');
  }
});

// Update launch button handler to download files if needed
launchButton.addEventListener('click', async () => {
  const version = versionSelect.value;
  const ram = parseInt(ramSlider.value);
  
  try {
    // Check if files need to be downloaded
    const needsDownload = await ipcRenderer.invoke('check-game-files', { version });
    
    if (needsDownload) {
      const downloaded = await downloadGameFiles(version);
      if (!downloaded) return;
    }
    
    // Launch the game
    const response = await ipcRenderer.invoke('launch-minecraft', { 
      username: currentUsername,
      version, 
      ram 
    });
    
    if (response.success) {
      if (response.ram !== ram) {
        ramSlider.value = response.ram;
        updateRamDisplay(response.ram);
        showNotification('Warning', `RAM allocation adjusted to ${response.ram}GB`, 'warning');
      }
      
      showNotification('Success', `Launching Voxel Loader with ${response.ram}GB RAM`);
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Launch failed:', error);
    showNotification('Error', error.message || 'Failed to launch game', 'error');
  }
});

// Initialize
(async () => {
  // Fetch versions on startup
  await fetchVersions();
  
  // Initialize slider
  initializeRamSlider();
})();

// Window controls
minimizeButton.addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

closeButton.addEventListener('click', () => {
  ipcRenderer.send('close-window');
}); 