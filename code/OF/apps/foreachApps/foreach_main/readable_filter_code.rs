
fn apply_filter_to_pixel(coordinate: Position) {
  Color original_color =  image[coordinate].rgb;

  let brightness = luma(orignal_color);
  Color purple = rgb(1.0, 0.2, 0.7);
  Color blue = rgb(0.1, 0.7, 1.2);

  let linear_brightness = (luma + gain).pow(exponent);
  Color new_color = mix(blue, purple, smooth_curve(0.1, 1.0, linear_brightness));
  new_color = mix(org_color, new_color, smooth_curve(0.0, 0.1, linear_brightness));
  new_color = mix(color, purple, smooth_curve(0.7, 1.0, linear_brightness));

  new_color *= (luma + 0.1).pow(1.5) + 0.1;
    image[coordinate] = new_color;
}











for|each pixel in image {
  Color original_color =  image[pixel].rgb;

  let brightness = luma(orignal_color);
  Color purple = rgb(1.0, 0.2, 0.7);
  Color blue = rgb(0.1, 0.7, 1.2);

  let linear_brightness = (luma + gain).pow(exponent);
  Color new_color;
  new_color = mix(blue, purple, smooth_curve(0.1, 1.0, linear_brightness));
  new_color = mix(org_color, new_color, smooth_curve(0.0, 0.1, linear_brightness));
  new_color = mix(color, purple, smooth_curve(0.7, 1.0, linear_brightness));

  new_color *= (luma + 0.1).pow(1.5) + 0.1;
  image[pixel] = new_color;
}
