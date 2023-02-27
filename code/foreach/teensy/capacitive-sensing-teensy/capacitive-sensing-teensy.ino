#include <Wire.h>

int pins[12] = {0, 1, 15, 16, 17, 18, 19, 22, 23, 25, 32, 33};

void setup() {

  // put your setup code here, to run once:
  Serial.begin(115200);

  while (!Serial) { // needed to keep leonardo/micro from starting too fast!
    delay(10);
  }

}

void loop() {
  int sensor_value[12];
  for(int i = 0; i < 12; i++) {
    sensor_value[i] = touchRead(pins[i]);
  }
  //
  for(int i = 0; i < 12; i++) {
    Serial.print(sensor_value[i]);
    if(i < 11) {
      Serial.print(",");
    }
  }
  Serial.print("\n");
  delay(1);
}
