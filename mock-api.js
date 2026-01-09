/**
 * MockAPI - Simulates a backend with localStorage
 */
class MockAPI {
    constructor() {
        // Updated DB Name to 'v2' to force a fresh start with clean data
        this.dbName = 'medready_db_v2';
        this.init();
    }

    /**
     * NOTE: These are MOCK credentials for demonstration purposes only.
     * In a real production application, passwords should never be stored
     * or hardcoded in client-side code.
     */
    init() {
        // Initialize Medicines
        if (!localStorage.getItem(this.dbName)) {
            const initialData = [
                // City Hospital Inventory
                { id: 1, name: 'Paracetamol 500mg', category: 'Tablets', status: 'Available', hospital: 'City Hospital', lastUpdated: new Date().toISOString() },
                { id: 2, name: 'Amoxicillin 250mg', category: 'Capsules', status: 'Available', hospital: 'City Hospital', lastUpdated: new Date().toISOString() },
                { id: 3, name: 'Dolo 650', category: 'Tablets', status: 'Out of Stock', hospital: 'City Hospital', lastUpdated: new Date().toISOString() },
                { id: 4, name: 'Cough Syrup', category: 'Syrups', status: 'Available', hospital: 'City Hospital', lastUpdated: new Date().toISOString() },

                // General Hospital Inventory
                { id: 5, name: 'Ibuprofen 400mg', category: 'Tablets', status: 'Available', hospital: 'General Hospital', lastUpdated: new Date().toISOString() },
                { id: 6, name: 'Insulin Glargine', category: 'Injections', status: 'Out of Stock', hospital: 'General Hospital', lastUpdated: new Date().toISOString() },
                { id: 7, name: 'Cetirizine', category: 'Tablets', status: 'Available', hospital: 'General Hospital', lastUpdated: new Date().toISOString() },
                { id: 8, name: 'Vitamin C Drops', category: 'Drops', status: 'Available', hospital: 'General Hospital', lastUpdated: new Date().toISOString() }
            ];
            localStorage.setItem(this.dbName, JSON.stringify(initialData));
        }

        // Initialize Users (Check independently so it works for existing users)
        if (!localStorage.getItem(this.dbName + '_users')) {
            const initialUsers = [
                { username: 'city_staff', password: 'admin123', hospital: 'City Hospital' },
                { username: 'general_staff', password: 'admin123', hospital: 'General Hospital' }
            ];
            localStorage.setItem(this.dbName + '_users', JSON.stringify(initialUsers));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.dbName) || '[]');
    }

    getUsers() {
        return JSON.parse(localStorage.getItem(this.dbName + '_users') || '[]');
    }

    getHospitals() {
        const users = this.getUsers();
        return [...new Set(users.map(u => u.hospital))].filter(Boolean);
    }

    saveData(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }

    // Public: Get all medicines with optional filters
    async getMedicines(medQuery = '', hospitalQuery = '', categoryQuery = '') {
        const data = this.getData();
        const lowerMed = medQuery.toLowerCase();
        const lowerHosp = hospitalQuery.toLowerCase();
        // Exact match usually better for category dropdown, but case-insensitive safety
        const lowerCat = categoryQuery.toLowerCase();

        return data.filter(item => {
            const matchesMed = !medQuery || item.name.toLowerCase().includes(lowerMed) || item.category.toLowerCase().includes(lowerMed);
            // Case-insensitive legacy check for hospital field (some might be missing in older data)
            const itemHospital = item.hospital || '';
            const matchesHosp = !hospitalQuery || itemHospital.toLowerCase().includes(lowerHosp);

            const matchesCat = !categoryQuery || item.category.toLowerCase().includes(lowerCat);

            return matchesMed && matchesHosp && matchesCat;
        });
    }

    // Staff: Login
    async login(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        return user || null;
    }

    // Staff: Toggle Availability
    async toggleAvailability(id) {
        const data = this.getData();
        const itemIndex = data.findIndex(i => i.id === id);
        if (itemIndex > -1) {
            const currentStatus = data[itemIndex].status;
            data[itemIndex].status = currentStatus === 'Available' ? 'Out of Stock' : 'Available';
            data[itemIndex].lastUpdated = new Date().toISOString();
            this.saveData(data);
            return true;
        }
        return false;
    }

    // Staff: Delete Medicine (NEW)
    async deleteMedicine(id) {
        let data = this.getData();
        const initialLength = data.length;
        data = data.filter(item => item.id !== id);
        this.saveData(data);
        return data.length < initialLength;
    }

    // Staff: Add Medicine
    async addMedicine(medicine) {
        const data = this.getData();
        const newId = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
        const newItem = {
            id: newId,
            ...medicine,
            status: 'Available',
            lastUpdated: new Date().toISOString()
        };
        data.push(newItem);
        this.saveData(data);
        return newItem;
    }
    // Super Admin: Register New Hospital (User)
    async registerUser(username, password, hospital) {
        const users = this.getUsers();
        if (users.find(u => u.username === username)) {
            return false; // User already exists
        }
        users.push({ username, password, hospital });
        localStorage.setItem(this.dbName + '_users', JSON.stringify(users));
        return true;
    }
}

// Global instance
const api = new MockAPI();
