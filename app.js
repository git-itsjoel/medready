/**
 * MedReady Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    const isPublicPage = document.getElementById('medicine-list') && document.getElementById('search-hospital');
    const isAdminPage = document.getElementById('login-form') || document.getElementById('admin-dashboard');

    if (isPublicPage) {
        initPublicPage();
    } else if (isAdminPage) {
        initAdminPage();
    }
});

// --- Public Page Logic ---
function initPublicPage() {
    const medInput = document.getElementById('search-medicine');
    const hospInput = document.getElementById('search-hospital');
    const catInput = document.getElementById('search-category');
    const customCatInput = document.getElementById('search-category-custom');
    const listContainer = document.getElementById('medicine-list');
    const mainContent = document.querySelector('.main-content');

    // Initial Load - Set Centered View
    mainContent.classList.add('centered-view');
    listContainer.innerHTML = '<p style="text-align:center; margin-top: 20px; color: var(--gray);">Please enter a <b>Hospital Name</b> to check availability.</p>';

    // Suggestions Logic
    const suggestionBox = document.getElementById('hospital-suggestions');
    const allHospitals = api.getHospitals();

    // Search Handlers
    function handleSearch(e) {
        const medQuery = medInput.value;
        const hospQuery = hospInput.value;
        let catQuery = catInput.value;

        // Suggestions for Hospital Input
        if (e && e.target && e.target.id === 'search-hospital') {
            if (hospQuery.trim().length > 0) {
                const matches = allHospitals.filter(h => h.toLowerCase().includes(hospQuery.toLowerCase()));
                renderSuggestions(matches);
            } else {
                suggestionBox.classList.add('hidden');
            }
        }

        // Toggle Custom Input
        if (catQuery === 'Others') {
            customCatInput.classList.remove('hidden');
            if (customCatInput.value.trim() !== '') {
                catQuery = customCatInput.value;
            }
        } else {
            customCatInput.classList.add('hidden');
            customCatInput.value = '';
        }

        // Require Hospital Name to switch view
        if (!hospQuery.trim()) {
            mainContent.classList.add('centered-view'); // Re-center if hospital cleared
            listContainer.innerHTML = '<p style="text-align:center; margin-top: 20px; color: var(--gray);">Please enter a <b>Hospital Name</b> to check availability.</p>';
            return;
        }

        // Switch to Top View
        mainContent.classList.remove('centered-view');

        api.getMedicines(medQuery, hospQuery, catQuery).then(results => renderMedicines(results));
    }

    function renderSuggestions(matches) {
        if (matches.length > 0) {
            suggestionBox.innerHTML = matches.map(h => `<li>${h}</li>`).join('');
            suggestionBox.classList.remove('hidden');

            // Add click listeners to items
            suggestionBox.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', () => {
                    hospInput.value = item.textContent;
                    suggestionBox.classList.add('hidden');
                    handleSearch({ target: { id: 'search-hospital' } }); // Trigger search update
                });
            });
        } else {
            suggestionBox.classList.add('hidden');
        }
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!hospInput.contains(e.target) && !suggestionBox.contains(e.target)) {
            suggestionBox.classList.add('hidden');
        }
    });

    medInput.addEventListener('input', handleSearch);
    hospInput.addEventListener('input', handleSearch);
    catInput.addEventListener('change', handleSearch);
    customCatInput.addEventListener('input', handleSearch);

    function renderMedicines(medicines) {
        if (medicines.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color: var(--gray);">No medicines found.</p>';
            return;
        }

        listContainer.innerHTML = medicines.map(med => {
            const statusClass = med.status === 'Available' ? 'available' : 'out-of-stock';
            const lastUpdated = new Date(med.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="medicine-card">
                    <div class="medicine-info">
                        <h3>${med.name}</h3>
                        <p class="medicine-meta">
                            <span class="hospital-tag">🏥 ${med.hospital || 'Unknown Hospital'}</span>
                            <span>• ${med.category}</span>
                            <span>• ${lastUpdated}</span>
                        </p>
                    </div>
                    <span class="badge ${statusClass}">${med.status}</span>
                </div>
            `;
        }).join('');
    }
}

// --- Admin Page Logic ---
function initAdminPage() {
    const loginForm = document.getElementById('login-form');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminList = document.getElementById('admin-medicine-list');

    // Check if already logged in (simple session check)
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser) {
        if (currentUser.role === 'superadmin') {
            showSuperDashboard();
        } else {
            showDashboard(currentUser);
        }
    }

    // Login Handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Check for Hardcoded Super Admin (Mock Logic)
            // NOTE: In a real app, this would be handled securely on the server
            if (username === 'superadmin' && password === 'masterkey') {
                const superUser = { username: 'superadmin', role: 'superadmin' };
                sessionStorage.setItem('currentUser', JSON.stringify(superUser));
                showSuperDashboard();
                return;
            }

            const user = await api.login(username, password);

            if (user) {
                user.role = 'staff'; // Ensure role
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                showDashboard(user);
            } else {
                alert('Invalid Username or Password');
            }
        });
    }

    // Toggle Password Visibility
    const togglePassBtn = document.getElementById('toggle-password');
    if (togglePassBtn) {
        togglePassBtn.addEventListener('click', () => {
            const passInput = document.getElementById('password');
            if (passInput.type === 'password') {
                passInput.type = 'text';
                togglePassBtn.textContent = 'Hide';
            } else {
                passInput.type = 'password';
                togglePassBtn.textContent = 'Show';
            }
        });
    }

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('super-logout-btn')?.addEventListener('click', logout);

    function logout() {
        sessionStorage.removeItem('currentUser');
        location.reload();
    }

    // Register Hospital (Super Admin)
    document.getElementById('add-hospital-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hospName = document.getElementById('reg-hospital').value;
        const staffUser = document.getElementById('reg-username').value;
        const staffPass = document.getElementById('reg-password').value;

        if (hospName && staffUser && staffPass) {
            const success = await api.registerUser(staffUser, staffPass, hospName);
            if (success) {
                alert(`Successfully registered ${hospName}!\nUsername: ${staffUser}`);
                document.getElementById('add-hospital-form').reset();
            } else {
                alert('Error: Username already exists.');
            }
        }
    });

    function showSuperDashboard() {
        if (loginForm) loginForm.classList.add('hidden');
        document.getElementById('super-admin-dashboard').classList.remove('hidden');
    }

    // Add Medicine
    document.getElementById('add-medicine-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser || currentUser.role === 'superadmin') return; // Safety check

        const name = document.getElementById('new-name').value;
        const category = document.getElementById('new-category').value;

        if (name && category) {
            // Auto-assign the hospital from the logged-in user
            await api.addMedicine({ name, category, hospital: currentUser.hospital });
            document.getElementById('add-medicine-form').reset();
            renderAdminList(currentUser.hospital);
            alert('Medicine Added');
        }
    });

    function showDashboard(user) {
        if (loginForm) loginForm.classList.add('hidden');
        if (adminDashboard) {
            adminDashboard.classList.remove('hidden');
            const badge = document.getElementById('staff-hospital-badge');
            if (badge) badge.textContent = `Managing Inventory for: ${user.hospital}`;
            renderAdminList(user.hospital);
        }
    }

    function renderAdminList(userHospital) {
        const medicines = api.getData(); // Get fresh data
        // Filter only medicines for this staff's hospital
        const myMedicines = medicines.filter(m => m.hospital === userHospital);

        if (myMedicines.length === 0) {
            adminList.innerHTML = '<p>No medicines found for your hospital.</p>';
            return;
        }

        adminList.innerHTML = myMedicines.map(med => {
            const statusClass = med.status === 'Available' ? 'available' : 'out-of-stock';

            return `
                <div class="medicine-card">
                    <div class="medicine-info">
                        <h3>${med.name}</h3>
                        <p class="medicine-meta">
                            <span class="hospital-tag">🏥 ${med.hospital}</span>
                            <span>• ${med.category}</span>
                        </p>
                    </div>
                    <div class="admin-controls">
                        <span class="badge ${statusClass}" style="margin-right: 10px;">${med.status}</span>
                        <button class="btn-toggle" onclick="toggleStatus(${med.id}, '${userHospital}')">Toggle Status</button>
                        <button class="btn-toggle" style="color: var(--danger); border-color: var(--danger); margin-left: 5px;" onclick="deleteMedicine(${med.id}, '${userHospital}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Expose toggle function globally
    window.toggleStatus = async (id, userHospital) => {
        await api.toggleAvailability(id);
        renderAdminList(userHospital);
    };

    // Expose delete function globally
    window.deleteMedicine = async (id, userHospital) => {
        if (confirm('Are you sure you want to delete this medicine?')) {
            await api.deleteMedicine(id);
            renderAdminList(userHospital);
        }
    };
}
