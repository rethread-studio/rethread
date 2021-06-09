use std::{cell::RefCell, env, fs::File, io::Read, path::PathBuf};

use crate::texture::{self, Texture};
use crevice::std140::{AsStd140, Std140};
use nannou::{image::buffer, prelude::*};
use spade::HasPosition;
use wgpu::{Extent3d, TextureCopyViewBase};

/// Returns (vertex_module, fragment_module)
pub fn load_shader(
    device: &nannou::wgpu::Device,
    shader_name: &str,
) -> (nannou::wgpu::ShaderModule, nannou::wgpu::ShaderModule) {
    let path = env::current_dir().unwrap();
    println!("The current directory is {}", path.display());
    let mut spirv_read_buf = Vec::new();
    let path = PathBuf::from(&format!("src/shaders/{}.vert.spv", shader_name));
    let mut f = File::open(path).unwrap();
    f.read_to_end(&mut spirv_read_buf).unwrap();
    let vs_mod = wgpu::shader_from_spirv_bytes(device, spirv_read_buf.as_slice());
    let path = PathBuf::from(&format!("src/shaders/{}.frag.spv", shader_name));
    let mut f = File::open(path).unwrap();
    spirv_read_buf.clear();
    f.read_to_end(&mut spirv_read_buf).unwrap();
    let fs_mod = wgpu::shader_from_spirv_bytes(device, spirv_read_buf.as_slice());
    (vs_mod, fs_mod)
}

pub struct WgpuShaderData {
    bind_group: wgpu::BindGroup,
    render_pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    pub vertices: Vec<Vertex>,
}

impl WgpuShaderData {
    pub fn new(window: &Window, resolution: [u32; 2], shader: &str) -> Self {
        let device = window.swap_chain_device();
        let format = Frame::TEXTURE_FORMAT;
        let sample_count = window.msaa_samples();
        let (vs_mod, fs_mod) = load_shader(&device, shader);

        // Vertices
        // Test vertices
        let vertices = vec![
            Vertex {
                position: [0.0, 0.5, 0.0],
                color: [1.0, 0.0, 0.0, 1.0],
            },
            Vertex {
                position: [-0.5, -0.5, 0.0],
                color: [0.0, 1.0, 0.0, 1.0],
            },
            Vertex {
                position: [0.5, -0.5, 0.0],
                color: [0.0, 0.0, 1.0, 1.0],
            },
        ];

        // Create the vertex buffer.
        let vertices_bytes = vertices_as_bytes(&vertices[..]);
        let usage = wgpu::BufferUsage::VERTEX;
        let vertex_buffer = device.create_buffer_init(&BufferInitDescriptor {
            label: None,
            contents: vertices_bytes,
            usage,
        });

        // Create the render pipeline.
        let bind_group_layout = wgpu::BindGroupLayoutBuilder::new().build(device);
        let bind_group = wgpu::BindGroupBuilder::new().build(device, &bind_group_layout);
        let pipeline_layout =
            wgpu::create_pipeline_layout(device, None, &[&bind_group_layout], &[]);
        let render_pipeline = create_render_pipeline(
            &device,
            &pipeline_layout,
            &vs_mod,
            &fs_mod,
            format,
            sample_count,
        );

        Self {
            bind_group,
            render_pipeline,
            vertex_buffer,
            vertices,
        }
    }

    /// Assuming the new vertices are already in self.vertices, create
    /// a new vertex buffer for use in the next rendering.
    pub fn set_new_vertices(&mut self, window: &Window) {
        let device = window.swap_chain_device();
        // Create a new vertex buffer
        let vertices_bytes = vertices_as_bytes(&self.vertices[..]);
        let usage = wgpu::BufferUsage::VERTEX;
        self.vertex_buffer = device.create_buffer_init(&BufferInitDescriptor {
            label: None,
            contents: vertices_bytes,
            usage,
        });
    }

    pub fn view(&self, encoder: &mut wgpu::CommandEncoder, texture_view: &wgpu::TextureView) {
        // The render pass can be thought of a single large command consisting of sub commands. Here we
        // begin a render pass that outputs to the frame's texture. Then we add sub-commands for
        // setting the bind group, render pipeline, vertex buffers and then finally drawing.
        let mut render_pass = wgpu::RenderPassBuilder::new()
            .color_attachment(texture_view, |color| color.load_op(wgpu::LoadOp::Load))
            .begin(encoder);
        render_pass.set_bind_group(0, &self.bind_group, &[]);
        render_pass.set_pipeline(&self.render_pipeline);
        render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));

        // We want to draw the whole range of vertices, and we're only drawing one instance of them.
        let vertex_range = 0..self.vertices.len() as u32;
        let instance_range = 0..1;
        render_pass.draw(vertex_range, instance_range);

        // The commands we added will be submitted after the nanou `view` completes.
        // Normally, we would manually submit the encoder to the queue here.
    }
}

pub struct OffscreenView {
    texture: nannou::wgpu::TextureHandle,
    texture_view: nannou::wgpu::TextureViewHandle,
    render_pipeline: nannou::wgpu::RenderPipeline,
}

impl OffscreenView {
    pub fn new(window: &Window, shader: &str) -> Self {
        // In order to create an offscreen texture view that can be
        // rendered to and then itself rendered to the swap chain
        // view, we just need to create one ourselves.  Just like the
        // main window texture, this texture has to be recreated any
        // time the window is resized.

        let device = window.swap_chain_device();
        // We're using the same format as the output frame for faster real time performance
        let format = Frame::TEXTURE_FORMAT;

        let (width, height) = window.inner_size_pixels();

        let texture_desc = wgpu::TextureDescriptor {
            size: wgpu::Extent3d {
                width,
                height,
                depth: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsage::COPY_SRC | wgpu::TextureUsage::RENDER_ATTACHMENT,
            label: None,
        };
        let texture = device.create_texture(&texture_desc);
        let texture_view = texture.create_view(&Default::default());

        // we need to store this for later
        let u32_size = std::mem::size_of::<u32>() as u32;

        let output_buffer_size = (u32_size * width * height) as wgpu::BufferAddress;
        let output_buffer_desc = wgpu::BufferDescriptor {
            size: output_buffer_size,
            usage: wgpu::BufferUsage::COPY_DST
            // this tells wpgu that we want to read this buffer from the cpu
		| wgpu::BufferUsage::MAP_READ,
            label: None,
            mapped_at_creation: false,
        };
        let output_buffer = device.create_buffer(&output_buffer_desc);

        let sample_count = window.msaa_samples();
        let mut spirv_read_buf = Vec::new();
        let mut f = File::open(&format!("shaders/{}.vert.spv", shader)).unwrap();
        f.read_to_end(&mut spirv_read_buf).unwrap();
        let vs_mod = wgpu::shader_from_spirv_bytes(device, spirv_read_buf.as_slice());
        let mut f = File::open(&format!("shaders/{}.frag.spv", shader)).unwrap();
        f.read_to_end(&mut spirv_read_buf).unwrap();
        let fs_mod = wgpu::shader_from_spirv_bytes(device, spirv_read_buf.as_slice());

        let render_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("Render Pipeline Layout"),
                bind_group_layouts: &[],
                push_constant_ranges: &[],
            });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&render_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &vs_mod,
                entry_point: "main",
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &fs_mod,
                entry_point: "main",
                targets: &[wgpu::ColorTargetState {
                    format: texture_desc.format,
                    alpha_blend: wgpu::BlendState::REPLACE,
                    color_blend: wgpu::BlendState::REPLACE,
                    write_mask: wgpu::ColorWrite::ALL,
                }],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: wgpu::CullMode::Back,
                // Setting this to anything other than Fill requires Features::NON_FILL_POLYGON_MODE
                polygon_mode: wgpu::PolygonMode::Fill,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState {
                count: 1,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
        });

        OffscreenView {
            texture,
            texture_view,
            render_pipeline,
        }
    }

    pub fn view(&self, frame: &Frame) {
        let mut encoder = frame.command_encoder();
        let render_pass_desc = wgpu::RenderPassDescriptor {
            label: Some("Render Pass"),
            color_attachments: &[wgpu::RenderPassColorAttachmentDescriptor {
                attachment: &self.texture_view,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color {
                        r: 0.1,
                        g: 0.2,
                        b: 0.3,
                        a: 0.0,
                    }),
                    store: true,
                },
            }],
            depth_stencil_attachment: None,
        };
        let mut render_pass = encoder.begin_render_pass(&render_pass_desc);

        // TODO: Fix render pass
        todo!();
        render_pass.set_pipeline(&self.render_pipeline);
        render_pass.draw(0..3, 0..1);
    }
}

pub struct Shader {
    fragment_module: nannou::wgpu::ShaderModule,
    vertex_module: nannou::wgpu::ShaderModule,
    render_pipeline: nannou::wgpu::RenderPipeline,
    pub bind_group_layouts: Vec<nannou::wgpu::BindGroupLayout>,
    load_op: nannou::wgpu::LoadOp<wgpu::Color>,
    sample_count: u32,
    // uniform_buffer: nannou::wgpu::Buffer,
}

impl Shader {
    pub fn new(
        window: &Window,
        bind_group_layouts: Vec<nannou::wgpu::BindGroupLayout>,
        shader_name: &str,
    ) -> Self {
        let device = window.swap_chain_device();
        let format = Frame::TEXTURE_FORMAT;
        let sample_count = window.msaa_samples();
        let (vertex_module, fragment_module) = load_shader(device, shader_name);

        let bind_group_layout_refs: Vec<&nannou::wgpu::BindGroupLayout> =
            bind_group_layouts.iter().map(|l| l).collect();

        let render_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("Render Pipeline Layout"),
                bind_group_layouts: bind_group_layout_refs.as_slice(),
                push_constant_ranges: &[],
            });

        let render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&render_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &vertex_module,
                entry_point: "main",
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &fragment_module,
                entry_point: "main",
                targets: &[wgpu::ColorTargetState {
                    format,
                    alpha_blend: wgpu::BlendState::REPLACE,
                    color_blend: wgpu::BlendState::REPLACE,
                    write_mask: wgpu::ColorWrite::ALL,
                }],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: wgpu::CullMode::Back,
                // Setting this to anything other than Fill requires Features::NON_FILL_POLYGON_MODE
                polygon_mode: wgpu::PolygonMode::Fill,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState {
                count: sample_count,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
        });

        Shader {
            fragment_module,
            vertex_module,
            bind_group_layouts,
            // uniform_buffer,
            render_pipeline,
            load_op: wgpu::LoadOp::Clear(wgpu::Color {
                r: 0.0,
                g: 0.0,
                b: 0.0,
                a: 0.0,
            }),
            sample_count,
        }
    }
    /// First set the bind_group_layouts of the Shader
    pub fn remake_render_pipeline(&mut self, device: &wgpu::Device) {
        let bind_group_layout_refs: Vec<&nannou::wgpu::BindGroupLayout> =
            self.bind_group_layouts.iter().map(|l| l).collect();

        let format = Frame::TEXTURE_FORMAT;
        let render_pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("Render Pipeline Layout"),
                bind_group_layouts: bind_group_layout_refs.as_slice(),
                push_constant_ranges: &[],
            });

        self.render_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Render Pipeline"),
            layout: Some(&render_pipeline_layout),
            vertex: wgpu::VertexState {
                module: &self.vertex_module,
                entry_point: "main",
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &self.fragment_module,
                entry_point: "main",
                targets: &[wgpu::ColorTargetState {
                    format,
                    alpha_blend: wgpu::BlendState::REPLACE,
                    color_blend: wgpu::BlendState::REPLACE,
                    write_mask: wgpu::ColorWrite::ALL,
                }],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: wgpu::CullMode::Back,
                // Setting this to anything other than Fill requires Features::NON_FILL_POLYGON_MODE
                polygon_mode: wgpu::PolygonMode::Fill,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState {
                count: self.sample_count,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
        });
    }
    pub fn view(
        &mut self,
        encoder: &mut wgpu::CommandEncoder,
        texture_view: &wgpu::TextureViewHandle,
        window: &Window,
        bind_groups: &Vec<nannou::wgpu::BindGroup>,
    ) {
        let mut render_pass = wgpu::RenderPassBuilder::new()
            .color_attachment(texture_view, |color| color.load_op(self.load_op.clone()))
            .begin(encoder);
        // render_pass.set_bind_group(0, &self.uniform_bind_group, &[]);
        for (i, bind_group) in bind_groups.iter().enumerate() {
            render_pass.set_bind_group(i as u32, bind_group, &[]);
        }
        render_pass.set_pipeline(&self.render_pipeline);
        let vertex_range = 0..6 as u32;
        let instance_range = 0..1;
        render_pass.draw(vertex_range, instance_range);
    }
}

pub struct VoronoiShader {
    shader: Shader,
    pub uniform: VoronoiUniform,
    data_texture: Texture,
    bind_groups: Vec<nannou::wgpu::BindGroup>,
}

impl VoronoiShader {
    pub fn new(window: &Window, resolution: [u32; 2]) -> Self {
        let shader_name = "frag_voronoi2";
        let device = window.swap_chain_device();
        let queue = window.swap_chain_queue();

        let (width, height) = (resolution[0], resolution[1]);

        let points: Vec<[f32; 4]> = vec![
            // [0.5, 0.5, 0.0, 0.0],
            // [0.0, 0.0, 0.0, 0.0],
            // [0.0, 0.0, 0.0, 0.0],
            // [0.1, 0.0, 0.0, 0.0],
            [-0.3, 0.0, 0.0, 0.0],
            // [-0.2, 0.0, 0.0, 0.0],
            // [-0.3, 0.0, 0.0, 0.0],
            [-1.0, 0.0, 0.0, 0.0],
            [-0.5, 0.5, 0.0, 0.0],
            [-0.5, -0.5, 0.0, 0.0],
            [0.5, -0.5, 0.0, 0.0],
            [0.15, -0.15, 0.0, 0.0],
            [0.15, 0.0, 0.0, 0.0],
        ];

        let resolution = [width as f32, height as f32];
        let width = points.len() as u32;
        let uniform = VoronoiUniform::new(resolution, points.len() as u32, [width as f32, 1.]);
        let uniform_buffer = uniform.buffer(&device);
        let uniform_bind_group_layout = uniform.bind_group_layout(device);
        let uniform_bind_group =
            uniform.bind_group(device, &uniform_bind_group_layout, &uniform_buffer);

        let data_texture = Texture::from_data_vec4(
            device,
            queue,
            &points,
            width,
            1,
            Some("fragment_data_texture"),
        )
        .unwrap();
        let texture_bind_group_layout = data_texture.bind_group_layout(device);
        let texture_bind_group = data_texture.bind_group(device);

        let bind_group_layouts = vec![uniform_bind_group_layout, texture_bind_group_layout];
        let bind_groups = vec![uniform_bind_group, texture_bind_group];

        let shader = Shader::new(window, bind_group_layouts, shader_name);

        Self {
            shader,
            uniform,
            data_texture,
            bind_groups,
        }
    }
    pub fn view(
        &mut self,
        encoder: &mut wgpu::CommandEncoder,
        texture_view: &wgpu::TextureView,
        window: &Window,
    ) {
        // Check if we need to rebuild things because the uniforms have changed
        let device = window.swap_chain_device();
        let new_buffer = self.uniform.buffer(device);
        let uniform_bind_group_layout = self.uniform.bind_group_layout(device);
        self.bind_groups[0] =
            self.uniform
                .bind_group(device, &uniform_bind_group_layout, &new_buffer);

        self.shader
            .view(encoder, texture_view, window, &self.bind_groups);
    }
    pub fn set_points_and_colors(
        &mut self,
        mut points: Vec<[f32; 4]>,
        window: &Window,
        cols: [[f32; 4]; 4],
    ) {
        let device = window.swap_chain_device();
        let queue = window.swap_chain_queue();
        // Pad the points to create a 2D texture
        let width = 1024;
        let height = (points.len() as f64 / width as f64).ceil() as u32;
        let padding_points = width * height - points.len() as u32;
        for _i in 0..padding_points {
            points.push([0., 0., 0., 0.]);
        }
        // Create a new texture
        let data_texture = Texture::from_data_vec4(
            device,
            queue,
            &points,
            width,
            height,
            Some("fragment_data_texture"),
        )
        .unwrap();
        // The bind layout should be the same, but the bind group needs to be remade
        let texture_bind_group = data_texture.bind_group(device);
        self.bind_groups[1] = texture_bind_group;

        // The Uniform also needs to be changed if the number of points changed
        // if points.len() as u32 != self.uniform.num_points {
        self.uniform.num_points = points.len() as u32;
        self.uniform.texture_res = [width as f32, height as f32];
        self.uniform.col1 = cols[0];
        self.uniform.col2 = cols[1];
        self.uniform.col3 = cols[2];
        self.uniform.col4 = cols[3];
        self.uniform.rebuild_raw();
        self.bind_groups[0] = self.uniform.bind_group(
            device,
            &self.uniform.bind_group_layout(device),
            &self.uniform.buffer(device),
        )
        // }
    }
}

pub trait Uniform {
    // fn data(&self) -> &[u8];
    fn bind_group(
        &self,
        device: &nannou::wgpu::Device,
        layout: &nannou::wgpu::BindGroupLayout,
        buffer: &nannou::wgpu::Buffer,
    ) -> nannou::wgpu::BindGroup;
    fn bind_group_layout(&self, device: &nannou::wgpu::Device) -> nannou::wgpu::BindGroupLayout;
    fn buffer(&self, device: &nannou::wgpu::Device) -> nannou::wgpu::Buffer;
}

enum UniformState {
    NeedsRebuild { bind_group: bool, buffer: bool },
    Unchanged,
}

/// The raw struct that gets converted to
#[repr(C)]
#[derive(Copy, Clone, AsStd140)]
struct VoronoiUniformRaw {
    resolution: mint::Vector2<f32>,
    num_points: u32,
    texture_res: mint::Vector2<f32>,
    fade_out_distance: f32,
    border_margin: f32,
    col1: mint::Vector4<f32>,
    col2: mint::Vector4<f32>,
    col3: mint::Vector4<f32>,
    col4: mint::Vector4<f32>,
}

pub struct VoronoiUniform {
    pub resolution: [f32; 2],
    pub num_points: u32,
    pub texture_res: [f32; 2],
    pub fade_out_distance: f32,
    pub border_margin: f32,
    pub col1: [f32; 4],
    pub col2: [f32; 4],
    pub col3: [f32; 4],
    pub col4: [f32; 4],
    raw: VoronoiUniformRaw,
}

impl VoronoiUniform {
    pub fn new(resolution: [f32; 2], num_points: u32, texture_res: [f32; 2]) -> Self {
        let raw = VoronoiUniformRaw {
            resolution: resolution.into(),
            num_points,
            texture_res: texture_res.into(),
            fade_out_distance: 0.01,
            border_margin: 0.2,
            col1: [0.; 4].into(),
            col2: [0.; 4].into(),
            col3: [0.; 4].into(),
            col4: [0.; 4].into(),
        };
        let mut s = Self {
            resolution,
            num_points,
            texture_res,
            fade_out_distance: 0.01,
            border_margin: 0.2,
            raw,
            col1: [0.; 4],
            col2: [0.; 4],
            col3: [0.; 4],
            col4: [0.; 4],
        };
        s.rebuild_raw();
        s
    }
    fn rebuild_raw(&mut self) {
        self.raw.resolution = self.resolution.into();
        self.raw.num_points = self.num_points;
        self.raw.texture_res = self.texture_res.into();
        self.raw.fade_out_distance = self.fade_out_distance;
        self.raw.border_margin = self.border_margin;
        self.raw.col1 = self.col1.into();
        self.raw.col2 = self.col2.into();
        self.raw.col3 = self.col3.into();
        self.raw.col4 = self.col4.into();
    }
}

impl Uniform for VoronoiUniform {
    fn bind_group_layout(&self, device: &nannou::wgpu::Device) -> nannou::wgpu::BindGroupLayout {
        device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStage::FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
            label: Some("uniform_bind_group_layout"),
        })
    }
    fn bind_group(
        &self,
        device: &nannou::wgpu::Device,
        layout: &nannou::wgpu::BindGroupLayout,
        buffer: &nannou::wgpu::Buffer,
    ) -> nannou::wgpu::BindGroup {
        let uniform_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: buffer.as_entire_binding(),
            }],
            label: Some("uniform_bind_group"),
        });
        uniform_bind_group
    }
    fn buffer(&self, device: &nannou::wgpu::Device) -> nannou::wgpu::Buffer {
        // let uniform_bytes = self.data();
        let uniform_std140 = self.raw.as_std140();
        let uniform_bytes = uniform_std140.as_bytes();
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Uniform Buffer"),
            contents: bytemuck::cast_slice(uniform_bytes),
            usage: wgpu::BufferUsage::UNIFORM | wgpu::BufferUsage::COPY_DST,
        });
        uniform_buffer
    }
}

#[repr(C)]
#[derive(Copy, Clone, Debug)]
pub struct Vertex {
    pub position: [f32; 3],
    pub color: [f32; 4],
}

impl Vertex {
    pub fn new() -> Self {
        Vertex {
            position: [0.0; 3],
            color: [0.0; 4],
        }
    }
    fn desc<'a>() -> wgpu::VertexBufferLayout<'a> {
        // There is a less verbose way of doing this using the
        // `wgpu::vertex_attr_array!` macro
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
            step_mode: wgpu::InputStepMode::Vertex,
            attributes: &[
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float3,
                },
                wgpu::VertexAttribute {
                    offset: std::mem::size_of::<[f32; 3]>() as wgpu::BufferAddress,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float4,
                },
            ],
        }
    }
    pub fn to_vec4(&self) -> [f32; 4] {
        [
            self.position[0],
            self.position[1],
            self.color[0],
            self.color[1],
        ]
    }
    pub fn to_point_col(&self) -> (Vector2, Rgba) {
        let point = pt2(self.position[0], self.position[1]);
        let col = rgba(self.color[0], self.color[1], self.color[2], self.color[3]);
        (point, col)
    }
}

impl HasPosition for Vertex {
    type Point = [f32; 2];
    fn position(&self) -> [f32; 2] {
        [self.position[0], self.position[1]]
    }
}

pub struct BlurShader {
    blur_shader: Shader,
    // combine_shader: Shader,
    pub blur_uniform: BlurUniform,
    blur_texture: Texture,
    blur_bind_groups: Vec<nannou::wgpu::BindGroup>,
    pub blur_size: u32,
    pub sigma: f32,
    combine_shader: Shader,
    pub combine_uniform: CombineUniform,
    combine_texture: Texture, // You cannot read form and write to the same texture
    pub contrast: f32,
    pub lightness: f32,
    pub blur_alpha: f32,
}

impl BlurShader {
    pub fn new(
        window: &Window,
        resolution: [u32; 2],
        render_texture_view: &wgpu::TextureView,
    ) -> Self {
        let shader_name = "blur";
        let device = window.swap_chain_device();
        let queue = window.swap_chain_queue();

        let (width, height) = (resolution[0], resolution[1]);
        let blur_size = 18;
        let sigma = 3.5;
        let contrast = 1.0;
        let lightness = 1.0;
        let blur_alpha = 0.5;

        let resolution = [width as f32, height as f32];
        let blur_uniform = BlurUniform {
            resolution: resolution.into(),
            blur_size,
            sigma,
            tex_offset: [1.0, 0.0].into(),
        };
        let blur_uniform_buffer = blur_uniform.buffer(&device);
        let blur_uniform_bind_group_layout = blur_uniform.bind_group_layout(device);
        let blur_uniform_bind_group = blur_uniform.bind_group(
            device,
            &blur_uniform_bind_group_layout,
            &blur_uniform_buffer,
        );

        // The blur texture is a texture to which the intermediate blur result can be written and which can then be overlayed on the original image or be the subject of more post processing
        let blur_texture = Texture::empty(
            device,
            queue,
            Some("blur_texture"),
            Frame::TEXTURE_FORMAT,
            width,
            height,
            window.msaa_samples(), // Must match the screen texture becase the Shader assumes it
        );
        let texture_bind_group_layout = blur_texture.bind_group_layout(device);
        let texture_bind_group = blur_texture.bind_group(device);

        let bind_group_layouts = vec![blur_uniform_bind_group_layout, texture_bind_group_layout];
        let blur_bind_groups = vec![blur_uniform_bind_group, texture_bind_group];

        let mut blur_shader = Shader::new(window, bind_group_layouts, shader_name);
        blur_shader.load_op = wgpu::LoadOp::Load;
        // Init the combine shader stuff

        let combine_uniform = CombineUniform {
            resolution: resolution.into(),
            contrast,
            lightness,
            blur_alpha,
        };
        let combine_uniform_bind_group_layout = combine_uniform.bind_group_layout(&device);
        let combine_uniform_buffer = combine_uniform.buffer(device);
        let render_texture_layout =
            texture::texture_bind_group_layout(&device, render_texture_view.sample_type());

        let bind_group_layouts = vec![
            combine_uniform_bind_group_layout,
            blur_texture.bind_group_layout(device),
            render_texture_layout,
        ];
        // Since you cannot read from the texture you're writing to, this will
        // hold the result of the combine shader pass.
        let combine_texture = Texture::empty(
            device,
            queue,
            Some("combine_texture"),
            Frame::TEXTURE_FORMAT,
            width,
            height,
            window.msaa_samples(), // Must match the screen texture becase the Shader assumes it
        );

        let mut combine_shader = Shader::new(window, bind_group_layouts, "combine");
        combine_shader.load_op = wgpu::LoadOp::Load;
        Self {
            blur_shader,
            blur_uniform,
            blur_texture,
            blur_bind_groups,
            blur_size,
            sigma,
            combine_shader,
            combine_texture,
            combine_uniform,
            contrast,
            lightness,
            blur_alpha,
        }
    }
    pub fn view(
        &mut self,
        encoder: &mut wgpu::CommandEncoder,
        screen_texture: &wgpu::TextureHandle,
        screen_texture_view: &wgpu::TextureView,
        window: &Window,
    ) {
        self.blur_uniform.blur_size = self.blur_size;
        self.blur_uniform.sigma = self.sigma;
        self.combine_uniform.contrast = self.contrast;
        self.combine_uniform.blur_alpha = self.blur_alpha;
        self.combine_uniform.lightness = self.lightness;
        // First run the shader with the screen texture as source and blur
        // texture as destination
        // Rebuild uniform:
        self.blur_uniform.tex_offset = [1.0, 0.0].into();
        let device = window.swap_chain_device();
        let new_buffer = self.blur_uniform.buffer(device);
        let uniform_bind_group_layout = self.blur_uniform.bind_group_layout(device);
        self.blur_bind_groups[0] =
            self.blur_uniform
                .bind_group(device, &uniform_bind_group_layout, &new_buffer);
        self.blur_shader.bind_group_layouts[0] = uniform_bind_group_layout;
        // Set the screen texture as source texture
        let screen_sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Nearest,
            mipmap_filter: wgpu::FilterMode::Nearest,
            ..Default::default()
        });
        let screen_layout =
            texture::texture_bind_group_layout(&device, screen_texture_view.sample_type());
        let screen_texture_bind_group = texture::texture_bind_group(
            &device,
            &screen_sampler,
            &screen_texture_view,
            &screen_layout,
        );
        self.blur_shader.bind_group_layouts[1] = screen_layout;
        self.blur_bind_groups[1] = screen_texture_bind_group;
        self.blur_shader.remake_render_pipeline(&device); // This is probably not the most efficient way
        self.blur_shader.view(
            encoder,
            &self.blur_texture.view,
            window,
            &self.blur_bind_groups,
        );

        // Then run it again, reading from the same texture it's writing to for
        // the second blur pass (in the other direction)
        self.blur_uniform.tex_offset = [0.0, 1.0].into();
        let new_buffer = self.blur_uniform.buffer(device);
        let combine_uniform_bind_group_layout = self.combine_uniform.bind_group_layout(&device);
        let uniform_bind_group_layout = self.blur_uniform.bind_group_layout(device);
        self.blur_bind_groups[0] =
            self.blur_uniform
                .bind_group(device, &uniform_bind_group_layout, &new_buffer);

        self.blur_shader.bind_group_layouts[1] = self.blur_texture.bind_group_layout(&device);
        self.blur_bind_groups[1] = self.blur_texture.bind_group(&device);
        self.blur_shader.remake_render_pipeline(&device); // This is probably not the most efficient way
                                                          // self.shader
                                                          //     .view(encoder, &self.blur_texture.view, window, &self.bind_groups);
        self.blur_shader.view(
            encoder,
            &self.combine_texture.view,
            window,
            &self.blur_bind_groups,
        );

        // Then blend the blur with the original in a combination shader
        let combine_uniform_buffer = self.combine_uniform.buffer(device);
        let combine_uniform_bind_group = self.combine_uniform.bind_group(
            &device,
            &combine_uniform_bind_group_layout,
            &combine_uniform_buffer,
        );
        let screen_layout =
            texture::texture_bind_group_layout(&device, screen_texture_view.sample_type());
        let screen_texture_bind_group = texture::texture_bind_group(
            &device,
            &screen_sampler,
            &screen_texture_view,
            &screen_layout,
        );
        let combine_bind_groups = vec![
            combine_uniform_bind_group,
            self.combine_texture.bind_group(device),
            screen_texture_bind_group,
        ];
        self.combine_shader.view(
            encoder,
            &self.blur_texture.view,
            window,
            &combine_bind_groups,
        );
        // Copy the result to the render texture target
        let copy_size = screen_texture_view.extent();
        let source_copy_view = wgpu::TextureCopyViewBase{
            texture: &self.blur_texture.texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
        };
        let dest_copy_view = wgpu::TextureCopyViewBase{
            texture: screen_texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
        };
        encoder.copy_texture_to_texture(source_copy_view, dest_copy_view, copy_size)
    }
}

#[repr(C)]
#[derive(Copy, Clone, AsStd140)]
pub struct BlurUniform {
    resolution: mint::Vector2<f32>,
    blur_size: u32,
    sigma: f32,
    tex_offset: mint::Vector2<f32>,
}

impl Uniform for BlurUniform {
    fn bind_group_layout(&self, device: &nannou::wgpu::Device) -> nannou::wgpu::BindGroupLayout {
        device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStage::FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
            label: Some("uniform_bind_group_layout"),
        })
    }
    fn bind_group(
        &self,
        device: &nannou::wgpu::Device,
        layout: &nannou::wgpu::BindGroupLayout,
        buffer: &nannou::wgpu::Buffer,
    ) -> nannou::wgpu::BindGroup {
        let uniform_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: buffer.as_entire_binding(),
            }],
            label: Some("uniform_bind_group"),
        });
        uniform_bind_group
    }
    fn buffer(&self, device: &nannou::wgpu::Device) -> nannou::wgpu::Buffer {
        let uniform_std140 = self.as_std140();
        let uniform_bytes = uniform_std140.as_bytes();
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Uniform Buffer"),
            contents: bytemuck::cast_slice(uniform_bytes),
            usage: wgpu::BufferUsage::UNIFORM | wgpu::BufferUsage::COPY_DST,
        });
        uniform_buffer
    }
}

pub fn create_bind_group_layout(
    device: &wgpu::Device,
    texture_sample_type: wgpu::TextureSampleType,
    sampler_filtering: bool,
) -> wgpu::BindGroupLayout {
    wgpu::BindGroupLayoutBuilder::new()
        .texture(
            wgpu::ShaderStage::FRAGMENT,
            false,
            wgpu::TextureViewDimension::D2,
            texture_sample_type,
        )
        .sampler(wgpu::ShaderStage::FRAGMENT, sampler_filtering)
        .build(device)
}
#[repr(C)]
#[derive(Copy, Clone, AsStd140)]
pub struct CombineUniform {
    resolution: mint::Vector2<f32>,
    contrast: f32,
    lightness: f32,
    blur_alpha: f32,
}

// TODO: Make all this part of the Uniform trait and demand the trait AsStd140
impl Uniform for CombineUniform {
    fn bind_group_layout(&self, device: &nannou::wgpu::Device) -> nannou::wgpu::BindGroupLayout {
        device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStage::FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
            label: Some("uniform_bind_group_layout"),
        })
    }
    fn bind_group(
        &self,
        device: &nannou::wgpu::Device,
        layout: &nannou::wgpu::BindGroupLayout,
        buffer: &nannou::wgpu::Buffer,
    ) -> nannou::wgpu::BindGroup {
        let uniform_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: buffer.as_entire_binding(),
            }],
            label: Some("uniform_bind_group"),
        });
        uniform_bind_group
    }
    fn buffer(&self, device: &nannou::wgpu::Device) -> nannou::wgpu::Buffer {
        let uniform_std140 = self.as_std140();
        let uniform_bytes = uniform_std140.as_bytes();
        let uniform_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Uniform Buffer"),
            contents: bytemuck::cast_slice(uniform_bytes),
            usage: wgpu::BufferUsage::UNIFORM | wgpu::BufferUsage::COPY_DST,
        });
        uniform_buffer
    }
}

pub fn create_bind_group(
    device: &wgpu::Device,
    layout: &wgpu::BindGroupLayout,
    texture: &wgpu::TextureView,
    sampler: &wgpu::Sampler,
) -> wgpu::BindGroup {
    wgpu::BindGroupBuilder::new()
        .texture_view(texture)
        .sampler(sampler)
        .build(device, layout)
}

pub fn create_pipeline_layout(
    device: &wgpu::Device,
    bind_group_layout: &wgpu::BindGroupLayout,
) -> wgpu::PipelineLayout {
    let desc = wgpu::PipelineLayoutDescriptor {
        label: None,
        bind_group_layouts: &[&bind_group_layout],
        push_constant_ranges: &[],
    };
    device.create_pipeline_layout(&desc)
}

pub fn create_render_pipeline(
    device: &wgpu::Device,
    layout: &wgpu::PipelineLayout,
    vs_mod: &wgpu::ShaderModule,
    fs_mod: &wgpu::ShaderModule,
    dst_format: wgpu::TextureFormat,
    sample_count: u32,
) -> wgpu::RenderPipeline {
    wgpu::RenderPipelineBuilder::from_layout(layout, vs_mod)
        .fragment_shader(fs_mod)
        .color_format(dst_format)
        .add_vertex_buffer_layout(Vertex::desc())
        .sample_count(sample_count)
        .primitive_topology(wgpu::PrimitiveTopology::TriangleList)
        .build(device)
}

// See the `nannou::wgpu::bytes` documentation for why this is necessary.
pub fn vertices_as_bytes(data: &[Vertex]) -> &[u8] {
    unsafe { wgpu::bytes::from_slice(data) }
}
