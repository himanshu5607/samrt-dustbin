/**
 * SmartBin OS
 * Firebase Realtime Database Service
 */

// ============================================================
// Firebase Configuration
// ============================================================

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


// ============================================================
// Initialize Firebase
// ============================================================

firebase.initializeApp(firebaseConfig);

const database = firebase.database();


// ============================================================
// SmartBin Database Service
// ============================================================

class SmartBinDatabaseService {

  constructor() {

    this.listeners = [];

    this.bins = [];

    this.simulationTimer = null;

    this.binsRef = database.ref("/bins");

    this.init();
  }


  // ==========================================================
  // Firebase Realtime Listener
  // ==========================================================

  init() {

    console.log(
      "[SmartBinDB] Initializing Firebase Realtime Database..."
    );


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

          this.bins = Object.values(data).map(
            (bin) => {

              return {

                // ------------------------------------------------
                // Basic Bin Information
                // ------------------------------------------------

                id:
                  bin.id || "Unknown",

                name:
                  bin.name || "Unknown Location",


                // ------------------------------------------------
                // CURRENT GPS
                // ------------------------------------------------

                lat:
                  Number(
                    bin.location?.lat ?? 19.0760
                  ),

                lng:
                  Number(
                    bin.location?.lng ?? 72.8777
                  ),

                gpsFix:
                  Boolean(
                    bin.location?.gps_fix
                  ),

                gpsSatellites:
                  Number(
                    bin.location?.gps_satellites ?? 0
                  ),

                gpsAltitude:
                  Number(
                    bin.location?.gps_altitude ?? 0
                  ),

                gpsLastUpdate:
                  bin.location?.gps_last_update ||
                  null,


                // ------------------------------------------------
                // LAST KNOWN GPS LOCATION
                // ------------------------------------------------

                lastKnownLat:
                  Number(
                    bin.location?.last_known_lat ??
                    bin.location?.lat ??
                    0
                  ),

                lastKnownLng:
                  Number(
                    bin.location?.last_known_lng ??
                    bin.location?.lng ??
                    0
                  ),

                lastKnownGpsTime:
                  bin.location?.last_known_gps_time ||
                  bin.location?.gps_last_update ||
                  null,


                // ------------------------------------------------
                // WASTE
                // ------------------------------------------------

                fillPercentage:
                  Number(
                    bin.fill_percentage ?? 0
                  ),

                biodegradableCount:
                  Number(
                    bin.biodegradable_count ?? 0
                  ),

                nonBiodegradableCount:
                  Number(
                    bin.non_biodegradable_count ?? 0
                  ),


                // ------------------------------------------------
                // DEVICE
                // ------------------------------------------------

                batteryLevel:
                  Number(
                    bin.battery_level ?? 95
                  ),

                lidStatus:
                  bin.lid_status ||
                  "Closed",

                status:
                  bin.status ||
                  "Normal",


                // ------------------------------------------------
                // TIME
                // ------------------------------------------------

                lastUpdated:
                  bin.last_updated ||
                  new Date().toISOString(),

                lastReset:
                  bin.last_reset ||
                  null,


                // ------------------------------------------------
                // PHASE 1 HISTORY
                // ------------------------------------------------

                fillHistory:
                  bin.fill_history ||
                  {},

                detectionHistory:
                  bin.detection_history ||
                  {},


                // ------------------------------------------------
                // ALERT CENTER
                // ------------------------------------------------

                alerts:
                  bin.alerts ||
                  {},

                deviceHealth: bin.device_health || {},
                lidActivity: bin.lid_activity || {},
                cameraStatus: bin.camera_status || {},
                bleControl: bin.ble_control || {},

              };

            }
          );

        }


        // Notify dashboard
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


  // ==========================================================
  // Dashboard Subscription
  // ==========================================================

  onValue(callback) {

    this.listeners.push(
      callback
    );


    // Immediately send current data
    if (
      this.bins.length > 0
    ) {

      callback(
        this.bins
      );

    }


    // Return unsubscribe function
    return () => {

      this.listeners =
        this.listeners.filter(
          (cb) => cb !== callback
        );

    };

  }


  // ==========================================================
  // Notify Dashboard
  // ==========================================================

  notifyListeners() {

    this.listeners.forEach(
      (listener) => {

        listener(
          this.bins
        );

      }
    );

  }


  // ==========================================================
  // Get Current Bins
  // ==========================================================

  async getBins() {

    return [
      ...this.bins
    ];

  }


  // ==========================================================
  // SIMULATE DEPOSIT
  // ==========================================================

  async simulateDeposit(
    binId = "SmartBin-1",
    isBio = true
  ) {

    try {

      const binRef =
        database.ref(
          `/bins/${binId}`
        );


      const snapshot =
        await binRef.once(
          "value"
        );


      const bin =
        snapshot.val();


      if (!bin) {

        console.error(
          "[SmartBinDB] Bin not found:",
          binId
        );

        return;

      }


      const currentBio =
        Number(
          bin.biodegradable_count || 0
        );


      const currentNonBio =
        Number(
          bin.non_biodegradable_count || 0
        );


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


      await binRef.update(
        updates
      );


      console.log(
        "[SmartBinDB] Firebase deposit:",
        isBio
          ? "BIODEGRADABLE"
          : "NON-BIODEGRADABLE"
      );

    }

    catch (error) {

      console.error(
        "[SmartBinDB] Deposit error:",
        error
      );

    }

  }


  // ==========================================================
  // RESET WASTE COUNTS
  // ==========================================================

  // ==========================================================
// RESET WASTE + AI HISTORY + ALERT CENTER
// ==========================================================

async resetWasteCounts(
  binId = "SmartBin-1",
  resetDate = null
) {

  try {

    const binRef =
      database.ref(
        `/bins/${binId}`
      );

    const date =
      resetDate ||
      new Date().toISOString();

    const updates = {

      // Waste counters
      biodegradable_count: 0,
      non_biodegradable_count: 0,

      // AI Detection History
      detection_history: null,

      // Alert Center
      alerts: null,

      // Reset information
      last_reset: date,
      last_updated: date

    };

    await binRef.update(updates);

    console.log(
      "[SmartBinDB] Waste + AI history + Alert Center reset:",
      binId,
      date
    );

    return date;

  }

  catch (error) {

    console.error(
      "[SmartBinDB] Reset error:",
      error
    );

    throw error;

  }
}
  // ==========================================================
  // ALERT HELPERS
  // ==========================================================

  getAlerts(
    binId = "SmartBin-1"
  ) {

    const bin =
      this.bins.find(
        item => item.id === binId
      );


    if (
      !bin ||
      !bin.alerts
    ) {

      return [];

    }


    return Object.entries(
      bin.alerts
    )

      .map(
        ([id, alert]) => ({

          id,

          ...alert

        })
      )

      .sort(
        (a, b) => {

          const timeA =
            new Date(
              a.timestamp || 0
            ).getTime();


          const timeB =
            new Date(
              b.timestamp || 0
            ).getTime();


          return timeB - timeA;

        }
      );

  }


  // ==========================================================
  // GET ACTIVE ALERTS
  // ==========================================================

  getActiveAlerts(
    binId = null
  ) {

    let alerts = [];


    const binsToCheck =
      binId
        ? this.bins.filter(
            bin => bin.id === binId
          )
        : this.bins;


    binsToCheck.forEach(
      bin => {

        if (
          !bin.alerts
        ) {

          return;

        }


        Object.entries(
          bin.alerts
        ).forEach(
          ([alertId, alert]) => {

            if (
              alert &&
              alert.acknowledged !== true
            ) {

              alerts.push({

                id:
                  alertId,

                binId:
                  bin.id,

                binName:
                  bin.name,

                type:
                  alert.type ||
                  "SYSTEM",

                message:
                  alert.message ||
                  "System alert",

                severity:
                  alert.severity ||
                  "WARNING",

                timestamp:
                  alert.timestamp ||
                  null,

                acknowledged:
                  false

              });

            }

          }
        );

      }
    );


    return alerts.sort(
      (a, b) => {

        const timeA =
          new Date(
            a.timestamp || 0
          ).getTime();


        const timeB =
          new Date(
            b.timestamp || 0
          ).getTime();


        return timeB - timeA;

      }
    );

  }


  // ==========================================================
  // GET ACTIVE ALERT COUNT
  // ==========================================================

  getActiveAlertCount(
    binId = null
  ) {

    return this
      .getActiveAlerts(
        binId
      )
      .length;

  }


  // ==========================================================
  // ACKNOWLEDGE ALERT
  // ==========================================================

  async acknowledgeAlert(
    binId,
    alertId
  ) {

    try {

      const alertRef =
        database.ref(
          `/bins/${binId}/alerts/${alertId}`
        );


      await alertRef.update({

        acknowledged:
          true,

        acknowledged_at:
          new Date().toISOString()

      });


      console.log(
        "[SmartBinDB] Alert acknowledged:",
        binId,
        alertId
      );


      return true;

    }

    catch (error) {

      console.error(
        "[SmartBinDB] Alert acknowledgement error:",
        error
      );


      return false;

    }

  }


  // ==========================================================
  // CLEAR / DELETE ALERT
  // ==========================================================

  async clearAlert(
    binId,
    alertId
  ) {

    try {

      await database
        .ref(
          `/bins/${binId}/alerts/${alertId}`
        )
        .remove();


      console.log(
        "[SmartBinDB] Alert removed:",
        binId,
        alertId
      );


      return true;

    }

    catch (error) {

      console.error(
        "[SmartBinDB] Alert removal error:",
        error
      );


      return false;

    }

  }


  // ==========================================================
  // START AUTOMATIC SIMULATION
  // ==========================================================

  startAutoSimulation(
    intervalMs = 8000
  ) {

    if (
      this.simulationTimer
    ) {

      console.log(
        "[SmartBinDB] Simulation already running."
      );


      return;

    }


    console.log(
      "[SmartBinDB] Firebase auto simulation enabled."
    );


    this.simulationTimer =
      setInterval(
        async () => {

          if (
            this.bins.length === 0
          ) {

            return;

          }


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

        },

        intervalMs
      );

  }


  // ==========================================================
  // STOP AUTOMATIC SIMULATION
  // ==========================================================

  stopAutoSimulation() {

    if (
      this.simulationTimer
    ) {

      clearInterval(
        this.simulationTimer
      );


      this.simulationTimer =
        null;


      console.log(
        "[SmartBinDB] Auto simulation stopped."
      );

    }

  }

}


// ============================================================
// CREATE GLOBAL SERVICE
// ============================================================

const smartBinDB =
  new SmartBinDatabaseService();


window.smartBinDB =
  smartBinDB;


window.firebaseConfig =
  firebaseConfig;


// ============================================================
// GLOBAL ALERT HELPERS
// ============================================================

window.getSmartBinActiveAlerts =
  function(
    binId = null
  ) {

    return smartBinDB.getActiveAlerts(
      binId
    );

  };


window.getSmartBinAlertCount =
  function(
    binId = null
  ) {

    return smartBinDB.getActiveAlertCount(
      binId
    );

  };


console.log(
  "✓ SmartBin Firebase service loaded successfully."
);
