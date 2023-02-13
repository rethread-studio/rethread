pub mod calltrace {
    use nom::branch::alt;
    use nom::bytes::complete::{is_a, is_not};

    use nom::sequence::terminated;
    use nom::{bytes::complete::tag, combinator::map_res, IResult};
    use std::fs;

    #[derive(Debug)]
    pub enum Direction {
        In,
        Out,
    }
    #[derive(Debug)]
    pub struct Call {
        pub direction: Direction,
        pub call_depth: u32,
        pub thread_id: u32,
        pub class: String,
        pub method: String,
        pub timestamp: u64,
    }
    fn direction(input: &str) -> IResult<&str, &str> {
        alt((tag("<"), tag(">")))(input)
    }
    fn decimal_then_bracket(input: &str) -> IResult<&str, &str> {
        // recognize(many1(terminated(one_of("0123456789"), many0(char(']')))))(input)
        terminated(is_a("0123456789"), tag("]"))(input)
    }
    fn from_decimal(input: &str) -> Result<u32, std::num::ParseIntError> {
        u32::from_str_radix(input, 10)
    }
    fn from_decimal_u64(input: &str) -> Result<u64, std::num::ParseIntError> {
        u64::from_str_radix(input, 10)
    }
    fn parse_decimal_then_bracket(input: &str) -> IResult<&str, u32> {
        map_res(decimal_then_bracket, from_decimal)(input)
    }
    pub fn parse_call_trace_line(data: &str) -> IResult<&str, Call> {
        let (input, dir) = direction(data)?;
        let direction = if dir == "<" {
            Direction::Out
        } else {
            Direction::In
        };
        let (input, _) = tag("[")(input)?;
        let (input, call_depth) = parse_decimal_then_bracket(input)?;
        let (input, _) = tag("[")(input)?;
        let (input, thread_id) = parse_decimal_then_bracket(input)?;
        let (input, class) = terminated(is_not(":"), tag(":"))(input)?;
        let (input, method) = terminated(is_not("="), tag("="))(input)?;
        let (input, timestamp) = map_res(is_a("0123456789"), from_decimal_u64)(input)?;
        Ok((
            input,
            Call {
                direction,
                call_depth,
                thread_id,
                class: class.to_owned(),
                method: method.to_owned(),
                timestamp,
            },
        ))
    }
    #[derive(Debug)]
    pub enum ColorSource {
        Method,
        Class,
    }
    #[derive(Debug)]
    pub struct Calltrace {
        pub trace: Vec<Call>,
        pub max_depth: u32,
    }
    impl Calltrace {
        pub fn new() -> Self {
            let data =
                fs::read_to_string("/home/erik/Hämtningar/nwl2022/varna_calltrace.txt").unwrap();
            let mut trace = vec![];
            for line in data.lines() {
                trace.push(parse_call_trace_line(line).unwrap().1);
            }
            println!("Calltrace!");
            println!("num calls: {}", trace.len());

            let mut max_depth = 0;
            for call in &trace {
                if call.call_depth > max_depth {
                    max_depth = call.call_depth;
                }
            }
            Self { trace, max_depth }
        }
    }
}

pub mod deepika1 {
    use serde::{Deserialize, Serialize};
    use std::fs;

    #[derive(Serialize, Deserialize, Debug)]
    pub struct Function {
        fqn: String,
        supplier: String,
        dependency: String,
    }
    #[derive(Serialize, Deserialize, Debug)]
    pub struct Call {
        callee: Function,
        caller: Function,
        timestamp: u64,
    }

    #[derive(Debug)]
    pub struct CallDrawData {
        pub depth: i32,
        pub callee_supplier: String,
        pub callee_dependency: String,
        pub callee_name: String,
        pub caller_name: String,
    }

    #[derive(Debug)]
    pub enum ColorSource {
        Supplier,
        Dependency,
        Function,
    }

    #[derive(Debug)]
    pub struct Deepika1 {
        pub draw_trace: Vec<CallDrawData>,
        pub max_depth: i32,
    }

    impl Deepika1 {
        pub fn new() -> Self {
            // let data =
            //     fs::read_to_string("/home/erik/Hämtningar/nwl2022/data-pdfbox-new-format.json")
            //         .unwrap();
            let data =
                fs::read_to_string("/home/erik/Hämtningar/nwl2022/data-varna-copy-paste.json")
                    .unwrap();
            // let data =
            //     fs::read_to_string("/home/erik/Hämtningar/nwl2022/data-minvert-100.json").unwrap();
            let trace_data: Vec<Call> = serde_json::from_str(&data).unwrap();

            // let trace_data: Vec<Call> = trace_data
            //     .into_iter()
            //     .map(|mut call| {
            //         std::mem::swap(&mut call.callee, &mut call.caller);
            //         call
            //     })
            //     .collect();

            let mut draw_trace = vec![];
            let call = &trace_data[0];
            draw_trace.push(CallDrawData {
                depth: 0,
                callee_supplier: call.callee.supplier.clone(),
                callee_dependency: call.callee.dependency.clone(),
                callee_name: call.callee.fqn.clone(),
                caller_name: call.caller.fqn.clone(),
            });
            let mut last_depth = 0;
            let mut lowest_depth = 0;
            let mut i = 0;
            while i < trace_data.len() - 1 {
                let a = &trace_data[i];
                let b = &trace_data[i + 1];

                let new_depth = if a.callee.fqn == b.caller.fqn {
                    last_depth + 1
                } else if a.caller.fqn == b.caller.fqn {
                    last_depth
                } else {
                    // backtrack to find the last known depth of this function
                    let mut j = i;
                    loop {
                        if draw_trace[j].caller_name == b.caller.fqn {
                            break draw_trace[j].depth;
                        }
                        if j == 0 {
                            lowest_depth -= 1;
                            break lowest_depth;
                        }
                        j -= 1;
                    }
                };
                draw_trace.push(CallDrawData {
                    depth: new_depth,
                    callee_supplier: b.callee.supplier.clone(),
                    callee_dependency: b.callee.dependency.clone(),
                    callee_name: b.callee.fqn.clone(),
                    caller_name: b.caller.fqn.clone(),
                });
                last_depth = new_depth;
                i += 1;
            }
            let mut min_depth = 999999;
            let mut max_depth = 0;
            for call in &draw_trace {
                let level = call.depth;
                if level < min_depth {
                    min_depth = level;
                }
                if level > max_depth {
                    max_depth = level;
                }
            }
            for call in &mut draw_trace {
                call.depth -= min_depth;
            }
            max_depth -= min_depth;

            // println!("depth_graph: {depth_graph:?}");
            println!("max_depth: {max_depth}");
            println!("min_depth: {min_depth}");
            println!("num_calls: {}", draw_trace.len());

            Self {
                draw_trace,
                max_depth,
            }
        }
    }

    impl Default for Deepika1 {
        fn default() -> Self {
            Self::new()
        }
    }
}

pub mod deepika2;
