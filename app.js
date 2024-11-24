// GitHub OAuth Configuration
const clientId = 'YOUR_GITHUB_CLIENT_ID'; // You'll need to replace this with your GitHub OAuth App client ID
const redirectUri = window.location.href;
const scope = 'repo';

// DOM Elements
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const loginSection = document.getElementById('loginSection');
const userInfo = document.getElementById('userInfo');
const usernameSpan = document.getElementById('username');
const repositoriesSection = document.getElementById('repositoriesSection');

// GitHub API base URL
const apiBaseUrl = 'https://api.github.com';

let accessToken = localStorage.getItem('github_access_token');

// Event Listeners
loginButton.addEventListener('click', initiateGitHubLogin);
logoutButton.addEventListener('click', logout);

// Check if we're returning from GitHub OAuth
window.addEventListener('load', () => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
        exchangeCodeForToken(code);
    } else if (accessToken) {
        showLoggedInState();
    }
});

function initiateGitHubLogin() {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = authUrl;
}

async function exchangeCodeForToken(code) {
    try {
        // Note: In a production environment, this should be done through your backend
        // to keep your client secret secure
        const response = await axios.post('YOUR_BACKEND_TOKEN_EXCHANGE_ENDPOINT', {
            code: code
        });
        
        accessToken = response.data.access_token;
        localStorage.setItem('github_access_token', accessToken);
        showLoggedInState();
        
        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        alert('Failed to complete GitHub authentication');
    }
}

function logout() {
    localStorage.removeItem('github_access_token');
    accessToken = null;
    showLoggedOutState();
}

async function showLoggedInState() {
    try {
        const userResponse = await axios.get(`${apiBaseUrl}/user`, {
            headers: { Authorization: `token ${accessToken}` }
        });
        
        usernameSpan.textContent = userResponse.data.login;
        loginSection.classList.add('hidden');
        userInfo.classList.remove('hidden');
        repositoriesSection.classList.remove('hidden');
        
        await loadRepositories();
    } catch (error) {
        console.error('Error loading user data:', error);
        showLoggedOutState();
    }
}

function showLoggedOutState() {
    loginSection.classList.remove('hidden');
    userInfo.classList.add('hidden');
    repositoriesSection.classList.add('hidden');
    repositoriesSection.innerHTML = '';
}

async function loadRepositories() {
    try {
        const response = await axios.get(`${apiBaseUrl}/user/repos`, {
            headers: { Authorization: `token ${accessToken}` }
        });
        
        repositoriesSection.innerHTML = '';
        response.data.forEach(repo => {
            const repoBox = createRepositoryBox(repo);
            repositoriesSection.appendChild(repoBox);
        });
    } catch (error) {
        console.error('Error loading repositories:', error);
        alert('Failed to load repositories');
    }
}

function createRepositoryBox(repo) {
    const box = document.createElement('div');
    box.className = 'repo-box';
    box.innerHTML = `
        <h3>${repo.name}</h3>
        <p>${repo.description || 'No description'}</p>
    `;
    
    // Add drag and drop event listeners
    box.addEventListener('dragover', handleDragOver);
    box.addEventListener('dragleave', handleDragLeave);
    box.addEventListener('drop', (e) => handleDrop(e, repo.name));
    
    return box;
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

async function handleDrop(e, repoName) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    
    for (const file of files) {
        try {
            const content = await readFileAsBase64(file);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${timestamp}-${file.name}`;
            
            await uploadFileToRepo(repoName, fileName, content);
            alert(`Successfully uploaded ${file.name}`);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert(`Failed to upload ${file.name}`);
        }
    }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove the "data:image/jpeg;base64," part
            const base64Content = reader.result.split(',')[1];
            resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadFileToRepo(repoName, fileName, content) {
    try {
        const response = await axios.put(
            `${apiBaseUrl}/repos/${usernameSpan.textContent}/${repoName}/contents/${fileName}`,
            {
                message: `Upload ${fileName}`,
                content: content
            },
            {
                headers: { Authorization: `token ${accessToken}` }
            }
        );
        return response.data;
    } catch (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}
