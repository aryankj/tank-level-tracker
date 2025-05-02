'''
us100-publisher.py
defines a program for using the us100 sensor to calibrate the size of the "tank",
collect distance measurements and convert them to "% of container full", then send
the resulting value to an MQTT broker using secure MQTT over websockets.

Authors:
Steven McKelvey (smm56)
Aryan Jha (akj22)

Calvin University
CS326, Dr. Derek Schuurman
Spring 2025
'''

import time
import board
from adafruit_hcsr04 import HCSR04
import paho.mqtt.client as mqtt

# MQTT Broker details
BROKER = "" # add broker
PORT = 8083  # Secure WebSocket port
USERNAME = "" # add username
PASSWORD = "" # add password
TOPIC = "/waterprojsensor"
PATH = "/mqtt"  # WebSocket path

# hardware pins
TRIG_PIN = board.D6
ECHO_PIN = board.D5

# length between samples in seconds
PUBLISH_SPEED = .5

# window size for moving average filter
WINDOW_SIZE = 15

# Create MQTT client with WebSockets. Declare globally for use in most functions
client = mqtt.Client(client_id="mqtt_python_pub", transport="websockets")

# Callback when the client connects to the broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(" Connected to MQTT broker!")

    else:
        print(f" Connection failed with code {rc}")

def setup_mqtt():
    # Set username & password
    client.username_pw_set(USERNAME, PASSWORD)

    # Set WebSocket path (IMPORTANT)
    client.ws_set_options(path=PATH)

    # Assign callback functions
    client.on_connect = on_connect

    # Connect to broker
    client.tls_set()  # Enable SSL/TLS for secure WebSocket
    client.connect(BROKER, PORT, keepalive=60)

def calibrate_size():
    print("calibrating...\nThis calibration assumes that the container being measured is EMPTY\n")
    container_size = 0 # initial size
    # get an average size from <iterations> samples collected over <time_to_calibrate> seconds
    iterations = 10 # number of iterations to base the calibration on
    time_to_calibrate = 5 # seconds
    sleep_time = time_to_calibrate / iterations # collect "iterations" samples over "time_to_calibrate" seconds
    
    with HCSR04(trigger_pin=board.D6, echo_pin=board.D5) as sonar:
        for i in range(iterations):
            container_size += sonar.distance
            time.sleep(sleep_time)
    container_size /= iterations # average

    print(f"finished calibrating, container size is {container_size}")
    return container_size

'''
Periodically publish data from the us100 sensor to the mqtt broker
@param container_size: the distance from the sensor to the bottom of the container being filled
@param stopping_distance: the minimum distance to keep between the sensor and the fluid in the container.
                        A signal to stop filling the container should be sent when this threshold is passed.
'''
def publish_distance(container_size, stopping_distance):
    # base code (for retrieving sonar.distance) from CircuitPython documentation (https://github.com/adafruit/Adafruit_CircuitPython_HCSR04)
    
    # values for moving average filter
    value_array = [container_size] * WINDOW_SIZE
    current_average = container_size
    oldest_value = 0
    # main loop
    with HCSR04(trigger_pin=TRIG_PIN, echo_pin=ECHO_PIN) as sonar:
        try:
            while True:
                # filtering done to smooth the output since water can have ripples/waves
                new_measurement = sonar.distance # raw value from sensor
                # replace the oldest value with the newest value
                value_array[oldest_value] = new_measurement
                oldest_value = (oldest_value + 1) % WINDOW_SIZE
                current_average = sum(value_array) / WINDOW_SIZE

                # technically gives you the percentage EMPTY (since distance goes down as the container fills), so we subtract it from 100
                percentage = 100 - (((current_average - stopping_distance) * 100) // (container_size - stopping_distance)) # return the percentage of the tank that is full
                # if (due to the way the container size is calibrated) the percentages are below 0 or above 100, round to 0 or 100 respectively
                percentage = 0 if percentage < 0 else (100 if percentage > 100 else percentage)
                client.publish(TOPIC, percentage)
                print(f" Published '{percentage}' to topic '{TOPIC}'")
                time.sleep(PUBLISH_SPEED)
        except KeyboardInterrupt:
            client.disconnect()
            pass

print("starting us100 sensor publisher")
setup_mqtt()
publish_distance(container_size=calibrate_size(), stopping_distance=2)
