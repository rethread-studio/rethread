use crate::coverage::*;
use nannou_osc as osc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// structs needed to deserialize the profile.json file
/// Profile is the main deserializing struct for the profile.json file
#[derive(Serialize, Deserialize)]
pub struct Profile {
    nodes: Vec<FunctionCall>,
    #[serde(alias = "startTime")]
    start_time: i64,
    #[serde(alias = "endTime")]
    end_time: i64,
    samples: Vec<i32>,
}

#[derive(Serialize, Deserialize)]
pub struct FunctionCall {
    id: i32,
    #[serde(alias = "callFrame")]
    call_frame: CallFrame,
    #[serde(alias = "hitCount")]
    hit_count: u32,
    children: Option<Vec<i32>>,
    #[serde(alias = "positionTicks")]
    position_ticks: Option<Vec<Tick>>,
}

#[derive(Serialize, Deserialize)]
pub struct CallFrame {
    #[serde(alias = "functionName")]
    function_name: String,
    #[serde(alias = "scriptId")]
    script_id: String,
    url: String,
    #[serde(alias = "lineNumber")]
    line_number: i32,
    #[serde(alias = "columnNumber")]
    column_number: i32,
}

#[derive(Serialize, Deserialize)]
pub struct Tick {
    line: i32,
    ticks: i32,
}

impl Profile {
    /// Generate the depth of the call tree step by step, recursively
    pub fn generate_depth_tree(&self) -> Vec<TreeNode> {
        let mut depth_tree = vec![];
        self.nodes[0].add_depth_tree(&mut depth_tree, 0, &self.nodes);
        depth_tree
    }

    pub fn generate_graph_data(&self) -> GraphData {
        let mut graph_data = GraphData::new();
        // Traverse the call graph recursively
        self.nodes[0].add_graph_data(&mut graph_data, &self.nodes);
        // TODO: Fetch the source code of the scripts and count the number of functions in them
        graph_data.update_metrics();
        // Traverse again to create the depth tree
        let depth_tree = self.generate_depth_tree();
        graph_data.depth_tree = depth_tree;
        graph_data
    }
}

impl PartialEq for FunctionCall {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl FunctionCall {
    fn add_graph_data(&self, graph_data: &mut GraphData, nodes: &Vec<FunctionCall>) {
        let script = graph_data.get_script_data(self.call_frame.script_id.clone());
        script.add_funcion_call(self.call_frame.function_name.clone(), self.ticks());
        if let Some(children) = &self.children {
            script.add_calls_from_function(
                self.call_frame.function_name.clone(),
                children.len() as u32,
            );
            for child_id in children {
                // Find the FunctionCall with that id
                let child_index = nodes.binary_search_by_key(&child_id, |probe| &probe.id);
                // Call add_depth_tree on it
                if let Ok(index) = child_index {
                    nodes[index].add_graph_data(graph_data, nodes);
                }
            }
        }
    }

    fn add_depth_tree(
        &self,
        depth_tree: &mut Vec<TreeNode>,
        depth: i32,
        nodes: &Vec<FunctionCall>,
    ) {
        if let Some(children) = &self.children {
            for child_id in children {
                depth_tree.push(self.to_tree_node(depth));
                // Find the FunctionCall with that id
                let child_index = nodes.binary_search_by_key(&child_id, |probe| &probe.id);
                // Call add_depth_tree on it
                if let Ok(index) = child_index {
                    nodes[index].add_depth_tree(depth_tree, depth + 1, nodes);
                }
            }
        }
    }

    fn ticks(&self) -> i32 {
        let mut ticks = 0;
        if let Some(position_ticks) = &self.position_ticks {
            for tick in position_ticks {
                ticks += tick.ticks;
            }
        }
        ticks
    }

    fn to_tree_node(&self, depth: i32) -> TreeNode {
        TreeNode {
            depth,
            script_id: self.call_frame.script_id.parse().unwrap(),
            ticks: self.ticks(),
        }
    }
}

pub struct TraceData {
    pub graph_data: GraphData,
    pub indentation_profile: Option<Vec<u32>>,
    pub line_length_profile: Option<Vec<u32>>,
    pub coverage: Option<Coverage>,
    pub name: String,
    pub timestamp: String,
}

impl TraceData {
    pub fn new(name: String, timestamp: String, graph_data: GraphData) -> Self {
        Self {
            graph_data,
            indentation_profile: None,
            line_length_profile: None,
            coverage: None,
            name,
            timestamp,
        }
    }
    pub fn add_indentation_profile(&mut self, data: String) -> Result<(), ()> {
        let mut indentation_profile = vec![];
        for n in data.split(',') {
            match n.parse::<u32>() {
                Ok(num) => indentation_profile.push(num),
                Err(e) => {
                    eprintln!("Failed to parse number {}, {}", n, e);
                    return Err(());
                }
            }
        }
        self.indentation_profile = Some(indentation_profile);
        Ok(())
    }
    pub fn add_line_length_profile(&mut self, data: String) -> Result<(), ()> {
        let mut line_length_profile = vec![];
        for n in data.split(',') {
            match n.parse::<u32>() {
                Ok(num) => line_length_profile.push(num),
                Err(e) => {
                    eprintln!("Failed to parse number {}, {}", n, e);
                    return Err(());
                }
            }
        }
        self.line_length_profile = Some(line_length_profile);
        Ok(())
    }
}

pub struct GraphData {
    pub script_data: HashMap<String, ScriptData>,
    pub depth_tree: Vec<TreeNode>,
}

impl GraphData {
    pub fn new() -> Self {
        GraphData {
            script_data: HashMap::new(),
            depth_tree: vec![],
        }
    }

    pub fn get_script_data(&mut self, script_id: String) -> &mut ScriptData {
        self.script_data
            .entry(script_id.clone())
            .or_insert(ScriptData::new(&script_id))
    }
    /// Updates the variables that depend only on other data in the
    /// GraphData. Also updates all ScriptData in the GraphData
    fn update_metrics(&mut self) {
        for script in self.script_data.values_mut() {
            script.update_metrics();
        }
    }

    pub fn send_script_data_osc(&self, sender: &osc::Sender<osc::Connected>) {
        let osc_addr = "/graph_data".to_string();
        sender.send((osc_addr, vec![])).ok();
        for sd in self.script_data.values() {
            let osc_addr = "/script_data".to_string();
            let args = vec![
                osc::Type::Int(sd.id),
                osc::Type::Int(sd.ticks_in_script),
                osc::Type::Int(sd.num_functions as i32),
                osc::Type::Int(sd.num_called_functions as i32),
                osc::Type::Int(sd.total_function_calls as i32),
            ];
            let packet = (osc_addr, args);
            sender.send(packet).ok();
            std::thread::sleep(std::time::Duration::from_millis(1));
            for fd in sd.function_data.values() {
                let osc_addr = "/function_data".to_string();
                let args = vec![
                    osc::Type::Int(fd.ticks_in_function),
                    osc::Type::Int(fd.calls_to_function as i32),
                    osc::Type::Int(fd.calls_from_function as i32),
                ];
                let packet = (osc_addr, args);
                std::thread::sleep(std::time::Duration::from_millis(1));
                sender.send(packet).ok();
            }
            let osc_addr = "/end_of_script_data".to_string();
            sender.send((osc_addr, vec![])).ok();
        }
        let osc_addr = "/end_of_graph_data".to_string();
        sender.send((osc_addr, vec![])).ok();
    }
}

pub struct TreeNode {
    pub depth: i32,
    pub script_id: i32,
    // url: String,
    pub ticks: i32,
}

pub struct ScriptData {
    pub id: i32,
    /// the number of ticks recorded in the functions in this script
    pub ticks_in_script: i32,
    /// the number of functions in the javascript source code, counted by
    /// counting occurrencies of "function" and "=>" in the code
    pub num_functions: u32,
    /// the number of functions in the script that are called at least once
    pub num_called_functions: u32,
    /// the total number of function calls over all functions in the script
    pub total_function_calls: u32,
    pub function_data: HashMap<String, FunctionData>,
    pub source_code: Option<String>,
}

impl ScriptData {
    pub fn new(id: &str) -> Self {
        ScriptData {
            id: id
                .parse::<i32>()
                .expect(r#"Error: script id is not a number"#),
            ticks_in_script: 0,
            num_functions: 0,
            num_called_functions: 0,
            total_function_calls: 0,
            function_data: HashMap::new(),
            source_code: None,
        }
    }
    pub fn add_funcion_call(&mut self, name: String, ticks: i32) {
        let function = self
            .function_data
            .entry(name)
            .or_insert_with(FunctionData::new);
        function.ticks_in_function += ticks;
        function.calls_to_function += 1;
        self.total_function_calls += 1;
        self.ticks_in_script += ticks;
    }
    pub fn add_calls_from_function(&mut self, name: String, children: u32) {
        let function = self
            .function_data
            .entry(name)
            .or_insert_with(FunctionData::new);
        function.calls_from_function += children;
    }
    /// Updates the variables that depend only on other data in the ScriptData
    pub fn update_metrics(&mut self) {
        self.num_called_functions = self.function_data.len() as u32;
        self.num_functions = self.num_called_functions; // TODO: Get actual number from source code
    }
}

pub struct FunctionData {
    pub ticks_in_function: i32,
    pub calls_to_function: u32,
    pub calls_from_function: u32,
}

impl FunctionData {
    pub fn new() -> Self {
        FunctionData {
            ticks_in_function: 0,
            calls_to_function: 0,
            calls_from_function: 0,
        }
    }
}
