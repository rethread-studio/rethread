use anyhow::{anyhow, Context, Result};
use serialport::SerialPort;
use std::io::ErrorKind;
use std::time::{Duration, Instant};

use nannou_osc as osc;
use nannou_osc::Type;

#[derive(Debug, Clone)]
struct CodeExecutor {
    total_num_instructions: u64,
    instructions_performed: u64,
    instructions_per_loop: u64,
    instructions_per_step: u64,
}

impl CodeExecutor {
    fn new(width: u64, height: u64) -> Self {
        let instructions_per_loop = 5;
        println!(
            "new CodeExecutor! pixels: {}, instructions: {}",
            width * height,
            instructions_per_loop * width * height
        );
        Self {
            total_num_instructions: instructions_per_loop * width * height,
            instructions_performed: 0,
            instructions_per_loop,
            instructions_per_step: 30000,
        }
    }
    fn step(&mut self, num_steps: u64) {
        self.instructions_performed += self.instructions_per_step * num_steps;
        self.instructions_performed = self.instructions_performed.min(self.total_num_instructions);
    }
    fn pixels_processed(&self) -> u64 {
        self.instructions_performed / self.instructions_per_loop
    }
    fn finished_executing(&self) -> bool {
        self.instructions_performed == self.total_num_instructions
    }
}

#[derive(Clone, Debug)]
enum StateMachine {
    Idle,
    Countdown {
        counts_left: usize,
        last_tick: Instant,
    },
    TransitionToFilter {
        start: Instant,
        duration: Duration,
    },
    ApplyFilter {
        executor: CodeExecutor,
    },
    EndScreen,
}

struct State {
    state_machine: StateMachine,
    communication: Communication,
    last_interaction: Instant,
    last_button_press: Instant,
    resolution: (i32, i32),
    timeout: Duration,
    num_steps: usize,
}

impl State {
    fn transition_to_apply_filter(&mut self, width: u64, height: u64) {
        self.state_machine = StateMachine::ApplyFilter {
            executor: CodeExecutor::new(width, height),
        };
        self.num_steps = 0;
        self.communication
            .send_transition_to_state(&self.state_machine);
    }
    fn transition_to_transition_to_filter(&mut self) {
        self.state_machine = StateMachine::TransitionToFilter {
            start: Instant::now(),
            duration: Duration::from_secs_f32(7.5),
        };
        self.communication
            .send_transition_to_state(&self.state_machine);
    }
    fn transition_to_idle(&mut self) {
        self.state_machine = StateMachine::Idle;
        self.communication
            .send_transition_to_state(&self.state_machine);
    }
    fn transition_to_end_screen(&mut self) {
        self.state_machine = StateMachine::EndScreen;
        self.communication
            .send_transition_to_state(&self.state_machine);
    }
    fn transition_to_countdown(&mut self) {
        self.state_machine = StateMachine::Countdown {
            counts_left: 3,
            last_tick: Instant::now(),
        };
        self.communication
            .send_transition_to_state(&self.state_machine);
        self.communication.send_countdown_tick(3);
    }
    fn button_pressed(&mut self) {
        self.last_interaction = Instant::now();
        match self.state_machine {
            StateMachine::Idle => self.transition_to_countdown(),
            StateMachine::TransitionToFilter { .. } => (),
            StateMachine::ApplyFilter { .. } => (),
            StateMachine::EndScreen => self.transition_to_idle(),
            StateMachine::Countdown {
                counts_left: _,
                last_tick: _,
            } => (),
        }
        if self.last_button_press.elapsed() < Duration::from_millis(500) {
            self.force_transition_to_next();
        }
        self.last_button_press = Instant::now();
    }
    fn force_transition_to_next(&mut self) {
        match self.state_machine {
            StateMachine::Idle => self.transition_to_countdown(),
            StateMachine::TransitionToFilter { .. } => {
                self.transition_to_apply_filter(self.resolution.0 as u64, self.resolution.1 as u64)
            }
            StateMachine::ApplyFilter { .. } => self.transition_to_end_screen(),
            StateMachine::EndScreen => self.transition_to_idle(),
            StateMachine::Countdown {
                counts_left: _,
                last_tick: _,
            } => self.transition_to_transition_to_filter(),
        }
    }
    fn perform_steps(&mut self, num_steps: u64) {
        match &mut self.state_machine {
            StateMachine::ApplyFilter { executor } => {
                // TODO: simulate running the code
                executor.step(num_steps);
                self.communication.send_step(
                    executor.instructions_performed,
                    executor.pixels_processed(),
                    self.num_steps,
                );
                if executor.finished_executing() {
                    self.transition_to_end_screen();
                }
            }
            _ => (),
        }
    }
    fn turn_forward(&mut self) {
        self.num_steps += 1;
        self.last_interaction = Instant::now();
        match &mut self.state_machine {
            StateMachine::Idle => (),
            StateMachine::Countdown {
                counts_left,
                last_tick,
            } => (),
            StateMachine::TransitionToFilter { start, duration } => (),
            StateMachine::ApplyFilter { executor } => self.perform_steps(1),
            StateMachine::EndScreen => {
                self.communication.send_scroll_forward();
            }
        }
    }
    // Run periodically to update time based state
    fn update(&mut self) {
        match &mut self.state_machine {
            StateMachine::Idle => (),
            StateMachine::Countdown {
                counts_left,
                last_tick,
            } => {
                if last_tick.elapsed().as_secs() >= 1 {
                    *counts_left -= 1;
                    *last_tick = Instant::now();
                    self.communication.send_countdown_tick(*counts_left);
                    if *counts_left == 0 {
                        self.transition_to_transition_to_filter();
                    }
                }
            }
            StateMachine::TransitionToFilter { start, duration } => {
                if start.elapsed() > *duration {
                    // TODO: Get the actual size of the image taken from the main_screen
                    self.transition_to_apply_filter(
                        self.resolution.0 as u64,
                        self.resolution.1 as u64,
                    );
                }
            }
            StateMachine::ApplyFilter { .. } | StateMachine::EndScreen => {
                if self.last_interaction.elapsed() > self.timeout {
                    self.transition_to_idle();
                }
                let time_to_timeout =
                    self.timeout.as_secs_f32() - self.last_interaction.elapsed().as_secs_f32();
                self.communication.send_timeout(time_to_timeout);
            }
        }
        for (packet, _addr) in self.communication.main_screen_receiver.try_iter() {
            for message in packet.into_msgs() {
                match message.addr.as_ref() {
                    "/image_resolution" => {
                        if let Some(args) = message.args {
                            for (i, arg) in args.into_iter().enumerate() {
                                match i {
                                    0 => {
                                        if let Some(width) = arg.int() {
                                            self.resolution.0 = width;
                                        } else {
                                            eprintln!("Wrong argument {i} for /image_resolution",);
                                        }
                                    }
                                    1 => {
                                        if let Some(height) = arg.int() {
                                            self.resolution.1 = height;
                                        } else {
                                            eprintln!("Wrong argument {i} for /image_resolution");
                                        }
                                    }
                                    _ => (),
                                }
                            }
                            println!("received resolution: {:?}", self.resolution);
                        }
                    }
                    _ => (),
                }
            }
        }
    }
}

struct Communication {
    main_screen_sender: osc::Sender<osc::Connected>,
    code_screen_sender: osc::Sender<osc::Connected>,
    supercollider_sender: osc::Sender<osc::Connected>,
    main_screen_receiver: osc::Receiver,
}

impl Communication {
    fn send_transition_to_state(&mut self, state: &StateMachine) {
        let state_str = match state {
            StateMachine::Idle => "idle",
            StateMachine::TransitionToFilter { .. } => "transition_to_filter",
            StateMachine::ApplyFilter { .. } => "apply_filter",
            StateMachine::EndScreen => "end_screen",
            StateMachine::Countdown { .. } => "countdown",
        };
        let arg2 = match state {
            StateMachine::TransitionToFilter { duration, .. } => duration.as_secs_f32(),
            _ => 0.0,
        };

        let addr = "/transition_to_state";
        let args = vec![Type::String(state_str.to_owned()), Type::Float(arg2)];
        self.send_to_all(addr, args);
    }
    fn send_countdown_tick(&mut self, count: usize) {
        let addr = "/countdown";
        let args = vec![Type::Int(count as i32)];
        self.send_to_all(addr, args);
    }
    fn send_step(
        &mut self,
        instructions_performed: u64,
        pixels_processed: u64,
        num_steps_turned: usize,
    ) {
        println!("step: {instructions_performed} instructions, {pixels_processed} pixels");
        let addr = "/instructions_performed";
        let args = vec![Type::Int(instructions_performed as i32)];
        self.code_screen_sender.send((addr, args)).ok();
        let addr = "/pixels_processed";
        let args = vec![
            Type::Int(pixels_processed as i32),
            Type::Int(num_steps_turned as i32),
        ];
        self.main_screen_sender.send((addr, args)).ok();
        let addr = "/step";
        self.supercollider_sender
            .send((addr, vec![Type::Int(pixels_processed as i32)]))
            .ok();
    }
    fn send_scroll_forward(&mut self) {
        let addr = "/scroll";
        let args = vec![Type::Int(1)];
        self.main_screen_sender.send((addr, args)).ok();
    }
    fn send_timeout(&mut self, seconds_left: f32) {
        let addr = "/timeout";
        let args = vec![Type::Float(seconds_left)];
        self.send_to_all(addr, args);
    }
    fn send_to_all(&mut self, addr: &str, args: Vec<Type>) {
        println!("sending {addr} {args:?}");
        self.main_screen_sender.send((addr, args.clone())).ok();
        self.code_screen_sender.send((addr, args.clone())).ok();
        self.supercollider_sender.send((addr, args.clone())).ok();
    }
}

fn main() -> Result<()> {
    println!("Hello, world!");
    // Set up serialport communication
    let mut last_serial_reconnect = Instant::now();
    let mut serial_port = match open_serial() {
        Ok(port) => Some(port),
        Err(e) => {
            eprintln!("Failed to open port: {e}");
            None
        }
    };
    // Set up OSC communication
    let main_screen_port = 12345;
    let code_screen_port = 12346;
    let supercollider_port = 57120;

    let main_screen_sender = osc::sender()?.connect(format!("127.0.0.1:{}", main_screen_port))?;
    let code_screen_sender = osc::sender()?.connect(format!("127.0.0.1:{}", code_screen_port))?;
    let supercollider_sender =
        osc::sender()?.connect(format!("127.0.0.1:{}", supercollider_port))?;
    let main_screen_receiver = osc::receiver(12371)?;

    let mut state = State {
        state_machine: StateMachine::Idle,
        communication: Communication {
            main_screen_sender,
            code_screen_sender,
            supercollider_sender,
            main_screen_receiver,
        },
        resolution: (640, 480),
        last_interaction: Instant::now(),
        last_button_press: Instant::now(),
        timeout: Duration::from_secs_f32(20.0),
        num_steps: 0,
    };

    let mut serial_buf: Vec<u8> = vec![0; 32];
    // main loop
    loop {
        let mut serial_port_disconnected = false;
        if let Some(sp) = &mut serial_port {
            // try reading serial data
            match sp.bytes_to_read() {
                Ok(num_bytes) => {
                    if num_bytes > 0 {
                        match sp.read(serial_buf.as_mut_slice()) {
                            Ok(bytes_read) => {
                                for byte in serial_buf.iter().take(bytes_read) {
                                    match *byte as char {
                                        'u' => state.turn_forward(),
                                        'd' => println!("down"),
                                        'b' => state.button_pressed(),
                                        _ => (),
                                    }
                                }
                            }
                            Err(e) => {
                                use std::io::ErrorKind;
                                match e.kind() {
                                    ErrorKind::NotFound
                                    | ErrorKind::ConnectionRefused
                                    | ErrorKind::BrokenPipe
                                    | ErrorKind::NotConnected => serial_port_disconnected = true,
                                    _ => eprintln!("Unhandled read error: {e}"),
                                }
                            }
                        }
                    }
                }
                Err(e) => match e.kind() {
                    serialport::ErrorKind::NoDevice => serial_port_disconnected = true,
                    serialport::ErrorKind::InvalidInput => (),
                    serialport::ErrorKind::Unknown => {
                        eprintln!("Unknown error getting bytes_to_read()");
                        serial_port_disconnected = true;
                    }
                    serialport::ErrorKind::Io(ioe) => {
                        eprintln!("IO error: {ioe}");
                    }
                },
            }
        } else {
            // Maybe sometimes try to reconnect to the serial port?
            if last_serial_reconnect.elapsed() > Duration::from_secs(1) {
                serial_port = match open_serial() {
                    Ok(port) => {
                        println!("Opened serial port connection");
                        Some(port)
                    }
                    Err(e) => {
                        eprintln!("Failed to open port: {e}");
                        None
                    }
                };
                last_serial_reconnect = Instant::now();
            }
        }
        if serial_port_disconnected {
            serial_port = None;
        }
        state.update();
    }
    #[allow(unreachable_code)]
    Ok(())
}

fn open_serial() -> Result<Box<dyn SerialPort>> {
    let ports = serialport::available_ports().context("No ports found!")?;
    for p in ports {
        println!("{}", p.port_name);
        if p.port_name == "/dev/ttyACM0" {
            let port = serialport::new("/dev/ttyACM0", 115_200)
                .timeout(Duration::from_millis(10))
                .open()?;
            return Ok(port);
        }
    }
    Err(anyhow!("No eligible serial port could be connected to"))
}
