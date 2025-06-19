#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include "imagedata.h"
#include <stdlib.h>

void setup()
{
	printf("EPD_4in01F_test Demo\r\n");
	DEV_Module_Init();

	printf("e-Paper Init and Clear...\r\n");
	EPD_4IN01F_Init();
	EPD_4IN01F_Clear(EPD_4IN01F_WHITE);
	DEV_Delay_ms(100);
  
	UBYTE *BlackImage;			
	UDOUBLE Imagesize = ((EPD_4IN01F_WIDTH % 2 == 0)? (EPD_4IN01F_WIDTH / 2 ): (EPD_4IN01F_WIDTH / 2 + 1)) * EPD_4IN01F_HEIGHT;
	if((BlackImage = (UBYTE *)malloc(Imagesize/2)) == NULL) {
			printf("Failed to apply for black memory...\r\n");
			while(1);
	}
	Paint_NewImage(BlackImage, EPD_4IN01F_WIDTH/2, EPD_4IN01F_HEIGHT, 0, EPD_4IN01F_WHITE);
	Paint_SetScale(7);
	
#if 1
	// EPD_4IN01F_Display_part(gImage_4in01f_part, 0, 0, 192, 143);
	// DEV_Delay_ms(5000); 

    EPD_4IN01F_Display(gImage_4in01f);
    DEV_Delay_ms(5000); 
#endif

#if 1
	Paint_Clear(EPD_4IN01F_WHITE);
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
	Paint_DrawString_CN(10, 120, "你好abc", &Font12CN, EPD_4IN01F_BLACK, WHITE);
	Paint_DrawString_CN(10, 140, "你好abc", &Font12CN, EPD_4IN01F_GREEN, WHITE);
	Paint_DrawString_CN(10, 160, "你好abc", &Font12CN, EPD_4IN01F_BLUE, WHITE);
	Paint_DrawString_CN(10, 180, "你好abc", &Font12CN, EPD_4IN01F_RED, WHITE);
	Paint_DrawString_CN(10, 200, "你好abc", &Font12CN, EPD_4IN01F_ORANGE, WHITE);
	
	Paint_DrawString_CN(150, 0, "微雪电子", &Font24CN, WHITE, BLACK);
	Paint_DrawString_CN(150, 40, "微雪电子", &Font24CN, EPD_4IN01F_GREEN, BLACK);
	Paint_DrawString_CN(150, 80, "微雪电子", &Font24CN, EPD_4IN01F_BLUE, BLACK);
	Paint_DrawString_CN(150, 120, "微雪电子", &Font24CN, EPD_4IN01F_RED, BLACK);
	Paint_DrawString_CN(150, 160, "微雪电子", &Font24CN, EPD_4IN01F_YELLOW, BLACK);
	
	EPD_4IN01F_Display_part(BlackImage, 0, 0, 320, 400);
	DEV_Delay_ms(5000); 
#endif

	printf("e-Paper Clear...\r\n");
	EPD_4IN01F_Clear(EPD_4IN01F_WHITE);
	DEV_Delay_ms(1000); 
  
	printf("Sleep...\r\n");
	EPD_4IN01F_Sleep();

	free(BlackImage);
	BlackImage = NULL;	
}

/* The main loop -------------------------------------------------------------*/
void loop()
{
  //
}
