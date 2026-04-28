/* Includes ------------------------------------------------------------------*/
#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include "ImageData.h"
#include <stdlib.h>

/* Slideshow Configuration ---------------------------------------------------*/
const unsigned char* image_slideshow[] = {
  gImage0, 
  gImage1
  // gImage2
};

const int NUM_IMAGES = sizeof(image_slideshow) / sizeof(image_slideshow[0]);
int currentImageIndex = 0;

// Global pointer for the image buffer
UBYTE *BlackImage;

/* Entry point ----------------------------------------------------------------*/
void setup()
{
  printf("EPD_7IN5_V2_test Slideshow Demo\r\n");
  DEV_Module_Init();

  // Calculate required memory size for the image buffer
  UWORD Imagesize = ((EPD_7IN5_V2_WIDTH % 8 == 0) ? (EPD_7IN5_V2_WIDTH / 8 ) : (EPD_7IN5_V2_WIDTH / 8 + 1)) * EPD_7IN5_V2_HEIGHT;
  
  // Allocate memory once during setup
  if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
    printf("Failed to apply for black memory...\r\n");
    while (1); // Halt execution if memory allocation fails
  }
  
  printf("Paint_NewImage initialized\r\n");
  Paint_NewImage(BlackImage, EPD_7IN5_V2_WIDTH, EPD_7IN5_V2_HEIGHT, 0, WHITE);
  
  EPD_7IN5_V2_Init();
  EPD_7IN5_V2_Clear();
  EPD_7IN5_V2_Sleep();
}

/* The main loop -------------------------------------------------------------*/
void loop()
{
  printf("Waking up display for Image %d\r\n", currentImageIndex);
  
  // 1. Initialize/Wake up the display
  EPD_7IN5_V2_Init();

  // 2. Prepare the image in the memory buffer
  Paint_SelectImage(BlackImage);
  Paint_Clear(WHITE);
  Paint_DrawBitMap(image_slideshow[currentImageIndex]);

  // 3. Send the buffer to the e-Paper display
  EPD_7IN5_V2_Display(BlackImage);

  // 4. Put the display back to sleep to protect it
  printf("Goto Sleep...\r\n");
  EPD_7IN5_V2_Sleep();

  // 5. Update index for the next loop
  currentImageIndex++;
  if (currentImageIndex >= NUM_IMAGES) {
    currentImageIndex = 0; // Loop back to the first image
  }

  // 6. Wait before showing the next image
  delay(30000); // in milliseconds
}