# Tank Level Tracker

This project is a working prototype for monitoring the water level in rooftop tanks, which are commonly found in developing countries.

By monitoring the water level, users can easily determine when to turn on the electric water motor to fill the tank. Additionally, with push notifications, users are alerted when it's time to turn off the motor to avoid overflow.

## 🔧 Technical Summary

- **Mobile App**: Built with [React Native](https://reactnative.dev/), supporting Android, iOS, and Web via cross-platform compatibility.
- **Sensor**: A **US-100** ultrasonic sensor is used to measure the water level.
- **Data Pipeline**:
  - The US-100 sensor sends readings to a **Raspberry Pi**.
  - The Pi publishes these readings to a **password-protected MQTT broker**.
- **Realtime Display**: 
  - The mobile app subscribes to the same MQTT topic.
  - It displays the current water level in a clean, minimal UI.
- **Notifications**: Push notifications are sent to alert users when action is needed (e.g. prevent overflow).

---
