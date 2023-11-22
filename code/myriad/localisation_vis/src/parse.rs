use color_eyre::{eyre::eyre, Result};
use nom::{
    branch::alt,
    bytes::complete::tag,
    character::complete::{char, one_of},
    combinator::{map_res, opt, recognize},
    multi::{many0, many1},
    number::complete::{float, recognize_float},
    sequence::{preceded, terminated},
    IResult,
};

use crate::AnchorId;
pub fn parse_value(input: &[u8]) -> Result<(AnchorId, f32)> {
    // let input_str = String::from_utf8_lossy(input);
    let input_str = String::from_utf8(input.to_vec())?;
    let (_remaining_input, (anchor_str, distance_str)) =
        parse_value_nom(&input_str).map_err(|e| eyre!("Failed to parse string: {e}"))?;
    let anchor = anchor_str.parse()?;
    let distance = distance_str.parse()?;
    Ok((AnchorId(anchor), distance))
}

fn parse_value_nom<'a>(input: &'a str) -> IResult<&'_ str, (&'_ str, &'_ str)> {
    let (input, anchor) = decimal(input)?;
    let (input, _) = tag(":")(input)?;
    let (input, distance) = recognize_float(input)?;
    Ok((input, (anchor, distance)))
}

fn decimal(input: &str) -> IResult<&str, &str> {
    recognize(many1(terminated(one_of("0123456789"), many0(char('_')))))(input)
}
