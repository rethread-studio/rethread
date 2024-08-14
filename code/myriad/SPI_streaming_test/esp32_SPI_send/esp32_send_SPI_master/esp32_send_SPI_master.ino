#include <SPI.h>


static const int spiClk = 1000000; // 1 MHz
#define HSPI_MISO   12
#define HSPI_MOSI   13
#define HSPI_CLK    14
#define HSPI_SS     15

SPIClass * hspi = NULL;

byte number = 0;
int ostinato_index =  0;
uint8_t ostinato[16] = {0, 1, 2, 4, 3, 5, 4, 3, 2, 3, 1, 6, 4, 3, 2, 1};

void setup() {
  // put your setup code here, to run once:
  // Serial.begin(115200);
  // Serial.print("MOSI Pin: ");
  // Serial.println(HSPI_MOSI);
  // Serial.print("MISO Pin: ");
  // Serial.println(HSPI_MISO);
  // Serial.print("SCK Pin: ");
  // Serial.println(HSPI_CLK);
  // Serial.print("SS Pin: ");
  // Serial.println(HSPI_SS);

  pinMode(HSPI_SS, OUTPUT);

  hspi = new SPIClass(HSPI);

  hspi->begin(HSPI_CLK, HSPI_MISO, HSPI_MOSI, HSPI_SS);
}

void loop() {
  // put your main code here, to run repeatedly:
  hspiCommand();
  delay(100);
}

void hspiCommand() {
  byte stuff = 0b11001100;
  
  hspi->beginTransaction(SPISettings(spiClk, MSBFIRST, SPI_MODE0));
  digitalWrite(HSPI_SS, LOW);
  hspi->transfer(ostinato[ostinato_index]);
  digitalWrite(HSPI_SS, HIGH);
  hspi->endTransaction();

  ostinato_index = (ostinato_index+1)%16;
  size_t rand_index = esp_random() % 16;
  ostinato[rand_index] = esp_random() % 16;
}