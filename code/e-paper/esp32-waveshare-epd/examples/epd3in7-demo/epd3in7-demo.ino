#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include "imagedata.h"
#include <stdlib.h>

void setup() {
    printf("EPD_3IN7_test Demo\r\n");
    DEV_Module_Init();

    printf("e-Paper Init and Clear...\r\n");
    EPD_3IN7_4Gray_Init();
    EPD_3IN7_4Gray_Clear();
    DEV_Delay_ms(500);

    //Create a new image cache
    UBYTE *BlackImage;

    UWORD Imagesize = ((EPD_3IN7_WIDTH % 4 == 0)? (EPD_3IN7_WIDTH / 4 ): (EPD_3IN7_WIDTH / 4 + 1)) * EPD_3IN7_HEIGHT;
    if((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
        printf("Failed to apply for black memory...\r\n");
        while(1);
    }

    printf("Paint_NewImage\r\n");
    Paint_NewImage(BlackImage, EPD_3IN7_WIDTH, EPD_3IN7_HEIGHT, 270, WHITE);
    Paint_SetScale(4);
    Paint_Clear(WHITE);

#if 1   //show image for array    
    printf("show image for array\r\n");
    EPD_3IN7_4Gray_Display(gImage_3in7);
    DEV_Delay_ms(4000);
#endif
  
#if 1 // Drawing on the image, partial display
    //1.Select Image
    printf("SelectImage:BlackImage\r\n");
    Paint_SelectImage(BlackImage);
    Paint_SetScale(4);
    Paint_Clear(WHITE);

    // 2.Drawing on the image
    printf("Drawing:BlackImage\r\n");
    Paint_DrawPoint(10, 80, BLACK, DOT_PIXEL_1X1, DOT_STYLE_DFT);
    Paint_DrawPoint(10, 90, BLACK, DOT_PIXEL_2X2, DOT_STYLE_DFT);
    Paint_DrawPoint(10, 100, BLACK, DOT_PIXEL_3X3, DOT_STYLE_DFT);
    Paint_DrawLine(20, 70, 70, 120, BLACK, DOT_PIXEL_1X1, LINE_STYLE_SOLID);
    Paint_DrawLine(70, 70, 20, 120, BLACK, DOT_PIXEL_1X1, LINE_STYLE_SOLID);
    Paint_DrawRectangle(20, 70, 70, 120, BLACK, DOT_PIXEL_1X1, DRAW_FILL_EMPTY);
    Paint_DrawRectangle(80, 70, 130, 120, BLACK, DOT_PIXEL_1X1, DRAW_FILL_FULL);
    Paint_DrawCircle(45, 95, 20, BLACK, DOT_PIXEL_1X1, DRAW_FILL_EMPTY);
    Paint_DrawCircle(105, 95, 20, WHITE, DOT_PIXEL_1X1, DRAW_FILL_FULL);
    Paint_DrawLine(85, 95, 125, 95, BLACK, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
    Paint_DrawLine(105, 75, 105, 115, BLACK, DOT_PIXEL_1X1, LINE_STYLE_DOTTED);
    Paint_DrawString_EN(10, 0, "waveshare", &Font16, BLACK, WHITE);
    Paint_DrawString_EN(10, 20, "hello world", &Font12, WHITE, BLACK);
    Paint_DrawNum(10, 33, 123456789, &Font12, BLACK, WHITE);
    Paint_DrawNum(10, 50, 987654321, &Font16, WHITE, BLACK);
    Paint_DrawString_EN(10, 150, "GRAY1 with black background", &Font24, BLACK, GRAY1);
    Paint_DrawString_EN(10, 175, "GRAY2 with white background", &Font24, WHITE, GRAY2);
    Paint_DrawString_EN(10, 200, "GRAY3 with white background", &Font24, WHITE, GRAY3);
    Paint_DrawString_EN(10, 225, "GRAY4 with white background", &Font24, WHITE, GRAY4);
    printf("EPD_Display\r\n");
    EPD_3IN7_4Gray_Display(BlackImage);
    DEV_Delay_ms(4000);
#endif

#if 1 // partial update, just 1 Gray mode
    EPD_3IN7_1Gray_Init();       //init 1 Gray mode
    EPD_3IN7_1Gray_Clear();
    Paint_SelectImage(BlackImage);
    Paint_SetScale(2);
    Paint_Clear(WHITE);
    printf("show time, partial update, just 1 Gary mode\r\n");
    PAINT_TIME sPaint_time;
    sPaint_time.Hour = 12;
    sPaint_time.Min = 34;
    sPaint_time.Sec = 56;
    UBYTE num = 10;
    for (;;) {
        sPaint_time.Sec = sPaint_time.Sec + 1;
        if (sPaint_time.Sec == 60) {
            sPaint_time.Min = sPaint_time.Min + 1;
            sPaint_time.Sec = 0;
            if (sPaint_time.Min == 60) {
                sPaint_time.Hour =  sPaint_time.Hour + 1;
                sPaint_time.Min = 0;
                if (sPaint_time.Hour == 24) {
                    sPaint_time.Hour = 0;
                    sPaint_time.Min = 0;
                    sPaint_time.Sec = 0;
                }
            }
        }
        Paint_ClearWindows(300, 0, 479, 80, WHITE);
        Paint_DrawTime(300, 20, &sPaint_time, &Font20, WHITE, BLACK);

        num = num - 1;
        if(num == 0) {
            break;
        }

        printf("Part refresh...\r\n");
        EPD_3IN7_1Gray_Display(BlackImage);
        // EPD_3IN7_1Gray_Display_Part(BlackImage, 0, 0, 279, 180);
        DEV_Delay_ms(500);
    }

#endif
    EPD_3IN7_4Gray_Init();
    printf("Clear...\r\n");
    EPD_3IN7_4Gray_Clear();
    
    // Sleep & close 5V
    printf("Goto Sleep...\r\n");
    EPD_3IN7_Sleep();

    free(BlackImage);
    BlackImage = NULL;

    printf("close 5V, Module enters 0 power consumption ...\r\n");  
}

/* The main loop -------------------------------------------------------------*/
void loop()
{
  //
}
