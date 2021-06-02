use crate::profile::*;
use crate::wgpu_helpers::*;
use crate::{ColorMode, Model};
use nannou::{
    color::{IntoColor, Mix},
    prelude::*,
};
use spade::delaunay::FloatDelaunayTriangulation;

// GRAPH DEPTH

pub fn draw_polar_depth_graph(draw: &Draw, model: &Model, win: &Rect) {
    let site = &model.sites[model.selected_site];
    let angle_scale: f32 = PI * 2.0 / site.longest_tree as f32;
    let radius_scale: f32 = win.h()
        / ((site.deepest_tree_depth + 1) as f32
            * (((site.trace_datas.len() - 1) as f32 * model.param1) + 1.0)
            * 2.0);
    let tree_separation = radius_scale * site.deepest_tree_depth as f32;

    for (index, td) in site.trace_datas.iter().enumerate() {
        let d_tree = &td.graph_data.depth_tree;
        let start_radius = index as f32 * tree_separation * model.param1;
        let mut start = pt2(start_radius, start_radius);
        for i in 0..model.index {
            let angle = i as f32 * angle_scale + PI / 4. + index.pow(2) as f32 * 0.00003;
            if i < d_tree.len() && index < site.trace_datas.len() {
                let start_radius = d_tree[i].depth as f32 * radius_scale
                    + (index as f32 * tree_separation * model.param1);
                let radius = (d_tree[i].depth + 1) as f32 * radius_scale
                    + (index as f32 * tree_separation * model.param1);
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_visit),
                };
                let weight = d_tree[i].ticks as f32;
                let weight = 1.0 - (1.0 - (weight.clamp(0.0, 20.0) / 20.0)).powi(2);
                // let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius);
                let end = pt2(angle.cos() * radius, angle.sin() * radius);
                // Draw a transparent circle representing the time spent
                let mut transparent_col = col.clone();
                transparent_col.alpha = 0.5; // (0.005 * weight * 20.0).min(0.5);
                draw.rect().xy(end).color(col).w_h(2., 2.);
                draw.ellipse()
                    .radius(weight * tree_separation)
                    .xy(start)
                    .stroke_weight(0.0)
                    .color(transparent_col);
                // Draw the line representing the function call
                // draw.line()
                //     .stroke_weight(1.0)
                //     .start(start)
                //     .end(end)
                //     .color(col);
                start = end;
            }
        }
    }
}

pub fn draw_polar_axes_depth_graph(draw: &Draw, model: &Model, win: &Rect) {
    let trace_datas = &model.sites[model.selected_site].trace_datas;
    let site = &model.sites[model.selected_site];
    let angle_scale: f32 = PI * 2.0 / trace_datas.len() as f32;
    let radius_offset = win.h() * 0.02;
    let radius_scale: f32 = win.h() * 0.90
        / ((site.longest_tree + 1) as f32
            //* (((model.trace_datas.len() - 1) as f32 * model.separation_ratio) + 1.0)
            * 2.0);
    let tree_separation = radius_scale * site.deepest_tree_depth as f32;

    let mut coloured_points = Vec::with_capacity(trace_datas.len() * site.longest_tree as usize);
    for (index, td) in trace_datas.iter().enumerate() {
        let d_tree = &td.graph_data.depth_tree;
        let start_radius = index as f32 * tree_separation * model.param1;
        let mut start = pt2(start_radius, start_radius);
        for i in 0..d_tree.len() {
            let circle_radius_scale = 1. / (i as f32) + 0.2;
            let angle = index as f32 * angle_scale + PI / 4.; // + i as f32 * 0.5;
                                                              // Add some sine curvature to the line
            let angle = angle + (i as f32 * 0.05).sin() * circle_radius_scale * angle_scale * 2.;
            if i < d_tree.len() && index < trace_datas.len() {
                let radius = (site.longest_tree as f32 - i as f32) * radius_scale + radius_offset;
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_visit),
                };
                let weight = d_tree[i].ticks as f32;
                let weight = 1.0 - (1.0 - (weight / site.max_profile_tick)).powi(4);
                // let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius);
                let end = pt2(angle.cos() * radius, angle.sin() * radius);

                // Draw a transparent circle representing the time spent
                let mut transparent_col = col;
                transparent_col.alpha = 0.25; // (0.005 * weight * 20.0).min(0.5);

                coloured_points.push((end, col));
                draw.ellipse()
                    .radius((weight * radius_scale * 90.0) * circle_radius_scale)
                    .xy(start)
                    .stroke_weight(0.0)
                    .color(transparent_col);
                // Draw the line representing the function call
                // draw.line()
                //     .stroke_weight(1.0)
                //     .start(start)
                //     .end(end)
                //     .color(col);
                start = end;
            }
        }
    }
    for (point, colour) in coloured_points {
        draw.rect().xy(point).color(colour).w_h(0.5, 0.5);
    }
}

pub fn draw_polar_axes_rolling_depth_graph(draw: &Draw, model: &Model, win: &Rect) {
    let num_visits = 24;
    let trace_datas = &model.sites[model.selected_site].trace_datas;
    let site = &model.sites[model.selected_site];
    let angle_scale: f32 = PI * 2.0 / num_visits as f32;
    let radius_offset = win.h() * 0.02;
    let radius_scale: f32 = win.h() * 0.90
        / ((site.longest_tree + 1) as f32
            //* (((model.trace_datas.len() - 1) as f32 * model.separation_ratio) + 1.0)
            * 2.0);
    let tree_separation = radius_scale * site.deepest_tree_depth as f32;

    let mut coloured_points = Vec::with_capacity(trace_datas.len() * site.longest_tree as usize);

    let actual_num_visits = num_visits.min(model.selected_visit);

    for (index, td) in trace_datas
        [model.selected_visit - actual_num_visits..model.selected_visit + 1]
        .iter()
        .rev()
        .enumerate()
    {
        let d_tree = &td.graph_data.depth_tree;
        let start_radius = index as f32 * tree_separation * model.param1;
        let mut start = pt2(start_radius, start_radius);
        for i in 0..d_tree.len() {
            let circle_radius_scale = 1. / (i as f32) + 0.2;
            let angle = PI / 2. - index as f32 * angle_scale;
            // Add some sine curvature to the line
            // let angle = angle + (i as f32 * 0.05).sin() * circle_radius_scale * angle_scale * 2.;
            if i < d_tree.len() && index < trace_datas.len() {
                let radius = (site.longest_tree as f32 - i as f32) * radius_scale + radius_offset;
                let mut col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_visit),
                };
                let weight = d_tree[i].ticks as f32;
                let weight = 1.0 - (1.0 - (weight / site.max_profile_tick)).powi(4);
                // let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius);
                let end = pt2(angle.cos() * radius, angle.sin() * radius);

                // Draw a transparent circle representing the time spent
                let index_transparency = 1.0 - (index as f32 / actual_num_visits as f32);
                let mut transparent_col = col;
                transparent_col.alpha = 0.25 * index_transparency; // (0.005 * weight * 20.0).min(0.5);
                col.alpha = index_transparency;

                coloured_points.push((end, col));
                draw.ellipse()
                    .radius((weight * radius_scale * 90.0) * circle_radius_scale)
                    .xy(start)
                    .stroke_weight(0.0)
                    .color(transparent_col);
                // Draw the line representing the function call
                // draw.line()
                //     .stroke_weight(1.0)
                //     .start(start)
                //     .end(end)
                //     .color(col);
                start = end;
            }
        }
    }
    for (point, colour) in coloured_points {
        draw.rect().xy(point).color(colour).w_h(0.5, 0.5);
    }
}

pub fn draw_triangle_rolling_depth_graph(draw: &Draw, model: &Model, win: &Rect) {
    let num_visits = 24;
    let trace_datas = &model.sites[model.selected_site].trace_datas;
    let site = &model.sites[model.selected_site];
    let y_scale = (win.h() * 0.9 / 2.0) / num_visits as f32;

    let radius_offset = win.h() * 0.02 - win.h() * 0.45;
    let radius_scale: f32 = win.h() * 0.90
        / ((site.longest_tree + 1) as f32
            //* (((model.trace_datas.len() - 1) as f32 * model.separation_ratio) + 1.0)
           * 2.0);

    let mut coloured_points = Vec::with_capacity(trace_datas.len() * site.longest_tree as usize);

    let actual_num_visits = num_visits.min(model.selected_visit + 1); // Don't index negative numbers

    for (index_u, td) in trace_datas
        [(model.selected_visit - actual_num_visits + 1)..=(model.selected_visit)]
        .iter()
        .enumerate()
    {
        let d_tree = &td.graph_data.depth_tree;
        let mut index = index_u as f32 + 1.0;
        let mut y_dir = 1.0;
        let mut visit_repeats = 1;
        // Fold the index numbering around for future traces, but with an inverted y
        if (index - actual_num_visits as f32).abs() < f32::EPSILON {
            visit_repeats = num_visits;
            // Repeat the current visit downwards
        }
        for repeat in 0..visit_repeats {
            index += repeat as f32;

            if index > actual_num_visits as f32 {
                // Fold repeats of the current trace down
                index = (actual_num_visits + actual_num_visits) as f32 - index;
                y_dir = -1.0;
            }

            let x_scale = (index as f32 / (actual_num_visits as f32 + 1.0)).powf(0.5);

            for i in 0..d_tree.len() {
                let circle_radius_scale = 1. / (i as f32) + 0.2;
                let y = y_scale * (actual_num_visits as f32 - index - 1.0) * y_dir;
                // Add some sine curvature to the line
                // let angle = angle + (i as f32 * 0.05).sin() * circle_radius_scale * angle_scale * 2.;
                if i < d_tree.len() && index_u < trace_datas.len() {
                    let radius = ((i as f32) * radius_scale * 2.0 + radius_offset) * x_scale;
                    let mut col = match model.color_mode {
                        ColorMode::Script => script_color(d_tree[i].script_id as f32),
                        ColorMode::Profile => profile_color(index as f32),
                        ColorMode::Selected => selected_color(index_u, model.selected_visit),
                    };
                    let weight = d_tree[i].ticks as f32;
                    let weight = 1.0 - (1.0 - (weight / site.max_profile_tick)).powi(4);
                    // let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius);
                    let pos = pt2(radius, y);

                    // Draw a transparent circle representing the time spent
                    let index_transparency =
                        (index as f32 / (actual_num_visits as f32 + 1.0)).powf(4.0);
                    let mut transparent_col = col;
                    transparent_col.alpha = 0.25 * index_transparency; // (0.005 * weight * 20.0).min(0.5);
                    col.alpha = index_transparency;

                    coloured_points.push((pos, col));
                    draw.ellipse()
                        .radius(
                            (weight * radius_scale * 90.0)
                                * circle_radius_scale
                                * (1.0 / (index_transparency * 0.9 + 0.1)),
                        )
                        .xy(pos)
                        .stroke_weight(0.0)
                        .color(transparent_col);
                    // Draw the line representing the function call
                    // draw.line()
                    //     .stroke_weight(1.0)
                    //     .start(start)
                    //     .end(end)
                    //     .color(col);
                }
            }
        }
    }
    for (point, colour) in coloured_points {
        draw.rect().xy(point).color(colour).w_h(0.5, 0.5);
    }
}

pub fn draw_all_sites_single_visit_polar_axes_depth_graph(draw: &Draw, model: &Model, win: &Rect) {
    let site = &model.sites[model.selected_site];
    let angle_offset_per_site = PI * 2.0 / model.sites.len() as f32;
    let angle_offset_per_visit = 0.02;
    let radius_offset = win.h() * 0.02;
    let num_old_visits = 10;

    let mut coloured_points =
        Vec::with_capacity(site.trace_datas.len() * site.longest_tree as usize);
    let selected_visit = model.selected_visit as i32;
    for (index, site) in model.sites.iter().enumerate() {
        for (visit_number, visit) in (selected_visit - num_old_visits..(selected_visit)).enumerate()
        {
            if (visit as usize) < site.trace_datas.len() && visit > 0 {
                let radius_scale: f32 = win.h() * 0.90
                    / ((site.longest_tree + 1) as f32
                   //* (((site.trace_datas.len() - 1) as f32 * site.separation_ratio) + 1.0)
                   * 2.0);
                let tree_separation = radius_scale * site.deepest_tree_depth as f32;
                let d_tree = &site.trace_datas[visit as usize].graph_data.depth_tree;
                let start_radius = index as f32 * tree_separation * model.param1;
                let mut start = pt2(start_radius, start_radius);
                let angle = index as f32 * angle_offset_per_site + PI / 4.;
                // Add angle offset per visit
                // let angle = angle + visit as f32 * angle_offset_per_visit;
                // Let the "old" visits trail off
                let angle =
                    angle + (visit_number as i32 - num_old_visits) as f32 * angle_offset_per_visit;
                for i in 0..d_tree.len() {
                    let circle_radius_scale = 1. / (i as f32) + 0.2;

                    // Add some sine curvature to the line
                    // let angle = angle + (i as f32 * 0.05).sin() * circle_radius_scale * angle_scale * 2.;
                    if i < d_tree.len() && index < site.trace_datas.len() {
                        let radius =
                            (site.longest_tree as f32 - i as f32) * radius_scale + radius_offset;
                        let mut col = match model.color_mode {
                            ColorMode::Script => script_color(d_tree[i].script_id as f32),
                            ColorMode::Profile => profile_color(index as f32),
                            ColorMode::Selected => selected_color(index, model.selected_visit),
                        };
                        let weight = d_tree[i].ticks as f32;
                        let weight = 1.0 - (1.0 - (weight / site.max_profile_tick)).powi(4);
                        // let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius);
                        let end = pt2(angle.cos() * radius, angle.sin() * radius);

                        col.alpha = ((visit_number + 1) as f32 / num_old_visits as f32).powi(5);

                        // Draw a transparent circle representing the time spent
                        let mut transparent_col = col;
                        transparent_col.alpha *= 0.25; // (0.005 * weight * 20.0).min(0.5);

                        coloured_points.push((end, col));
                        draw.ellipse()
                            .radius((weight * radius_scale * 90.0) * circle_radius_scale)
                            .xy(start)
                            .stroke_weight(0.0)
                            .color(transparent_col);
                        // Draw the line representing the function call
                        // draw.line()
                        //     .stroke_weight(1.0)
                        //     .start(start)
                        //     .end(end)
                        //     .color(col);
                        start = end;
                    }
                }
            }
        }
    }
    for (point, colour) in coloured_points {
        draw.rect().xy(point).color(colour).w_h(0.5, 0.5);
    }
}

fn vertex_to_col_point(vertex: &Vertex, width: f32, height: f32) -> (Point2<f32>, Rgba) {
    (
        pt2(vertex.position[0] * width, vertex.position[1] * height),
        rgba(vertex.color[0], vertex.color[1], vertex.color[2], 1.0),
    )
}

fn vertex_to_col_point_alpha(vertex: &Vertex, width: f32, height: f32) -> (Point2<f32>, Rgba) {
    (
        pt2(vertex.position[0] * width, vertex.position[1] * height),
        rgba(
            vertex.color[0],
            vertex.color[1],
            vertex.color[2],
            vertex.color[3],
        ),
    )
}

pub fn draw_depth_graph_rings(
    draw: &Draw,
    model: &Model,
    window: &Window,
    win: &Rect,
    encoder: &mut wgpu::CommandEncoder,
    texture_view: &wgpu::TextureView,
    wgpu_shader_data: &mut WgpuShaderData,
) {
    let site = &model.sites[model.selected_site];
    let num_circles = 4.;
    let points_per_circle = site.longest_tree as f32 / num_circles;
    let angle_scale: f32 = PI * 2.0 / site.longest_tree as f32;
    let max_radius = 0.475 * 2.0;
    let radius_scale: f32 = (max_radius * 2.)
        / ((site.deepest_tree_depth + 1) as f32 * ((num_circles + 1.) + 1.0) * 2.0);
    let tree_separation = radius_scale * site.deepest_tree_depth as f32;
    let d_tree = &site.trace_datas[model.selected_visit].graph_data.depth_tree;
    let start_radius = win.h() * 0.05;
    let mut start = pt2(0.0, start_radius);
    let mut coloured_points = Vec::with_capacity(d_tree.len());
    let mut float_delaunay = FloatDelaunayTriangulation::with_tree_locate();
    for i in 0..d_tree.len() {
        let angle = i as f32 * angle_scale * num_circles + PI / 2.;
        // index = what circle we are at
        let index = i as f32 / points_per_circle;

        let weight = d_tree[i].ticks as f32;
        let weight = (weight.clamp(0., 20.) / 20.).powf(0.45);
        // let weight = 1.0 - (1.0 - (weight.clamp(0.0, 20.0) / 20.0)).powf(0.5);

        let radius = (((d_tree[i].depth) as f32 / site.deepest_tree_depth as f32).powf(0.5)
            + weight)
            * (max_radius / num_circles)
            + (index as f32 * tree_separation);
        // let radius = max_radius - radius;
        let radius = (radius / max_radius).powf(0.9) * max_radius;

        let mut col = match model.color_mode {
            ColorMode::Script => script_color_sl(
                d_tree[i].script_id as f32,
                weight * 0.2 + 0.8,
                0.67 - (weight * 0.6).max((i as f32 / d_tree.len() as f32) * 0.5),
            ),
            ColorMode::Profile => profile_color(index),
            ColorMode::Selected => selected_color(model.selected_visit, model.selected_visit),
        };

        // let start = pt2(angle.cos() * start_radius, angle.sin() * start_radius);
        let point = pt2(angle.cos() * radius, angle.sin() * radius);
        // let point = pt2(-max_radius + radius * 2., weight * 100.);
        // Draw a transparent circle representing the time spent
        let mut transparent_col = col;
        transparent_col.alpha = 0.25; // (0.005 * weight * 20.0).min(0.5);
                                      // Draw the line representing the function call
                                      // draw.line()
                                      //     .stroke_weight(6.0)
                                      //     .start(start)
                                      //     .end(end)
                                      //     .color(col);
                                      // start = point;
        col.alpha = 0.08;
        let rgb = nannou::color::IntoLinSrgba::into_lin_srgba(col);

        coloured_points.push((point, col));
        float_delaunay.insert(Vertex {
            position: [point.x, point.y, 0.0],
            color: [rgb.red, rgb.blue, rgb.green, rgb.alpha],
        });
    }

    // Triangulate all the points
    wgpu_shader_data
        .vertices
        .resize(float_delaunay.num_triangles() * 3, Vertex::new());
    for (i, face) in float_delaunay.triangles().enumerate() {
        let triangle = face.as_triangle();
        wgpu_shader_data.vertices[i * 3] = *triangle[0];
        wgpu_shader_data.vertices[i * 3 + 1] = *triangle[1];
        wgpu_shader_data.vertices[i * 3 + 2] = *triangle[2];
        let points = vec![
            vertex_to_col_point(&triangle[0], win.w() * 0.5, win.h() * 0.5),
            vertex_to_col_point(&triangle[1], win.w() * 0.5, win.h() * 0.5),
            vertex_to_col_point(&triangle[2], win.w() * 0.5, win.h() * 0.5),
        ];
        draw.polyline().stroke_weight(3.0).points_colored(points);
    }
    wgpu_shader_data.set_new_vertices(window);
    wgpu_shader_data.view(encoder, texture_view);
}

pub fn draw_flower_grid_graph_depth(draw: &Draw, model: &Model, win: &Rect) {
    let site = &model.sites[model.selected_site];
    let angle_scale: f32 = PI * 2.0 / site.longest_tree as f32;
    let radius_scale: f32 = win.h() / ((site.deepest_tree_depth + 1) as f32 * 4.0);
    for (index, td) in site.trace_datas.iter().enumerate() {
        let d_tree = &td.graph_data.depth_tree;
        let offset_angle = (index as f32 / site.trace_datas.len() as f32) * PI * 2.0;
        let offset_radius = match index {
            0 => 0.0,
            _ => radius_scale * site.deepest_tree_depth as f32 * 1.5,
        };
        let offset = pt2(
            offset_angle.cos() * offset_radius,
            offset_angle.sin() * offset_radius,
        );
        for i in 0..model.index {
            let angle = i as f32 * angle_scale;
            if i < d_tree.len() && index < site.trace_datas.len() as usize {
                let start_radius = d_tree[i].depth as f32 * radius_scale;
                let radius = (d_tree[i].depth + 1) as f32 * radius_scale;
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_visit),
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
    let site = &model.sites[model.selected_site];
    let x_scale: f32 = win.w()
        / ((site.trace_datas.len() as f32 * model.param1 + 1.0) * site.deepest_tree_depth as f32);
    let y_scale: f32 = win.h() / site.longest_tree as f32;

    let tree_separation = win.w() / site.trace_datas.len() as f32;
    for i in 0..model.index {
        let y = win.top() - (i as f32 * y_scale);
        for (index, td) in site.trace_datas.iter().enumerate() {
            let d_tree = &td.graph_data.depth_tree;
            if i < d_tree.len() && index < site.trace_datas.len() as usize {
                let x = win.left()
                    + (d_tree[i].depth as f32 * x_scale
                        + (index as f32 * tree_separation * model.param1));
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_visit),
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
    let site = &model.sites[model.selected_site];
    let y_scale: f32 = win.h()
        / ((site.trace_datas.len() as f32 * model.param1 + 1.0) * site.deepest_tree_depth as f32);
    let x_scale: f32 = win.w() / site.longest_tree as f32;

    let tree_separation = win.h() / site.trace_datas.len() as f32;
    for i in 0..model.index {
        let x = win.left() + (i as f32 * x_scale);
        for (index, td) in site.trace_datas.iter().enumerate() {
            let d_tree = &td.graph_data.depth_tree;
            if i < d_tree.len() && index < site.trace_datas.len() as usize {
                let y = win.top()
                    - (d_tree[i].depth as f32 * y_scale
                        + (index as f32 * tree_separation * model.param1));
                let col = match model.color_mode {
                    ColorMode::Script => script_color(d_tree[i].script_id as f32),
                    ColorMode::Profile => profile_color(index as f32),
                    ColorMode::Selected => selected_color(index, model.selected_visit),
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
    let site = &model.sites[model.selected_site];
    let angle_scale: f32 = PI * 2.0 / site.longest_indentation as f32;
    let radius_scale: f32 = win.h() / ((site.deepest_indentation + 1) as f32 * 4.0);

    // If there are too many lines to be drawn on the screen, don't draw them all
    let graph_width = radius_scale * site.deepest_indentation as f32 * 1.5;
    let res_decimator = (1.0 / (angle_scale * graph_width)) as usize;
    println!("res_decimator: {}", res_decimator);
    for (index, td) in site.trace_datas.iter().enumerate() {
        if let Some(indent_profile) = &td.indentation_profile {
            let offset_angle = (index as f32 / site.trace_datas.len() as f32) * PI * 2.0;
            let offset_radius = match index {
                0 => 0.0,
                _ => radius_scale * site.deepest_indentation as f32 * 1.5,
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
                            ColorMode::Selected => selected_color(index, model.selected_visit),
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
    let site = &model.sites[model.selected_site];
    let td = &site.trace_datas[model.selected_visit];
    let index = model.selected_visit;
    let deep_indent = site.deepest_indentation as f32;

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
                        ColorMode::Selected => selected_color(index, model.selected_visit),
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
    let site = &model.sites[model.selected_site];
    let td = &site.trace_datas[model.selected_visit];
    let index = model.selected_visit;
    let deep_indent = site.deepest_line_length as f32;

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
                        ColorMode::Selected => selected_color(index, model.selected_visit),
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
    let site = &model.sites[model.selected_site];
    if let Some(coverage) = &site.trace_datas[model.selected_visit].coverage {
        let vector = &coverage.vector;
        let total_area = win.w() * win.h();
        let area_per_pair = total_area as f64 / site.longest_coverage_vector as f64;
        let side_length = area_per_pair.sqrt() as f32;
        let squares_per_row = (win.w() / side_length).floor();

        for (i, pair) in vector.iter().enumerate() {
            //let heat = pair.1 as f32 / site.max_coverage_vector_count as f32;
            let heat = pair.0 as f32 / site.max_coverage_total_length as f32;
            let heat = heat.powf(0.33);
            let col = hsla(-0.5 + heat * 0.5, 0.7, 0.6, 1.0);
            // let size = (pair.0 as f32 / site.max_coverage_total_length as f32) * total_area;
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
    let site = &model.sites[model.selected_site];
    let coverage = match &site.trace_datas[model.selected_visit].coverage {
        Some(it) => it,
        _ => return,
    };
    let vector = &coverage.vector;
    let width_per_length = win.w() as f64 / site.max_coverage_total_length as f64;
    //let width_per_length = win.w() as f64 / coverage.total_length as f64;

    let col1 = hsla(0.0, 1.0, 0.45, 1.0);
    let col2 = hsla(0.6, 0.8, 0.25, 1.0);

    let gradient = nannou::color::Gradient::new(vec![col2, col1]);

    let mut x = 0.0;

    let mut old_rect = Rect::from_wh(pt2(0.0, 0.0)).left_of(*win);

    for (i, pair) in vector.iter().enumerate() {
        let heat = pair.1 as f32 / site.max_coverage_vector_count as f32;
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
    let site = &model.sites[model.selected_site];
    let coverage = match &site.trace_datas[model.selected_visit].coverage {
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
        let this_length = pair.0 as f32 / site.max_coverage_total_length as f32;
        let heat = pair.1 as f32 / site.max_coverage_vector_count as f32;
        let heat = heat.powf(0.1);
        let angle = sum_length * PI * 2. * num_circles;
        let num_circles = sum_length * num_circles;
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

pub fn draw_smooth_coverage_blob(draw: &Draw, model: &Model, win: &Rect) {
    let site = &model.sites[model.selected_site];
    let coverage = match &site.trace_datas[model.selected_visit].coverage {
        Some(it) => it,
        _ => return,
    };
    let vector = &coverage.vector;
    //let width_per_length = win.w() / model.max_coverage_total_length as f32;

    let num_circles = 15.;

    let radius_per_circle = win.h() * 0.5 / (num_circles + 2.0);

    let mut coloured_points = vec![];
    let mut sum_length = 0.0;
    let mut last_heat = 0.;
    const MINIMUM_LENGTH: f32 = 0.001;
    for (i, pair) in vector.iter().enumerate() {
        let mut this_length = pair.0 as f32 / site.max_coverage_total_length as f32;
        let heat = pair.1 as f32 / site.max_coverage_vector_count as f32;
        let height = heat.powf(0.1);
        let heat = heat.powf(0.2);
        let col = hsla(
            0.6 + heat * 1.2,
            0.4 + heat * 0.6,
            0.055 + height * 0.6,
            (heat * 2.0).min(0.9) + 0.1,
        );
        // Split the line into many points if the segment is long
        while this_length > MINIMUM_LENGTH {
            let angle = sum_length * PI * 2. * num_circles;
            let num_circles = sum_length * num_circles;
            let radius =
                height * radius_per_circle + num_circles * radius_per_circle + win.h() * 0.1;
            let point = pt2(angle.cos() * radius, angle.sin() * radius);
            coloured_points.push((point, col));
            this_length -= MINIMUM_LENGTH;

            sum_length += MINIMUM_LENGTH;
        }
        // Now add the last point
        let angle = sum_length * PI * 2. * num_circles;
        let num_circles = sum_length * num_circles;
        let radius = heat * radius_per_circle + num_circles * radius_per_circle + win.h() * 0.1;
        let point = pt2(angle.cos() * radius, angle.sin() * radius);

        coloured_points.push((point, col));
        last_heat = heat;
        sum_length += this_length;
    }
    draw.polyline()
        .join_round()
        .weight(2.0)
        .points_colored(coloured_points);
}

/// Draws the JS coverage using a brush that is pushed from its normal orbit
pub fn draw_coverage_spacebrush(draw: &Draw, model: &Model, win: &Rect) {
    let site = &model.sites[model.selected_site];
    let coverage = match &site.trace_datas[model.selected_visit].coverage {
        Some(it) => it,
        _ => return,
    };
    let vector = &coverage.vector;
    //let width_per_length = win.w() / model.max_coverage_total_length as f32;

    let radius_offset = win.h() * 0.1;

    struct Spacebrush {
        pos: Point2<f32>,
        vel: Vector2<f32>,
        hue: f32,
        sat: f32,
        lightness: f32,
    }
    impl Spacebrush {
        fn update(
            &mut self,
            ring_pos: Point2<f32>,
            ring_angle: f32,
            count_ratio: f32,
            normal_thrust: f32,
        ) {
            let thrust = count_ratio.powf(0.5) * 20.;
            let ring_vel = (ring_pos - self.pos) * normal_thrust;
            let thrust_vel = pt2(ring_angle.cos(), ring_angle.sin()) * thrust;
            const MIX: f32 = 0.99;
            self.vel = (self.vel * MIX) + (ring_vel + thrust_vel) * (1. - MIX);
            // self.vel.limit_magnitude(10.0);
            self.pos += self.vel;
            self.hue += (count_ratio - 0.05).max(0.) * 0.04;
            self.sat = count_ratio.powf(0.3) * 3.;
            self.lightness = count_ratio.powf(0.35) * 1.2;
        }
        fn col(&self) -> Hsla {
            hsla(self.hue, (self.sat * 2.0).min(1.0), self.lightness, 0.8)
        }
    }

    let mut spacebrush = Spacebrush {
        pos: pt2(radius_offset, 0.),
        vel: pt2(0., 0.),
        hue: 0.0,
        sat: 0.0,
        lightness: 0.0,
    };

    let num_circles = 20.;

    let radius_per_circle = win.h() * 0.5 / (num_circles * 1.4);

    let mut coloured_points = vec![];
    let mut spacebrush_points = vec![];
    let mut ellipse_sizes = vec![];
    let mut sum_length = 0.0;
    const MINIMUM_LENGTH: f32 = 0.00004;
    for (i, pair) in vector.iter().enumerate() {
        let mut this_length = pair.0 as f32 / site.max_coverage_total_length as f32;
        let count_ratio = pair.1 as f32 / site.max_coverage_vector_count as f32;
        let height = count_ratio.powf(0.1);
        let heat = count_ratio.powf(0.2);
        let col = hsla(
            0.6 + heat * 1.2,
            0.4 + heat * 0.6,
            0.055 + height * 0.6,
            (heat * 2.0).min(0.9) + 0.1,
        );
        let _spacebrush_thrust = heat * 20.0;
        let spacebrush_normal_thrust = model.param1.powf(2.) * 50.0;
        // Split the line into many points if the segment is long
        while this_length > MINIMUM_LENGTH {
            let angle = sum_length * PI * 2. * num_circles;
            let num_circles = sum_length * num_circles;
            let radius =
                height * radius_per_circle + num_circles * radius_per_circle + win.h() * 0.1;
            let point = pt2(angle.cos() * radius, angle.sin() * radius);

            spacebrush.update(point, angle, count_ratio, spacebrush_normal_thrust);
            spacebrush_points.push((spacebrush.pos, spacebrush.col()));
            coloured_points.push((point, col));
            ellipse_sizes.push(height);
            this_length -= MINIMUM_LENGTH;

            sum_length += MINIMUM_LENGTH;
        }
        // Now add the last point
        let angle = sum_length * PI * 2. * num_circles;
        let num_circles = sum_length * num_circles;
        let radius = heat * radius_per_circle + num_circles * radius_per_circle + win.h() * 0.1;
        let point = pt2(angle.cos() * radius, angle.sin() * radius);

        spacebrush.update(point, angle, count_ratio, spacebrush_normal_thrust);
        spacebrush_points.push((spacebrush.pos, spacebrush.col()));
        ellipse_sizes.push(height);
        coloured_points.push((point, col));
        sum_length += this_length;
    }
    // draw.polyline()
    //     .join_round()
    //     .weight(1.0)
    //     .points_colored(coloured_points);

    for ((point, colour), size) in spacebrush_points.iter().zip(ellipse_sizes) {
        let mut col = *colour;
        col.alpha = 0.09;
        let radius = size * 25.0;
        if radius > 6.0 {
            draw.ellipse()
                .radius((radius - 6.0) * 1.5)
                .color(col)
                .xy(*point)
                .stroke_weight(0.);
        }
    }
    draw.polyline()
        .join_round()
        .weight(1.0)
        .points_colored(spacebrush_points);
}

pub fn draw_coverage_shell(
    draw: &Draw,
    model: &Model,
    window: &Window,
    win: &Rect,
    encoder: &mut wgpu::CommandEncoder,
    texture_view: &wgpu::TextureView,
    wgpu_shader_data: &mut WgpuShaderData,
) {
    let site = &model.sites[model.selected_site];
    let coverage = match &site.trace_datas[model.selected_visit].coverage {
        Some(it) => it,
        _ => return,
    };
    let vector = &coverage.vector;
    // Make sure the vertex vector is the right size
    // wgpu_shader_data
    //     .vertices
    //     .resize(vector.len(), Vertex::new());

    let mut float_delaunay = FloatDelaunayTriangulation::with_tree_locate();
    // Supports the insertion of f64-Vectors

    let num_circles = 8.;

    let radius_per_circle = 1.0 / (num_circles + 2.0);

    let mut coloured_points = vec![];
    let mut sum_length = 0.0;
    let mut sum_count_ratio = 0.0;
    for (i, pair) in vector.iter().enumerate() {
        let this_length = pair.0 as f32 / site.max_coverage_total_length as f32;
        let count_ratio = pair.1 as f32 / site.max_coverage_vector_count as f32;
        let heat = count_ratio.powf(0.1);
        let angle = sum_length * PI * 2. * num_circles;
        let num_circles = sum_length * num_circles;
        let radius = heat * radius_per_circle + num_circles * radius_per_circle;
        sum_length += this_length;
        let point = pt2(angle.cos() * radius, angle.sin() * radius);
        sum_count_ratio += (count_ratio.powf(0.5) - 0.05).max(0.) * model.param1 * 0.1;
        let col = hsla(
            0.6 + sum_count_ratio + model.param2,
            0.4 + heat * 0.6,
            0.055 + heat * 0.6,
            1.0,
        );
        let rgb = nannou::color::IntoLinSrgba::into_lin_srgba(col);
        coloured_points.push((point, col));
        float_delaunay.insert(Vertex {
            position: [point.x, point.y, 0.0],
            color: [rgb.red, rgb.blue, rgb.green, rgb.alpha],
        });
    }

    // Triangulate all the points
    wgpu_shader_data
        .vertices
        .resize(float_delaunay.num_triangles() * 3, Vertex::new());
    for (i, face) in float_delaunay.triangles().enumerate() {
        let triangle = face.as_triangle();
        wgpu_shader_data.vertices[i * 3] = *triangle[0];
        wgpu_shader_data.vertices[i * 3 + 1] = *triangle[1];
        wgpu_shader_data.vertices[i * 3 + 2] = *triangle[2];
    }

    wgpu_shader_data.set_new_vertices(window);
    wgpu_shader_data.view(encoder, texture_view);
}

pub fn draw_coverage_organic(
    draw: &Draw,
    model: &Model,
    window: &Window,
    win: &Rect,
    encoder: &mut wgpu::CommandEncoder,
    texture_view: &wgpu::TextureView,
    wgpu_shader_data: &mut WgpuShaderData,
) {
    let site = &model.sites[model.selected_site];
    let coverage = match &site.trace_datas[model.selected_visit].coverage {
        Some(it) => it,
        _ => return,
    };
    let vector = &coverage.vector;
    let radius_offset = 0.1;

    struct Spacebrush {
        pos: Point2<f32>,
        vel: Vector2<f32>,
        hue: f32,
        sat: f32,
        lightness: f32,
    }
    impl Spacebrush {
        fn update(
            &mut self,
            ring_pos: Point2<f32>,
            ring_angle: f32,
            count_ratio: f32,
            normal_thrust: f32,
        ) {
            let thrust = count_ratio.powf(0.5) * 20.;
            let ring_vel = (ring_pos - self.pos) * normal_thrust;
            let thrust_vel = pt2(ring_angle.cos(), ring_angle.sin()) * thrust;
            const MIX: f32 = 0.99;
            self.vel = (self.vel * MIX) + (ring_vel + thrust_vel) * (1. - MIX);
            // self.vel.limit_magnitude(10.0);
            self.pos += self.vel;
            self.hue += (count_ratio - 0.05).max(0.) * 0.04;
            self.sat = count_ratio.powf(0.3) * 3.;
            self.lightness = count_ratio.powf(0.4) * 1.3;
        }
        fn col(&self) -> Hsla {
            hsla(self.hue, (self.sat * 2.5).min(1.0), self.lightness, 1.0)
        }
    }

    let mut spacebrush = Spacebrush {
        pos: pt2(radius_offset, 0.),
        vel: pt2(0., 0.),
        hue: 0.0,
        sat: 0.0,
        lightness: 0.0,
    };

    let num_circles = 20.;

    let radius_per_circle = 0.5 / (num_circles * 1.4);

    let mut float_delaunay = FloatDelaunayTriangulation::with_tree_locate();
    let mut spacebrush_points = vec![];
    let mut ellipse_sizes = vec![];
    let mut sum_length = 0.0;
    const MINIMUM_LENGTH: f32 = 0.004;
    for (i, pair) in vector.iter().enumerate() {
        let mut this_length = pair.0 as f32 / site.max_coverage_total_length as f32;
        let count_ratio = pair.1 as f32 / site.max_coverage_vector_count as f32;
        let height = count_ratio.powf(0.1);
        let heat = count_ratio.powf(0.2);
        let _spacebrush_thrust = heat * 20.0;
        let spacebrush_normal_thrust = model.param1.powf(2.) * 50.0;
        // Split the line into many points if the segment is long
        while this_length > MINIMUM_LENGTH {
            let angle = sum_length * PI * 2. * num_circles;
            let num_circles = sum_length * num_circles;
            let radius = height * radius_per_circle + num_circles * radius_per_circle;
            let point = pt2(angle.cos() * radius, angle.sin() * radius);

            spacebrush.update(point, angle, count_ratio, spacebrush_normal_thrust);
            spacebrush_points.push((spacebrush.pos, spacebrush.col()));
            ellipse_sizes.push(height);
            let rgb = nannou::color::IntoLinSrgba::into_lin_srgba(spacebrush.col());
            float_delaunay.insert(Vertex {
                position: [spacebrush.pos.x, spacebrush.pos.y, 0.0],
                color: [rgb.red, rgb.blue, rgb.green, rgb.alpha],
            });
            this_length -= MINIMUM_LENGTH;

            sum_length += MINIMUM_LENGTH;
        }
        // Now add the last point
        let angle = sum_length * PI * 2. * num_circles;
        let num_circles = sum_length * num_circles;
        let radius = heat * radius_per_circle + num_circles * radius_per_circle;
        let point = pt2(angle.cos() * radius, angle.sin() * radius);

        spacebrush.update(point, angle, count_ratio, spacebrush_normal_thrust);
        spacebrush_points.push((spacebrush.pos, spacebrush.col()));
        ellipse_sizes.push(height);
        let rgb = nannou::color::IntoLinSrgba::into_lin_srgba(spacebrush.col());
        float_delaunay.insert(Vertex {
            position: [spacebrush.pos.x, spacebrush.pos.y, 0.0],
            color: [rgb.red, rgb.blue, rgb.green, rgb.alpha],
        });
        sum_length += this_length;
    }
    // Add the hot point highlights
    // for ((point, colour), size) in spacebrush_points.iter().zip(ellipse_sizes) {
    //     let mut col = *colour;
    //     col.alpha = 0.09;
    //     let radius = size;
    //     if radius > 6.0 {
    //         const CIRCLE_RESOLUTION: usize = 10;
    //         for i in 0..CIRCLE_RESOLUTION {
    //             let rgb = nannou::color::IntoLinSrgba::into_lin_srgba(col);
    //             let angle = (2.0 * PI) / i as f32;
    //             float_delaunay.insert(Vertex {
    //                 position: [
    //                     point.x + angle.cos() * radius,
    //                     point.y + angle.sin() * radius,
    //                     0.0,
    //                 ],
    //                 color: [rgb.red, rgb.blue, rgb.green, rgb.alpha],
    //             });
    //         }
    //     }
    // }
    // Triangulate all the points
    wgpu_shader_data
        .vertices
        .resize(float_delaunay.num_triangles() * 3, Vertex::new());
    for (i, face) in float_delaunay.triangles().enumerate() {
        let triangle = face.as_triangle();
        wgpu_shader_data.vertices[i * 3] = *triangle[0];
        wgpu_shader_data.vertices[i * 3 + 1] = *triangle[1];
        wgpu_shader_data.vertices[i * 3 + 2] = *triangle[2];
        // wgpu_shader_data.vertices[i * 3 + 3] = *triangle[0];
    }

    wgpu_shader_data.set_new_vertices(window);
    wgpu_shader_data.view(encoder, texture_view);
}

pub fn draw_coverage_voronoi(
    draw: &Draw,
    model: &Model,
    window: &Window,
    win: &Rect,
    colors: [[f32; 4]; 4],
    encoder: &mut wgpu::CommandEncoder,
    texture_view: &wgpu::TextureView,
    voronoi_shader: &mut VoronoiShader,
) {
    let site = &model.sites[model.selected_site];
    let coverage = match &site.trace_datas[model.selected_visit].coverage {
        Some(it) => it,
        _ => return,
    };
    let vector = &coverage.vector;
    let radius_offset = 0.1;
    // let mut float_delaunay = FloatDelaunayTriangulation::with_tree_locate();

    // struct Spacebrush {
    //     pos: Point2<f32>,
    //     vel: Vector2<f32>,
    //     hue: f32,
    //     sat: f32,
    //     lightness: f32,
    // }
    // impl Spacebrush {
    //     fn update(
    //         &mut self,
    //         ring_pos: Point2<f32>,
    //         ring_angle: f32,
    //         count_ratio: f32,
    //         normal_thrust: f32,
    //     ) {
    //         let thrust = count_ratio.powf(0.5) * 20.;
    //         let ring_vel = (ring_pos - self.pos) * normal_thrust;
    //         let thrust_vel = pt2(ring_angle.cos(), ring_angle.sin()) * thrust;
    //         const MIX: f32 = 0.99;
    //         self.vel = (self.vel * MIX) + (ring_vel + thrust_vel) * (1. - MIX);
    //         // self.vel.limit_magnitude(10.0);
    //         self.pos += self.vel;
    //         self.hue += (count_ratio - 0.05).max(0.) * 0.04;
    //         self.sat = count_ratio.powf(0.3) * 3.;
    //         self.lightness = count_ratio.powf(0.4) * 1.3;
    //     }
    //     fn col(&self) -> Hsla {
    //         hsla(self.hue, (self.sat * 2.5).min(1.0), self.lightness, 1.0)
    //     }
    // }

    // let mut spacebrush = Spacebrush {
    //     pos: pt2(radius_offset, 0.),
    //     vel: pt2(0., 0.),
    //     hue: 0.0,
    //     sat: 0.0,
    //     lightness: 0.0,
    // };

    // let num_circles = 20.;

    // let radius_per_circle = 0.5 / (num_circles * 1.4);

    //
    // let mut spacebrush_points = vec![];
    // let mut ellipse_sizes = vec![];
    // let mut sum_length = 0.0;
    // const MINIMUM_LENGTH: f32 = 0.4;
    // for (i, pair) in vector.iter().enumerate() {
    //     let mut this_length = pair.0 as f32 / site.max_coverage_total_length as f32;
    //     let count_ratio = pair.1 as f32 / site.max_coverage_vector_count as f32;
    //     let height = count_ratio.powf(0.1);
    //     let heat = count_ratio.powf(0.2);
    //     let _spacebrush_thrust = heat * 20.0;
    //     let spacebrush_normal_thrust = model.separation_ratio.powf(2.) * 50.0;
    //     // Split the line into many points if the segment is long
    //     while this_length > MINIMUM_LENGTH {
    //         let angle = sum_length * PI * 2. * num_circles;
    //         let num_circles = sum_length * num_circles;
    //         let radius = height * radius_per_circle + num_circles * radius_per_circle;
    //         let point = pt2(angle.cos() * radius, angle.sin() * radius);

    //         spacebrush.update(point, angle, count_ratio, spacebrush_normal_thrust);
    //         spacebrush_points.push((spacebrush.pos, spacebrush.col()));
    //         ellipse_sizes.push(height);
    //         let rgb = nannou::color::IntoLinSrgba::into_lin_srgba(spacebrush.col());
    //         float_delaunay.insert(Vertex {
    //             position: [spacebrush.pos.x, spacebrush.pos.y, 0.0],
    //             color: [rgb.red, rgb.blue, rgb.green, rgb.alpha],
    //         });
    //         this_length -= MINIMUM_LENGTH;

    //         sum_length += MINIMUM_LENGTH;
    //     }
    //     // Now add the last point
    //     let angle = sum_length * PI * 2. * num_circles;
    //     let num_circles = sum_length * num_circles;
    //     let radius = heat * radius_per_circle + num_circles * radius_per_circle;
    //     let point = pt2(angle.cos() * radius, angle.sin() * radius);

    //     spacebrush.update(point, angle, count_ratio, spacebrush_normal_thrust);
    //     spacebrush_points.push((spacebrush.pos, spacebrush.col()));
    //     ellipse_sizes.push(height);
    //     let rgb = nannou::color::IntoLinSrgba::into_lin_srgba(spacebrush.col());
    //     float_delaunay.insert(Vertex {
    //         position: [spacebrush.pos.x, spacebrush.pos.y, 0.0],
    //         color: [rgb.red, rgb.blue, rgb.green, rgb.alpha],
    //     });
    //     sum_length += this_length;
    // }
    // Triangulate all the points
    // let mut voronoi_points = Vec::with_capacity(float_delaunay.num_triangles() * 3);
    // for (i, face) in float_delaunay.triangles().enumerate() {
    //     let triangle = face.as_triangle();
    //     voronoi_points.push(triangle[0].to_vec4());
    //     voronoi_points.push(triangle[1].to_vec4());
    //     voronoi_points.push(triangle[2].to_vec4());
    // }

    let num_circles = 300.;

    let radius_per_circle = 1.0 / (num_circles + 1.0);
    let mut float_delaunay = FloatDelaunayTriangulation::with_tree_locate();

    let mut sum_length = 0.0;
    let mut voronoi_points = vec![];
    let mut heat_sum = 0.;

    for (i, pair) in vector.iter().enumerate() {
        let this_length = pair.0 as f32 / site.max_coverage_total_length as f32;
        let count_ratio = pair.1 as f32 / site.max_coverage_vector_count as f32;
        let heat = count_ratio.powf(0.1);
        let angle = sum_length * PI * 2. * num_circles;
        let circle = sum_length * num_circles;
        let radius = (circle / num_circles + heat / num_circles).powf(1. / 3.);
        // let radius = heat * radius_per_circle + circle * radius_per_circle;
        // let radius = radius * 1.2;
        sum_length += this_length;
        let point = pt2(angle.cos() * radius, angle.sin() * radius);
        let col = hsla(0.6 + heat * 0.6, 0.4 + heat * 0.6, 0.055 + heat * 0.6, 0.15);
        let rgb = nannou::color::IntoLinSrgba::into_lin_srgba(col);
        // coloured_points.push((point, col));
        let vertex = Vertex {
            position: [point.x, point.y, 0.0],
            color: [heat, heat_sum, rgb.green, rgb.alpha],
        };
        float_delaunay.insert(Vertex {
            position: [point.x, point.y, 0.0],
            color: [rgb.red, rgb.blue, rgb.green, rgb.alpha],
        });
        voronoi_points.push(vertex.to_vec4());
        // heat_sum += heat;
        heat_sum += (count_ratio.powf(0.5) - 0.05).max(0.) * 0.15;
    }

    println!("Num points: {}", voronoi_points.len());
    voronoi_shader.uniform.fade_out_distance = model.voronoi_fade_out_distance;
    voronoi_shader.uniform.border_margin = model.param3;
    voronoi_shader.set_points_and_colors(voronoi_points, window, colors);
    voronoi_shader.view(encoder, texture_view, window);

    fn length_of_vertex_line(v1: &Vertex, v2: &Vertex) -> f32 {
        let p1 = pt2(v1.position[0], v1.position[1]);
        let p2 = pt2(v2.position[0], v2.position[1]);
        p1.distance2(p2)
    }

    // Triangulate all the points
    for (i, face) in float_delaunay.triangles().enumerate() {
        let triangle = face.as_triangle();
        let dist1 = length_of_vertex_line(&triangle[0], &triangle[1]);
        let thresh = 0.64
            * 0.1
            * (1.0 - pt2(triangle[0].position[0], triangle[0].position[1]).distance(pt2(0.0, 0.0)));
        if dist1 < thresh
            && length_of_vertex_line(&triangle[1], &triangle[2]) < thresh
            && length_of_vertex_line(&triangle[2], &triangle[0]) < thresh
        {
            let points = vec![
                vertex_to_col_point_alpha(
                    &vertex_halfway_between(&triangle[0], &triangle[1]),
                    win.w() * 0.5,
                    win.h() * 0.5,
                ),
                vertex_to_col_point_alpha(
                    &vertex_halfway_between(&triangle[1], &triangle[2]),
                    win.w() * 0.5,
                    win.h() * 0.5,
                ),
                vertex_to_col_point_alpha(
                    &vertex_halfway_between(&triangle[2], &triangle[0]),
                    win.w() * 0.5,
                    win.h() * 0.5,
                ),
            ];

            draw.polyline()
                .stroke_weight(2.0)
                .points_colored_closed(points.clone());
        }
        // draw.polyline()
        //     .stroke_weight(2.0)
        //     .x_y(1.0, 1.0)
        //     .points_colored_closed(points.clone());
        // draw.polyline()
        //     .stroke_weight(2.0)
        //     .x_y(-1.0, 0.0)
        //     .points_colored_closed(points.clone());
    }
}

fn vertex_halfway_between(v1: &Vertex, v2: &Vertex) -> Vertex {
    Vertex {
        position: [
            v1.position[0] + (v2.position[0] - v1.position[0]) / 2.0,
            v1.position[1] + (v2.position[1] - v1.position[1]) / 2.0,
            v1.position[2] + (v2.position[2] - v1.position[2]) / 2.0,
        ],
        color: [
            v1.color[0] + (v2.color[0] - v1.color[0]) / 2.0,
            v1.color[1] + (v2.color[1] - v1.color[1]) / 2.0,
            v1.color[2] + (v2.color[2] - v1.color[2]) / 2.0,
            v1.color[3] + (v2.color[3] - v1.color[3]) / 2.0,
        ],
    }
}

// HELPER FUNCTIONS

fn script_color(id: f32) -> Hsla {
    hsla(id as f32 * 0.0226, 0.8, 0.45, 1.0)
}

fn script_color_sl(id: f32, saturation: f32, lightness: f32) -> Hsla {
    hsla(id as f32 * 0.0226, saturation, lightness, 1.0)
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
