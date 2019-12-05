// This sketch is for testing purposes, it uses the simple circuit for one sensor

#include <CapacitiveSensor.h>

CapacitiveSensor   cs_4_8 = CapacitiveSensor(4,8); // 1M resistor between pins 4 & 8, pin 8 is sensor pin, add a wire and or foil
CapacitiveSensor   cs_7_2 = CapacitiveSensor(7,2); 

void setup()                    
{
   cs_4_8.set_CS_AutocaL_Millis(0xFFFFFFFF);// turn off autocalibrate on channel 1 - just as an example
   Serial.begin(9600);
   pinMode(7,OUTPUT);
}

void loop()                    
{
 long sensor1 =  cs_4_8.capacitiveSensor(50);

   //Serial.println(sensor1);  // print sensor output 
   if(sensor1 >= 1000)
   {
    //digitalWrite(7,HIGH);
    Serial.println("touched");
   }
   else{
    //digitalWrite(7,LOW);
    Serial.println("not touched");
   }  
}
