use anyhow::{anyhow, Context, Result};
use serialport::SerialPort;
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
            instructions_per_step: 3000,
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
    timeout: Duration,
}

impl State {
    fn transition_to_apply_filter(&mut self, width: u64, height: u64) {
        self.state_machine = StateMachine::ApplyFilter {
            executor: CodeExecutor::new(width, height),
        };
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
    }
    fn perform_steps(&mut self, num_steps: u64) {
        self.last_interaction = Instant::now();
        match &mut self.state_machine {
            StateMachine::ApplyFilter { executor } => {
                // TODO: simulate running the code
                executor.step(num_steps);
                self.communication
                    .send_step(executor.instructions_performed, executor.pixels_processed());
                if executor.finished_executing() {
                    self.transition_to_end_screen();
                }
            }
            _ => (),
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
                if last_tick.elapsed().as_secs() > 1 {
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
                    self.transition_to_apply_filter(640, 480);
                }
            }
            StateMachine::ApplyFilter { .. } | StateMachine::EndScreen => {
                if self.last_interaction.elapsed() > self.timeout {
                    self.transition_to_idle();
                }
            }
        }
    }
}

struct Communication {
    main_screen_sender: osc::Sender<osc::Connected>,
    code_screen_sender: osc::Sender<osc::Connected>,
    supercollider_sender: osc::Sender<osc::Connected>,
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
    fn send_step(&mut self, instructions_performed: u64, pixels_processed: u64) {
        println!("step: {instructions_performed} instructions, {pixels_processed} pixels");
        let addr = "/instructions_performed";
        let args = vec![Type::Int(instructions_performed as i32)];
        self.code_screen_sender.send((addr, args)).ok();
        let addr = "/pixels_processed";
        let args = vec![Type::Int(pixels_processed as i32)];
        self.main_screen_sender.send((addr, args)).ok();
        let addr = "/step";
        self.supercollider_sender.send((addr, vec![])).ok();
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

    let mut state = State {
        state_machine: StateMachine::Idle,
        communication: Communication {
            main_screen_sender,
            code_screen_sender,
            supercollider_sender,
        },
        last_interaction: Instant::now(),
        timeout: Duration::from_secs_f32(20.0),
    };

    let mut serial_buf: Vec<u8> = vec![0; 32];
    // main loop
    loop {
        if let Some(sp) = &mut serial_port {
            // try reading serial data
            if let Ok(bytes_read) = sp.read(serial_buf.as_mut_slice()) {
                for byte in serial_buf.iter().take(bytes_read) {
                    match *byte as char {
                        'u' => state.perform_steps(1),
                        'd' => println!("down"),
                        'b' => state.button_pressed(),
                        _ => (),
                    }
                }
            }
        } else {
            // Maybe sometimes try to reconnect to the serial port?
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