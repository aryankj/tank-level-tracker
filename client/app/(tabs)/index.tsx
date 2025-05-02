{
  /*
   * Authors: Aryan Jha (akj22) and Steven McKelvey (smm56)
   *
   * The repo was cloned and modified from starter code provided by EMQX:
   * https://github.com/emqx/MQTT-Client-Examples/tree/master/mqtt-client-React-Native-Expo
   *
   * We completely revamped the UI. The MQTT code from the repo is used below.
   */
}
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Switch,
} from "react-native";
import mqtt from "mqtt";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
export default function HomeScreen() {
  const [host, setHost] = useState("iot.cs.calvin.edu");
  const [username, setUsername] = useState("<INSERT USERNAME HERE>");
  const [password, setPassword] = useState("<INSERT PASSWORD HERE>");
  const [subTopic, setSubTopic] = useState("/waterprojsensor");
  const [pubTopic, setPubTopic] = useState("/waterprojmotor");
  const [receivedMsg, setReceivedMsg] = useState("95");
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);

  const protocol = "wss";
  const path = "/mqtt";
  const port = 8083;

  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Request permissions when the app starts
  const registerForPushNotifications = async () => {
    if (Constants.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        alert("Failed to get push token for push notifications!");
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Expo Push Token:", token);
    } else {
      alert("Must use a physical device for Push Notifications");
    }
  };

  const doConnect = () => {
    try {
      const clientId = `calvin-${new Date().getTime()}`;
      const newClient = mqtt.connect(`${protocol}://${host}:${port}${path}`, {
        clientId,
        username,
        password,
        reconnectPeriod: 1000,
        connectTimeout: 600 * 1000,
        // more options, refer to https://github.com/mqttjs/MQTT.js#mqttclientstreambuilder-options
      });

      setClient(newClient);
      // Subscribe after connecting
      newClient.subscribe(subTopic, { qos: 0 }, (error) => {
        if (error) {
          console.error("Subscription error:", error);
        } else {
          console.log("Successfully subscribed to:", subTopic);
        }
      });

      newClient.on("error", (error) => {
        console.log("onError", error);
      });

      newClient.on("message", async (topic, payload) => {
        // console.log(payload)
        const receivedValue = Number(payload.toString());
        console.log(`Received message on ${topic}: ${receivedValue}`);
        setReceivedMsg(receivedValue.toString());

        // Send push notification if water level is greater than 90
        if (receivedValue > 90) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Tank Almost Full!",
              body: `Your tank is at ${receivedValue}% capacity.`,
              sound: "default",
            },
            trigger: null, // Immediate notification
          });
        }
      });

      newClient.on("offline", () => {
        console.log("offline");
      });
    } catch (error) {
      console.log("catch error:", error);
    }
  };

  const doPublish = (val: string) => {
    client?.publish(pubTopic, val, { qos: 0 }, (error) => {
      if (error) {
        console.error("Failed to publish message:", error);
      } else {
        console.log("Message published to topic:", pubTopic);
      }
    });
  };

  const doDisconnect = () => {
    client?.end();
    client?.unsubscribe(subTopic, {}, (error) => {
      if (error) {
        console.error("Failed to unsubscribe from topic:", subTopic, error);
      } else {
        console.log("Unsubscribed from topic:", subTopic);
      }
    });
    setClient(null);
  };

  const [isEnabled, setIsEnabled] = useState(false);
  const toggleSwitch = () => {
    setIsEnabled((previousState) => !previousState);
    // if (isEnabled){
    //  doPublish('2000')
    // }else{
    //   doPublish('1000')
    // }
  };

  useEffect(() => {
    // This function runs only once when the component mounts
    registerForPushNotifications();
    doConnect();
    console.log("Component mounted.");
    // Cleanup function (runs when the component unmounts)
    return () => {
      doDisconnect();
      console.log("Component unmounted");
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centeredView}>
        <Text style={styles.label}>Your Tank Is At</Text>

        {/* Tank visualization */}
        <View style={styles.tankContainer}>
          {/* The empty tank (outer circle) */}
          <View style={styles.tankOuterCircle}>
            {/* The water level (inner fill) - calculate percentage of container height */}
            <View
              style={[
                styles.tankFill,
                {
                  height: (parseInt(receivedMsg) / 100) * 180, // 180px is the height of container
                  //height: sensor-val / 100 * 180  // 180px is the height of container
                },
              ]}
            />

            {/* Percentage text overlay */}
            <View style={styles.percentageTextContainer}>
              <Text style={styles.percentageText}>{`${receivedMsg}%`}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Capacity</Text>

        {/* Toggle Switch */}
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isEnabled ? "#f5dd4b" : "#f4f3f4"}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isEnabled}
          style={styles.toggleSwitch}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: "white",
    padding: 20,
  },
  label: {
    marginBottom: 8,
    color: "#1d1d1d",
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  messages: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
    minHeight: 160,
  },
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  centeredView: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  },
  // Tank container to hold the visualization
  tankContainer: {
    marginVertical: 15,
  },
  // Outer circle (empty tank)
  tankOuterCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: "#3498db",
    backgroundColor: "white",
    overflow: "hidden", // Important: clip the fill inside the circle
    justifyContent: "flex-end", // Align child from bottom
    alignItems: "center",
    position: "relative",
  },
  // Water fill effect
  tankFill: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#3498db",
  },
  // Container for percentage text
  percentageTextContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  // Text style for percentage
  percentageText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  toggleSwitch: {
    marginTop: 20,
  },
});
