/* Includes ------------------------------------------------------------------*/
#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include <stdlib.h>

/* Entry point ----------------------------------------------------------------*/
void setup() {
  printf("EPD_7IN5_V2_test Demo\r\n");
  DEV_Module_Init();

  printf("e-Paper Init and Clear...\r\n");
  EPD_7IN5_V2_Init();
  EPD_7IN5_V2_Clear();
  //DEV_Delay_ms(500);

  //Create a new image cache
  UBYTE *canvas;
  /* you have to edit the startup_stm32fxxx.s file and set a big enough heap size */
  UWORD Imagesize = ((EPD_7IN5_V2_WIDTH % 8 == 0) ? (EPD_7IN5_V2_WIDTH / 8) : (EPD_7IN5_V2_WIDTH / 8 + 1)) * EPD_7IN5_V2_HEIGHT;
  if ((canvas = (UBYTE *)malloc(Imagesize)) == NULL) {
    printf("Failed to apply for black memory...\r\n");
    while (1)
      ;
  }
#if 1  //Partial refresh, example shows time
  EPD_7IN5_V2_Init_Part();
  // Partial update size seems to have to be a power of 2 or a multiple of 8 or similar
  int width = 8;
  int height = 8;
  Paint_NewImage(canvas, width, height, 0, WHITE);
  Debug("Partial refresh\r\n");
  Paint_SelectImage(canvas);
  Paint_Clear(BLACK);

  int counter = 0;
  // Paint_Clear(BLACK);
  // Paint_DrawPoint(1, 1, BLACK, DOT_PIXEL_1X1, DOT_STYLE_DFT);
  while (1) {
    if (random(100) > 98) {
      Paint_Clear(WHITE);
    }

    // Paint_ClearWindows(0, 0, width, height, WHITE);
    for(int i = 0; i < 2; i++) {
      Paint_DrawPoint(random(width+1), random(width+1), BLACK, DOT_PIXEL_1X1, DOT_STYLE_DFT);
      Paint_DrawPoint(random(width+1), random(width+1), WHITE, DOT_PIXEL_1X1, DOT_STYLE_DFT);
    }
    //       Paint_DrawPoint(10, 90, BLACK, DOT_PIXEL_2X2, DOT_STYLE_DFT);
    // Paint_DrawPoint(10, 100, BLACK, DOT_PIXEL_3X3, DOT_STYLE_DFT);

    // int x = random(800-width);
    // int y = random(480-height);
    int x = ((counter * width) + 1) % 800;
    int y = ((((counter * width) / 800) * height) + 1) % 480;
    printf("x: %d, y: %d \n", x, y);
    EPD_7IN5_V2_Display_Part(canvas, x, y, x + width, y + height);
    // DEV_Delay_ms(5); // Not necessary, it will draw as fast as it can without it
    counter += 1;
  }
#endif

  printf("Goto Sleep...\r\n");
  EPD_7IN5_V2_Sleep();
  free(canvas);
  canvas = NULL;
}

/* The main loop -------------------------------------------------------------*/
void loop() {
  //
}
