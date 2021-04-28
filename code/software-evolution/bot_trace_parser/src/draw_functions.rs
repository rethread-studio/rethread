use crate::profile::*;
use crate::{ColorMode, Model};
use nannou::prelude::*;


// GRAPH DEPTH

pub fn draw_polar_depth_graph(draw: &Draw, model: &Model, win: &Rect) {
    let angle_scale: f32 = PI * 2.0 / model.longest_tree as f32;
    let radius_scale: f32 = win.h()
        / ((model.deepest_tree_depth + 1) as f32
            * (((model.num_profiles - 1) as f32 * model.separation_ratio) + 1.0)
            * 2.0);
    let tree_separation = radius_scale * model.deepest_tree_depth as f32;
    for i in 0..model.index {
        let angle = i as f32 * angle_scale;
        for (index, td) in model.trace_datas.iter().enumerate() {
            let d_tree = &td.graph_data.depth_tree;
            if i < d_tree.len() && index < model.num_profiles as usize {
                let start_radius = d_tree[i].depth as f32 * radius_scale
                    + (index as f32 * tree_separation * model.separation_ratio);
                let radius = (d_tree[i].depth + 1) as f32 * radius_scale
                    + (index as f32 * tree_separation * model.separation_ratio);
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_profile),
                };
                let weight = d_tree[i].ticks as f32;
                let weight = weight;
                let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius);
                let end = pt2(angle.cos() * radius, angle.sin() * radius);
                // Draw a transparent circle representing the time spent
                let mut transparent_col = col.clone();
                transparent_col.alpha = 0.01 * weight;
                draw.ellipse()
                    .radius(weight.max(0.0))
                    .xy(start)
                    .stroke_weight(0.0)
                    .color(transparent_col);
                // Draw the line representing the function call
                draw.line()
                    .stroke_weight(1.0)
                    .start(start)
                    .end(end)
                    .color(col);
            }
        }
    }
}

pub fn draw_flower_grid_graph_depth(draw: &Draw, model: &Model, win: &Rect) {
    let angle_scale: f32 = PI * 2.0 / model.longest_tree as f32;
    let radius_scale: f32 = win.h() / ((model.deepest_tree_depth + 1) as f32 * 4.0);
    for (index, td) in model.trace_datas.iter().enumerate() {
        let d_tree = &td.graph_data.depth_tree;
        let offset_angle = (index as f32 / model.num_profiles as f32) * PI * 2.0;
        let offset_radius = match index {
            0 => 0.0,
            _ => radius_scale * model.deepest_tree_depth as f32 * 1.5,
        };
        let offset = pt2(
            offset_angle.cos() * offset_radius,
            offset_angle.sin() * offset_radius,
        );
        for i in 0..model.index {
            let angle = i as f32 * angle_scale;
            if i < d_tree.len() && index < model.num_profiles as usize {
                let start_radius = d_tree[i].depth as f32 * radius_scale;
                let radius = (d_tree[i].depth + 1) as f32 * radius_scale;
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_profile),
                };
                let weight = d_tree[i].ticks as f32;
                let weight = weight.max(0.0);

                let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius) + offset;
                let end = pt2(angle.cos() * radius, angle.sin() * radius) + offset;
                // Draw a transparent circle representing the time spent
                let mut transparent_col = col.clone();
                transparent_col.alpha = 0.01 * weight;
                draw.ellipse()
                    .radius(weight)
                    .stroke_weight(0.0)
                    .xy(start)
                    .color(transparent_col);
                // Draw the line representing the function call
                draw.line()
                    .stroke_weight(1.0)
                    .start(start)
                    .end(end)
                    .color(col);
            }
        }
    }
}

pub fn draw_vertical_graph_depth(draw: &Draw, model: &Model, win: &Rect) {
    let x_scale: f32 = win.w()
        / ((model.num_profiles as f32 * model.separation_ratio + 1.0)
            * model.deepest_tree_depth as f32);
    let y_scale: f32 = win.h() / model.longest_tree as f32;

    let tree_separation = win.w() / model.num_profiles as f32;
    for i in 0..model.index {
        let y = win.top() - (i as f32 * y_scale);
        for (index, td) in model.trace_datas.iter().enumerate() {
            let d_tree = &td.graph_data.depth_tree;
            if i < d_tree.len() && index < model.num_profiles as usize {
                let x = win.left()
                    + (d_tree[i].depth as f32 * x_scale
                        + (index as f32 * tree_separation * model.separation_ratio));
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_profile),
                };
                let weight = d_tree[i].ticks as f32;
                // Draw a transparent circle representing the time spent
                let mut transparent_col = col.clone();
                transparent_col.alpha = 0.01 * weight;
                draw.ellipse()
                    .radius(weight)
                    .stroke_weight(0.0)
                    .xy(pt2(x, y))
                    .color(transparent_col);
                draw.rect().color(col).x_y(x, y).w_h(x_scale, y_scale);
            }
        }
    }
}

pub fn draw_horizontal_graph_depth(draw: &Draw, model: &Model, win: &Rect) {
    let y_scale: f32 = win.h()
        / ((model.num_profiles as f32 * model.separation_ratio + 1.0)
            * model.deepest_tree_depth as f32);
    let x_scale: f32 = win.w() / model.longest_tree as f32;

    let tree_separation = win.h() / model.num_profiles as f32;
    for i in 0..model.index {
        let x = win.left() + (i as f32 * x_scale);
        for (index, td) in model.trace_datas.iter().enumerate() {
            let d_tree = &td.graph_data.depth_tree;
            if i < d_tree.len() && index < model.num_profiles as usize {
                let y = win.top()
                    - (d_tree[i].depth as f32 * y_scale
                        + (index as f32 * tree_separation * model.separation_ratio));
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_profile),
                };
                let weight = d_tree[i].ticks as f32;
                // Draw a transparent circle representing the time spent
                let mut transparent_col = col.clone();
                transparent_col.alpha = 0.01 * weight;
                draw.ellipse()
                    .radius(weight)
                    .stroke_weight(0.0)
                    .xy(pt2(x, y))
                    .color(transparent_col);
                draw.rect()
                    .color(col)
                    .x_y(x, y)
                    .w_h(x_scale, (y_scale * 0.5).max(1.0));
            }
        }
    }
}

// INDENTATION

pub fn draw_flower_grid_indentation(draw: &Draw, model: &Model, win: &Rect) {
    let angle_scale: f32 = PI * 2.0 / model.longest_indentation as f32;
    let radius_scale: f32 = win.h() / ((model.deepest_indentation + 1) as f32 * 4.0);

    // If there are too many lines to be drawn on the screen, don't draw them all
    let graph_width = radius_scale * model.deepest_indentation as f32 * 1.5;
    let res_decimator = (1.0 / (angle_scale * graph_width)) as usize;
    println!("res_decimator: {}", res_decimator);
    for (index, td) in model.trace_datas.iter().enumerate() {
        if let Some(indent_profile) = &td.indentation_profile {
            let offset_angle = (index as f32 / model.num_profiles as f32) * PI * 2.0;
            let offset_radius = match index {
                0 => 0.0,
                _ => radius_scale * model.deepest_indentation as f32 * 1.5,
            };
            let offset = pt2(
                offset_angle.cos() * offset_radius,
                offset_angle.sin() * offset_radius,
            );

            for i in 0..indent_profile.len() {
                if i % res_decimator == 0 {
                    let angle = i as f32 * angle_scale;
                    if i < indent_profile.len() {
                        let start_radius = indent_profile[i] as f32 * radius_scale;
                        let radius = (indent_profile[i] + 1) as f32 * radius_scale;
                        let col = match model.color_mode {
                            ColorMode::Script => script_color(indent_profile[i] as f32),
                            ColorMode::Profile => profile_color(index as f32),
                            ColorMode::Selected => selected_color(index, model.selected_profile),
                        };

                        let start =
                            pt2(angle.cos() * start_radius, angle.sin() * start_radius) + offset;
                        let end = pt2(angle.cos() * radius, angle.sin() * radius) + offset;
                        // Draw the line representing the indentation level
                        draw.line()
                            .stroke_weight(1.0)
                            .start(start)
                            .end(end)
                            .color(col);
                    }
                }
            }
        }
    }
}

pub fn draw_single_flower_indentation(draw: &Draw, model: &Model, win: &Rect) {
    let td = &model.trace_datas[model.selected_profile];
    let index = model.selected_profile;
    let deep_indent = model.deepest_indentation as f32;

    let max_radius = win.h() * 0.4;
    if let Some(indent_profile) = &td.indentation_profile {
        let angle_scale: f32 = PI * 2.0 / (indent_profile.len() +1) as f32;
        for i in 0..indent_profile.len() {
            if true {
                //if i % res_decimator == 0 {
                let angle = i as f32 * angle_scale;
                
                if i < indent_profile.len() {
                    let sine = (angle * (10. + 5.7362 * indent_profile[i] as f32)).sin() * max_radius * 0.01;
                    // let radius = (indent_profile[i] + 1) as f32 * radius_scale;
                    let radius = ((indent_profile[i] + 1) as f32 / deep_indent).powf(0.7) * max_radius + sine;
                    let col = match model.color_mode {
                        ColorMode::Script => script_color(indent_profile[i] as f32),
                        ColorMode::Profile => profile_color(index as f32),
                        ColorMode::Selected => selected_color(index, model.selected_profile),
                    };

                    let start = pt2(angle.cos() * radius, angle.sin() * radius);
                    // Draw the line representing the indentation level
                    draw.rect().xy(start).w_h(1.0, 1.0).color(col);
                }
            }
        }
    }
}

pub fn draw_single_flower_line_length(draw: &Draw, model: &Model, win: &Rect) {
    let td = &model.trace_datas[model.selected_profile];
    let index = model.selected_profile;
    let deep_indent = model.deepest_line_length as f32;

    let max_radius = win.h() * 0.4;
    if let Some(line_profile) = &td.line_length_profile {
        let angle_scale: f32 = PI * 2.0 / (line_profile.len() +1) as f32;
        for i in 0..line_profile.len() {
            if true {
                //if i % res_decimator == 0 {
                let angle = i as f32 * angle_scale;
                
                if i < line_profile.len() {
                    // let sine = (angle * (10. + 5.7362 * line_profile[i] as f32)).sin() * max_radius * 0.001;
                    // let radius = (indent_profile[i] + 1) as f32 * radius_scale;
                    let radius = ((line_profile[i] + 1) as f32 / deep_indent).powf(0.16) * max_radius;
                    let col = match model.color_mode {
                        ColorMode::Script => script_color(line_profile[i] as f32 * 0.1),
                        ColorMode::Profile => profile_color(index as f32),
                        ColorMode::Selected => selected_color(index, model.selected_profile),
                    };

                    let start = pt2(angle.cos() * radius, angle.sin() * radius);
                    // Draw the line representing the indentation level
                    draw.rect().xy(start).w_h(1.0, 1.0).color(col);
                }
            }
        }
    }
}

fn script_color(id: f32) -> Hsla {
    hsla(id as f32 * 0.0226, 0.8, 0.45, 1.0)
}

fn profile_color(index: f32) -> Hsla {
    hsla(index * 0.048573, 0.8, 0.45, 1.0)
}

fn selected_color(index: usize, selected: usize) -> Hsla {
    if index == selected {
        hsla(0.048573, 0.8, 0.45, 1.0)
    } else {
        hsla(0.7, 0.8, 0.45, 1.0)
    }
}
