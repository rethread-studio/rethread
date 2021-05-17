use nannou::prelude::*;
use spade::HasPosition;

pub struct WgpuShaderData {
    bind_group: wgpu::BindGroup,
    render_pipeline: wgpu::RenderPipeline,
    vertex_buffer: wgpu::Buffer,
    pub vertices: Vec<Vertex>,
}

impl WgpuShaderData {
    pub fn new(window: &Window) -> Self {
        let device = window.swap_chain_device();
        let format = Frame::TEXTURE_FORMAT;
        let sample_count = window.msaa_samples();
        let vs_mod =
            wgpu::shader_from_spirv_bytes(device, include_bytes!("shaders/shader.vert.spv"));
        let fs_mod =
            wgpu::shader_from_spirv_bytes(device, include_bytes!("shaders/shader.frag.spv"));

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

    pub fn view(&self, frame: &Frame) {
        // Using this we will encode commands that will be submitted to the GPU.
        let mut encoder = frame.command_encoder();

        // The render pass can be thought of a single large command consisting of sub commands. Here we
        // begin a render pass that outputs to the frame's texture. Then we add sub-commands for
        // setting the bind group, render pipeline, vertex buffers and then finally drawing.
        let mut render_pass = wgpu::RenderPassBuilder::new()
            .color_attachment(frame.texture_view(), |color| {
                color.load_op(wgpu::LoadOp::Load)
            })
            .begin(&mut encoder);
        render_pass.set_bind_group(0, &self.bind_group, &[]);
        render_pass.set_pipeline(&self.render_pipeline);
        render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));

        // We want to draw the whole range of vertices, and we're only drawing one instance of them.
        let vertex_range = 0..self.vertices.len() as u32;
        let instance_range = 0..1;
        render_pass.draw(vertex_range, instance_range);

        // The commands we added will be submitted after the nanou `view` completes.
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
}

impl HasPosition for Vertex {
    type Point = [f32; 2];
    fn position(&self) -> [f32; 2] {
        [self.position[0], self.position[1]]
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
