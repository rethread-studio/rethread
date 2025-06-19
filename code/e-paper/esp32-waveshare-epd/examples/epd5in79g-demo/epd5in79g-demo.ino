#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include "imagedata.h"
#include <stdlib.h>

void setup() {
    printf("EPD_3IN0G_test Demo\r\n");
    DEV_Module_Init();

    printf("e-Paper Init and Clear...\r\n");
    EPD_5in79g_Init();
    EPD_5in79g_Clear(EPD_5in79G_WHITE);
    DEV_Delay_ms(500);

    //Create a new image cache named IMAGE_BW and fill it with white
    UBYTE *BlackImage;
    UWORD Imagesize = ((EPD_5in79G_WIDTH % 4 == 0)? (EPD_5in79G_WIDTH / 4 ):(EPD_5in79G_WIDTH / 4 + 1)) * EPD_5in79G_HEIGHT;
    if((BlackImage = (UBYTE *)malloc(Imagesize/4)) == NULL) {
        printf("Failed to apply for black memory...\r\n");
        while(1);
    }

    printf("NewImage:BlackImage and RYImage\r\n");
    Paint_NewImage(BlackImage, EPD_5in79G_WIDTH/2, EPD_5in79G_HEIGHT/2, 0, WHITE);
    Paint_SetScale(4);

    //Select Image
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);

#if 1   // show bmp
    printf("show red bmp------------------------\r\n");
    EPD_5in79g_Display(gImage_5in79g);
    DEV_Delay_ms(2000);
#endif

#if 1   // Drawing on the image
    //1.Select Image
    printf("SelectImage:BlackImage\r\n");
    Paint_SelectImage(BlackImage);
    Paint_Clear(EPD_5in79G_WHITE);

    // 2.Drawing on the image
    printf("Drawing:BlackImage\r\n");
    Paint_DrawPoint(10, 80, EPD_5in79G_BLACK, DOT_PIXEL_1X1, DOT_STYLE_DFT);
    Paint_DrawPoint(10, 90, EPD_5in79G_YELLOW, DOT_PIXEL_2X2, DOT_STYLE_DFT);
    Paint_DrawPoint(10, 100, EPD_5in79G_RED, DOT_PIXEL_3X3, DOT_STYLE_DFT);
    Paint_DrawLine(20, 70, 70, 120, EPD_5in79G_BLACK, DOT_PIXEL_1X1, LINE_STYLE_SOLID);
    Paint_DrawLine(70, 70, 20, 120, EPD_5in79G_BLACK, DOT_PIXEL_1X1, LINE_STYLE_SOLID);
    Paint_DrawRectangle(20, 70, 70, 120, EPD_5in79G_YELLOW, DOT_PIXEL_1X1, DRAW_FILL_EMPTY);
    Paint_DrawRectangle(80, 70, 130, 120, EPD_5in79G_BLACK, DOT_PIXEL_1X1, DRAW_FILL_FULL);
    Paint_DrawCircle(45, 95, 20, EPD_5in79G_RED, DOT_PIXEL_1X1, DRAW_FILL_EMPTY);
    Paint_DrawCircle(105, 95, 20, EPD_5in79G_RED, DOT_PIXEL_1X1, DRAW_FILL_FULL);
    Paint_DrawLine(85, 95, 125, 95, EPD_5in79G_BLACK, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
    Paint_DrawLine(105, 75, 105, 115, EPD_5in79G_WHITE, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
    Paint_DrawString_EN(10, 10, "Red, yellow, white and black", &Font16, EPD_5in79G_BLACK, EPD_5in79G_WHITE);
    Paint_DrawString_EN(10, 30, "Four color e-Paper", &Font12, EPD_5in79G_WHITE, EPD_5in79G_RED);
    Paint_DrawNum(10, 50, 123456, &Font12, EPD_5in79G_BLACK, EPD_5in79G_YELLOW);

    printf("EPD_Display\r\n");
    EPD_5in79g_Display_Partial(BlackImage);
    DEV_Delay_ms(3000);
#endif

    printf("Clear...\r\n");
    EPD_5in79g_Clear(EPD_5in79G_WHITE);

    printf("Goto Sleep...\r\n");
    EPD_5in79g_Sleep();
    free(BlackImage);
    BlackImage = NULL;
    DEV_Delay_ms(2000);//important, at least 2s
    // close 5V
    printf("close 5V, Module enters 0 power consumption ...\r\n");
}

/* The main loop -------------------------------------------------------------*/
void loop()
{
  //
}
