/**
 * SmartBin OS
 * Firebase Realtime Database Service
 */

// Firebase Compat SDK
const firebaseConfig = {
  apiKey: "AIzaSyBZvpPhp2t72M42Qp6pcCRBpNs4jMJj4E",
  authDomain: "smart-dustbin-b0686.firebaseapp.com",
  databaseURL: "https://smart-dustbin-b0686-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-dustbin-b0686",
  storageBucket: "smart-dustbin-b0686.firebasestorage.app",
  messagingSenderId: "1082725598537",
  appId: "1:1082725598537:web:8d0e2d148d71b8dea30698",
  measurementId: "G-4Y82SYWY91"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const database = firebase.database();


class SmartBinDatabaseService {

  constructor() {
    this.listeners = [];
    this.bins = [];
    this.binsRef = database.ref("/bins");

    this.init();
  }


  init() {

    console.log(
      "[SmartBinDB] Initializing Firebase Realtime Database..."
    );

    // Listen for REAL Firebase changes
    this.binsRef.on(
      "value",
      (snapshot) => {

        const data = snapshot.val();

        console.log(
          "[SmartBinDB] Firebase data received:",
          data
        );

        if (!data) {
          this.bins = [];
        } else {

          this.bins = Object.values(data).map(bin => {

            return {
              id: bin.id || "Unknown",
              name: bin.name || "Unknown Location",

              lat: bin.location?.lat || 19.0760,
              lng: bin.location?.lng || 72.8777,

              fillPercentage: Number(
                bin.fill_percentage || 0
              ),

              biodegradableCount: Number(
                bin.biodegradable_count || 0
              ),

              nonBiodegradableCount: Number(
                bin.non_biodegradable_count || 0
              ),

              batteryLevel: Number(
                bin.battery_level || 95
              ),

              lidStatus:
                bin.lid_status || "Closed",

              lastUpdated:
                bin.last_updated ||
                new Date().toISOString(),

              status:
                bin.status || "Normal"
            };

          });
        }

        // Send Firebase data to dashboard
        this.notifyListeners();

      },
      (error) => {

        console.error(
          "[SmartBinDB] Firebase error:",
          error
        );

      }
    );
  }


  /**
   * Subscribe dashboard to Firebase updates
   */
  onValue(callback) {

    this.listeners.push(callback);

    // Send current data immediately
    if (this.bins.length > 0) {
      callback(this.bins);
    }

    return () => {

      this.listeners =
        this.listeners.filter(
          cb => cb !== callback
        );

    };
  }


  /**
   * Notify dashboard listeners
   */
  notifyListeners() {

    for (const listener of this.listeners) {

      listener(this.bins);

    }

  }


  /**
   * Get current bins
   */
  async getBins() {

    return [...this.bins];

  }


  /**
   * Simulate deposit directly in Firebase
   *
   * Useful for testing the dashboard.
   */
  async simulateDeposit(
    binId = "SmartBin-1",
    isBio = true
  ) {

    const binRef =
      database.ref(`/bins/${binId}`);

    const snapshot =
      await binRef.once("value");

    const bin = snapshot.val();

    if (!bin) {

      console.error(
        "Bin not found:",
        binId
      );

      return;

    }

    const currentBio =
      Number(bin.biodegradable_count || 0);

    const currentNonBio =
      Number(bin.non_biodegradable_count || 0);


    const updates = {};

    if (isBio) {

      updates.biodegradable_count =
        currentBio + 1;

    } else {

      updates.non_biodegradable_count =
        currentNonBio + 1;

    }


    updates.last_updated =
      new Date().toISOString();


    await binRef.update(updates);

    console.log(
      "[SmartBinDB] Firebase deposit:",
      isBio
        ? "BIODEGRADABLE"
        : "NON-BIODEGRADABLE"
    );

  }


  /**
   * Start dashboard-side simulation
   */
  startAutoSimulation(intervalMs = 8000) {

    if (this.simulationTimer) return;

    console.log(
      "[SmartBinDB] Firebase auto simulation enabled."
    );

    this.simulationTimer =
      setInterval(async () => {

        if (this.bins.length === 0) return;

        const randomBin =
          this.bins[
            Math.floor(
              Math.random() *
              this.bins.length
            )
          ];

        const isBio =
          Math.random() > 0.45;

        await this.simulateDeposit(
          randomBin.id,
          isBio
        );

      }, intervalMs);

  }


  stopAutoSimulation() {

    if (this.simulationTimer) {

      clearInterval(
        this.simulationTimer
      );

      this.simulationTimer = null;

      console.log(
        "[SmartBinDB] Auto simulation stopped."
      );

    }

  }

}


// Create global service
const smartBinDB =
  new SmartBinDatabaseService();

window.smartBinDB =
  smartBinDB;

window.firebaseConfig =
  firebaseConfig;
