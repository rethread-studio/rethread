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

pub mod deepika2 {
    use serde::{Deserialize, Serialize};
    use serde_json::Result;
    use std::{
        collections::{HashMap, HashSet},
        fs::{self, File},
        io::{BufReader, Read, Write},
        path::PathBuf,
    };

    fn is_power_of_2(num: i32) -> bool {
        if (num & (num - 1)) != 0 {
            false
        } else {
            true
        }
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct NGramSection {
        pub section_length: usize,
        pub start_indices: Vec<usize>,
    }
    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct NGramAnalysis {
        pub sections: HashMap<String, NGramSection>,
    }
    impl NGramAnalysis {
        pub fn new() -> Self {
            Self {
                sections: HashMap::new(),
            }
        }
        pub fn add_n_gram(&mut self, s: String, start_index: usize, section_length: usize) {
            if let Some(section) = self.sections.get_mut(&s) {
                section.start_indices.push(start_index);
            } else {
                self.sections.insert(
                    s,
                    NGramSection {
                        section_length,
                        start_indices: vec![start_index],
                    },
                );
            }
        }
        pub fn filter_unusual(&mut self, min_repetitions: usize) {
            self.sections
                .retain(|_k, section| section.start_indices.len() >= min_repetitions);
        }
        pub fn filter_subsections(&mut self) {
            // If a section has the same starting indices as another section,
            // but is shorter, it is a subsection of that section. Which of the
            // sections is most useful? If we first filter out complete
            // overlaps, we may want the biggest sections possible that repeat.
            let all_hash_map_keys: Vec<String> = self.sections.keys().cloned().collect();
            for (key0, key1) in all_hash_map_keys
                .iter()
                .zip(all_hash_map_keys.iter().skip(1))
            {
                if key0 == key1 {
                    continue;
                }

                let len0 = key0.len();
                let len1 = key1.len();

                if len0 == len1 {
                    continue;
                }

                let (key_smaller, key_larger, len_smaller) = if len1 > len0 {
                    (key0, key1, len0)
                } else {
                    (key1, key0, len1)
                };

                // key_smaller is a subset of key_larger

                let larger_start_indices =
                    self.sections.get(key_larger).unwrap().start_indices.clone();
                let larger_section_length =
                    self.sections.get_mut(key_larger).unwrap().section_length;
                let mut i = 0;
                let smaller_section_length =
                    self.sections.get_mut(key_smaller).unwrap().section_length;
                let smaller_start_indices =
                    &mut self.sections.get_mut(key_smaller).unwrap().start_indices;
                while i < smaller_start_indices.len() {
                    let mut removed = false;
                    for large_si in &larger_start_indices {
                        if smaller_start_indices[i] >= *large_si
                            && smaller_start_indices[i] + smaller_section_length
                                < *large_si + larger_section_length
                        {
                            smaller_start_indices.remove(i);
                            removed = true;
                            break;
                        }
                    }
                    if !removed {
                        i += 1;
                    }
                }
            }
            // Remove entries that have no start indices
            self.sections
                .retain(|_k, section| section.start_indices.len() > 0);
        }
        pub fn filter_overlaps(&mut self) {
            // If we have a loop with 16 iterations, that could be seen as 8
            // iterations of the loop twice or 4 iterations of the loop 4 times.
            // We want to filter out these overlapping ngram sections.
            //
            // For each section, go through all sections where their section
            // length is a power of two times the smaller section length. If the
            // indices overlap at the section boundaries, remove the start index
            // from the longer section.
            //
            // We can also have subgrams to a larger gram which is the same as the larger gram

            let all_hash_map_keys: Vec<String> = self.sections.keys().cloned().collect();
            for (key0, key1) in all_hash_map_keys
                .iter()
                .zip(all_hash_map_keys.iter().skip(1))
            {
                if key0 == key1 {
                    continue;
                }
                let len0 = key0.len() as f32;
                let len1 = key1.len() as f32;
                if len0 != len1 {
                    let length_ratio = if len0 > len1 {
                        len0 / len1
                    } else {
                        len1 / len0
                    };
                    if length_ratio.fract() == 0.0 {
                        // The ratio between the lengths is an integer. This may suggest the larger is a set of repetitions.
                        // Remove any start indices where the larger section overlaps with a start of the smaller section.
                        let (key_smaller, key_larger) = if len1 > len0 {
                            (key0, key1)
                        } else {
                            (key1, key0)
                        };
                        let smaller_start_indices = self
                            .sections
                            .get(key_smaller)
                            .unwrap()
                            .start_indices
                            .clone();
                        let mut i = 0;
                        let larger_start_indices =
                            &mut self.sections.get_mut(key_larger).unwrap().start_indices;
                        while i < larger_start_indices.len() {
                            let mut removed = false;
                            for small_si in smaller_start_indices.iter() {
                                if *small_si == larger_start_indices[i] {
                                    larger_start_indices.remove(i);
                                    removed = true;
                                    break;
                                }
                            }
                            if !removed {
                                i += 1;
                            }
                        }
                    }
                } else {
                    // The length of both keys is the same. This may suggest that they are that same sequence with an offset.
                }
            }

            // Remove entries that have no start indices
            self.sections
                .retain(|_k, section| section.start_indices.len() > 0);
        }
    }

    #[derive(Serialize, Deserialize, Debug, Clone, Copy)]
    pub struct DepthEnvelopePoint {
        pub start_index: usize,
        pub end_index: usize,
        pub state: DepthState,
        pub average: f32,
        pub num_suppliers: usize,
        pub supplier_dist_evenness: f32,
        pub num_dependencies: usize,
        pub dependency_dist_evenness: f32,
        pub min_depth: i32,
        pub max_depth: i32,
        pub shannon_wiener_diversity_index: f32,
    }
    impl Default for DepthEnvelopePoint {
        fn default() -> Self {
            Self {
                start_index: Default::default(),
                end_index: Default::default(),
                state: DepthState::Stable,
                average: Default::default(),
                num_suppliers: Default::default(),
                supplier_dist_evenness: 1.0,
                num_dependencies: Default::default(),
                dependency_dist_evenness: 1.0,
                min_depth: Default::default(),
                max_depth: Default::default(),
                shannon_wiener_diversity_index: 0.0,
            }
        }
    }
    #[derive(Serialize, Deserialize, Debug, Clone, Copy)]
    pub enum DepthState {
        Stable,
        Increasing,
        Decreasing,
    }
    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct DepthEnvelope {
        pub sections: Vec<DepthEnvelopePoint>,
    }
    impl DepthEnvelope {
        pub fn from_depth_list(list: Vec<i32>) -> Self {
            // The challenge of creating a good depth envelope is choosing a good window size that represents the curve.
            //
            // We can start with a pretty large window size to get the rough
            // shape of the cure, and then subdivide sections at the boundaries
            // between states to determine roughly where a section starts. Or we
            // can just go through the list once with a certain window size and
            // if it doesn't change too much we determine it is stable.
            //
            // This can detect certain features, but not others.
            //
            let window_size = 128;
            let max_diff = 5.0;
            let mut points = Vec::with_capacity(list.len() / window_size);
            let averages = list
                .chunks(window_size)
                .map(|chunk| chunk.into_iter().sum::<i32>() as f32 / window_size as f32)
                .collect::<Vec<f32>>();
            // Start stable
            points.push(DepthEnvelopePoint {
                start_index: 0,
                end_index: window_size,
                state: DepthState::Stable,
                average: averages[0],
                ..Default::default()
            });
            for (i, (avg0, avg1)) in averages.iter().zip(averages.iter().skip(1)).enumerate() {
                // Compare avg1 the previous avg0 to see if it's stable or not
                let start_index = (i + 1) * window_size;
                if (avg0 - avg1).abs() > max_diff {
                    let state = if avg1 < avg0 {
                        DepthState::Decreasing
                    } else {
                        DepthState::Increasing
                    };
                    points.push(DepthEnvelopePoint {
                        start_index,
                        end_index: start_index + window_size,
                        state,
                        average: *avg1,
                        ..Default::default()
                    });
                } else {
                    points.push(DepthEnvelopePoint {
                        start_index,
                        end_index: start_index + window_size,
                        state: DepthState::Stable,
                        average: *avg1,
                        ..Default::default()
                    });
                }
            }
            Self { sections: points }
        }
        pub fn from_depth_list2(list: Vec<i32>, calls: &[CallDrawData]) -> Self {
            let max_window_size = 128;
            let min_window_size = 8;
            let max_diff = 3.0_f32;
            let mut index_pointer = 0;
            let mut last_average: f32 =
                list[0..min_window_size].iter().sum::<i32>() as f32 / 16.0_f32;
            let mut last_slope = DepthState::Stable;
            let mut sections = vec![DepthEnvelopePoint {
                state: DepthState::Stable,
                average: last_average,
                start_index: 0,
                end_index: 0,
                ..Default::default()
            }];
            println!("from_depth_list2 len: {}", list.len());
            while index_pointer < list.len() {
                let mut current_window_size = max_window_size.min(list.len() - index_pointer);
                if index_pointer > 296900 {
                    dbg!(index_pointer, current_window_size);
                }
                while current_window_size >= min_window_size {
                    let average = list[index_pointer..index_pointer + current_window_size]
                        .iter()
                        .sum::<i32>() as f32
                        / current_window_size as f32;
                    if (average - last_average).abs() < max_diff {
                        // The current average doesn't differ from that last state. This means we are stable. If the last section was stable, prolong it. If we come from instability, create a new stable point.
                        match last_slope {
                            DepthState::Stable => {
                                let last_index = sections.len() - 1;
                                sections[last_index].end_index += current_window_size;
                            }
                            DepthState::Increasing | DepthState::Decreasing => {
                                sections.push(DepthEnvelopePoint {
                                    state: DepthState::Stable,
                                    average,
                                    start_index: index_pointer,
                                    end_index: index_pointer + current_window_size,
                                    ..Default::default()
                                });
                            }
                        }
                        last_average = average;
                        last_slope = DepthState::Stable;
                        break;
                    }
                    current_window_size -= min_window_size;
                }
                if current_window_size < min_window_size {
                    current_window_size = min_window_size.min(list.len() - index_pointer);
                    let average = list[index_pointer..index_pointer + current_window_size]
                        .iter()
                        .sum::<i32>() as f32
                        / current_window_size as f32;
                    let state = if average > last_average {
                        DepthState::Increasing
                    } else {
                        DepthState::Decreasing
                    };

                    sections.push(DepthEnvelopePoint {
                        state,
                        average,
                        start_index: index_pointer,
                        end_index: index_pointer + current_window_size,
                        ..Default::default()
                    });
                    last_average = average;
                    last_slope = state;
                }
                index_pointer += current_window_size;
            }
            Self::analyse_sections(&mut sections, calls);
            Self { sections }
        }
        fn analyse_sections(sections: &mut Vec<DepthEnvelopePoint>, calls: &[CallDrawData]) {
            for section in sections {
                let mut min_depth = i32::MAX;
                let mut max_depth = i32::MIN;
                let mut supplier_map: HashMap<String, i32> = HashMap::new();
                let mut dependency_map: HashMap<String, i32> = HashMap::new();
                for call in &calls[section.start_index..section.end_index] {
                    if call.depth < min_depth {
                        min_depth = call.depth;
                    }
                    max_depth = max_depth.max(call.depth);
                    if let Some(s) = &call.supplier {
                        *supplier_map.entry(s.clone()).or_insert(0) += 1;
                    }
                    if let Some(d) = &call.dependency {
                        *dependency_map.entry(d.clone()).or_insert(0) += 1;
                    }
                }
                section.min_depth = min_depth;
                section.max_depth = max_depth;
                section.num_suppliers = supplier_map.len();
                section.num_dependencies = dependency_map.len();
                let calls_per_supplier: Vec<i32> = supplier_map.values().map(|v| *v).collect();
                let supplier_distances = distance_from_mean(&calls_per_supplier);
                section.supplier_dist_evenness = average_distance_from_mean(&supplier_distances);
                let calls_per_dependency: Vec<i32> = dependency_map.values().map(|v| *v).collect();
                let dependency_distances = distance_from_mean(&calls_per_dependency);
                section.dependency_dist_evenness =
                    average_distance_from_mean(&dependency_distances);

                // Shannon-Wiener Diversity Index
                let num_calls = (section.end_index - section.start_index) as f32;
                section.shannon_wiener_diversity_index = dependency_map
                    .values()
                    .map(|v| *v as f32 / num_calls)
                    .map(|p| p * p.ln())
                    .sum::<f32>()
                    .abs(); // should be the negative of the sum I think, but we want to avoid -0.0
            }
            println!("sections:#?");
        }
    }

    fn mean(list: &[i32]) -> f32 {
        list.iter().sum::<i32>() as f32 / list.len() as f32
    }

    fn distance_from_mean(list: &[i32]) -> Vec<f32> {
        let mean = mean(list);
        list.iter()
            .map(|&v| {
                let v = v as f32;
                if v > mean {
                    mean / v
                } else {
                    v / mean
                }
            })
            .collect()
    }

    fn average_distance_from_mean(distances: &[f32]) -> f32 {
        distances.iter().sum::<f32>() as f32 / distances.len() as f32
    }

    // One approach is to run the curve through an FFT analysis and
    // compare the bins to each other. If they are very different, we
    // may decide that this is a new section. Especially the DC offset
    // will be important in this case.
    struct DepthFFT {}

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct Function {
        fqn: String,
        supplier: String,
        dependency: String,
    }
    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct Call {
        callee: Function,
        caller: Function,
        timestamp: u64,
        length: i32,
        #[serde(alias = "stackTrace")]
        stack_trace: String,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct CallDrawData {
        pub depth: i32,
        pub supplier: Option<String>,
        pub dependency: Option<String>,
        pub name: String,
        pub caller_name: Option<String>,
    }
    impl Default for CallDrawData {
        fn default() -> Self {
            Self {
                depth: 0,
                supplier: None,
                dependency: None,
                name: Default::default(),
                caller_name: None,
            }
        }
    }

    #[derive(Serialize, Deserialize, Debug)]
    pub enum ColorSource {
        Supplier,
        Dependency,
        Function,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct Deepika2 {
        pub draw_trace: Vec<CallDrawData>,
        pub max_depth: i32,
        pub ngram_analysis: Option<NGramAnalysis>,
        pub depth_envelope: DepthEnvelope,
    }

    impl Deepika2 {
        pub fn open_or_parse(path: impl Into<PathBuf>) -> anyhow::Result<Self> {
            let path = path.into();
            let mut postcard_path = path.clone();
            postcard_path.set_extension("postcard");
            let mut parsed_json_path = path.clone();
            let mut file_name = parsed_json_path
                .file_name()
                .unwrap()
                .to_str()
                .unwrap()
                .to_string();
            file_name.push_str("_parsed");
            parsed_json_path.set_file_name(file_name);
            parsed_json_path.set_extension("json");
            match Deepika2::from_file_postcard(&postcard_path) {
                Ok(s) => return Ok(s),
                Err(e) => {
                    eprintln!(
                        "Failed to read postcard format from path {:?} with error {e}",
                        postcard_path
                    );
                    let mut raw_path = path.clone();
                    raw_path.set_extension("json");
                    let me = Deepika2::parse_from_raw_file(raw_path)?;
                    me.save_to_file_postcard(&postcard_path);
                    me.save_to_file_json(&parsed_json_path);
                    return Ok(me);
                }
            }
        }
        pub fn parse_and_save(path: impl Into<PathBuf>) -> anyhow::Result<Self> {
            let path = path.into();
            let mut postcard_path = path.clone();
            postcard_path.set_extension("postcard");
            let mut parsed_json_path = path.clone();
            let mut file_name = parsed_json_path
                .file_name()
                .unwrap()
                .to_str()
                .unwrap()
                .to_string();
            file_name.push_str("_parsed");
            parsed_json_path.set_file_name(file_name);
            parsed_json_path.set_extension("json");
            let mut raw_path = path.clone();
            raw_path.set_extension("json");
            let me = Deepika2::parse_from_raw_file(raw_path)?;
            me.save_to_file_postcard(&postcard_path);
            me.save_to_file_json(&parsed_json_path);
            return Ok(me);
        }
        pub fn from_file_postcard(path: impl Into<PathBuf>) -> anyhow::Result<Self> {
            let file = File::open(path.into())?;
            let mut reader = BufReader::new(file);
            let mut buffer = Vec::new();

            // Read file into vector.
            reader.read_to_end(&mut buffer)?;
            let me = postcard::from_bytes::<Deepika2>(&buffer)?;
            Ok(me)
        }
        pub fn save_to_file_postcard(&self, path: impl Into<PathBuf>) {
            let output: Vec<u8> = postcard::to_allocvec(self).unwrap();
            let mut file = File::create(path.into()).unwrap();
            file.write_all(&output).unwrap();
        }
        pub fn save_to_file_json(&self, path: impl Into<PathBuf>) {
            let path = path.into();
            println!("Saving to json path: {path:?}");
            let output = serde_json::to_string(self).unwrap();
            let mut file = File::create(path).unwrap();
            write!(file, "{}", output).unwrap();
        }
        pub fn parse_from_raw_file(path: impl Into<PathBuf>) -> anyhow::Result<Self> {
            let path = path.into();
            println!("Parsing file {path:?}");
            let mut supplier_set = HashSet::new();
            let data = fs::read_to_string(path)?;
            // let data =
            //     fs::read_to_string("/media/erik/Erik Work 073079/data-varna-startup-shutdown.json")
            //         .unwrap();
            let trace_data: Vec<Call> = serde_json::from_str(&data)?;

            // let trace_data: Vec<Call> = trace_data
            //     .into_iter()
            //     .map(|mut call| {
            //         std::mem::swap(&mut call.callee, &mut call.caller);
            //         call
            //     })
            //     .collect();

            let mut draw_trace: Vec<CallDrawData> = vec![];
            for call in trace_data {
                let stack_functions: Vec<&str> = call.stack_trace.split(", ").collect();
                // println!("stack_functions: {:#?}", stack_functions);
                let mut first_nonadded_function = stack_functions.len() - 1;
                let mut i = 1; // Skip first because it is the same as the current callee function
                'find_nonadded: while i < stack_functions.len() {
                    let depth = call.length - (i) as i32;
                    let name_parts: Vec<&str> = stack_functions[i].split("/").collect();
                    let function_name = if name_parts.len() == 2 {
                        name_parts[1].split("(").collect::<Vec<&str>>()[0]
                    } else {
                        name_parts[0].split("(").collect::<Vec<&str>>()[0]
                    };
                    for draw_call in draw_trace.iter().rev() {
                        if draw_call.name == function_name && draw_call.depth == depth {
                            // This was already added, set the first nonadded to be the previous
                            first_nonadded_function = i - 1;
                            // println!("first nonadded: {}", first_nonadded_function);
                            break 'find_nonadded;
                        } else if draw_call.depth == 0 {
                            break;
                        }
                    }
                    i += 1;
                }
                for (i, function) in stack_functions
                    .iter()
                    .skip(1)
                    .take(first_nonadded_function)
                    .enumerate()
                    .rev()
                {
                    let depth = call.length - (i + 1) as i32;
                    let name_parts: Vec<&str> = function.split("/").collect();
                    if name_parts.len() == 2 {
                        let name_parts = name_parts[1];
                        let function = name_parts.split("(").collect::<Vec<&str>>()[0];
                        let name_parts: Vec<&str> = name_parts.splitn(4, ".").collect();
                        if name_parts.len() == 4 {
                            let supplier = format!("{}.{}", name_parts[0], name_parts[1]);
                            let dependency = name_parts[2];
                            draw_trace.push(CallDrawData {
                                name: function.to_string(),
                                depth,
                                supplier: Some(supplier),
                                dependency: Some(dependency.to_string()),
                                ..Default::default()
                            });
                        }
                    }
                }
                draw_trace.push(CallDrawData {
                    depth: call.length,
                    supplier: Some(call.callee.supplier.clone()),
                    dependency: Some(call.callee.dependency.clone()),
                    name: call.callee.fqn.clone(),
                    caller_name: Some(call.caller.fqn.clone()),
                });
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
                if let Some(supplier) = &call.supplier {
                    supplier_set.insert(supplier);
                }
            }
            println!("Suppliers: {supplier_set:#?}");
            println!("max_depth: {max_depth}");
            println!("min_depth: {min_depth}");
            for call in &mut draw_trace {
                call.depth -= min_depth;
            }
            max_depth -= min_depth;

            // println!("Performing n-gram analysis");
            // let mut ngram_analysis: NGramAnalysis = NGramAnalysis::new();
            // for section_size in 4..30 {
            //     for start_index in 0..(draw_trace.len() - section_size) {
            //         let mut section_string = String::new();
            //         for i in start_index..start_index + section_size {
            //             section_string.push_str(&draw_trace[i].name);
            //         }
            //         ngram_analysis.add_n_gram(section_string, start_index, section_size);
            //     }
            // }
            // println!(
            //     "Num ngram sections before filtering for repetitions: {}",
            //     ngram_analysis.sections.len()
            // );
            // ngram_analysis.filter_unusual(30);
            // println!(
            //     "Num ngram sections before filtering for overlap: {}",
            //     ngram_analysis.sections.len()
            // );
            // ngram_analysis.filter_overlaps();
            // println!(
            //     "Num ngram sections before filtering for subsections: {}",
            //     ngram_analysis.sections.len()
            // );
            // ngram_analysis.filter_subsections();
            // println!("Num ngram sections: {}", ngram_analysis.sections.len());

            let depth_list = draw_trace.iter().map(|call| call.depth).collect();
            let depth_envelope = DepthEnvelope::from_depth_list2(depth_list, &draw_trace);

            println!("depth_envelope: {depth_envelope:#?}");

            // println!("depth_graph: {depth_graph:?}");
            println!("num_calls: {}", draw_trace.len());

            Ok(Self {
                draw_trace,
                max_depth,
                ngram_analysis: None,
                depth_envelope,
            })
        }
    }
}
