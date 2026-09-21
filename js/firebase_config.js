/**
 * Firebase Realtime Database Configuration & Mock Simulation Layer
 * 
 * Provides transparent switching between live Firebase Realtime Database
 * and an offline/mock in-memory simulation for local testing.
 */

// Production / Development Firebase Credentials
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBZvpPhp2t72M42Qp6pcCRBpNs4AjMJj4E",
  authDomain: "smart-dustbin-b0686.firebaseapp.com",
  databaseURL: "https://smart-dustbin-b0686-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-dustbin-b0686",
  storageBucket: "smart-dustbin-b0686.firebasestorage.app",
  messagingSenderId: "1082725598537",
  appId: "1:1082725598537:web:8d0e2d148d71b8dea30698",
  measurementId: "G-4Y82SYWY91"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

class SmartBinDatabaseService {
  constructor() {
    this.isMock = true; // Default to mock mode for offline / test evaluation
    this.listeners = [];
    this.bins = [];
    this.simulationTimer = null;
    this.init();
  }

  init() {
    console.log("[SmartBinDB] Initializing Database Service (Mode: Mock Simulation)");
    // Load from localStorage or fallback to INITIAL_MOCK_BINS
    const saved = localStorage.getItem("smart_dustbin_state");
    if (saved) {
      try {
        this.bins = JSON.parse(saved);
      } catch (e) {
        this.bins = [...(window.INITIAL_MOCK_BINS || [])];
      }
    } else {
      this.bins = [...(window.INITIAL_MOCK_BINS || [])];
      this.persist();
    }
  }

  persist() {
    localStorage.setItem("smart_dustbin_state", JSON.stringify(this.bins));
  }

  /**
   * Subscribe to live updates
   * @param {Function} callback receives bins array
   */
  onValue(callback) {
    this.listeners.push(callback);
    // Immediately emit current state
    callback(this.bins);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.persist();
    for (const listener of this.listeners) {
      listener(this.bins);
    }
  }

  /**
   * Fetch all bins
   */
  async getBins() {
    return [...this.bins];
  }

  /**
   * Update a specific bin
   */
  async updateBin(binId, partialData) {
    const idx = this.bins.findIndex(b => b.id === binId);
    if (idx !== -1) {
      this.bins[idx] = {
        ...this.bins[idx],
        ...partialData,
        lastUpdated: new Date().toISOString()
      };
      // Recalculate status based on fill percentage
      const fill = this.bins[idx].fillPercentage;
      if (fill >= 80) this.bins[idx].status = "Critical";
      else if (fill >= 50) this.bins[idx].status = "Warning";
      else this.bins[idx].status = "Normal";

      this.notifyListeners();
      return this.bins[idx];
    }
    return null;
  }

  /**
   * Simulate a disposal event (e.g. from IoT trigger or BLE open event)
   */
  simulateDeposit(binId = "SmartBin-1", isBio = true) {
    const bin = this.bins.find(b => b.id === binId);
    if (!bin) return;

    const newBio = isBio ? bin.biodegradableCount + 1 : bin.biodegradableCount;
    const newNonBio = !isBio ? bin.nonBiodegradableCount + 1 : bin.nonBiodegradableCount;
    const newFill = Math.min(100, bin.fillPercentage + Math.floor(Math.random() * 5) + 2);

    this.updateBin(binId, {
      biodegradableCount: newBio,
      nonBiodegradableCount: newNonBio,
      fillPercentage: newFill,
      lidStatus: "Closed"
    });
  }

  /**
   * Reset data to initial mock state
   */
  resetToDefaults() {
    this.bins = JSON.parse(JSON.stringify(window.INITIAL_MOCK_BINS || []));
    this.notifyListeners();
  }

  /**
   * Start periodic simulation of waste collection & disposal
   */
  startAutoSimulation(intervalMs = 8000) {
    if (this.simulationTimer) return;
    console.log("[SmartBinDB] Auto simulation enabled.");
    this.simulationTimer = setInterval(() => {
      // Pick random bin
      if (this.bins.length === 0) return;
      const randomBin = this.bins[Math.floor(Math.random() * this.bins.length)];
      const isBio = Math.random() > 0.45;
      this.simulateDeposit(randomBin.id, isBio);
    }, intervalMs);
  }

  stopAutoSimulation() {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
      console.log("[SmartBinDB] Auto simulation stopped.");
    }
  }
}

// Global Singleton Database Instance
const smartBinDB = new SmartBinDatabaseService();
window.smartBinDB = smartBinDB;
window.firebaseConfig = firebaseConfig;

