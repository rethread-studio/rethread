#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include "imagedata.h"
#include <stdlib.h>

void setup() {
    printf("EPD_7IN3F_test Demo\r\n");
    DEV_Module_Init();

    printf("e-Paper Init and Clear...\r\n");
    EPD_7IN3F_Init();

    EPD_7IN3F_Clear(EPD_7IN3F_WHITE); // WHITE
    DEV_Delay_ms(1000);

    //Create a new image cache
    UBYTE *BlackImage;
    UDOUBLE Imagesize = ((EPD_7IN3F_WIDTH % 2 == 0)? (EPD_7IN3F_WIDTH / 2 ): (EPD_7IN3F_WIDTH / 2 + 1)) * EPD_7IN3F_HEIGHT;
    if((BlackImage = (UBYTE *)malloc(Imagesize/2)) == NULL) {
        printf("Failed to apply for black memory...\r\n");
        while (1);
    }
    printf("Paint_NewImage\r\n");
    Paint_NewImage(BlackImage, EPD_7IN3F_WIDTH, EPD_7IN3F_HEIGHT/2, 0, EPD_7IN3F_WHITE);
    Paint_SetScale(7);

#if 1   // show bmp
    printf("show bmp1-----------------\r\n");
    EPD_7IN3F_Display(gImage_7fin3f);
    DEV_Delay_ms(3000);
#endif

#if 1   // Drawing on the image
    // 1.Select Image
    printf("SelectImage:BlackImage\r\n");
    Paint_SelectImage(BlackImage);
    Paint_Clear(EPD_7IN3F_WHITE);

    // 2.Drawing on the image
    printf("Drawing:BlackImage\r\n");
    Paint_DrawPoint(10, 80, EPD_7IN3F_RED, DOT_PIXEL_1X1, DOT_STYLE_DFT);
    Paint_DrawPoint(10, 90, EPD_7IN3F_BLUE, DOT_PIXEL_2X2, DOT_STYLE_DFT);
    Paint_DrawPoint(10, 100, EPD_7IN3F_GREEN, DOT_PIXEL_3X3, DOT_STYLE_DFT);
    Paint_DrawLine(20, 70, 70, 120, EPD_7IN3F_ORANGE, DOT_PIXEL_1X1, LINE_STYLE_SOLID);
    Paint_DrawLine(70, 70, 20, 120, EPD_7IN3F_ORANGE, DOT_PIXEL_1X1, LINE_STYLE_SOLID);
    Paint_DrawRectangle(20, 70, 70, 120, EPD_7IN3F_BLACK, DOT_PIXEL_1X1, DRAW_FILL_EMPTY);
    Paint_DrawRectangle(80, 70, 130, 120, EPD_7IN3F_BLACK, DOT_PIXEL_1X1, DRAW_FILL_FULL);
    Paint_DrawCircle(45, 95, 20, EPD_7IN3F_BLACK, DOT_PIXEL_1X1, DRAW_FILL_EMPTY);
    Paint_DrawCircle(105, 95, 20, EPD_7IN3F_WHITE, DOT_PIXEL_1X1, DRAW_FILL_FULL);
    Paint_DrawLine(85, 95, 125, 95, EPD_7IN3F_YELLOW, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
    Paint_DrawLine(105, 75, 105, 115, EPD_7IN3F_YELLOW, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
    Paint_DrawString_CN(10, 160, "你好abc", &Font12CN, EPD_7IN3F_BLACK, EPD_7IN3F_WHITE);
    Paint_DrawString_CN(10, 180, "微雪电子", &Font24CN, EPD_7IN3F_WHITE, EPD_7IN3F_BLACK);
    Paint_DrawNum(10, 33, 123456789, &Font12, EPD_7IN3F_BLACK, EPD_7IN3F_WHITE);
    Paint_DrawNum(10, 50, 987654321, &Font16, EPD_7IN3F_WHITE, EPD_7IN3F_BLACK);
    Paint_DrawString_EN(400, 0, "waveshare", &Font16, EPD_7IN3F_BLACK, EPD_7IN3F_WHITE);
    Paint_DrawString_EN(400, 20, "waveshare", &Font16, EPD_7IN3F_GREEN, EPD_7IN3F_WHITE);
    Paint_DrawString_EN(400, 40, "waveshare", &Font16, EPD_7IN3F_BLUE, EPD_7IN3F_WHITE);
    Paint_DrawString_EN(400, 60, "waveshare", &Font16, EPD_7IN3F_RED, EPD_7IN3F_WHITE);
    Paint_DrawString_EN(400, 80, "waveshare", &Font16, EPD_7IN3F_YELLOW, EPD_7IN3F_WHITE);
    Paint_DrawString_EN(400, 100, "waveshare", &Font16, EPD_7IN3F_ORANGE, EPD_7IN3F_WHITE);
    Paint_DrawString_EN(150, 0, "hello world", &Font24, EPD_7IN3F_WHITE, EPD_7IN3F_BLACK);
    Paint_DrawString_EN(150, 30, "hello world", &Font24, EPD_7IN3F_GREEN, EPD_7IN3F_BLACK);
    Paint_DrawString_EN(150, 60, "hello world", &Font24, EPD_7IN3F_BLUE, EPD_7IN3F_BLACK);
    Paint_DrawString_EN(150, 90, "hello world", &Font24, EPD_7IN3F_RED, EPD_7IN3F_BLACK);
    Paint_DrawString_EN(150, 120, "hello world", &Font24, EPD_7IN3F_YELLOW, EPD_7IN3F_BLACK);
    Paint_DrawString_EN(150, 150, "hello world", &Font24, EPD_7IN3F_ORANGE, EPD_7IN3F_BLACK);
    Paint_DrawString_EN(150, 180, "hello world", &Font24, EPD_7IN3F_BLACK, EPD_7IN3F_YELLOW);

    printf("EPD_Display\r\n");
    EPD_7IN3F_DisplayPart(BlackImage, 0, 0, 800, 240);
    DEV_Delay_ms(3000);
#endif

    printf("Clear...\r\n");
    EPD_7IN3F_Clear(EPD_7IN3F_WHITE);

    printf("Goto Sleep...\r\n");
    EPD_7IN3F_Sleep();
    free(BlackImage);
    BlackImage = NULL;
    DEV_Delay_ms(2000); // important, at least 2s
    // close 5V
    printf("close 5V, Module enters 0 power consumption ...\r\n");
}

/* The main loop -------------------------------------------------------------*/
void loop()
{
  //
}
