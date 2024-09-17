/// Converts values in HSV color space to RGB
///
///
/// # Params
/// * hue: f64 - the position of the color on the color wheel. Between 0 and 360
/// * saturation: f64 - how much color. Between 0, no color, and 1, all color
/// * value: f64 - or lightness. Between 0, black, and 1, white
///
/// # Panics
/// If the supplied values are outside the ranges stated above. The ranges are inclusive
///
/// # Examples
/// Black
/// ```
/// assert_eq!(hsv::hsv_to_rgb(0.0, 0.0, 0.0), (0, 0, 0));
/// ```
/// White
/// ```
/// assert_eq!(hsv::hsv_to_rgb(0.0, 0.0, 1.0), (255, 255, 255));
/// ```
/// Red
/// ```
/// assert_eq!(hsv::hsv_to_rgb(0.0, 1.0, 1.0), (255, 0, 0));
/// ```
/// Green
/// ```
/// assert_eq!(hsv::hsv_to_rgb(120.0, 1.0, 1.0), (0, 255, 0));
/// ```
/// Blue
/// ```
/// assert_eq!(hsv::hsv_to_rgb(240.0, 1.0, 1.0), (0, 0, 255));
/// ```
use num_traits::Float;
pub fn hsv_to_rgb(hue: f64, saturation: f64, value: f64) -> (u8, u8, u8) {
    fn is_between(value: f64, min: f64, max: f64) -> bool {
        min <= value && value < max
    }

    check_bounds(hue, saturation, value);

    let c = value * saturation;
    let h = hue / 60.0;
    let x = c * (1.0 - ((h % 2.0) - 1.0).abs());
    let m = value - c;

    let (r, g, b): (f64, f64, f64) = if is_between(h, 0.0, 1.0) {
        (c, x, 0.0)
    } else if is_between(h, 1.0, 2.0) {
        (x, c, 0.0)
    } else if is_between(h, 2.0, 3.0) {
        (0.0, c, x)
    } else if is_between(h, 3.0, 4.0) {
        (0.0, x, c)
    } else if is_between(h, 4.0, 5.0) {
        (x, 0.0, c)
    } else {
        (c, 0.0, x)
    };

    (
        ((r + m) * 255.0) as u8,
        ((g + m) * 255.0) as u8,
        ((b + m) * 255.0) as u8,
    )
}

fn check_bounds(hue: f64, saturation: f64, value: f64) {
    fn panic_bad_params(name: &str, from_value: &str, to_value: &str, supplied: f64) -> ! {
        panic!(
            "param {} must be between {} and {} inclusive; was: {}",
            name, from_value, to_value, supplied
        )
    }

    if !(0.0..=360.0).contains(&hue) {
        panic_bad_params("hue", "0.0", "360.0", hue)
    } else if !(0.0..=1.0).contains(&saturation) {
        panic_bad_params("saturation", "0.0", "1.0", saturation)
    } else if !(0.0..=1.0).contains(&value) {
        panic_bad_params("value", "0.0", "1.0", value)
    }
}

#[cfg(test)]
mod test {

    mod check_bounds {
        use crate::*;
        #[test]
        #[should_panic(expected = "param hue must be between 0.0 and 360.0 inclusive; was: -0.1")]
        fn test_check_bounds_fail1() {
            check_bounds(-0.1, 0.0, 0.0);
        }

        #[test]
        #[should_panic(expected = "param hue must be between 0.0 and 360.0 inclusive; was: 360.1")]
        fn test_check_bounds_fail2() {
            check_bounds(360.1, 0.0, 0.0);
        }

        #[test]
        #[should_panic(
            expected = "param saturation must be between 0.0 and 1.0 inclusive; was: -0.1"
        )]
        fn test_check_bounds_fail3() {
            check_bounds(0.1, -0.1, 0.0);
        }

        #[test]
        #[should_panic(
            expected = "param saturation must be between 0.0 and 1.0 inclusive; was: 1.1"
        )]
        fn test_check_bounds_fail4() {
            check_bounds(0.1, 1.1, 0.0);
        }

        #[test]
        #[should_panic(expected = "param value must be between 0.0 and 1.0 inclusive; was: -0.1")]
        fn test_check_bounds_fail5() {
            check_bounds(0.1, 0.1, -0.1);
        }

        #[test]
        #[should_panic(expected = "param value must be between 0.0 and 1.0 inclusive; was: 1.1")]
        fn test_check_bounds_fail6() {
            check_bounds(0.1, 0.1, 1.1);
        }

        #[test]
        fn test_check_bounds_red() {
            check_bounds(0.0, 1.0, 1.0);
        }

        #[test]
        fn test_check_bounds_green() {
            check_bounds(120.0, 1.0, 1.0);
        }

        #[test]
        fn test_check_bounds_blue() {
            check_bounds(240.0, 1.0, 1.0);
        }

        #[test]
        fn test_check_bounds_yellow() {
            check_bounds(60.0, 1.0, 1.0);
        }

        #[test]
        fn test_check_bounds_rust() {
            check_bounds(28.0, 0.92, 0.71);
        }

        #[test]
        fn test_check_bounds_purple() {
            check_bounds(277.0, 0.87, 0.94);
        }
    }

    mod hsv_to_rgb {

        use crate::*;
        #[test]
        fn test_hsv_black() {
            assert_eq!(hsv_to_rgb(0.0, 0.0, 0.0), (0, 0, 0));
        }

        #[test]
        fn test_hsv_white() {
            assert_eq!(hsv_to_rgb(0.0, 0.0, 1.0), (255, 255, 255));
        }

        #[test]
        fn test_hsv_red() {
            assert_eq!(hsv_to_rgb(0.0, 1.0, 1.0), (255, 0, 0));
        }

        #[test]
        fn test_hsv_green() {
            assert_eq!(hsv_to_rgb(120.0, 1.0, 1.0), (0, 255, 0));
        }

        #[test]
        fn test_hsv_blue() {
            assert_eq!(hsv_to_rgb(240.0, 1.0, 1.0), (0, 0, 255));
        }

        #[test]
        fn test_hsv_yellow() {
            assert_eq!(hsv_to_rgb(60.0, 1.0, 1.0), (255, 255, 0));
        }

        #[test]
        fn test_hsv_cyan() {
            assert_eq!(hsv_to_rgb(180.0, 1.0, 1.0), (0, 255, 255));
        }

        #[test]
        fn test_hsv_magenta() {
            assert_eq!(hsv_to_rgb(300.0, 1.0, 1.0), (255, 0, 255));
        }

        #[test]
        fn test_hsv_rust() {
            assert_eq!(hsv_to_rgb(28.0, 0.92, 0.71), (181, 92, 14));
        }

        #[test]
        fn test_hsv_purple() {
            assert_eq!(hsv_to_rgb(277.0, 0.87, 0.94), (159, 31, 239));
        }
    }
}