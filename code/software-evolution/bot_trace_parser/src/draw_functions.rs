use crate::profile::*;
use crate::{ColorMode, Model};
use nannou::{color::Mix, prelude::*};

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
        let angle_scale: f32 = PI * 2.0 / (indent_profile.len() + 1) as f32;
        for i in 0..indent_profile.len() {
            if true {
                //if i % res_decimator == 0 {
                let angle = i as f32 * angle_scale;

                if i < indent_profile.len() {
                    let sine = (angle * (10. + 5.7362 * indent_profile[i] as f32)).sin()
                        * max_radius
                        * 0.01;
                    // let radius = (indent_profile[i] + 1) as f32 * radius_scale;
                    let radius = ((indent_profile[i] + 1) as f32 / deep_indent).powf(0.7)
                        * max_radius
                        + sine;
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
        let angle_scale: f32 = PI * 2.0 / (line_profile.len() + 1) as f32;
        for i in 0..line_profile.len() {
            if true {
                //if i % res_decimator == 0 {
                let angle = i as f32 * angle_scale;

                if i < line_profile.len() {
                    // let sine = (angle * (10. + 5.7362 * line_profile[i] as f32)).sin() * max_radius * 0.001;
                    // let radius = (indent_profile[i] + 1) as f32 * radius_scale;
                    let radius =
                        ((line_profile[i] + 1) as f32 / deep_indent).powf(0.16) * max_radius;
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

// COVERAGE

pub fn draw_coverage_heat_map_square(draw: &Draw, model: &Model, win: &Rect) {
    if let Some(coverage) = &model.trace_datas[model.selected_profile].coverage {
        let vector = &coverage.vector;
        let total_area = win.w() * win.h();
        let area_per_pair = total_area as f64 / model.longest_coverage_vector as f64;
        let side_length = area_per_pair.sqrt() as f32;
        let squares_per_row = (win.w() / side_length).floor();

        for (i, pair) in vector.iter().enumerate() {
            //let heat = pair.1 as f32 / model.max_coverage_vector_count as f32;
            let heat = pair.0 as f32 / model.max_coverage_total_length as f32;
            let heat = heat.powf(0.33);
            let col = hsla(-0.5 + heat * 0.5, 0.7, 0.6, 1.0);
            // let size = (pair.0 as f32 / model.max_coverage_total_length as f32) * total_area;
            let y = win.top() - (i as f32 / squares_per_row).floor() as f32 * side_length;
            let x = (i % squares_per_row as usize) as f32 * side_length + win.left();
            draw.rect()
                .x_y(x, y)
                .w_h(side_length, side_length)
                .color(col);
        }
    }
}

pub fn draw_coverage_heat_map(draw: &Draw, model: &Model, win: &Rect) {
    let coverage = match &model.trace_datas[model.selected_profile].coverage {
        Some(it) => it,
        _ => return,
    };
    let vector = &coverage.vector;
    let width_per_length = win.w() as f64 / model.max_coverage_total_length as f64;
    //let width_per_length = win.w() as f64 / coverage.total_length as f64;

    let col1 = hsla(0.0, 1.0, 0.45, 1.0);
    let col2 = hsla(0.6, 0.8, 0.25, 1.0);

    let gradient = nannou::color::Gradient::new(vec![col2, col1]);

    let mut x = 0.0;

    let mut old_rect = Rect::from_wh(pt2(0.0, 0.0)).left_of(*win);

    for (i, pair) in vector.iter().enumerate() {
        let heat = pair.1 as f32 / model.max_coverage_vector_count as f32;
        let width = pair.0 as f64 * width_per_length;
        if width == 0.0 {
            println!("width 0, pair.0: {}", pair.0);
        }
        let new_rect = Rect::from_w_h(width as f32, win.h()).right_of(old_rect);
        // println!("width: {}", width);
        let heat = heat.powf(0.1);
        let col = hsla(0.6 + heat * 0.6, 0.4 + heat * 0.6, 0.055 + heat * 0.6, 1.0);

        // let col = col2.mix(&col1, heat);
        // let col = gradient.get((new_rect.x() - win.left()) / win.w());
        // let col = gradient.get(heat);

        draw.rect().xy(new_rect.xy()).wh(new_rect.wh()).color(col);
        old_rect = new_rect;
    }
}

pub fn draw_coverage_blob(draw: &Draw, model: &Model, win: &Rect) {
    let coverage = match &model.trace_datas[model.selected_profile].coverage {
        Some(it) => it,
        _ => return,
    };
    let vector = &coverage.vector;
    //let width_per_length = win.w() / model.max_coverage_total_length as f32;

    let num_circles = 8.;

    let radius_per_circle = win.h() * 0.5 / (num_circles + 2.0);

    let mut coloured_points = vec![];
    let mut sum_length = 0.0;
    for (i, pair) in vector.iter().enumerate() {
        let this_length = pair.0 as f32 / model.max_coverage_total_length as f32;
        let heat = pair.1 as f32 / model.max_coverage_vector_count as f32;
        let heat = heat.powf(0.1);
        let angle = sum_length * PI * 2. * num_circles;
        let num_circles = (sum_length * num_circles).floor();
        let radius = heat * radius_per_circle + num_circles * radius_per_circle + win.h() * 0.1;
        sum_length += this_length;
        let point = pt2(angle.cos() * radius, angle.sin() * radius);
        let col = hsla(0.6 + heat * 0.6, 0.4 + heat * 0.6, 0.055 + heat * 0.6, 1.0);
        coloured_points.push((point, col));
    }
    draw.polyline()
        .join_round()
        .weight(2.0)
        .points_colored(coloured_points);
}

// HELPER FUNCTIONS

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
