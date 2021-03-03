use serde::{Deserialize, Serialize};

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
}

impl PartialEq for FunctionCall {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
    }
}

impl FunctionCall {
    fn eq_id(&self, other_id: i32) -> bool {
        self.id == other_id
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

    fn to_tree_node(&self, depth: i32) -> TreeNode {
        let mut ticks = 0;
        if let Some(position_ticks) = &self.position_ticks {
            for tick in position_ticks {
                ticks += tick.ticks;
            }
        }
        TreeNode {
            depth,
            script_id: self.call_frame.script_id.parse().unwrap(),
            ticks,
        }
    }
}

pub struct TreeNode {
    pub depth: i32,
    pub script_id: i32,
    // url: String,
    pub ticks: i32,
}
