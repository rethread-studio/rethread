use anyhow::{anyhow, Context, Result};
use serialport::SerialPort;
use std::time::{Duration, Instant};

use nannou_osc as osc;
use nannou_osc::Type;

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
    ApplyFilter,
    EndScreen,
}

struct State {
    state_machine: StateMachine,
    communication: Communication,
}

impl State {
    fn transition_to_apply_filter(&mut self) {
        self.state_machine = StateMachine::ApplyFilter;
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
        match self.state_machine {
            StateMachine::Idle => self.transition_to_countdown(),
            StateMachine::TransitionToFilter { .. } => (),
            StateMachine::ApplyFilter => (),
            StateMachine::EndScreen => (),
            StateMachine::Countdown {
                counts_left: _,
                last_tick: _,
            } => (),
        }
    }
    fn perform_steps(&mut self, num_steps: usize) {
        if matches!(self.state_machine, StateMachine::ApplyFilter) {
            // TODO: simulate running the code
            // TODO: count the number of new pixels having been processed
            // TODO: send the number of pixels processed
            // TODO: send the number of instructions performed to the code screen
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
                    self.transition_to_apply_filter();
                }
            }
            StateMachine::ApplyFilter => (),
            StateMachine::EndScreen => (),
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
            StateMachine::ApplyFilter => "apply_filter",
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
    };

    let mut serial_buf: Vec<u8> = vec![0; 32];
    // main loop
    loop {
        if let Some(sp) = &mut serial_port {
            // try reading serial data
            if let Ok(bytes_read) = sp.read(serial_buf.as_mut_slice()) {
                for byte in serial_buf.iter().take(bytes_read) {
                    match *byte as char {
                        'u' => println!("up"),
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
